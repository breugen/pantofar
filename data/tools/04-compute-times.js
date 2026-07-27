#!/usr/bin/env node
// Stage 4: DIN 33466 times per segment (both directions), calibrated against the
// published route totals; writes times + DEM profiles into rarau.json and fills
// route durationReverse. Prints the calibration table.
const path = require('path');
const { dataDir, geomDir, readJSON, writeJSON } = require('./lib');

const db = readJSON(path.join(dataDir, 'rarau.json'));
const profiles = readJSON(path.join(geomDir, 'profiles.json'));
const seg = Object.fromEntries(db.segments.map(s => [s.id, s]));

// DIN 33466: horizontal 4 km/h; vertical 300 m/h up, 500 m/h down;
// time = larger component + half of the smaller. Returns minutes (raw, uncalibrated).
function dinMinutes(distKm, upM, downM) {
  const th = distKm / 4;
  const tv = upM / 300 + downM / 500;
  return 60 * (Math.max(th, tv) + Math.min(th, tv) / 2);
}
const rawFwd = id => { const p = profiles[id]; return dinMinutes(p.distKm, p.ascentM, p.descentM); };
const rawBwd = id => { const p = profiles[id]; return dinMinutes(p.distKm, p.descentM, p.ascentM); };

// Direction-correct raw total along a route's sequence.
function routeRaw(r, reverse = false) {
  const segsInOrder = reverse ? [...r.segments].reverse() : r.segments;
  const wseq = reverse ? [...r.waypointSequence].reverse() : r.waypointSequence;
  let total = 0, at = wseq[0];
  for (const sid of segsInOrder) {
    const s = seg[sid];
    if (!profiles[sid]) return null;
    if (s.roundtrip) { total += rawFwd(sid); continue; }
    if (s.from === at) { total += rawFwd(sid); at = s.to; }
    else if (s.to === at) { total += rawBwd(sid); at = s.from; }
    else throw new Error(`route ${r.id}: chain break at ${sid}`);
  }
  return total;
}

// ---- calibration ---------------------------------------------------------------
const EXCLUDE = new Set(['16MN03', '16MN16', '16MN20']);
const ratios = [];
console.log('route   | publ min | raw din | ratio');
for (const r of db.routes) {
  const raw = routeRaw(r);
  const publ = r.durationListed.minutes;
  const ratio = raw && publ ? publ / raw : null;
  r._raw = raw;
  if (ratio && !EXCLUDE.has(r.id)) ratios.push({ id: r.id, ratio });
  console.log(`${r.id} | ${String(publ).padStart(8)} | ${raw ? String(Math.round(raw)).padStart(7) : '      -'} | ${ratio ? ratio.toFixed(3) : '-'}${EXCLUDE.has(r.id) ? ' (excluded)' : ''}`);
}
ratios.sort((a, b) => a.ratio - b.ratio);
const median = ratios[Math.floor(ratios.length / 2)].ratio;
const factor = +median.toFixed(3);
console.log(`\ncalibration: n=${ratios.length}, min=${ratios[0].ratio.toFixed(2)} (${ratios[0].id}), max=${ratios[ratios.length - 1].ratio.toFixed(2)} (${ratios[ratios.length - 1].id}), MEDIAN=${factor}`);

const round5 = m => Math.max(5, Math.round(m / 5) * 5);

// 16MN20: the chains section makes raw DIN unreliable, so the published circuit
// total (120 min) is distributed over the three arcs proportionally to DIN effort.
const MN20_SEGS = ['s52', 's53', 's54'];
const publ20 = db.routes.find(r => r.id === '16MN20').durationListed.minutes;
const k20 = publ20 / MN20_SEGS.reduce((n, id) => n + rawFwd(id), 0);

// ---- write segment times & profiles -------------------------------------------
for (const s of db.segments) {
  const p = profiles[s.id];
  if (!p) continue; // access segments stay pending
  s.profile = { ascentM: p.ascentM, descentM: p.descentM, eleStartM: p.eleStart, eleEndM: p.eleEnd, eleMaxM: p.eleMax, sources: ['opentopodata-srtm30m'], status: 'extracted', note: 'sensul from→to; netezit cu prag 5 m; SRTM are deriva coronamentului în pădure' };
  if (MN20_SEGS.includes(s.id)) {
    s.timeMinutes = {
      forward: round5(rawFwd(s.id) * k20),
      backward: round5(rawBwd(s.id) * k20),
      status: 'computed',
      method: 'published-total-din-split',
      sources: ['mn-16MN20', 'computed-din33466'],
      confidence: 'low',
      note: 'cota-parte din durata publicată a circuitului (120 min), împărțită DIN-proporțional — porțiunea cu lanțuri face formula DIN nefiabilă aici'
    };
    continue;
  }
  s.timeMinutes = {
    forward: round5(rawFwd(s.id) * factor),
    backward: round5(rawBwd(s.id) * factor),
    status: 'computed',
    method: 'din33466-calibrated',
    calibration: factor,
    sources: ['computed-din33466'],
    confidence: 'medium'
  };
}

// ---- route reverse durations & residuals --------------------------------------
console.log('\nroute   | publ | calib fwd | resid% | reverse');
for (const r of db.routes) {
  delete r._raw;
  if (r.id === '16MN20') { console.log(`${r.id} |  120 |         - |      - | n/a (circuit)`); continue; }
  const fwd = routeRaw(r), bwd = routeRaw(r, true);
  const calibFwd = round5(fwd * factor), calibBwd = round5(bwd * factor);
  const resid = r.durationListed.minutes ? Math.round((calibFwd - r.durationListed.minutes) / r.durationListed.minutes * 100) : null;
  if (r.id === '16MN03') {
    r.durationReverse = { minutes: null, status: 'missing', note: 'traseul publicat depășește regiunea pilot; se folosesc timpii pe segmente' };
    r.durationComputedCheck = { pilotPortionForwardMinutes: calibFwd, pilotPortionReverseMinutes: calibBwd, sources: ['computed-din33466'], note: 'doar porțiunea Pasul Mestecăniș → Curmătura Prislop' };
  } else {
    r.durationReverse = { minutes: calibBwd, status: 'computed', method: 'din33466-calibrated', calibration: factor, sources: ['computed-din33466'], confidence: 'medium' };
    r.durationComputedCheck = { forwardMinutes: calibFwd, residualVsPublishedPct: resid, sources: ['computed-din33466'] };
  }
  console.log(`${r.id} | ${String(r.durationListed.minutes).padStart(4)} | ${String(calibFwd).padStart(9)} | ${String(resid ?? '-').padStart(6)} | ${calibBwd}`);
}

db.sources['opentopodata-srtm30m'] = { type: 'dem', title: 'Open Topo Data — SRTM 30m, eșantionat la 60 m de-a lungul segmentelor', url: 'https://www.opentopodata.org/', accessed: '2026-07-24', role: 'profil altimetric, urcare/coborâre pe segmente' };
db.sources['computed-din33466'] = { type: 'computed', title: `Timpi calculați DIN 33466, calibrați pe duratele publicate MN (factor median ${factor}, n=${ratios.length})`, accessed: '2026-07-24', role: 'timeMinutes pe segmente (ambele sensuri) și durationReverse pe trasee — NEVERIFICAȚI pe teren' };
writeJSON(path.join(dataDir, 'rarau.json'), db);
console.log('\nrarau.json updated.');
