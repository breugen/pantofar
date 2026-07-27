#!/usr/bin/env node
// Stage 2b (one-shot structural refinement after the first topology audit):
//  - real trailhead waypoints where village/station anchors sit far off the route start
//  - access segments linking transport anchors to trailheads
//  - split s35 (at the 16MN18 branch) and s39 (at the 16MN23 junction)
//  - derive the true 16MN13×16MN14 junction (Flocească peak is off-route)
// Idempotent: exits if already applied. Rerun 02-topology.js afterwards to recut slices.
const path = require('path');
const { haversineM, projectOnPolyline, dataDir, geomDir, readJSON, writeJSON } = require('./lib');

const db = readJSON(path.join(dataDir, 'rarau.json'));
if (db.waypoints.some(w => w.id === 'th-slatioara')) { console.log('already applied — nothing to do'); process.exit(0); }

const routeLine = id => readJSON(path.join(geomDir, 'routes', `${id}.json`)).points.map(([lat, lon]) => ({ lat, lon }));
const wp = Object.fromEntries(db.waypoints.map(w => [w.id, w]));
const seg = Object.fromEntries(db.segments.map(s => [s.id, s]));
const route = Object.fromEntries(db.routes.map(r => [r.id, r]));

const mkWp = (id, name, type, pt, how, notes) => {
  const w = { id, type, name: { ro: name }, lat: +pt.lat.toFixed(7), lon: +pt.lon.toFixed(7), coords: { sources: ['osm-geometry'], status: 'extracted', confidence: 'high', derivedBy: how } };
  if (notes) w.notes = { ro: notes };
  db.waypoints.push(w);
  wp[id] = w;
  return w;
};

// ---- trailheads ----------------------------------------------------------------
const l14 = routeLine('16MN14'), l15 = routeLine('16MN15'), l16 = routeLine('16MN16'), l23 = routeLine('16MN23'), l24 = routeLine('16MN24'), l25 = routeLine('16MN25');

mkWp('th-campulung-sirenei', 'Câmpulung Moldovenesc — intrarea traseului BA (str. Sirenei / Pârâul Mesteacăn)', 'trailhead', l14[0], 'capătul poliliniei 16MN14', 'Startul real al 16MN14, în oraș.');
console.log('th-campulung-sirenei — dist gara-campulung:', Math.round(haversineM(l14[0], wp['gara-campulung'])), 'm');

const dSeaca = Math.round(haversineM(l15[0], l16[0]));
console.log('16MN15 vs 16MN16 start distance:', dSeaca, 'm');
mkWp('th-campulung-valea-seaca', 'Câmpulung Moldovenesc — capătul străzii Valea Seacă', 'trailhead', l16[0], 'capătul poliliniei 16MN16', 'Start comun 16MN15/16MN16 (dacă distanța dintre capete confirmă).');

const dSlat = Math.round(haversineM(l23[0], l24[0]));
console.log('16MN23 vs 16MN24 start distance:', dSlat, 'm');
mkWp('th-slatioara', 'Slătioara — confluența Pârâul Ursului / Pârâul lui Ion', 'trailhead', l24[0], 'capătul poliliniei 16MN24', 'Start comun 16MN23/16MN24, în capătul vestic al satului.');

mkWp('th-chiril-dj175a', 'Chiril — intrarea traseului PG (km 2,8 pe DJ175A)', 'trailhead', l25[0], 'capătul poliliniei 16MN25', null);

const retarget = (rid, newFrom, firstSeg) => {
  const r = route[rid];
  r.from = newFrom;
  r.waypointSequence[0] = newFrom;
  seg[firstSeg].from = newFrom;
};
retarget('16MN14', 'th-campulung-sirenei', 's28');
retarget('16MN15', 'th-campulung-valea-seaca', 's31');
retarget('16MN16', 'th-campulung-valea-seaca', 's32');
retarget('16MN23', 'th-slatioara', 's25');
retarget('16MN24', 'th-slatioara', 's26');
retarget('16MN25', 'th-chiril-dj175a', 's23');

// ---- access segments -----------------------------------------------------------
const mkAccess = (id, from, to, dist, note) => {
  const s = { id, kind: 'access', from, to, routes: [], notes: { ro: note }, timeMinutes: { forward: null, backward: null, status: 'to-compute', method: 'walk-estimate-pending' } };
  s.distanceKm = dist != null ? { value: dist, sources: ['mn-16MN25'], status: 'extracted' } : { value: null, sources: [], status: 'missing', note: `în linie dreaptă ~${(haversineM(wp[from], wp[to]) / 1000).toFixed(1)} km — distanța reală pe străzi de măsurat` };
  db.segments.push(s);
  seg[id] = s;
};
mkAccess('s48', 'gara-campulung', 'th-campulung-sirenei', null, 'Legătură prin oraș până la intrarea traseului BA.');
mkAccess('s49', 'gara-campulung-est', 'th-campulung-valea-seaca', null, 'Legătură prin oraș (str. Rândunicii / Valea Seacă).');
mkAccess('s50', 'sat-slatioara', 'th-slatioara', null, 'Prin sat, spre capătul vestic.');
mkAccess('s51', 'sat-chiril', 'th-chiril-dj175a', 2.8, 'Pe DJ175A Transrarău, 2,8 km de la DN17B (sursă: pagina 16MN25).');

// ---- split s35 at the 16MN18 branch -------------------------------------------
seg['s35'].to = 'junction-17pr-limpedea';
seg['s35'].variantNote = 'pe Valea Izvorul Alb (fostul drum auto), până la desprinderea traseului CG';
db.segments.push({ id: 's47', from: 'junction-17pr-limpedea', to: 'man-sihastria', routes: ['16MN17'], variantNote: 'continuarea pe Izvorul Alb, pe la Piatra Buhei, până la mănăstire', timeMinutes: { forward: null, backward: null, status: 'to-compute', method: 'din33466-calibrated-pending' } });
route['16MN17'].waypointSequence = ['gara-campulung-est', 'junction-17pr-limpedea', 'man-sihastria', 'hotel-rarau'];
route['16MN17'].segments = ['s35', 's47', 's36'];

// ---- split s39 at the 16MN23 junction -----------------------------------------
seg['s39'].to = 'junction-23x19';
db.segments.push({ id: 's46', from: 'junction-23x19', to: 'popii-raraului', routes: ['16MN19'], timeMinutes: { forward: null, backward: null, status: 'to-compute', method: 'din33466-calibrated-pending' } });
route['16MN19'].waypointSequence = ['dn17-valea-caselor', 'cheile-moara-dracului', 'junction-23x19', 'popii-raraului', 'saua-ciobanilor', 'hotel-rarau'];
route['16MN19'].segments = ['s38', 's39', 's46', 's40', 's05'];

// ---- true 16MN13 × 16MN14 junction --------------------------------------------
const l13 = routeLine('16MN13');
const end13 = l13[l13.length - 1];
const pr = projectOnPolyline(l14, end13);
console.log('16MN13 end → 16MN14 line:', Math.round(pr.distM), 'm');
if (pr.distM < 150) {
  mkWp('junction-13x14', 'Joncțiunea traseelor PR (Pojorâta) și BA (Munceii Rarăului)', 'junction', pr.point, `capătul 16MN13 proiectat pe 16MN14 (dist ${Math.round(pr.distM)} m)`, 'Lângă Vf. Obcina Flocească; vârful propriu-zis rămâne reper separat.');
  route['16MN13'].to = 'junction-13x14';
  route['16MN13'].waypointSequence = ['sat-pojorata', 'junction-13x14'];
  seg['s30'].to = 'junction-13x14';
  route['16MN14'].waypointSequence = ['th-campulung-sirenei', 'junction-13x14', 'hotel-rarau'];
  seg['s28'].to = 'junction-13x14';
  seg['s29'].from = 'junction-13x14';
  wp['obcina-floceasca'].issues = ['Vârful e la ~' + Math.round(haversineM(end13, wp['obcina-floceasca'])) + ' m de capătul 16MN13; joncțiunea reală 13×14 e waypoint separat (junction-13x14).'];
} else {
  console.log('  distanță prea mare — joncțiunea 13×14 rămâne nerezolvată');
  route['16MN13'].issues = (route['16MN13'].issues || []).concat([`Capătul 16MN13 e la ${Math.round(pr.distM)} m de linia 16MN14 — legătura reală de clarificat.`]);
}

// ---- refreshed issue texts on resolved waypoints ------------------------------
wp['pasul-mestecanis'].issues = ['Capătul NV al gpx-ului MN e la ~6 km SE de pasul Mestecăniș propriu-zis (DN17). Numele traseului sugerează pasul; punctul real de start de clarificat.'];
wp['pasul-mestecanis'].coords.confidence = 'medium';
wp['poiana-ciungi'].issues = ['Coordonata = joncțiunea geometrică 16MN03×16MN04 (51 puncte de suprapunere). Dacă toponimul «Poiana Ciungilor» e exact aici — de confirmat pe teren.'];
wp['muntele-todirescu'].issues = ['Coordonata = punctul unde 16MN24 întâlnește magistrala BR. Poiana Todirescu (OSM way/1372004332, pajiște) e centrată la ~600 m E. Altitudinea 1487 rămâne nesursată.'];
wp['junction-23x19'].issues = ['Rezolvat geometric: capătul 16MN23 e chiar pe 16MN19 (dist 0 m), la N de Popii Rarăului. De confirmat indicatorul pe teren.'];
wp['cheile-moara-dracului'].issues = ['Poziționat pe elementul OSM al cheilor, proiectat pe traseu (37 m).'];

writeJSON(path.join(dataDir, 'rarau.json'), db);
console.log('\nrefine applied: +' + 5 + ' waypoints, +6 segments (2 splits, 4 access), retargeted 6 routes');
console.log('ACUM rulează din nou: node data/tools/02-topology.js (recut cu noua structură)');
