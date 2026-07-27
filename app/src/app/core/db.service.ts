import { Injectable, computed, signal } from '@angular/core';
import { DbRoute, DbSegment, DbWaypoint, RarauDb } from './model/db';

/** Loads the bundled region database (data/rarau.json) and indexes it. */
@Injectable({ providedIn: 'root' })
export class DbService {
  private readonly _db = signal<RarauDb | null>(null);
  private readonly _error = signal<string | null>(null);

  readonly db = this._db.asReadonly();
  readonly error = this._error.asReadonly();
  readonly ready = computed(() => this._db() !== null);

  readonly routes = computed<DbRoute[]>(() =>
    [...(this._db()?.routes ?? [])].sort((a, b) => a.id.localeCompare(b.id)));

  readonly waypointsById = computed(() =>
    new Map<string, DbWaypoint>((this._db()?.waypoints ?? []).map(w => [w.id, w])));

  readonly segmentsById = computed(() =>
    new Map<string, DbSegment>((this._db()?.segments ?? []).map(s => [s.id, s])));

  readonly routesById = computed(() =>
    new Map<string, DbRoute>((this._db()?.routes ?? []).map(r => [r.id, r])));

  waypoint(id: string): DbWaypoint | undefined { return this.waypointsById().get(id); }
  segment(id: string): DbSegment | undefined { return this.segmentsById().get(id); }
  route(id: string): DbRoute | undefined { return this.routesById().get(id); }

  /** Display name of a waypoint (proper nouns are language-independent). */
  waypointName(id: string): string {
    return this.waypoint(id)?.name.ro ?? id;
  }

  async load(): Promise<void> {
    try {
      const res = await fetch('data/rarau.json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      this.loadData(await res.json() as RarauDb);
    } catch (e) {
      this._error.set(e instanceof Error ? e.message : String(e));
    }
  }

  /** Direct injection of a database — used by tests and build tooling. */
  loadData(db: RarauDb): void {
    this._db.set(db);
  }
}
