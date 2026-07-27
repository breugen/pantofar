import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CatalogService } from '../../core/catalog.service';
import { TRAIL_TYPES, massifOf, massifOfWaypoints, routeMatchesType, trailType } from '../../core/categories';
import { DbService } from '../../core/db.service';
import { GraphService, MilestoneRow, toBlaze } from '../../core/graph.service';
import { I18nService } from '../../core/i18n.service';
import { ProseFact, WaypointType } from '../../core/model/db';
import { BlazePlate } from '../../shared/blaze-plate';
import { DurationPipe } from '../../shared/duration-pipe';
import { Icon, IconName } from '../../shared/icon';

/** Reserve/sight waypoints whose notes feed the "Floră și faună" section. */
const NATURE_WAYPOINTS = ['codrul-secular', 'pietrele-doamnei', 'cheile-moara-dracului', 'muntele-todirescu'];

const PIN_ICON: Partial<Record<WaypointType, IconName>> = {
  'train-station': 'train', 'train-halt': 'train', parking: 'car', spring: 'drop',
  hotel: 'hut', hut: 'hut', sight: 'tree', peak: 'peak'
};

interface TimelineRow extends MilestoneRow {
  major: boolean;
  icon?: IconName;
}

interface DayView {
  rows: TimelineRow[];
  minutes: number | null;
}

/**
 * The track sheet (/detail/:code) in the ui-concept-v1 layout: header with the
 * blaze plate, the stamped meta card, the honest elevation sketch, and the
 * milestone timeline as the hero. `code` is either an official route id
 * (16MN17) or a composed segment chain built by the engine (s35.s47~…).
 */
@Component({
  selector: 'pm-trail-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BlazePlate, DurationPipe, Icon, RouterLink],
  templateUrl: './trail-detail.html',
  styleUrl: './trail-detail.scss'
})
export class TrailDetailPage {
  /** Bound from :code — official route id or composed chain. */
  readonly code = input.required<string>();
  /** Bound from the ?t= query parameter: the category the track was opened from. */
  readonly t = input<string | undefined>(undefined);

  protected readonly i18n = inject(I18nService);
  protected readonly dbs = inject(DbService);
  private readonly graph = inject(GraphService);
  private readonly catalog = inject(CatalogService);
  private readonly location = inject(Location);

  protected readonly route = computed(() => this.dbs.route(this.code()));
  protected readonly composed = computed(() =>
    this.route() ? null : this.catalog.parseComposedId(this.code()));
  protected readonly found = computed(() => !!this.route() || !!this.composed());
  protected readonly kind = computed(() => this.route() ? 'official' : 'generated');

  private readonly dayTrails = computed(() => (this.composed() ?? [])
    .map(day => day.map(leg => this.graph.segmentTrail(leg.segmentId, leg.forward))));

  private readonly typeDef = computed(() => {
    const fromParam = trailType(Number(this.t()));
    if (fromParam) return fromParam;
    const r = this.route();
    return (r && TRAIL_TYPES.find(td => routeMatchesType(r, td.type))) ?? TRAIL_TYPES[1];
  });

  protected readonly listLink = computed(() => ['/trails', this.typeDef().type]);

  /** Official route number (16MN03 → "3"), shown map-style in a red square. */
  protected readonly routeNo = computed(() => {
    const m = this.route() ? this.code().match(/(\d+)$/) : null;
    return m ? String(Number(m[1])) : null;
  });

  protected readonly over = computed(() => {
    const r = this.route();
    const massif = r ? massifOf(r)
      : massifOfWaypoints(this.catalog.chainWaypoints(this.composed() ?? []));
    return `${this.i18n.t(this.typeDef().caption)} · ${massif}`;
  });

  protected readonly title = computed(() => {
    const r = this.route();
    if (r) return this.i18n.t(r.name);
    return this.catalog.titleFor(this.composed() ?? []);
  });

  protected readonly blaze = computed(() => {
    const r = this.route();
    if (r) return toBlaze(r);
    return this.dayTrails().flat().find(t => t.blaze)?.blaze;
  });

  /** Timeline per day: official routes are one day; composed tracks may be two. */
  protected readonly days = computed<DayView[]>(() => {
    const r = this.route();
    if (r) return [this.toDayView(this.graph.milestones(r))];
    return (this.composed() ?? []).map(day =>
      this.toDayView(this.graph.composedDayMilestones(day)));
  });

  private toDayView(rows: MilestoneRow[]): DayView {
    const nodes = rows.filter(m => !m.via);
    const last = nodes[nodes.length - 1];
    return {
      minutes: last?.cumMinutes ?? null,
      rows: rows.map((m, i) => {
        const type = this.dbs.waypoint(m.id)?.type;
        const major = !m.via &&
          (i === 0 || m === last || type === 'hotel' || type === 'hut');
        return { ...m, major, icon: type ? PIN_ICON[type] : undefined };
      })
    };
  }

  /** The four meta-card cells. */
  protected readonly meta = computed<{ k: string; v: string }[]>(() => {
    const ui = (k: string) => this.i18n.ui(k);
    const r = this.route();
    if (r) {
      return [
        { k: ui('detail.durata'), v: r.durationListed.listed ?? fmt(r.durationListed.minutes) },
        { k: ui('detail.intoarcere'), v: fmt(r.durationReverse?.minutes) },
        { k: ui('detail.urcare'), v: r.ascentM.value != null ? `+${r.ascentM.value} m` : '—' },
        { k: ui('detail.difficulty'), v: this.i18n.difficulty(r.difficulty.value) || '—' }
      ];
    }
    const legs = this.dayTrails().flat();
    const total = this.days().reduce((s, d) => s + (d.minutes ?? 0), 0);
    const back = legs.reduce((s, l) =>
      s + (l.reverseTime != null ? this.graph.comfortMinutes(l.reverseTime) : 0), 0);
    const ascent = legs.reduce((s, l) => s + (l.ascentM ?? 0), 0);
    const km = legs.reduce((s, l) => s + (l.distanceKm ?? 0), 0);
    return [
      { k: ui('detail.durata'), v: fmt(total) },
      { k: ui('detail.intoarcere'), v: fmt(back) },
      { k: ui('detail.urcare'), v: `+${ascent} m` },
      { k: ui('detail.lungime'), v: `${Math.round(km * 10) / 10} km` }
    ];
  });

  /** The honest elevation sketch: milestones with known elevation, x = walking time. */
  protected readonly profile = computed(() => {
    const pts: { x: number; ele: number; name: string }[] = [];
    let offset = 0;
    for (const day of this.days()) {
      for (const m of day.rows) {
        if (m.ele != null) pts.push({ x: offset + (m.cumMinutes ?? 0), ele: m.ele, name: m.name });
      }
      offset += day.minutes ?? 0;
    }
    if (pts.length < 2) return null;
    const xMax = Math.max(...pts.map(p => p.x), 1);
    const eMin = Math.min(...pts.map(p => p.ele));
    const eMax = Math.max(...pts.map(p => p.ele));
    const W = 340, H = 64, PX = 8, PY = 9;
    const sx = (x: number) => PX + (W - 2 * PX) * x / xMax;
    const sy = (e: number) => eMax === eMin ? H / 2 : PY + (H - 2 * PY) * (eMax - e) / (eMax - eMin);
    const line = pts.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)} ${sy(p.ele).toFixed(1)}`).join(' ');
    const first = pts[0], peak = pts.reduce((a, b) => b.ele > a.ele ? b : a), end = pts[pts.length - 1];
    return {
      line,
      area: `${line} L${sx(end.x).toFixed(1)} ${H - 2} L${sx(first.x).toFixed(1)} ${H - 2} Z`,
      x0: sx(first.x), y0: sy(first.ele), x1: sx(end.x), y1: sy(end.ele),
      startCap: `${first.ele} m · ${short(first.name)}`,
      endCap: end.ele === peak.ele || end === peak
        ? `${end.ele} m · ${short(end.name)}`
        : `max ${peak.ele} m · ${short(peak.name)}`
    };
  });

  /** Route-borne cautions for the crossed marked routes (composed tracks). */
  protected readonly warnings = computed<string[]>(() => {
    if (this.route()) return [];
    const out = new Set<string>();
    for (const rid of new Set(this.dayTrails().flat().flatMap(l => l.routeIds))) {
      const w = this.dbs.route(rid)?.winter;
      if (w?.ro && /pericul|nerecomandat/i.test(w.ro)) out.add(w.ro);
    }
    return [...out];
  });

  protected readonly estimated = computed(() =>
    this.dayTrails().flat().some(l => l.estimated));

  protected readonly descriptionNotes = computed(() => {
    const r = this.route();
    if (!r) return [];
    const rows: { key: string; text: ProseFact }[] = [];
    const push = (key: string, f?: ProseFact) => { if (f?.ro) rows.push({ key, text: f }); };
    push('detail.access', r.access);
    push('detail.winter', r.winter);
    push('detail.water', r.water);
    push('detail.lodging', r.lodging);
    return rows;
  });

  /** Notes of the reserves/sights the track passes — the old "Flora și fauna" panel. */
  protected readonly natureNotes = computed(() => {
    const ids = this.route()?.waypointSequence ??
      this.catalog.chainWaypoints(this.composed() ?? []);
    return [...new Set(ids)]
      .filter(id => NATURE_WAYPOINTS.includes(id))
      .map(id => this.dbs.waypoint(id))
      .filter(wp => !!wp?.notes)
      .map(wp => ({ name: wp!.name.ro, notes: wp!.notes! }));
  });

  protected readonly sources = computed(() => {
    const r = this.route();
    const db = this.dbs.db();
    if (!r || !db) return [];
    const ids = new Set<string>();
    const facts: ({ sources?: string[] } | undefined)[] = [
      r.blaze, r.distanceKm, r.durationListed, r.durationReverse,
      r.ascentM, r.descentM, r.maxElevationM, r.difficulty,
      r.winter, r.water, r.lodging, r.access, r.safety
    ];
    for (const f of facts) for (const s of f?.sources ?? []) ids.add(s);
    return [...ids]
      .map(id => ({ id, ...db.sources[id] }))
      .filter(s => s.title);
  });

  protected goBack(): void {
    this.location.back();
  }
}

function fmt(minutes: number | null | undefined): string {
  if (minutes == null) return '—';
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;
}

/** First comma/paren-free part of a waypoint name, for the tight profile caption. */
function short(name: string): string {
  return name.split(/[(—–,]/)[0].trim();
}
