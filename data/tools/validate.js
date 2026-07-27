#!/usr/bin/env node
/**
 * Integrity checker for data/rarau.json (and future region files).
 * Usage: node data/tools/validate.js [path-to-json]
 * Exits non-zero on structural errors; warnings are informational.
 */
const fs = require('fs');
const path = require('path');

const file = process.argv[2] || path.join(__dirname, '..', 'rarau.json');
const db = JSON.parse(fs.readFileSync(file, 'utf8'));

const errors = [];
const warnings = [];

const wpIds = new Set();
for (const wp of db.waypoints) {
  if (wpIds.has(wp.id)) errors.push(`duplicate waypoint id: ${wp.id}`);
  wpIds.add(wp.id);
  const hasCoords = typeof wp.lat === 'number' && typeof wp.lon === 'number';
  if (hasCoords && wp.coords.status === 'missing') errors.push(`${wp.id}: has coords but status=missing`);
  if (!hasCoords && wp.coords.status !== 'missing') errors.push(`${wp.id}: lacks coords but status=${wp.coords.status}`);
  if (!hasCoords) warnings.push(`waypoint without coords: ${wp.id}`);
}

const segIds = new Set();
const segById = {};
for (const s of db.segments) {
  if (segIds.has(s.id)) errors.push(`duplicate segment id: ${s.id}`);
  segIds.add(s.id);
  segById[s.id] = s;
  for (const end of ['from', 'to']) {
    if (!wpIds.has(s[end])) errors.push(`segment ${s.id}: unknown ${end} waypoint '${s[end]}'`);
  }
  for (const v of s.via || []) {
    if (!wpIds.has(v.wp)) errors.push(`segment ${s.id}: unknown via waypoint '${v.wp}'`);
    if (v.wp === s.from || v.wp === s.to) errors.push(`segment ${s.id}: via '${v.wp}' duplicates an endpoint`);
    if (typeof v.atKm !== 'number') errors.push(`segment ${s.id}: via '${v.wp}' lacks atKm`);
  }
}

const routeIds = new Set();
for (const r of db.routes) {
  if (routeIds.has(r.id)) errors.push(`duplicate route id: ${r.id}`);
  routeIds.add(r.id);
  for (const end of ['from', 'to']) {
    if (!wpIds.has(r[end])) errors.push(`route ${r.id}: unknown ${end} waypoint '${r[end]}'`);
  }
  for (const w of r.waypointSequence) {
    if (!wpIds.has(w)) errors.push(`route ${r.id}: unknown waypoint in sequence '${w}'`);
  }
  if (r.waypointSequence[0] !== r.from) errors.push(`route ${r.id}: sequence does not start at 'from'`);
  if (r.waypointSequence[r.waypointSequence.length - 1] !== r.to) errors.push(`route ${r.id}: sequence does not end at 'to'`);

  // Segment chain must connect from -> to, orientation-agnostic.
  let at = r.from;
  for (const sid of r.segments) {
    const s = segById[sid];
    if (!s) { errors.push(`route ${r.id}: unknown segment '${sid}'`); at = null; break; }
    if (s.roundtrip) { if (s.from !== at) errors.push(`route ${r.id}: roundtrip segment ${sid} does not start at ${at}`); continue; }
    if (s.from === at) at = s.to;
    else if (s.to === at) at = s.from;
    else { errors.push(`route ${r.id}: segment ${sid} (${s.from}–${s.to}) does not connect at ${at}`); at = null; break; }
  }
  if (at !== null && at !== r.to) errors.push(`route ${r.id}: segment chain ends at ${at}, expected ${r.to}`);

  // Back-references: every segment listing this route must be in the route's list and vice versa.
  for (const sid of r.segments) {
    const s = segById[sid];
    if (s && !s.routes.includes(r.id)) errors.push(`segment ${sid} missing back-reference to route ${r.id}`);
  }
}
for (const s of db.segments) {
  for (const rid of s.routes) {
    if (!routeIds.has(rid)) errors.push(`segment ${s.id}: unknown route '${rid}'`);
    else {
      const r = db.routes.find(x => x.id === rid);
      if (!r.segments.includes(s.id)) errors.push(`route ${rid} does not list segment ${s.id} which claims it`);
    }
  }
}

// Source references must exist.
const srcIds = new Set(Object.keys(db.sources));
const checkSources = (obj, where) => {
  if (obj && Array.isArray(obj.sources)) {
    for (const s of obj.sources) if (!srcIds.has(s)) errors.push(`${where}: unknown source '${s}'`);
  }
};
for (const wp of db.waypoints) { checkSources(wp.coords, `waypoint ${wp.id}.coords`); checkSources(wp.ele, `waypoint ${wp.id}.ele`); }
for (const r of db.routes) {
  for (const k of ['blaze', 'distanceKm', 'durationListed', 'ascentM', 'descentM', 'maxElevationM', 'difficulty', 'winter', 'water', 'lodging', 'access', 'safety']) {
    checkSources(r[k], `route ${r.id}.${k}`);
  }
}

// Stats.
const validated = db.routes.filter(r => r.status === 'validated').length;
const noCoords = db.waypoints.filter(w => w.coords.status === 'missing').length;
const approx = db.waypoints.filter(w => (w.coords.sources || []).includes('claude-estimate')).length;
const withDuration = db.routes.filter(r => r.durationListed && r.durationListed.minutes).length;

const segTimed = db.segments.filter(s => s.timeMinutes && s.timeMinutes.forward != null).length;
const revDur = db.routes.filter(r => r.durationReverse && r.durationReverse.minutes != null).length;
console.log(`waypoints: ${db.waypoints.length} (missing coords: ${noCoords}, estimated coords: ${approx})`);
console.log(`segments:  ${db.segments.length} (with times: ${segTimed}, pending: ${db.segments.length - segTimed})`);
console.log(`routes:    ${db.routes.length} (published duration: ${withDuration}, reverse duration: ${revDur}, validated: ${validated})`);
console.log('');
for (const w of warnings) console.log(`WARN  ${w}`);
if (errors.length) {
  for (const e of errors) console.log(`ERROR ${e}`);
  process.exit(1);
}
console.log('OK — referential integrity checks passed.');
