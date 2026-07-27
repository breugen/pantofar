# Region DB build pipeline

Builds a mountain-region trail database (`data/<region>.json`) as a **graph**:
waypoints (nodes where marked routes meet, plus milestones/POIs), segments
(edges with distance, elevation profile and walking time **per direction**),
and official routes as a metadata overlay referencing segments. The app plans
circuits and traverses over this graph; it never ships "static" trails.

## Run order

```
node data/tools/01-fetch-geometry.js   # Overpass 'out geom' for all route relations (network; identifying User-Agent required or you get 406/429)
node data/tools/02-topology.js         # stitch + orient polylines, derive junction coords, cut segment slices, attach via milestones, write distances back
node data/tools/03-sample-dem.js       # SRTM30m via opentopodata @60 m spacing (network; cached in geometry/dem-cache.json, ~1 batch of 100 pts / 1.1 s)
node data/tools/04-compute-times.js    # DIN 33466 both directions, calibrated by median(published/raw) per region; fills route reverse durations
node data/tools/validate.js            # referential integrity (exit 1 on errors)
node data/tools/graph-audit.js         # graph shape: node roles, orphans, components, parallel edges, chains, time asymmetry
node data/tools/sync-app-data.js       # copy the JSON into app/public (also runs on app prestart/prebuild)
```

02→03→04 are idempotent — re-run all three after any topology change
(splits, new waypoints in a `waypointSequence`), then validate + audit.
One-off migrations are throwaway scripts that edit the JSON once; the
pipeline re-derives everything derivable afterwards.

## Input the tools expect (hand-authored skeleton)

- `waypoints`: every graph node and POI. A point where ≥2 marked routes meet
  MUST be a waypoint so segments can be cut there. New junction waypoints
  referenced in a `waypointSequence` need at least provisional coords before
  02 runs (orientation happens before derivation).
- `segments`: `from`/`to` + `routes` back-refs. `kind: "access"` for
  town/parking connectors (no geometry; times estimated at runtime, or fixed
  `method: micro-access` 1-min for tens-of-meters links). ids `sNN`, never reused.
- `routes`: `osmRelation`, `waypointSequence` (defines the cuts, must be
  monotonic along the polyline — the audit table shows this), `segments`
  chain, published facts as `{value, sources[], status}`.
- `via` on segments is **tool-owned** (02 §4b rebuilds it every run):
  spring/sight/saddle/peak/poi waypoints ≤80 m from a slice get
  `{wp, atKm, offM}`; 80–300 m are reported as near-misses, left off.

## Region-specific code to adapt for a new massif

- **02-topology.js**: the explicit derivation blocks (which route ends define
  which junctions, cluster/polygon/named-element special cases, duplicate-name
  decisions, loop-cut block for circuit routes — cut ids and waypoint ids are
  hardcoded per region) and the no-anchor orientation fallback.
- **04-compute-times.js**: the calibration `EXCLUDE` set (multi-day routes,
  routes with published totals that don't reflect walking time, circuits with
  chains/scrambles) and any published-total-split blocks (e.g. 16MN20 →
  s52–s54). Never reuse another region's calibration factor.
- File names: `rarau.json` is hardcoded in the tools and in the app's
  `db.service.ts` fetch; `sync-app-data.js` job list.
- App-side region config: `core/categories.ts` (massif waypoint sets,
  LOCALITIES for the city filter, type-derivation rules),
  `trail-detail.ts` NATURE_WAYPOINTS, `planner.service.ts` EXCLUDED_LODGINGS.

## Fixed conventions (keep across regions)

DEM sampling 60 m; ascent = median-of-3 smoothing + 5 m hysteresis;
DIN 33466 = 4 km/h horizontal, 300 m/h up, 500 m/h down, larger component
plus half the smaller; times rounded to 5 min (floor 5); comfort ×1.3 applied
at generation time, never stored; access walks 13 min/km on 1.35× the straight
line; every fact carries `{sources[], status: extracted|validated}`;
schemaVersion bumps on structural change, with a `conventions` note.
