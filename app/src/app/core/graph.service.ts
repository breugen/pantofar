import { Injectable, computed, inject } from '@angular/core';
import { DbService } from './db.service';
import { DbRoute, DbSegment } from './model/db';
import { Blaze, Trail } from './model/trail';

/** One traversable direction of a database segment. */
export interface GraphEdge {
  segmentId: string;
  from: string;
  to: string;
  /** Calibrated minutes in this direction (rough estimate for town-access walks). */
  minutes: number;
  distanceKm: number | null;
  ascentM: number | null;
  descentM: number | null;
  kind: 'segment' | 'access';
  estimated: boolean;
  /** Present when the edge must not be used in generated itineraries. */
  excluded?: 'salvamont';
  routeIds: string[];
  blaze?: Blaze;
  /** Milestones lying on the segment (springs, saddles, sights…), in travel order. */
  viaIds: string[];
}

const ACCESS_WALK_MIN_PER_KM = 13;
const STREET_DETOUR_FACTOR = 1.35;

/** Applied on top of calibrated DIN 33466 times: unhurried pace, short breaks. */
export const COMFORT_FACTOR = 1.3;

export interface MilestoneRow {
  id: string;
  name: string;
  ele: number | null;
  cumMinutes: number | null;
  /** True for points lying on a segment (interpolated time) rather than graph nodes. */
  via?: boolean;
}

/** Bridges the raw database into the Trail domain model and a routable graph. */
@Injectable({ providedIn: 'root' })
export class GraphService {
  private readonly dbs = inject(DbService);

  /** Both directions of every non-roundtrip segment with a usable time. */
  readonly edges = computed<GraphEdge[]>(() => {
    const db = this.dbs.db();
    if (!db) return [];
    const out: GraphEdge[] = [];
    for (const seg of db.segments) {
      if (seg.roundtrip) continue; // the Pietrele Doamnei circuit is an add-on, not a graph edge
      const fwd = this.edgeFor(seg, true);
      const bwd = this.edgeFor(seg, false);
      if (fwd) out.push(fwd);
      if (bwd) out.push(bwd);
    }
    return out;
  });

  readonly adjacency = computed<Map<string, GraphEdge[]>>(() => {
    const map = new Map<string, GraphEdge[]>();
    for (const e of this.edges()) {
      if (!map.has(e.from)) map.set(e.from, []);
      map.get(e.from)!.push(e);
    }
    return map;
  });

  private edgeFor(seg: DbSegment, forward: boolean): GraphEdge | null {
    const time = this.orientedMinutes(seg, forward);
    if (time == null) return null;
    const routes = seg.routes.map(id => this.dbs.route(id)).filter((r): r is DbRoute => !!r);
    const excluded = routes.some(r => (r.pantofarConcerns ?? []).some(c => c.startsWith('EXCLUS')))
      ? 'salvamont' as const : undefined;
    const primary = routes[0];
    return {
      segmentId: seg.id,
      from: forward ? seg.from : seg.to,
      to: forward ? seg.to : seg.from,
      minutes: time.minutes,
      distanceKm: seg.distanceKm?.value ?? null,
      ascentM: seg.profile ? (forward ? seg.profile.ascentM : seg.profile.descentM) : null,
      descentM: seg.profile ? (forward ? seg.profile.descentM : seg.profile.ascentM) : null,
      kind: seg.kind === 'access' ? 'access' : 'segment',
      estimated: time.estimated,
      excluded,
      routeIds: seg.routes,
      blaze: primary ? toBlaze(primary) : undefined,
      viaIds: this.orientedViaIds(seg, forward)
    };
  }

  private orientedViaIds(seg: DbSegment, forward: boolean): string[] {
    const ids = (seg.via ?? []).map(v => v.wp);
    return forward ? ids : [...ids].reverse();
  }

  private orientedMinutes(seg: DbSegment, forward: boolean): { minutes: number; estimated: boolean } | null {
    const t = seg.timeMinutes;
    const exact = forward ? t?.forward : t?.backward;
    if (exact != null) return { minutes: exact, estimated: false };
    if (seg.kind !== 'access') return null;
    // Town-access walks have no computed time yet: estimate from the (street) distance
    // or, failing that, the straight line with a detour factor. Marked as estimated.
    let km = seg.distanceKm?.value ?? null;
    if (km == null) {
      const a = this.dbs.waypoint(seg.from);
      const b = this.dbs.waypoint(seg.to);
      if (!a?.lat || !b?.lat || a.lon == null || b.lon == null) return null;
      km = haversineKm(a.lat, a.lon, b.lat, b.lon) * STREET_DETOUR_FACTOR;
    }
    const minutes = Math.max(5, Math.round(km * ACCESS_WALK_MIN_PER_KM / 5) * 5);
    return { minutes, estimated: true };
  }

  /** An atomic Trail for one oriented segment (the composition building block). */
  segmentTrail(segmentId: string, forward: boolean): Trail {
    const seg = this.dbs.segment(segmentId);
    if (!seg) throw new Error(`unknown segment ${segmentId}`);
    const t = new Trail();
    t.id = `${segmentId}${forward ? '' : ':r'}`;
    t.kind = seg.kind === 'access' ? 'access' : 'segment';
    const fromId = forward ? seg.from : seg.to;
    const toId = forward ? seg.to : seg.from;
    t.pointShortList = [this.dbs.waypointName(fromId), this.dbs.waypointName(toId)];
    t.pointLongList = [fromId, ...this.orientedViaIds(seg, forward), toId]
      .map(id => this.dbs.waypointName(id));
    const fwdTime = this.orientedMinutes(seg, forward);
    const bwdTime = this.orientedMinutes(seg, !forward);
    t.time = fwdTime?.minutes;
    t.reverseTime = bwdTime?.minutes;
    t.estimated = fwdTime?.estimated ?? false;
    t.distanceKm = seg.distanceKm?.value ?? undefined;
    if (seg.profile) {
      t.ascentM = forward ? seg.profile.ascentM : seg.profile.descentM;
      t.descentM = forward ? seg.profile.descentM : seg.profile.ascentM;
    }
    t.routeIds = [...seg.routes];
    const primary = seg.routes.length ? this.dbs.route(seg.routes[0]) : undefined;
    t.blaze = primary ? toBlaze(primary) : undefined;
    return t;
  }

  /** An official route as a composed Trail — published totals stay authoritative. */
  routeTrail(routeId: string): Trail | null {
    const route = this.dbs.route(routeId);
    if (!route) return null;
    const t = new Trail();
    t.id = route.id;
    t.kind = 'route';
    t.name = route.name.ro;
    t.blaze = toBlaze(route);
    t.pointShortList = route.waypointSequence.map(id => this.dbs.waypointName(id));
    t.time = route.durationListed.minutes ?? undefined;
    t.reverseTime = route.durationReverse?.minutes ?? undefined;
    t.distanceKm = route.distanceKm.value;
    t.ascentM = route.ascentM.value ?? undefined;
    t.descentM = route.descentM.value ?? undefined;
    t.segments = this.orientedRouteLegs(route);
    t.mergeSegments();
    return t;
  }

  /** The route's segments as oriented Trails, in walking order. */
  orientedRouteLegs(route: DbRoute): Trail[] {
    const legs: Trail[] = [];
    let at = route.from;
    for (const sid of route.segments) {
      const seg = this.dbs.segment(sid);
      if (!seg) continue;
      if (seg.roundtrip) { legs.push(this.segmentTrail(sid, true)); continue; }
      const forward = seg.from === at;
      legs.push(this.segmentTrail(sid, forward));
      at = forward ? seg.to : seg.from;
    }
    return legs;
  }

  /** Milestones with running (uncomforted) computed minutes for a route's detail page.
   *  Node rows come from segment endpoints; via rows (springs, saddles…) are
   *  interleaved with times interpolated along the segment. */
  milestones(route: DbRoute): MilestoneRow[] {
    let cum: number | null = 0;
    let at = route.from;
    const rows: MilestoneRow[] = [this.milestoneRow(route.from, 0)];
    for (const sid of route.segments) {
      const seg = this.dbs.segment(sid);
      if (!seg) continue;
      if (seg.roundtrip) continue;
      const forward = seg.from === at;
      const t = this.orientedMinutes(seg, forward);
      const before: number | null = cum;
      cum = before == null || t == null ? null : before + t.minutes;
      at = forward ? seg.to : seg.from;
      for (const v of this.orientedVias(seg, forward)) {
        const est = before == null || t == null ? null : Math.round(before + t.minutes * v.frac);
        rows.push({ ...this.milestoneRow(v.wp, est), via: true });
      }
      rows.push(this.milestoneRow(at, cum, seg, forward));
    }
    return rows;
  }

  /** Comforted minutes (rounded to 5) — the figure shown for planned walking. */
  comfortMinutes(minutes: number): number {
    return Math.round(minutes * COMFORT_FACTOR / 5) * 5;
  }

  /** Timeline rows for one day of a composed track (oriented segment legs),
   *  with comforted cumulative minutes and via milestones interleaved. */
  composedDayMilestones(legs: { segmentId: string; forward: boolean }[]): MilestoneRow[] {
    const rows: MilestoneRow[] = [];
    let cum = 0;
    for (const { segmentId, forward } of legs) {
      const seg = this.dbs.segment(segmentId);
      if (!seg) continue;
      const fromId = forward ? seg.from : seg.to;
      const toId = forward ? seg.to : seg.from;
      if (!rows.length) rows.push(this.milestoneRow(fromId, 0));
      const t = this.orientedMinutes(seg, forward);
      const eff = t == null ? 0 : this.comfortMinutes(t.minutes);
      for (const v of this.orientedVias(seg, forward)) {
        rows.push({ ...this.milestoneRow(v.wp, Math.round(cum + eff * v.frac)), via: true });
      }
      cum += eff;
      rows.push(this.milestoneRow(toId, cum, seg, forward));
    }
    return rows;
  }

  /** Via milestones with their fraction of the segment in the travel direction. */
  private orientedVias(seg: DbSegment, forward: boolean): { wp: string; frac: number }[] {
    const dist = seg.distanceKm?.value;
    if (!dist) return [];
    return (seg.via ?? [])
      .map(v => ({ wp: v.wp, frac: Math.min(1, Math.max(0, forward ? v.atKm / dist : 1 - v.atKm / dist)) }))
      .sort((a, b) => a.frac - b.frac);
  }

  private milestoneRow(wpId: string, cum: number | null, viaSeg?: DbSegment, forward = true): MilestoneRow {
    const wp = this.dbs.waypoint(wpId);
    let ele = wp?.ele?.value ?? null;
    if (ele == null && viaSeg?.profile) {
      ele = forward ? viaSeg.profile.eleEndM ?? null : viaSeg.profile.eleStartM ?? null;
    }
    return { id: wpId, name: wp?.name.ro ?? wpId, ele, cumMinutes: cum };
  }
}

export function toBlaze(route: Pick<DbRoute, 'blaze'>): Blaze {
  return { shape: route.blaze.shape, color: route.blaze.color, ro: route.blaze.ro };
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = (d: number) => d * Math.PI / 180;
  const s = Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(s));
}
