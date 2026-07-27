#!/usr/bin/env node
// Stage 1: fetch full geometry of the 23 route relations + nearby protected areas from Overpass.
// Output: data/geometry/raw-relations.json, data/geometry/raw-areas.json
const path = require('path');
const { geomDir, writeJSON } = require('./lib');

const MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter'
];

const REL_IDS = [9709967, 9718294, 9718349, 9718400, 9718505, 9718525, 9718542, 9718593, 9718621, 9718640, 9719020, 9719114, 9719142, 9721233, 9721291, 9721386, 9721697, 9721771, 9721966, 9721968, 9721969, 9722071, 9722208];

async function overpass(query) {
  let lastErr;
  for (const url of MIRRORS) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
            'User-Agent': 'PrieteniiMuntelui-trail-db-build/0.1 (non-commercial hiking DB; contact: ebreaur@gmail.com)'
          },
          body: 'data=' + encodeURIComponent(query),
          signal: AbortSignal.timeout(240000)
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } catch (e) {
        lastErr = e;
        console.error(`  ${url} attempt ${attempt}: ${e.message}`);
        await new Promise(r => setTimeout(r, 5000));
      }
    }
  }
  throw lastErr;
}

(async () => {
  console.log(`Fetching geometry for ${REL_IDS.length} relations...`);
  const rels = await overpass(`[out:json][timeout:180];rel(id:${REL_IDS.join(',')});out geom;`);
  const got = (rels.elements || []).filter(e => e.type === 'relation');
  writeJSON(path.join(geomDir, 'raw-relations.json'), rels, 0);
  console.log(`  got ${got.length}/${REL_IDS.length} relations, ${got.reduce((n, r) => n + r.members.length, 0)} members`);
  const missing = REL_IDS.filter(id => !got.some(r => r.id === id));
  if (missing.length) console.log(`  MISSING: ${missing.join(', ')}`);

  console.log('Fetching protected areas...');
  const areas = await overpass(`[out:json][timeout:120];(wr["boundary"="protected_area"](47.36,25.35,47.57,25.75);wr["leisure"="nature_reserve"](47.36,25.35,47.57,25.75););out geom;`);
  writeJSON(path.join(geomDir, 'raw-areas.json'), areas, 0);
  const names = (areas.elements || []).map(e => `${e.type}/${e.id} ${(e.tags && e.tags.name) || '(unnamed)'}`);
  console.log(`  got ${names.length} area elements:`);
  for (const n of names) console.log(`    ${n}`);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
