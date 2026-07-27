#!/usr/bin/env node
// Stage 2: stitch relation geometry into oriented route polylines, derive stub-junction
// coordinates, audit the assumed waypoint sequences, cut per-segment slices, and write
// distances + geometry references back into rarau.json.
const fs = require('fs');
const path = require('path');
const { haversineM, polyLengthM, projectOnPolyline, slicePolyline, stitchWays, pointInPolygon, dataDir, geomDir, readJSON, writeJSON } = require('./lib');

const db = readJSON(path.join(dataDir, 'rarau.json'));
const raw = readJSON(path.join(geomDir, 'raw-relations.json'));
const areas = readJSON(path.join(geomDir, 'raw-areas.json'));
let named = { elements: [] };
try { named = readJSON(path.join(geomDir, 'raw-named.json')); } catch {}

const wp = Object.fromEntries(db.waypoints.map(w => [w.id, w]));
const seg = Object.fromEntries(db.segments.map(s => [s.id, s]));
const routes = Object.fromEntries(db.routes.map(r => [r.id, r]));
const audit = { routes: {}, derived: {}, decisions: {}, crossChecks: [] };

// ---- 1. Stitch ----------------------------------------------------------------
const lines = {}; // routeId -> points
for (const r of db.routes) {
  const rel = raw.elements.find(e => e.type === 'relation' && e.id === r.osmRelation);
  if (!rel) { console.error(`no relation for ${r.id}`); process.exit(1); }
  const ways = rel.members.filter(m => m.type === 'way' && m.geometry).map(m => m.geometry.map(g => ({ lat: g.lat, lon: g.lon })));
  const { points, gaps } = stitchWays(ways);
  lines[r.id] = points;
  audit.routes[r.id] = { stitchedKm: +(polyLengthM(points) / 1000).toFixed(2), gaps };
}

// ---- 2. Orient ----------------------------------------------------------------
const hasCoords = id => wp[id] && typeof wp[id].lat === 'number';
function orient(r) {
  if (r.id === '16MN20') return; // loop
  const pts = lines[r.id];
  const knowns = r.waypointSequence.filter(hasCoords);
  if (knowns.length === 0) return; // handled specially (16MN08)
  const first = wp[knowns[0]], last = wp[knowns[knowns.length - 1]];
  if (knowns.length === 1) {
    // single anchor: it sits at sequence start or end; make its nearest polyline end match
    const idx = r.waypointSequence.indexOf(knowns[0]);
    const nearStart = haversineM(pts[0], first) < haversineM(pts[pts.length - 1], first);
    const wantStart = idx < r.waypointSequence.length / 2;
    if (nearStart !== wantStart) pts.reverse();
    return;
  }
  const a = projectOnPolyline(pts, first).alongM;
  const b = projectOnPolyline(pts, last).alongM;
  if (a > b) pts.reverse();
}
for (const r of db.routes) orient(r);
// 16MN08 has no coordinate anchors: orient so the end nearest 16MN06 comes last (junction-zmarzii).
{
  const pts = lines['16MN08'];
  const d0 = projectOnPolyline(lines['16MN06'], pts[0]).distM;
  const d1 = projectOnPolyline(lines['16MN06'], pts[pts.length - 1]).distM;
  if (d0 < d1) pts.reverse();
  audit.decisions['16MN08-orientation'] = { startToMN06m: Math.round(Math.max(d0, d1)), endToMN06m: Math.round(Math.min(d0, d1)) };
}

// ---- 3. Derive stub/approximate waypoints ------------------------------------
const derived = {};
function setDerived(id, point, confidence, how, extra = {}) {
  derived[id] = { point, confidence, how, ...extra };
  wp[id].lat = +point.lat.toFixed(7);
  wp[id].lon = +point.lon.toFixed(7);
  wp[id].coords = { sources: ['osm-geometry'], status: 'extracted', confidence, derivedBy: how };
  audit.derived[id] = { lat: wp[id].lat, lon: wp[id].lon, confidence, how, ...extra };
}
const endOf = (id, which) => { const p = lines[id]; return which === 'start' ? p[0] : p[p.length - 1]; };

// endpoints that ARE the polyline ends
setDerived('pasul-mestecanis', endOf('16MN03', 'start'), 'high', 'capătul de NV al poligonului 16MN03');
setDerived('dn17-valea-caselor', endOf('16MN19', 'start'), 'high', 'capătul dinspre DN17 al 16MN19');
setDerived('dj175b-chilia', endOf('16MN08', 'start'), 'high', 'capătul dinspre DJ175B al 16MN08');
setDerived('polita-caprelor', endOf('16MN07', 'end'), 'high', 'capătul 16MN07 (joncțiunea cu BR)', { distToMN03m: Math.round(projectOnPolyline(lines['16MN03'], endOf('16MN07', 'end')).distM) });

// projections of one route's end onto another route
function deriveJunction(id, endRoute, endWhich, ontoRoute, maxM) {
  const p = endOf(endRoute, endWhich);
  const proj = projectOnPolyline(lines[ontoRoute], p);
  const ok = proj.distM <= maxM;
  setDerived(id, ok ? proj.point : p, ok ? 'high' : 'low', `capătul ${endRoute} proiectat pe ${ontoRoute} (dist ${Math.round(proj.distM)} m)`, { joinDistM: Math.round(proj.distM), joined: ok });
}
deriveJunction('junction-zmarzii', '16MN08', 'end', '16MN06', 100);
deriveJunction('junction-17pr-limpedea', '16MN18', 'start', '16MN17', 150);
deriveJunction('poiana-mandrila', '16MN15', 'end', '16MN16', 150);
deriveJunction('junction-23x19', '16MN23', 'end', '16MN19', 250);
// signpost where 16MN22 leaves the Pietrele Doamnei circuit — the 16MN22 line starts on the loop
setDerived('junction-20x22', endOf('16MN22', 'start'), 'high', 'capătul 16MN22 pe circuitul 16MN20 (dist 0 m)', {
  distToMN20m: Math.round(projectOnPolyline(lines['16MN20'], endOf('16MN22', 'start')).distM)
});

// Poiana Ciungi: junction of 16MN03 & 16MN04 NW of Giumalău
{
  const A = lines['16MN04'].filter(p => p.lat > 42.0); // all, then restrict by proximity logic below
  let best = { d: Infinity, p: null };
  const cluster = [];
  for (const p of lines['16MN04']) {
    if (p.lat < 47.425) continue;
    const pr = projectOnPolyline(lines['16MN03'], p);
    if (pr.distM < best.d) best = { d: pr.distM, p: pr.point };
    if (pr.distM < 40) cluster.push(pr.point);
  }
  const pt = cluster.length ? cluster[Math.floor(cluster.length / 2)] : best.p;
  setDerived('poiana-ciungi', pt, cluster.length ? 'high' : 'medium', `joncțiune 16MN04×16MN03 (${cluster.length} puncte de suprapunere <40 m; cea mai mică distanță ${Math.round(best.d)} m)`);
}

// Muntele Todirescu: first point (from Slătioara) where 16MN24 meets 16MN03
{
  let found = null, minD = Infinity;
  for (const p of lines['16MN24']) {
    const pr = projectOnPolyline(lines['16MN03'], p);
    if (pr.distM < minD) minD = pr.distM;
    if (pr.distM < 40) { found = pr.point; break; }
  }
  if (found) setDerived('muntele-todirescu', found, 'medium', 'primul punct al 16MN24 (dinspre Slătioara) aflat pe 16MN03', { note: 'altitudinea 1487 rămâne nesursată' });
  else audit.derived['muntele-todirescu'] = { FAILED: true, minDistM: Math.round(minD) };
}

// Codrul Secular entry: 16MN24 enters the reserve polygon
{
  const area = (areas.elements || []).find(e => e.tags && /Slătioara/i.test(e.tags.name || ''));
  if (area && area.geometry) {
    const poly = area.geometry.map(g => ({ lat: g.lat, lon: g.lon }));
    const pts = lines['16MN24'];
    let entry = null;
    for (let i = 1; i < pts.length; i++) {
      if (!pointInPolygon(pts[i - 1], poly) && pointInPolygon(pts[i], poly)) {
        entry = { lat: (pts[i - 1].lat + pts[i].lat) / 2, lon: (pts[i - 1].lon + pts[i].lon) / 2 };
        break;
      }
    }
    if (entry) setDerived('codrul-secular', entry, 'high', `intrarea 16MN24 în poligonul rezervației (OSM way/${area.id})`);
    else audit.derived['codrul-secular'] = { FAILED: 'no polygon crossing found' };
  } else audit.derived['codrul-secular'] = { FAILED: 'reserve polygon not in raw-areas' };
}

// Cheile Moara Dracului: named OSM feature projected onto 16MN19, else km 4.4 fallback
{
  const el = (named.elements || []).find(e => /Moara Dracului/i.test((e.tags && e.tags.name) || ''));
  if (el) {
    const p = { lat: el.lat || el.center.lat, lon: el.lon || el.center.lon };
    const pr = projectOnPolyline(lines['16MN19'], p);
    setDerived('cheile-moara-dracului', pr.point, 'high', `element OSM «${el.tags.name}» (${el.type}/${el.id}) proiectat pe 16MN19 (dist ${Math.round(pr.distM)} m)`);
  } else {
    setDerived('cheile-moara-dracului', slicePolyline(lines['16MN19'], 0, 4400).slice(-1)[0], 'low', 'fallback: km 4,4 pe 16MN19 (capătul porțiunii auto) — de precizat');
  }
}

// Șaua Ciobanilor: decide between the two same-named OSM saddles by distance to the converging routes
{
  const cand = {
    'saua-ciobanilor': { lat: 47.4528331, lon: 25.5824741, osm: '633216742' },
    'saua-ciobanilor-sud': { lat: 47.4377604, lon: 25.6121376, osm: '12704414729' }
  };
  const against = ['16MN03', '16MN18', '16MN19', '16MN24'];
  const table = {};
  for (const [id, c] of Object.entries(cand)) {
    table[id] = {};
    for (const rid of against) table[id][rid] = Math.round(projectOnPolyline(lines[rid], c).distM);
  }
  audit.decisions['saua-ciobanilor'] = table;
  const sum = id => against.reduce((n, rid) => n + table[id][rid], 0);
  if (sum('saua-ciobanilor-sud') < sum('saua-ciobanilor')) {
    // southern node is the real convergence point: swap coordinates onto the canonical id
    const a = wp['saua-ciobanilor'], b = wp['saua-ciobanilor-sud'];
    [a.lat, b.lat] = [b.lat, a.lat]; [a.lon, b.lon] = [b.lon, a.lon];
    [a.osmId, b.osmId] = [b.osmId, a.osmId];
    if (b.ele && !a.ele) { a.ele = b.ele; delete b.ele; }
    audit.decisions['saua-ciobanilor'].swapped = true;
  } else audit.decisions['saua-ciobanilor'].swapped = false;
}

// ---- 4. Audit sequences & cut segments ---------------------------------------
fs.mkdirSync(path.join(geomDir, 'segments'), { recursive: true });
fs.mkdirSync(path.join(geomDir, 'routes'), { recursive: true });
const sliceCache = {}; // segId -> points (primary owner)
for (const r of db.routes) {
  const pts = lines[r.id];
  writeJSON(path.join(geomDir, 'routes', `${r.id}.json`), { id: r.id, lengthKm: +(polyLengthM(pts) / 1000).toFixed(2), points: pts.map(p => [+p.lat.toFixed(6), +p.lon.toFixed(6)]) }, 0);
  const a = audit.routes[r.id];
  a.publishedKm = r.distanceKm.value;
  a.deltaPct = a.publishedKm ? +((a.stitchedKm - a.publishedKm) / a.publishedKm * 100).toFixed(1) : null;

  if (r.id === '16MN20') {
    // Circuit with a stitch gap on the north side: bridge end->start synthetically,
    // then cut at the hotel, Pietrele Doamnei and the 16MN22 signpost into s52/s53/s54.
    const gapM = Math.round(haversineM(pts[pts.length - 1], pts[0]));
    const closed = pts.concat([pts[0]]);
    const total = polyLengthM(closed);
    const cuts = ['hotel-rarau', 'pietrele-doamnei', 'junction-20x22']
      .map(id => ({ id, ...projectOnPolyline(pts, wp[id]) }));
    const [aH, aP, aJ] = cuts.map(c => c.alongM);
    sliceCache['s52'] = slicePolyline(closed, aH, aP);
    sliceCache['s53'] = slicePolyline(closed, aP, aJ);
    const p1 = slicePolyline(closed, aJ, total);
    const p2 = slicePolyline(closed, 0, aH);
    sliceCache['s54'] = p1.concat(p2.slice(1));
    a.note = `loop cut at ${cuts.map(c => `${c.id}@${Math.round(c.alongM)}m/${Math.round(c.distM)}m`).join(', ')}; gap ${gapM} m bridged on the s54 side`;
    a.monotonic = cuts.every((c, i) => i === 0 || c.alongM > cuts[i - 1].alongM);
    continue;
  }

  const params = r.waypointSequence.map(id => {
    const pr = projectOnPolyline(pts, wp[id]);
    return { id, alongM: Math.round(pr.alongM), distM: Math.round(pr.distM) };
  });
  a.sequence = params;
  a.monotonic = params.every((p, i) => i === 0 || p.alongM >= params[i - 1].alongM);
  a.maxOffRouteM = Math.max(...params.map(p => p.distM));

  for (let i = 1; i < params.length; i++) {
    const sid = r.segments[i - 1];
    const s = seg[sid];
    const slice = slicePolyline(pts, params[i - 1].alongM, params[i].alongM);
    const lenKm = +(polyLengthM(slice) / 1000).toFixed(2);
    if (s.routes[0] === r.id) {
      sliceCache[sid] = slice;
    } else if (sliceCache[sid]) {
      const primaryKm = +(polyLengthM(sliceCache[sid]) / 1000).toFixed(2);
      if (primaryKm > 0 && Math.abs(lenKm - primaryKm) / primaryKm > 0.15) {
        audit.crossChecks.push({ segment: sid, primaryRoute: s.routes[0], primaryKm, altRoute: r.id, altKm: lenKm });
      }
    }
  }
}
// second pass for shared segments whose primary route was processed after a secondary one
for (const s of db.segments) {
  if (!sliceCache[s.id]) {
    console.error(`no slice for ${s.id}`);
    continue;
  }
  const pts = sliceCache[s.id];
  const lenKm = +(polyLengthM(pts) / 1000).toFixed(2);
  writeJSON(path.join(geomDir, 'segments', `${s.id}.json`), { id: s.id, from: s.from, to: s.to, lengthKm: lenKm, points: pts.map(p => [+p.lat.toFixed(6), +p.lon.toFixed(6)]) }, 0);
  s.distanceKm = { value: lenKm, sources: ['osm-geometry'], status: 'extracted' };
  s.geometryFile = `geometry/segments/${s.id}.json`;
}

// ---- 4b. Attach off-node POIs as via milestones --------------------------------
// A waypoint that is no segment endpoint but lies on (≤80 m from) a segment slice
// becomes a via entry {wp, atKm, offM} on its best segment — springs, saddles,
// peaks and sights ride along the edge instead of splitting it.
{
  const VIA_TYPES = new Set(['spring', 'sight', 'saddle', 'peak', 'poi']);
  const VIA_MAX_OFF_M = 80;
  const endpointIds = new Set(db.segments.flatMap(s => [s.from, s.to]));
  for (const s of db.segments) delete s.via; // tool-owned: rebuilt every run
  audit.via = { attached: [], nearMisses: [] };
  for (const w of db.waypoints) {
    if (endpointIds.has(w.id) || !VIA_TYPES.has(w.type) || typeof w.lat !== 'number') continue;
    let best = null;
    for (const [sid, pts] of Object.entries(sliceCache)) {
      const pr = projectOnPolyline(pts, w);
      if (!best || pr.distM < best.distM) best = { sid, ...pr };
    }
    if (!best) continue;
    const hit = { wp: w.id, segment: best.sid, atKm: +(best.alongM / 1000).toFixed(2), offM: Math.round(best.distM) };
    if (best.distM <= VIA_MAX_OFF_M) {
      const s = seg[best.sid];
      s.via = [...(s.via ?? []), { wp: w.id, atKm: hit.atKm, offM: hit.offM }].sort((a, b) => a.atKm - b.atKm);
      audit.via.attached.push(hit);
    } else if (best.distM <= 300) {
      audit.via.nearMisses.push(hit);
    }
  }
}

// ---- 5. Write back ------------------------------------------------------------
db.sources['osm-geometry'] = { type: 'osm-overpass', title: 'Geometrie extrasă din relațiile OSM (out geom), asamblată și tăiată pe segmente la build', url: 'https://overpass-api.de/', accessed: '2026-07-24', role: 'polilinii trasee, distanțe pe segmente, coordonate joncțiuni derivate' };
writeJSON(path.join(dataDir, 'rarau.json'), db);
writeJSON(path.join(geomDir, 'topology-audit.json'), audit);

// ---- 6. Console summary -------------------------------------------------------
console.log('route    | stitched | publ  | Δ%    | gaps | maxOff | monotonic');
for (const r of db.routes) {
  const a = audit.routes[r.id];
  const gapStr = a.gaps.length ? `${a.gaps.length}(${Math.max(...a.gaps)}m)` : '0';
  console.log(`${r.id} | ${String(a.stitchedKm).padStart(8)} | ${String(a.publishedKm ?? '-').padStart(5)} | ${String(a.deltaPct ?? '-').padStart(5)} | ${gapStr.padStart(4)} | ${String(a.maxOffRouteM ?? '-').padStart(6)} | ${a.monotonic === false ? 'NO!' : (a.monotonic ? 'ok' : '-')}`);
}
console.log('\nDerived waypoints:');
for (const [id, d] of Object.entries(audit.derived)) console.log(`  ${id}: ${d.FAILED ? 'FAILED ' + JSON.stringify(d) : `${d.lat},${d.lon} [${d.confidence}] ${d.how}`}`);
console.log('\nVia milestones attached:');
for (const v of audit.via.attached) console.log(`  ${v.wp} -> ${v.segment} @ ${v.atKm} km (${v.offM} m off)`);
if (audit.via.nearMisses.length) {
  console.log('Via near-misses (80–300 m — left unattached):');
  for (const v of audit.via.nearMisses) console.log(`  ${v.wp} ~ ${v.segment} @ ${v.atKm} km (${v.offM} m off)`);
}
console.log('\nȘaua Ciobanilor decision:', JSON.stringify(audit.decisions['saua-ciobanilor']));
if (audit.crossChecks.length) { console.log('\nShared-segment cross-check deltas:'); for (const c of audit.crossChecks) console.log(' ', JSON.stringify(c)); }
