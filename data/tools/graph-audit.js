#!/usr/bin/env node
/**
 * Graph-shape report for a region DB — complements validate.js (referential
 * integrity) with the structural view: node roles, orphan POIs, parallel
 * edges, connectivity, chain checks, time asymmetry.
 * Usage: node data/tools/graph-audit.js [path-to-json]
 */
const path = require('path');
const { readJSON, dataDir } = require('./lib');

const file = process.argv[2] || path.join(dataDir, 'rarau.json');
const db = readJSON(file);
const wpById = new Map(db.waypoints.map(w => [w.id, w]));
const problems = [];

console.log(`counts: ${db.waypoints.length} waypoints, ${db.segments.length} segments, ${db.routes.length} routes\n`);

// ---- endpoint usage / degree / routes meeting at each waypoint ----------------
const incident = new Map();   // wp -> segment ids (non-roundtrip)
const routesAt = new Map();   // wp -> Set(route ids) via incident segments
const pairs = new Map();      // sorted "a|b" -> segment ids

for (const s of db.segments) {
  for (const end of [s.from, s.to]) {
    if (!wpById.has(end)) problems.push(`segment ${s.id}: unknown endpoint '${end}'`);
  }
  for (const v of s.via ?? []) {
    const id = typeof v === 'string' ? v : v.wp;
    if (!wpById.has(id)) problems.push(`segment ${s.id}: unknown via '${id}'`);
  }
  if (s.roundtrip) continue;
  for (const end of [s.from, s.to]) {
    if (!incident.has(end)) incident.set(end, []);
    incident.get(end).push(s.id);
    if (!routesAt.has(end)) routesAt.set(end, new Set());
    for (const r of s.routes) routesAt.get(end).add(r);
  }
  const key = [s.from, s.to].sort().join(' | ');
  if (!pairs.has(key)) pairs.set(key, []);
  pairs.get(key).push(s.id);
}

// ---- waypoints that are neither endpoints nor via entries ---------------------
const viaIds = new Set(db.segments.flatMap(s => (s.via ?? []).map(v => (typeof v === 'string' ? v : v.wp))));
const orphans = db.waypoints.filter(w => !incident.has(w.id) && !viaIds.has(w.id));
console.log(`ORPHAN waypoints (no segment endpoint, no via): ${orphans.length}`);
for (const w of orphans) console.log(`  ${w.id}  [${w.type}]`);

// ---- degree classification ----------------------------------------------------
console.log('\nDEGREE / ROLE of graph waypoints:');
const rows = [];
for (const [id, segs] of incident) {
  const deg = segs.length;
  const nRoutes = routesAt.get(id)?.size ?? 0;
  const role = deg >= 3 ? 'JUNCTION(topo)' : deg === 2 ? (nRoutes >= 2 ? 'node(2 routes)' : 'MILESTONE(1 route)') : 'LEAF';
  rows.push({ id, type: wpById.get(id)?.type, deg, nRoutes, role });
}
rows.sort((a, b) => b.deg - a.deg || a.id.localeCompare(b.id));
for (const r of rows) console.log(`  deg=${r.deg} routes=${r.nRoutes}  ${r.role.padEnd(18)} ${r.id} [${r.type}]`);

// ---- parallel edges -----------------------------------------------------------
console.log('\nPARALLEL edges (same waypoint pair, multiple segments):');
for (const [key, ids] of pairs) if (ids.length > 1) console.log(`  ${key}: ${ids.join(', ')}`);

// ---- connectivity over edges the app graph would use --------------------------
const usable = db.segments.filter(s => !s.roundtrip && (s.timeMinutes?.forward != null || s.kind === 'access'));
const unusable = db.segments.filter(s => !s.roundtrip && s.timeMinutes?.forward == null && s.kind !== 'access');
if (unusable.length) console.log(`\nsegments with NO usable time (dropped from graph): ${unusable.map(s => s.id).join(', ')}`);

const parent = new Map();
const find = x => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x); } return x; };
for (const id of incident.keys()) parent.set(id, id);
for (const s of usable) {
  if (!parent.has(s.from) || !parent.has(s.to)) continue;
  const a = find(s.from), b = find(s.to);
  if (a !== b) parent.set(a, b);
}
const comps = new Map();
for (const id of incident.keys()) {
  const root = find(id);
  if (!comps.has(root)) comps.set(root, []);
  comps.get(root).push(id);
}
console.log(`\nCONNECTED COMPONENTS (usable edges): ${comps.size}`);
for (const members of comps.values()) console.log(`  [${members.length}] ${members.sort().join(', ')}`);

// ---- route chain walks --------------------------------------------------------
const segById = new Map(db.segments.map(s => [s.id, s]));
for (const r of db.routes) {
  let at = r.from; const seq = [r.from]; let ok = true;
  for (const sid of r.segments) {
    const s = segById.get(sid);
    if (!s) { problems.push(`route ${r.id}: unknown segment '${sid}'`); ok = false; break; }
    if (s.roundtrip) continue;
    if (s.from === at) at = s.to;
    else if (s.to === at) at = s.from;
    else { problems.push(`route ${r.id}: segment ${sid} does not continue from '${at}'`); ok = false; break; }
    seq.push(at);
  }
  if (ok && at !== r.to) problems.push(`route ${r.id}: chain ends at '${at}', route.to is '${r.to}'`);
  if (ok && JSON.stringify(r.waypointSequence) !== JSON.stringify(seq)) {
    problems.push(`route ${r.id}: waypointSequence != walked chain\n    walked ${JSON.stringify(seq)}\n    field  ${JSON.stringify(r.waypointSequence)}`);
  }
}

// ---- directional time sanity --------------------------------------------------
let asym = 0, symm = 0;
for (const s of db.segments) {
  if (s.roundtrip || s.kind === 'access') continue;
  const t = s.timeMinutes;
  if (t?.forward == null || t?.backward == null) { problems.push(`segment ${s.id}: missing forward/backward time`); continue; }
  t.forward === t.backward ? symm++ : asym++;
}
console.log(`\ntimes: ${asym} segments asymmetric, ${symm} symmetric`);

console.log(`\nPROBLEMS: ${problems.length}`);
for (const p of problems) console.log('  ! ' + p);
process.exit(problems.length ? 1 : 0);
