import { TestBed } from '@angular/core/testing';
import { DbService } from './db.service';
import { GraphService } from './graph.service';
import { RarauDb } from './model/db';
import dbJson from '../../../../data/rarau.json';

/** The DB→graph bridge exercised against the real shipped database. */
describe('GraphService on the Rarău database', () => {
  let graph: GraphService;
  let dbs: DbService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    dbs = TestBed.inject(DbService);
    dbs.loadData(dbJson as unknown as RarauDb);
    graph = TestBed.inject(GraphService);
  });

  it('exposes the Pietrele Doamnei circuit as three real edges, both directions', () => {
    const ids = new Set(graph.edges().map(e => e.segmentId));
    expect(ids.has('s52')).toBe(true);
    expect(ids.has('s53')).toBe(true);
    expect(ids.has('s54')).toBe(true);
    const s52 = graph.edges().filter(e => e.segmentId === 's52');
    expect(s52.length).toBe(2);
    expect(s52.map(e => e.from).sort()).toEqual(['hotel-rarau', 'pietrele-doamnei']);
  });

  it('connects the parkings and Gara Pojorâta to the graph', () => {
    const adj = graph.adjacency();
    for (const id of ['parcare-hotel', 'parcare-sihastria', 'parcare-cota-1400', 'gara-pojorata']) {
      expect(adj.has(id)).toBe(true);
    }
  });

  it('carries via milestones on edges and into the leg point lists', () => {
    const s29 = graph.edges().find(e => e.segmentId === 's29' && e.from === 'junction-13x14')!;
    expect(s29.viaIds).toContain('izvor-transrarau');
    const leg = graph.segmentTrail('s29', true);
    expect(leg.pointLongList).toContain('Izvor la DJ175B (vest de hotel)');
    // reversed direction reverses the via order too
    const back = graph.segmentTrail('s16', false);
    expect(back.pointLongList).toEqual([
      'Polița Caprelor', 'Izvor lângă Cabana Giumalău', 'Cabana Giumalău'
    ]);
  });

  it('interleaves via rows with interpolated times in route milestones', () => {
    const rows = graph.milestones(dbs.route('16MN14')!);
    const via = rows.find(r => r.id === 'izvor-transrarau');
    expect(via?.via).toBe(true);
    expect(via?.cumMinutes).toBeGreaterThan(0);
    const hotel = rows[rows.length - 1];
    expect(hotel.id).toBe('hotel-rarau');
    expect(via!.cumMinutes!).toBeLessThan(hotel.cumMinutes!);
  });

  it('composes 16MN20 as a walkable roundtrip through the signpost junction', () => {
    const t = graph.routeTrail('16MN20')!;
    expect(t.segments.length).toBe(3);
    expect(t.isRoundTrip()).toBe(true);
    expect(t.pointShortList).toContain('Pietrele Doamnei');
  });
});
