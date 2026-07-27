/**
 * The Trail composition model, ported from the original 2020 client
 * (src/app/trail.ts). The core idea is preserved: a Trail is either atomic
 * (one marked segment, traversed in a direction) or composed of smaller
 * Trails — an official route is a Trail of segments, a generated itinerary
 * is a Trail of route slices. `mergeSegments()` aggregates the totals.
 *
 * Ported changes:
 *  - the long-point-list aggregation bug is fixed (the old code re-checked
 *    pointShortList and assigned to the wrong property, so it never ran);
 *  - times are minutes in both directions (time / reverseTime), matching the
 *    new database which computes both;
 *  - distance / ascent / descent aggregate alongside the times.
 */

export type BlazeShape = 'stripe' | 'dot' | 'cross' | 'triangle';
export type BlazeColor = 'red' | 'blue' | 'yellow';

export interface Blaze {
  shape: BlazeShape;
  color: BlazeColor;
  /** Romanian name, e.g. "punct roșu" */
  ro?: string;
}

export type TrailKind = 'segment' | 'access' | 'route' | 'itinerary';

export class Trail {
  id = '';
  kind: TrailKind = 'segment';
  name?: string;
  blaze?: Blaze;
  /** Key waypoints along the way (display names, travel order). */
  pointShortList?: string[];
  /** Every waypoint along the way (display names, travel order). */
  pointLongList?: string[];
  segments: Trail[] = [];
  /** Minutes, in the direction of pointShortList. */
  time?: number;
  /** Minutes, walking it backwards. */
  reverseTime?: number;
  distanceKm?: number;
  ascentM?: number;
  descentM?: number;
  /** Official route ids this trail (or its parts) belongs to, e.g. 16MN17. */
  routeIds: string[] = [];
  /** True when any aggregated time is a rough estimate (town-access walks). */
  estimated = false;

  get startBlaze(): Blaze | undefined {
    return this.blaze ?? this.segments[0]?.blaze;
  }

  get title(): string {
    if (this.name) return this.name;
    if (this.pointShortList?.length) return this.pointShortList.join(' – ');
    return this.id;
  }

  isRoundTrip(): boolean {
    if (!Array.isArray(this.pointShortList) || !this.pointShortList.length) {
      return false;
    }
    return this.pointShortList[0] ===
      this.pointShortList[this.pointShortList.length - 1];
  }

  /**
   * Fill this trail's aggregate properties from its segments.
   * Only fills what is not already set — a composed trail may override
   * any total with an authoritative (published) value first.
   */
  mergeSegments(): void {
    if (!Array.isArray(this.segments) || !this.segments.length) return;

    if (!Array.isArray(this.pointShortList) || !this.pointShortList.length) {
      this.pointShortList = [];
      this.segments.forEach((segment, index) => {
        if (Array.isArray(segment.pointShortList) && segment.pointShortList.length) {
          // segment N starts with the last point of segment N-1 -> ignore it
          this.pointShortList =
            this.pointShortList!.concat(segment.pointShortList.slice(index ? 1 : 0));
        }
      });
    }

    // (fixed) the original checked pointShortList here and assigned the
    // concatenation to pointShortList, so long lists were never aggregated
    if (!Array.isArray(this.pointLongList) || !this.pointLongList.length) {
      this.pointLongList = [];
      this.segments.forEach((segment, index) => {
        if (Array.isArray(segment.pointLongList) && segment.pointLongList.length) {
          this.pointLongList =
            this.pointLongList!.concat(segment.pointLongList.slice(index ? 1 : 0));
        }
      });
    }

    // totals aggregate when any part carries the figure (missing parts count 0),
    // so an itinerary that happens to start with a town-access leg keeps its climb
    const total = (get: (s: Trail) => number | undefined): number | undefined =>
      this.segments.some(s => get(s) != null)
        ? this.segments.reduce((sum, s) => sum + (get(s) ?? 0), 0)
        : undefined;
    if (this.time == null) this.time = total(s => s.time);
    if (this.reverseTime == null) this.reverseTime = total(s => s.reverseTime);
    if (this.distanceKm == null) {
      const km = total(s => s.distanceKm);
      this.distanceKm = km == null ? undefined : round1(km);
    }
    if (this.ascentM == null) this.ascentM = total(s => s.ascentM);
    if (this.descentM == null) this.descentM = total(s => s.descentM);

    this.routeIds = [...new Set(this.segments.flatMap(s => s.routeIds))];
    this.estimated = this.segments.some(s => s.estimated);
  }

  static compose(kind: TrailKind, id: string, parts: Trail[], name?: string): Trail {
    const trail = new Trail();
    trail.kind = kind;
    trail.id = id;
    trail.name = name;
    trail.segments = parts;
    trail.mergeSegments();
    return trail;
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
