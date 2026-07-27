/**
 * Types mirroring data/rarau.json (schemaVersion 0.1.x).
 * Facts keep their provenance: { value, sources[], status } — status is
 * "extracted" until a human validates, then "validated".
 */

export interface LocalizedText {
  ro: string;
  en?: string;
}

export interface Fact<T> {
  value: T;
  sources?: string[];
  status?: string;
  confidence?: string;
  note?: string;
}

/** A prose fact — Romanian text with provenance (en added at validation time). */
export interface ProseFact {
  ro: string;
  en?: string;
  sources?: string[];
  status?: string;
}

export interface DbCoordsMeta {
  sources?: string[];
  status?: string;
  confidence?: string;
  derivedBy?: string;
}

export type WaypointType =
  | 'train-station' | 'train-halt' | 'village' | 'trailhead' | 'pass'
  | 'hotel' | 'hut' | 'monastery' | 'peak' | 'saddle' | 'junction'
  | 'spring' | 'parking' | 'sight' | 'poi';

export interface DbWaypoint {
  id: string;
  type: WaypointType;
  name: LocalizedText;
  lat: number | null;
  lon: number | null;
  coords?: DbCoordsMeta;
  osmId?: string;
  ele?: Fact<number>;
  notes?: LocalizedText;
  issues?: string[];
}

export interface DbSegmentTime {
  forward: number | null;
  backward: number | null;
  status?: string;
  method?: string;
  calibration?: number;
  sources?: string[];
  confidence?: string;
  note?: string;
}

export interface DbSegmentProfile {
  ascentM: number;
  descentM: number;
  eleStartM?: number;
  eleEndM?: number;
  eleMaxM?: number;
  sources?: string[];
  status?: string;
  note?: string;
}

/** A waypoint that lies ON a segment without splitting it (spring, saddle, sight…). */
export interface DbSegmentVia {
  wp: string;
  /** Along the segment, km, in the from→to direction. */
  atKm: number;
  /** Perpendicular offset of the waypoint from the path, m. */
  offM?: number;
}

export interface DbSegment {
  id: string;
  from: string;
  to: string;
  routes: string[];
  kind?: 'access';
  roundtrip?: boolean;
  via?: DbSegmentVia[];
  variantNote?: string;
  notes?: LocalizedText;
  distanceKm?: Fact<number | null>;
  timeMinutes?: DbSegmentTime;
  profile?: DbSegmentProfile;
  geometryFile?: string;
}

export interface DbBlaze {
  shape: 'stripe' | 'dot' | 'cross' | 'triangle';
  color: 'red' | 'blue' | 'yellow';
  ro?: string;
  osmc?: string;
  sources?: string[];
  status?: string;
}

export interface DbDuration {
  minutes: number | null;
  listed?: string;
  rangeMinutes?: [number, number];
  direction?: string;
  status?: string;
  method?: string;
  calibration?: number;
  sources?: string[];
  confidence?: string;
  note?: string;
}

export interface DbRoute {
  id: string;
  osmRelation?: number;
  name: LocalizedText;
  blaze: DbBlaze;
  from: string;
  to: string;
  roundtrip?: boolean;
  waypointSequence: string[];
  segments: string[];
  scopeNote?: string;
  distanceKm: Fact<number>;
  durationListed: DbDuration;
  durationReverse?: DbDuration;
  durationComputedCheck?: Record<string, unknown>;
  ascentM: Fact<number | null>;
  descentM: Fact<number | null>;
  maxElevationM: Fact<number | null>;
  difficulty: Fact<'ușor' | 'mediu' | 'dificil' | string>;
  winter?: ProseFact;
  water?: ProseFact;
  lodging?: ProseFact;
  access?: ProseFact;
  safety?: ProseFact;
  status: string;
  pantofarConcerns?: string[];
  issues?: string[];
}

export interface DbSource {
  type?: string;
  title: string;
  url?: string;
  accessed?: string;
  role?: string;
}

export interface RarauDb {
  schemaVersion: string;
  generated: string;
  generator?: string;
  region: {
    id: string;
    name: LocalizedText;
    officialGroup?: string;
    county?: string;
    bbox?: number[];
  };
  attribution: Record<string, string>;
  conventions?: Record<string, string>;
  sources: Record<string, DbSource>;
  waypoints: DbWaypoint[];
  segments: DbSegment[];
  routes: DbRoute[];
}
