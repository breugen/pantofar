# Rarău database — build report & validation checklist

Updated 2026-07-24, after the geometry + DEM + time-computation build. [`rarau.json`](rarau.json) is now a complete computable graph; everything remains `status: "extracted"` until human validation flips facts to `validated`.

## Current state

| | |
|---|---|
| Waypoints | **54**, all with coordinates (1 estimated: `punct-salvamont`) |
| Segments | **51** — 47 with distance + elevation profile + **times in both directions**; 4 town-access links pending measurement |
| Routes | **23** (16MN03–25) — 23 published durations, **21 computed reverse durations** (16MN20 = circuit, 16MN03 = pilot portion only) |
| Geometry | 23 route polylines + 47 segment slices under [`geometry/`](geometry/), 3 701 DEM samples cached |

## Build pipeline (rerunnable)

```
node data/tools/01-fetch-geometry.js   # Overpass: 23 relations (out geom) + protected areas
node data/tools/02-topology.js         # stitch, orient, derive junctions, cut slices, audit
node data/tools/03-sample-dem.js       # SRTM 30m @60 m spacing (cached in dem-cache.json)
node data/tools/04-compute-times.js    # DIN 33466 calibrated, both directions + route reverses
node data/tools/validate.js            # referential integrity
```
`02b-refine.js` was a one-shot structural fix (trailheads, splits, access segments) — already applied, guarded against re-runs. Overpass requires the identifying User-Agent the scripts send.

## Time computation & calibration

DIN 33466 (4 km/h horizontal; 300 m/h up, 500 m/h down; larger + half the smaller) on each segment's DEM profile, then calibrated against the 20 usable published route totals: **median factor 1.06** (range 0.85–1.99). Excluded from calibration: 16MN03 (published time covers the full 58 km, beyond the pilot cut), 16MN20 (chained scramble — formula doesn't apply; segment keeps the published 2:00), 16MN16 (facts from search snippets only).

Residuals after calibration: 15 of 20 routes within ±20 %; 16MN17 and 16MN19 land at 0 %/−1 %. The big negative residuals are all **padding artifacts in the published numbers**, not model errors: 16MN21/22 ("1:00" for 30–40 min walks) and 16MN15 (3:00 listed for a 2:00 valley stroll, range 1:00–3:00).

**App policy recommendation:** display the published (official, generous) duration where one exists; use computed segment times only for itinerary arithmetic, and apply the pantofar comfort factor (×1.25–1.5, then round up) at generation time — it is deliberately *not* baked into the stored values. Computed values carry `method: din33466-calibrated`, `confidence: medium` and stay flagged until validated.

Known bias: SRTM measures canopy in forest; per-segment ascent runs ~5 % under the published figures. The calibration factor absorbs the average effect.

## Topology resolved by geometry (field-confirm when convenient)

1. **Șaua Ciobanilor settled**: the hotel-side OSM node projects at **0 m onto all four converging routes** (03/18/19/24). The southern namesake (1 362 m) is also genuine — it sits on the BR ridge 22 m off 16MN03 — kept as `saua-ciobanilor-sud`.
2. **16MN23 ends exactly on 16MN19** (0 m) at 47.4523, 25.5931, just N of Popii Rarăului → 19 was split there (`s46`), so Slătioara→hotel via 23+19 is now routable.
3. **16MN18's branch off 16MN17** found at 0 m (47.4960, 25.5804) → 17 split (`s47`).
4. **13×14 junction exact** (0 m). Vf. Obcina Flocească itself is 336 m off-route — now a standalone POI, `junction-13x14` carries the graph.
5. **Muntele Todirescu** = the point where 16MN24 meets the BR ridge (47.4437, 25.6059); the Poiana Todirescu meadow (OSM grassland) is centred ~600 m E. Elevation 1487 still unsourced.
6. **Poiana Ciungi** = the 03×04 junction (47.4285, 25.4690; 51 overlap points <40 m). Whether the *toponym* sits exactly there needs a map/field check.
7. **Codrul Secular entry** from the reserve polygon (way/180206581); **Cheile Moara Dracului** from the OSM gorge feature (37 m off route).
8. **Real trailheads added** (village/station anchors were 1.5–2.7 km off): str. Sirenei (393 m from gara Câmpulung), capătul str. Valea Seacă (shared by 15/16 — their gpx starts differ by 225 m), confluența Ursului/Ion in Slătioara (23/24 start identically), Chiril km 2.8 on DJ175A. Town-access segments `s48–s51` link stations/villages to them.
9. **Surprise on 16MN03**: the gpx's NW end (47.4640, 25.3477) is ~6 km SE of the actual Pasul Mestecăniș on DN17, despite the route's name — the published 58.05 km matches the gpx, so the discrepancy is in the naming. To clarify before ever showing that endpoint.
10. Stitched vs published lengths agree within ±2.7 % everywhere except 16MN14 (+5 %, three ≤59 m gaps in OSM) and the 16MN20 loop (+12 %, loop+spur stitched imperfectly — its geometry is illustrative only).

## Remaining validation, in priority order

**P1 — access (decides itinerary feasibility)**
- Bus service to Chiril, Rusca, Zugreni, Slătioara, Gemenea: exists? schedule? This gates every southern trailhead.
- Confirm CFR stops (Câmpulung Est, halta Valea Putnei) in the current Mersul Trenurilor.
- Measure the town-walk access segments `s48/s49/s50` (only s51 has a sourced 2.8 km); confirm trailhead signage on the ground.

**P1 — times**
- Spot-check 2–3 computed reverse durations on real descents (e.g. hotel→Câmpulung on 14: computed 5:20; hotel→Sihăstria→CM Est on 17: computed 4:00).
- Confirm the comfort-factor policy above.

**P2 — placements**
- `punct-salvamont` is almost coincident with Cabana Pastorală (`s42` = 0.02 km!) — locate the real Salvamont post; merge or move.
- Re-extract 16MN16 from its page (facts currently from snippets; ascent/descent missing); Bodea peak is 797 m off route 16's line, so the s32/s33 boundary is approximate.
- 16MN21/22 anchors sit 140/191 m off their polylines (start-curve below hotel; CA-circuit signpost) — fine for the graph, worth noting in trail descriptions.

**P3 — safety flags to carry into the app** (already encoded)
16MN15 nerecomandat de Salvamont (excluded from generation); 16MN20 dificil + chains, published-time-only; Giumalău summit dangerous in winter (orange winter variant exists); faded markings on 08/09/11/13/25; Cabana Giumalău ~30 bunks, no meals (04-page ambiguity to clarify); Cabana Zugreni closed; Transrarău plowed year-round (winter access asset); reserves: stay-on-path rules to add officially.

## What the data now supports (illustrative, pre-validation)

Two-day train-based circuit, no car: CM Est →16MN17→ Hotel Rarău (publ. 5:00) → evening summit 16MN21 (40′ up / 30′ down computed) → overnight → Pietrele Doamnei circuit (2:00 publ.) → descend 16MN14 to Câmpulung (computed 5:20). Both directions of every leg now have numbers; generation can begin once P1 validation lands.
