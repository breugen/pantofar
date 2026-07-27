import { Trail } from './trail';

function seg(id: string, points: string[], time: number, reverseTime: number, extra: Partial<Trail> = {}): Trail {
  const t = new Trail();
  t.id = id;
  t.pointShortList = points;
  t.pointLongList = points;
  t.time = time;
  t.reverseTime = reverseTime;
  Object.assign(t, extra);
  return t;
}

describe('Trail.mergeSegments', () => {
  it('aggregates the short point list, dropping duplicated joints', () => {
    const t = Trail.compose('route', 'r1', [
      seg('a', ['Gara', 'Mănăstire'], 120, 90),
      seg('b', ['Mănăstire', 'Hotel'], 180, 150)
    ]);
    expect(t.pointShortList).toEqual(['Gara', 'Mănăstire', 'Hotel']);
  });

  it('aggregates the LONG point list too (regression: the 2020 bug dropped it)', () => {
    const a = seg('a', ['A', 'B'], 60, 60);
    a.pointLongList = ['A', 'a1', 'B'];
    const b = seg('b', ['B', 'C'], 60, 60);
    b.pointLongList = ['B', 'b1', 'C'];
    const t = Trail.compose('route', 'r1', [a, b]);
    expect(t.pointLongList).toEqual(['A', 'a1', 'B', 'b1', 'C']);
    // the old bug overwrote pointShortList instead — make sure it is intact
    expect(t.pointShortList).toEqual(['A', 'B', 'C']);
  });

  it('sums both directions of time and the physical totals', () => {
    const t = Trail.compose('itinerary', 'i1', [
      seg('a', ['A', 'B'], 100, 80, { distanceKm: 4.2, ascentM: 300, descentM: 50 }),
      seg('b', ['B', 'A'], 45, 90, { distanceKm: 3.1, ascentM: 20, descentM: 260 })
    ]);
    expect(t.time).toBe(145);
    expect(t.reverseTime).toBe(170);
    expect(t.distanceKm).toBeCloseTo(7.3);
    expect(t.ascentM).toBe(320);
    expect(t.descentM).toBe(310);
  });

  it('does not overwrite authoritative totals set before merging', () => {
    const t = new Trail();
    t.time = 300; // published duration wins
    t.segments = [seg('a', ['A', 'B'], 100, 80), seg('b', ['B', 'C'], 100, 80)];
    t.mergeSegments();
    expect(t.time).toBe(300);
    expect(t.reverseTime).toBe(160);
  });

  it('detects circuits from the aggregated points', () => {
    const t = Trail.compose('itinerary', 'i1', [
      seg('a', ['Hotel', 'Vârf'], 60, 40),
      seg('b', ['Vârf', 'Hotel'], 40, 60)
    ]);
    expect(t.isRoundTrip()).toBe(true);
    expect(t.title).toBe('Hotel – Vârf – Hotel');
  });

  it('collects route provenance and the estimated flag from parts', () => {
    const a = seg('a', ['A', 'B'], 60, 60);
    a.routeIds = ['16MN17'];
    const b = seg('b', ['B', 'C'], 10, 10);
    b.routeIds = [];
    b.estimated = true;
    const t = Trail.compose('itinerary', 'i1', [a, b]);
    expect(t.routeIds).toEqual(['16MN17']);
    expect(t.estimated).toBe(true);
  });
});
