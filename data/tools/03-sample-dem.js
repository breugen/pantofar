#!/usr/bin/env node
// Stage 3: sample SRTM 30m elevations along every segment slice (60 m spacing),
// compute smoothed ascent/descent per direction. Cached; polite to the public API.
// Output: data/geometry/profiles.json (+ dem-cache.json)
const path = require('path');
const fs = require('fs');
const { resample, polyLengthM, geomDir, readJSON, writeJSON } = require('./lib');

const dataDir = path.join(__dirname, '..');
const db = readJSON(path.join(dataDir, 'rarau.json'));
const cacheFile = path.join(geomDir, 'dem-cache.json');
let cache = {};
try { cache = readJSON(cacheFile); } catch {}

const key = p => `${p.lat.toFixed(5)},${p.lon.toFixed(5)}`;
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchBatch(points) {
  const locs = points.map(p => `${p.lat.toFixed(5)},${p.lon.toFixed(5)}`).join('|');
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch('https://api.opentopodata.org/v1/srtm30m', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'PrieteniiMuntelui-trail-db-build/0.1 (contact: ebreaur@gmail.com)' },
        body: JSON.stringify({ locations: locs }),
        signal: AbortSignal.timeout(60000)
      });
      if (res.status === 429) throw new Error('429');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      if (j.status !== 'OK') throw new Error(j.error || 'API error');
      return j.results.map(r => r.elevation);
    } catch (e) {
      console.error(`  batch retry ${attempt}: ${e.message}`);
      await sleep(3000 * attempt);
    }
  }
  throw new Error('DEM batch failed after retries');
}

function ascentDescent(eles) {
  // median-of-3 smoothing, then 5 m hysteresis accumulation
  const sm = eles.map((e, i) => {
    if (i === 0 || i === eles.length - 1) return e;
    return [eles[i - 1], e, eles[i + 1]].sort((a, b) => a - b)[1];
  });
  let up = 0, down = 0, ref = sm[0];
  for (const e of sm) {
    const d = e - ref;
    if (d >= 5) { up += d; ref = e; }
    else if (d <= -5) { down -= d; ref = e; }
  }
  return { up: Math.round(up), down: Math.round(down) };
}

(async () => {
  const segs = db.segments.filter(s => s.geometryFile);
  const perSeg = {};
  const need = [];
  for (const s of segs) {
    const g = readJSON(path.join(dataDir, s.geometryFile));
    const pts = g.points.map(([lat, lon]) => ({ lat, lon }));
    const samples = pts.length >= 2 ? resample(pts, 60) : pts;
    perSeg[s.id] = { samples, distKm: g.lengthKm };
    for (const p of samples) if (!(key(p) in cache)) need.push(p);
  }
  console.log(`${segs.length} segments, ${Object.values(perSeg).reduce((n, x) => n + x.samples.length, 0)} samples, ${need.length} to fetch`);

  for (let i = 0; i < need.length; i += 100) {
    const batch = need.slice(i, i + 100);
    const eles = await fetchBatch(batch);
    batch.forEach((p, j) => { cache[key(p)] = eles[j]; });
    writeJSON(cacheFile, cache, 0);
    process.stdout.write(`\r  fetched ${Math.min(i + 100, need.length)}/${need.length}`);
    await sleep(1100);
  }
  if (need.length) console.log('');

  const profiles = {};
  for (const s of segs) {
    const { samples, distKm } = perSeg[s.id];
    const eles = samples.map(p => cache[key(p)]).filter(e => e !== null && e !== undefined);
    const { up, down } = ascentDescent(eles);
    profiles[s.id] = { distKm, ascentM: up, descentM: down, nSamples: eles.length, eleStart: eles[0], eleEnd: eles[eles.length - 1], eleMax: Math.max(...eles) };
  }
  writeJSON(path.join(geomDir, 'profiles.json'), profiles);
  console.log('seg | km    | +m   | -m   | eleStart→eleEnd (max)');
  for (const [id, p] of Object.entries(profiles)) {
    console.log(`${id.padEnd(4)}| ${String(p.distKm).padStart(5)} | ${String(p.ascentM).padStart(4)} | ${String(p.descentM).padStart(4)} | ${p.eleStart}→${p.eleEnd} (${p.eleMax})`);
  }
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
