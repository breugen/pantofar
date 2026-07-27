import { Injectable, inject } from '@angular/core';
import { routeMatchesType } from './categories';
import { DbService } from './db.service';
import { GraphService, toBlaze } from './graph.service';
import { DbRoute, WaypointType } from './model/db';
import { Blaze } from './model/trail';
import { Itinerary, PlannerService } from './planner.service';

/**
 * One entry of a category's trail list: either an official marked route or a
 * track the graph engine composed for that kind of outing. Generated tracks
 * are addressed by their oriented segment chain (e.g. "s35.s47~s36r"), so a
 * composed track is deep-linkable and rebuilt deterministically from its id.
 */
export interface TrackOffer {
  id: string;
  kind: 'official' | 'generated';
  type: number;
  title: string;
  blaze?: Blaze;
  /** For sorting/display: official = published minutes, generated = comforted total. */
  minutes: number | null;
  roundtrip: boolean;
  days: 1 | 2;
  /** Way in / way out — used by the locality filter. */
  endpoints: string[];
  tags: TrackTag[];
  difficulty?: string;
  excluded: boolean;
  estimated: boolean;
  score: number;
}

export type TrackTag = 'tren' | 'parcare' | 'apa' | 'cabana' | 'padure';

export interface ComposedLeg { segmentId: string; forward: boolean; }

const COMPOSED_ID = /^s\d+r?(\.s\d+r?)*(~s\d+r?(\.s\d+r?)*)*$/;

/** Waypoint kinds that can serve as the middle name of a track title. */
const APEX_RANK: Partial<Record<WaypointType, number>> = {
  peak: 4, sight: 3, monastery: 2, hut: 2, hotel: 2, saddle: 1, pass: 1
};

/** Builds each category's track list: official routes + engine-composed tracks. */
@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly dbs = inject(DbService);
  private readonly graph = inject(GraphService);
  private readonly planner = inject(PlannerService);

  private readonly cache = new Map<number, TrackOffer[]>();

  offersForType(type: number): TrackOffer[] {
    const hit = this.cache.get(type);
    if (hit) return hit;
    if (!this.dbs.ready()) return [];
    const official = this.dbs.routes()
      .filter(r => routeMatchesType(r, type))
      .map(r => this.officialOffer(r, type));
    const generated = this.generatedForType(type);
    const seen = new Set(official.map(o => o.id));
    const offers = [...official, ...generated.filter(o => !seen.has(o.id) && !!seen.add(o.id))];
    this.cache.set(type, offers);
    return offers;
  }

  // ---- composed-track addressing -------------------------------------------

  composedIdOf(it: Itinerary): string {
    return it.days
      .map(d => d.legs.map(l => l.id.endsWith(':r') ? `${l.id.slice(0, -2)}r` : l.id).join('.'))
      .join('~');
  }

  /** Parses a composed id back into oriented legs per day; null if invalid. */
  parseComposedId(code: string): ComposedLeg[][] | null {
    if (!COMPOSED_ID.test(code)) return null;
    const days = code.split('~').map(day => day.split('.').map(tok => ({
      segmentId: tok.endsWith('r') ? tok.slice(0, -1) : tok,
      forward: !tok.endsWith('r')
    })));
    for (const day of days) {
      for (const leg of day) if (!this.dbs.segment(leg.segmentId)) return null;
    }
    return days;
  }

  /** Every waypoint id a chain passes (nodes and vias), in travel order. */
  chainWaypoints(days: ComposedLeg[][]): string[] {
    const out: string[] = [];
    for (const day of days) {
      for (const { segmentId, forward } of day) {
        const seg = this.dbs.segment(segmentId);
        if (!seg) continue;
        const from = forward ? seg.from : seg.to;
        const to = forward ? seg.to : seg.from;
        const vias = (seg.via ?? []).map(v => v.wp);
        if (!forward) vias.reverse();
        if (out[out.length - 1] !== from) out.push(from);
        out.push(...vias, to);
      }
    }
    return out;
  }

  /** "Start – apex – end" in the guidebook style of the concept board. */
  titleFor(days: ComposedLeg[][]): string {
    const wps = this.chainWaypoints(days);
    const start = wps[0];
    const end = wps[wps.length - 1];
    let apex: string | undefined;
    let best = 0;
    for (const id of wps.slice(1, -1)) {
      const rank = APEX_RANK[this.dbs.waypoint(id)?.type as WaypointType] ?? 0;
      if (rank > best) { best = rank; apex = id; }
    }
    // long trailhead names ("Slătioara — confluența…", "Cabana Pastorală (a lui Mao)")
    // keep only their headword in titles; the full name stays on the detail timeline
    const name = (id: string) => this.dbs.waypointName(id).split(/\s+[—(]/)[0].trim();
    return apex && apex !== start && apex !== end
      ? `${name(start)} – ${name(apex)} – ${name(end)}`
      : `${name(start)} – ${name(end)}`;
  }

  // ---- offers ---------------------------------------------------------------

  private officialOffer(route: DbRoute, type: number): TrackOffer {
    const wps = new Set(route.waypointSequence);
    for (const sid of route.segments) {
      for (const v of this.dbs.segment(sid)?.via ?? []) wps.add(v.wp);
    }
    return {
      id: route.id,
      kind: 'official',
      type,
      title: route.name.ro,
      blaze: toBlaze(route),
      minutes: route.durationListed.minutes,
      roundtrip: !!route.roundtrip,
      days: 1,
      endpoints: [route.from, route.to],
      tags: this.tagsFor([...wps], route.from),
      difficulty: route.difficulty.value,
      excluded: (route.pantofarConcerns ?? []).some(c => c.startsWith('EXCLUS')),
      estimated: false,
      score: 0
    };
  }

  private offerFromItinerary(it: Itinerary, type: number): TrackOffer {
    const id = this.composedIdOf(it);
    const days = this.parseComposedId(id)!;
    const wps = this.chainWaypoints(days);
    const start = wps[0];
    const end = wps[wps.length - 1];
    const blazeLeg = it.days.flatMap(d => d.legs).find(l => l.blaze);
    return {
      id,
      kind: 'generated',
      type,
      title: this.titleFor(days),
      blaze: blazeLeg?.blaze,
      minutes: it.totalMinutes,
      roundtrip: start === end,
      days: it.days.length === 2 ? 2 : 1,
      endpoints: [start, end],
      tags: this.tagsFor(wps, start),
      excluded: false,
      estimated: it.estimated,
      score: it.score
    };
  }

  private tagsFor(waypointIds: string[], startId: string): TrackTag[] {
    const tags = new Set<TrackTag>();
    const startType = this.dbs.waypoint(startId)?.type;
    if (startType === 'train-station' || startType === 'train-halt') tags.add('tren');
    for (const id of waypointIds) {
      switch (this.dbs.waypoint(id)?.type) {
        case 'parking': tags.add('parcare'); break;
        case 'spring': tags.add('apa'); break;
        case 'hut': case 'hotel': tags.add('cabana'); break;
      }
      if (id === 'codrul-secular') tags.add('padure');
    }
    return [...tags];
  }

  // ---- the engine runs behind each category --------------------------------

  private generatedForType(type: number): TrackOffer[] {
    switch (type) {
      case 1: return this.strolls();
      case 2: return this.dayHikes();
      case 3: return this.daisyWeekends();
      case 4: return this.starWeekends();
      default: return [];
    }
  }

  private startsOf(...types: WaypointType[]): string[] {
    const adj = this.graph.adjacency();
    return [...this.dbs.waypointsById().values()]
      .filter(w => types.includes(w.type) && adj.has(w.id))
      .map(w => w.id);
  }

  private rank(offers: TrackOffer[], cap: number): TrackOffer[] {
    const seen = new Set<string>();
    return offers
      .sort((a, b) => b.score - a.score)
      .filter(o => !seen.has(o.id) && !!seen.add(o.id))
      .slice(0, cap);
  }

  /** Short easy loops from any access point. */
  private strolls(): TrackOffer[] {
    const offers: TrackOffer[] = [];
    for (const startId of this.startsOf('train-station', 'train-halt', 'village', 'trailhead', 'parking', 'hotel', 'hut')) {
      for (const it of this.planner.generate({ startId, budgetMinutes: 180, days: 1 }).slice(0, 2)) {
        offers.push(this.offerFromItinerary(it, 1));
      }
    }
    return this.rank(offers, 8);
  }

  /** Full-day circuits from access points + rail-to-rail traverses. */
  private dayHikes(): TrackOffer[] {
    const offers: TrackOffer[] = [];
    for (const startId of this.startsOf('train-station', 'train-halt', 'village', 'trailhead', 'parking')) {
      for (const it of this.planner.generate({ startId, budgetMinutes: 480, days: 1 }).slice(0, 2)) {
        offers.push(this.offerFromItinerary(it, 2));
      }
    }
    const rails = this.startsOf('train-station', 'train-halt');
    for (const startId of rails) {
      for (const endId of rails) {
        if (endId === startId) continue;
        const [best] = this.planner.generate({ startId, endId, budgetMinutes: 480, days: 1 });
        if (best) offers.push(this.offerFromItinerary(best, 2));
      }
    }
    return this.rank(offers, 12);
  }

  /** Two day-loops ("petals") from the same valley base — sleep down in the village. */
  private daisyWeekends(): TrackOffer[] {
    const offers: TrackOffer[] = [];
    for (const base of this.startsOf('train-station', 'train-halt', 'village')) {
      const petals = this.petalPair(base, 360);
      if (petals) offers.push(petals);
    }
    return this.rank(offers, 8);
  }

  /** Hotel-based weekends: 2-day trips overnighting at the hotel, plus
   *  two-petal weekends for those who drive up. */
  private starWeekends(): TrackOffer[] {
    const offers: TrackOffer[] = [];
    for (const startId of this.startsOf('train-station', 'train-halt', 'village')) {
      for (const it of this.planner.generate({ startId, budgetMinutes: 420, days: 2 })) {
        if (it.overnightAt?.includes('Hotel')) { offers.push(this.offerFromItinerary(it, 4)); break; }
      }
    }
    for (const base of ['hotel-rarau', 'parcare-cota-1400']) {
      const petals = this.petalPair(base, 300);
      if (petals) offers.push(petals);
    }
    return this.rank(offers, 10);
  }

  /** Two distinct day circuits from one base, joined into a 2-day offer. */
  private petalPair(base: string, budgetMinutes: number): TrackOffer | null {
    const circuits = this.planner.generate({ startId: base, budgetMinutes, days: 1 });
    if (circuits.length < 2) return null;
    const first = circuits[0];
    const firstSegs = new Set(first.days[0].legs.map(l => l.id.replace(/:r$/, '')));
    const second = circuits.slice(1).find(c =>
      !c.days[0].legs.some(l => firstSegs.has(l.id.replace(/:r$/, '')))) ?? circuits[1];
    const id = `${this.composedIdOf(first)}~${this.composedIdOf(second)}`;
    const days = this.parseComposedId(id);
    if (!days) return null;
    const wps = this.chainWaypoints(days);
    return {
      id,
      kind: 'generated',
      type: 3,
      title: this.titleFor(days),
      blaze: [...first.days[0].legs, ...second.days[0].legs].find(l => l.blaze)?.blaze,
      minutes: first.totalMinutes + second.totalMinutes,
      roundtrip: true,
      days: 2,
      endpoints: [base, base],
      tags: this.tagsFor(wps, base),
      excluded: false,
      estimated: first.estimated || second.estimated,
      score: first.score + second.score
    };
  }
}
