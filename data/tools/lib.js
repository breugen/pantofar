// Shared geometry helpers for the Rarău DB build scripts. Plain CommonJS, no deps.
const fs = require('fs');
const path = require('path');

const R = 6371000;
const rad = d => d * Math.PI / 180;

function haversineM(a, b) {
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function polyLengthM(pts) {
  let m = 0;
  for (let i = 1; i < pts.length; i++) m += haversineM(pts[i - 1], pts[i]);
  return m;
}

// Equirectangular local projection around a reference latitude — good enough at trail scale.
function toXY(pt, refLat) {
  const k = Math.cos(rad(refLat));
  return { x: rad(pt.lon) * R * k, y: rad(pt.lat) * R };
}

// Closest point on polyline to pt: returns cumulative distance along line (m),
// perpendicular distance (m), and the interpolated point.
function projectOnPolyline(pts, pt) {
  const refLat = pt.lat;
  const P = toXY(pt, refLat);
  let best = { alongM: 0, distM: Infinity, point: pts[0] };
  let cum = 0;
  for (let i = 1; i < pts.length; i++) {
    const A = toXY(pts[i - 1], refLat), B = toXY(pts[i], refLat);
    const abx = B.x - A.x, aby = B.y - A.y;
    const len2 = abx * abx + aby * aby;
    let t = len2 === 0 ? 0 : ((P.x - A.x) * abx + (P.y - A.y) * aby) / len2;
    t = Math.max(0, Math.min(1, t));
    const proj = { x: A.x + t * abx, y: A.y + t * aby };
    const d = Math.hypot(P.x - proj.x, P.y - proj.y);
    if (d < best.distM) {
      const segLen = haversineM(pts[i - 1], pts[i]);
      best = {
        distM: d,
        alongM: cum + t * segLen,
        point: {
          lat: pts[i - 1].lat + t * (pts[i].lat - pts[i - 1].lat),
          lon: pts[i - 1].lon + t * (pts[i].lon - pts[i - 1].lon)
        }
      };
    }
    cum += haversineM(pts[i - 1], pts[i]);
  }
  return best;
}

// Slice polyline between cumulative distances d0..d1 (m), interpolating end points.
function slicePolyline(pts, d0, d1) {
  if (d1 < d0) [d0, d1] = [d1, d0];
  const out = [];
  let cum = 0;
  const lerp = (a, b, t) => ({ lat: a.lat + t * (b.lat - a.lat), lon: a.lon + t * (b.lon - a.lon) });
  for (let i = 1; i < pts.length; i++) {
    const L = haversineM(pts[i - 1], pts[i]);
    const s0 = cum, s1 = cum + L;
    if (s1 >= d0 && s0 <= d1 && L > 0) {
      const t0 = Math.max(0, (d0 - s0) / L), t1 = Math.min(1, (d1 - s0) / L);
      const p0 = lerp(pts[i - 1], pts[i], t0);
      if (out.length === 0) out.push(p0);
      out.push(lerp(pts[i - 1], pts[i], t1));
    }
    cum = s1;
    if (cum > d1 && out.length) break;
  }
  return out;
}

// Resample polyline at ~stepM spacing (keeps first/last).
function resample(pts, stepM) {
  const out = [pts[0]];
  let carry = 0;
  for (let i = 1; i < pts.length; i++) {
    let a = pts[i - 1];
    const b = pts[i];
    let L = haversineM(a, b);
    while (carry + L >= stepM) {
      const t = (stepM - carry) / L;
      const p = { lat: a.lat + t * (b.lat - a.lat), lon: a.lon + t * (b.lon - a.lon) };
      out.push(p);
      L -= (stepM - carry);
      a = p;
      carry = 0;
    }
    carry += L;
  }
  const last = pts[pts.length - 1];
  const tail = out[out.length - 1];
  if (haversineM(tail, last) > 1) out.push(last);
  return out;
}

// Stitch relation member ways (arrays of {lat,lon}) into one polyline.
// Exact endpoint matches first; falls back to nearest-endpoint joins, recording gaps.
function stitchWays(ways) {
  const eq = (a, b) => Math.abs(a.lat - b.lat) < 1e-6 && Math.abs(a.lon - b.lon) < 1e-6;
  const unused = ways.map(w => w.slice()).filter(w => w.length > 1);
  const chains = [];
  while (unused.length) {
    let chain = unused.shift();
    let grew = true;
    while (grew) {
      grew = false;
      for (let i = 0; i < unused.length; i++) {
        const w = unused[i];
        const head = chain[0], tail = chain[chain.length - 1];
        if (eq(w[0], tail)) { chain = chain.concat(w.slice(1)); }
        else if (eq(w[w.length - 1], tail)) { chain = chain.concat(w.slice(0, -1).reverse()); }
        else if (eq(w[w.length - 1], head)) { chain = w.slice(0, -1).concat(chain); }
        else if (eq(w[0], head)) { chain = w.slice(1).reverse().concat(chain); }
        else continue;
        unused.splice(i, 1);
        grew = true;
        break;
      }
    }
    chains.push(chain);
  }
  // Join remaining chains by nearest endpoints.
  const gaps = [];
  while (chains.length > 1) {
    let best = null;
    for (let i = 1; i < chains.length; i++) {
      const a = chains[0], b = chains[i];
      const combos = [
        { d: haversineM(a[a.length - 1], b[0]), mode: 'tail-head', i },
        { d: haversineM(a[a.length - 1], b[b.length - 1]), mode: 'tail-tail', i },
        { d: haversineM(a[0], b[0]), mode: 'head-head', i },
        { d: haversineM(a[0], b[b.length - 1]), mode: 'head-tail', i }
      ];
      for (const c of combos) if (!best || c.d < best.d) best = c;
    }
    const b = chains.splice(best.i, 1)[0];
    gaps.push(Math.round(best.d));
    if (best.mode === 'tail-head') chains[0] = chains[0].concat(b);
    else if (best.mode === 'tail-tail') chains[0] = chains[0].concat(b.slice().reverse());
    else if (best.mode === 'head-head') chains[0] = b.slice().reverse().concat(chains[0]);
    else chains[0] = b.concat(chains[0]);
  }
  return { points: chains[0] || [], gaps };
}

// Point-in-polygon (ray casting) for protected-area membership tests.
function pointInPolygon(pt, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].lon, yi = poly[i].lat, xj = poly[j].lon, yj = poly[j].lat;
    if (((yi > pt.lat) !== (yj > pt.lat)) && (pt.lon < (xj - xi) * (pt.lat - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}

const dataDir = path.join(__dirname, '..');
const geomDir = path.join(dataDir, 'geometry');
const readJSON = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const writeJSON = (f, obj, pretty = 2) => {
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify(obj, null, pretty) + '\n', 'utf8');
};

module.exports = { haversineM, polyLengthM, projectOnPolyline, slicePolyline, resample, stitchWays, pointInPolygon, dataDir, geomDir, readJSON, writeJSON };
