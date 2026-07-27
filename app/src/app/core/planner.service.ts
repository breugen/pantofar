import { Injectable, inject } from '@angular/core';
import { DbService } from './db.service';
import { COMFORT_FACTOR, GraphEdge, GraphService } from './graph.service';
import { Trail } from './model/trail';

export { COMFORT_FACTOR };

export interface PlannerOptions {
  startId: string;
  /** When set (and different from startId), plan a traverse to this point
   *  instead of a circuit back to the start. */
  endId?: string;
  /** Walking budget per day, minutes (comfort factor included). */
  budgetMinutes: number;
  days: 1 | 2;
}

export interface DayPlan {
  legs: Trail[];
  minutes: number;
}

export interface Itinerary {
  id: string;
  trail: Trail;
  days: DayPlan[];
  totalMinutes: number;
  distanceKm: number | null;
  ascentM: number | null;
  overnightAt?: string;
  estimated: boolean;
  score: number;
  /** Route-borne cautions (winter etc.), deduplicated. */
  warnings: string[];
}

/** How much a pure loop outranks a full out-and-back, all else equal.
 *  Applied to (1 − 2·repeatFraction), so the swing is ±REPEAT_WEIGHT. */
const REPEAT_WEIGHT = 6;

/** Lodgings are derived from the data (hotel/hut waypoints on the graph);
 *  these are excluded until validated — see the waypoint's issues in the DB. */
const EXCLUDED_LODGINGS = new Set(['cabana-pastorala']);
const MAX_EDGES_PER_DAY = 12;
const CANDIDATE_CAP = 500;

interface Candidate {
  edges: GraphEdge[];
  minutes: number;
}

@Injectable({ providedIn: 'root' })
export class PlannerService {
  private readonly dbs = inject(DbService);
  private readonly graph = inject(GraphService);

  generate(opts: PlannerOptions): Itinerary[] {
    if (!this.dbs.ready()) return [];
    const endId = opts.endId && opts.endId !== opts.startId ? opts.endId : undefined;
    if (opts.days === 1) {
      return endId ? this.oneDayTraverses(opts, endId) : this.oneDayCircuits(opts);
    }
    return this.twoDayTrips(opts, endId);
  }

  /** Comforted minutes for an edge, rounded to 5. */
  effMinutes(e: GraphEdge): number {
    return this.graph.comfortMinutes(e.minutes);
  }

  /** Fraction of the walked time spent re-walking a segment already walked
   *  (either direction). 0 = never the same path twice; 1 = pure out-and-back.
   *  Time-weighted, so repeating one long climb hurts more than a short spur. */
  repeatFraction(edges: GraphEdge[]): number {
    const seen = new Set<string>();
    let total = 0, repeated = 0;
    for (const e of edges) {
      const m = this.effMinutes(e);
      total += m;
      if (seen.has(e.segmentId)) repeated += m;
      else seen.add(e.segmentId);
    }
    return total ? repeated / total : 0;
  }

  /** Overnight bases: hotel/hut waypoints that are on the graph and not excluded. */
  private lodgings(): string[] {
    const adj = this.graph.adjacency();
    return [...this.dbs.waypointsById().values()]
      .filter(w => (w.type === 'hotel' || w.type === 'hut') && adj.has(w.id) && !EXCLUDED_LODGINGS.has(w.id))
      .map(w => w.id);
  }

  // ---- one day: circuits back to the start --------------------------------

  private oneDayCircuits(opts: PlannerOptions): Itinerary[] {
    const adj = this.graph.adjacency();
    const byKey = new Map<string, Candidate>();
    const path: GraphEdge[] = [];
    const segUse = new Map<string, number>();
    let visited = 0;

    const dfs = (node: string, minutes: number) => {
      if (visited > 200000) return;
      visited++;
      if (node === opts.startId && path.length >= 2 && minutes >= 90) {
        this.recordCircuit(byKey, path, minutes);
      }
      if (path.length >= MAX_EDGES_PER_DAY) return;
      const prev = path[path.length - 1];
      for (const e of adj.get(node) ?? []) {
        if (e.excluded) continue;
        const used = segUse.get(e.segmentId) ?? 0;
        if (used >= 2) continue; // each path walked at most there-and-back
        const eff = this.effMinutes(e);
        // a free there-and-back (hop to a car park and out again) is pure noise;
        // real out-and-backs to a viewpoint cost time and stay allowed
        if (prev && prev.segmentId === e.segmentId && eff === 0) continue;
        const t = minutes + eff;
        if (t > opts.budgetMinutes) continue;
        path.push(e);
        segUse.set(e.segmentId, used + 1);
        dfs(e.to, t);
        path.pop();
        segUse.set(e.segmentId, used);
        if (byKey.size >= CANDIDATE_CAP) return;
      }
    };
    dfs(opts.startId, 0);

    const scored = [...byKey.values()]
      .map(c => ({ c, score: this.scoreCircuit(c, opts.budgetMinutes) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    return scored.map(({ c, score }, i) =>
      this.toItinerary(`c${i}`, [c.edges], score, undefined));
  }

  private recordCircuit(byKey: Map<string, Candidate>, path: GraphEdge[], minutes: number): void {
    // canonical key: the multiset of segments — kills mirror-image duplicates
    const key = path.map(e => e.segmentId).sort().join('+');
    const existing = byKey.get(key);
    if (!existing || existing.minutes > minutes) {
      byKey.set(key, { edges: [...path], minutes });
    }
  }

  private scoreCircuit(c: Candidate, budget: number): number {
    let score = this.sightseeingScore(c.edges);
    // travelers hate re-walking the path they came up on: reward loops, and
    // weight any repetition by its time, not by how often it happens
    score += REPEAT_WEIGHT * (1 - 2 * this.repeatFraction(c.edges));
    score += 2 * (c.minutes / budget);                // fuller days beat token strolls
    score -= Math.min(2, c.edges.filter(e => e.estimated).length);
    return score;
  }

  // ---- one day: a traverse to a different endpoint -------------------------

  private oneDayTraverses(opts: PlannerOptions, endId: string): Itinerary[] {
    const scored = this.paths(opts.startId, endId, opts.budgetMinutes)
      .map(c => ({ c, score: this.scoreTraverse(c, opts.budgetMinutes) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
    return scored.map(({ c, score }, i) => this.toItinerary(`v${i}`, [c.edges], score, undefined));
  }

  /** Simple paths never repeat a segment, so no repeat term here. */
  private scoreTraverse(c: Candidate, budget: number): number {
    let score = this.sightseeingScore(c.edges);
    score += 2 * (c.minutes / budget);
    score -= Math.min(2, c.edges.filter(e => e.estimated).length);
    return score;
  }

  // ---- two days: out to a lodging, on (or back) another way ----------------

  private twoDayTrips(opts: PlannerOptions, endId?: string): Itinerary[] {
    const destination = endId ?? opts.startId;
    const results: Itinerary[] = [];
    for (const lodging of this.lodgings()) {
      if (lodging === opts.startId || lodging === destination) continue;
      const out = this.paths(opts.startId, lodging, opts.budgetMinutes);
      const back = this.paths(lodging, destination, opts.budgetMinutes);
      if (!out.length || !back.length) continue;
      const combos: { o: Candidate; b: Candidate; score: number }[] = [];
      for (const o of out.slice(0, 30)) {
        for (const b of back.slice(0, 30)) {
          const edges = [...o.edges, ...b.edges];
          const score = this.sightseeingScore(edges)
            + REPEAT_WEIGHT * (1 - 2 * this.repeatFraction(edges))
            + (o.minutes + b.minutes) / opts.budgetMinutes
            + (lodging === 'hotel-rarau' ? 1 : 0);
          combos.push({ o, b, score });
        }
      }
      combos.sort((a, b) => b.score - a.score);
      for (const combo of combos.slice(0, 2)) {
        results.push(this.toItinerary(
          `t${results.length}`, [combo.o.edges, combo.b.edges], combo.score, lodging));
      }
    }
    return results.sort((a, b) => b.score - a.score).slice(0, 4);
  }

  /** Simple paths from A to B within the budget (each segment at most once). */
  private paths(fromId: string, toId: string, budget: number): Candidate[] {
    const adj = this.graph.adjacency();
    const found: Candidate[] = [];
    const path: GraphEdge[] = [];
    const usedSegs = new Set<string>();
    let visited = 0;
    const dfs = (node: string, minutes: number) => {
      if (found.length >= 300 || visited > 200000) return;
      visited++;
      if (node === toId && path.length) {
        found.push({ edges: [...path], minutes });
        return; // arriving is the point; longer wanderings emerge via other branches
      }
      if (path.length >= MAX_EDGES_PER_DAY) return;
      for (const e of adj.get(node) ?? []) {
        if (e.excluded || usedSegs.has(e.segmentId)) continue;
        const t = minutes + this.effMinutes(e);
        if (t > budget) continue;
        path.push(e);
        usedSegs.add(e.segmentId);
        dfs(e.to, t);
        path.pop();
        usedSegs.delete(e.segmentId);
      }
    };
    dfs(fromId, 0);
    return found
      .map(c => ({ c, s: this.sightseeingScore(c.edges) }))
      .sort((a, b) => b.s - a.s)
      .map(x => x.c);
  }

  // ---- shared -------------------------------------------------------------

  private sightseeingScore(edges: GraphEdge[]): number {
    const wps = new Set<string>();
    for (const e of edges) {
      wps.add(e.from);
      wps.add(e.to);
      for (const v of e.viaIds) wps.add(v); // springs & co. riding along the edge count too
    }
    let score = 0;
    for (const id of wps) {
      const wp = this.dbs.waypoint(id);
      switch (wp?.type) {
        case 'peak': score += 3; break;
        case 'sight': score += 2; break;
        case 'saddle': score += 1; break;
        case 'monastery': score += 1; break;
        case 'hut': case 'hotel': score += 1; break;
        case 'spring': score += 0.5; break;
      }
    }
    return score;
  }

  private toItinerary(id: string, dayEdges: GraphEdge[][], score: number, overnightAt?: string): Itinerary {
    const days: DayPlan[] = dayEdges.map(edges => {
      const legs = edges.map(e => {
        const forward = this.dbs.segment(e.segmentId)!.from === e.from;
        const leg = this.graph.segmentTrail(e.segmentId, forward);
        // display the same comforted minutes the budget maths used
        leg.time = this.effMinutes(e);
        return leg;
      });
      return { legs, minutes: legs.reduce((s, l) => s + (l.time ?? 0), 0) };
    });
    const allLegs = days.flatMap(d => d.legs);
    const trail = Trail.compose('itinerary', id, allLegs);
    const warnings = this.collectWarnings(dayEdges.flat(), overnightAt);
    return {
      id,
      trail,
      days,
      totalMinutes: days.reduce((s, d) => s + d.minutes, 0),
      distanceKm: trail.distanceKm ?? null,
      ascentM: trail.ascentM ?? null,
      overnightAt: overnightAt ? this.dbs.waypointName(overnightAt) : undefined,
      estimated: trail.estimated,
      score,
      warnings
    };
  }

  private collectWarnings(edges: GraphEdge[], overnightAt?: string): string[] {
    const warnings = new Set<string>();
    for (const rid of new Set(edges.flatMap(e => e.routeIds))) {
      const route = this.dbs.route(rid);
      if (route?.winter?.ro && /pericul|nerecomandat/i.test(route.winter.ro)) {
        warnings.add(route.winter.ro);
      }
    }
    if (overnightAt === 'cabana-giumalau') {
      const note = this.dbs.waypoint('cabana-giumalau')?.notes?.ro;
      if (note) warnings.add(note);
    }
    return [...warnings];
  }
}
