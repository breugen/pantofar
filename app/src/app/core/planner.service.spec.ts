import { TestBed } from '@angular/core/testing';
import { DbService } from './db.service';
import { RarauDb } from './model/db';
import { Itinerary, PlannerService } from './planner.service';
import dbJson from '../../../../data/rarau.json';

/** Share of an itinerary's minutes spent re-walking a segment (from leg ids). */
function repeatShare(it: Itinerary): number {
  const seen = new Set<string>();
  let total = 0, repeated = 0;
  for (const leg of it.trail.segments) {
    const sid = leg.id.replace(/:r$/, '');
    const m = leg.time ?? 0;
    total += m;
    if (seen.has(sid)) repeated += m;
    else seen.add(sid);
  }
  return total ? repeated / total : 0;
}

/** The planner exercised against the real shipped database. */
describe('PlannerService on the Rarău database', () => {
  let planner: PlannerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    TestBed.inject(DbService).loadData(dbJson as unknown as RarauDb);
    planner = TestBed.inject(PlannerService);
  });

  it('finds one-day circuits from Câmpulung Est inside the budget', () => {
    const trips = planner.generate({ startId: 'gara-campulung-est', budgetMinutes: 420, days: 1 });
    expect(trips.length).toBeGreaterThan(0);
    for (const trip of trips) {
      expect(trip.totalMinutes).toBeLessThanOrEqual(420);
      expect(trip.trail.isRoundTrip()).toBe(true);
      expect(trip.days.length).toBe(1);
    }
  });

  it('finds circuits from the Hotel Rarău parking with a small budget', () => {
    const trips = planner.generate({ startId: 'hotel-rarau', budgetMinutes: 240, days: 1 });
    expect(trips.length).toBeGreaterThan(0);
  });

  it('builds two-day trips with a mountain overnight', () => {
    const trips = planner.generate({ startId: 'gara-campulung-est', budgetMinutes: 420, days: 2 });
    expect(trips.length).toBeGreaterThan(0);
    for (const trip of trips) {
      expect(trip.days.length).toBe(2);
      expect(trip.overnightAt).toBeDefined();
      for (const day of trip.days) {
        expect(day.minutes).toBeLessThanOrEqual(420);
      }
    }
  });

  it('never routes over the Salvamont-excluded trail (16MN15)', () => {
    const trips = [
      ...planner.generate({ startId: 'gara-campulung-est', budgetMinutes: 480, days: 1 }),
      ...planner.generate({ startId: 'gara-campulung-est', budgetMinutes: 420, days: 2 })
    ];
    const usedRoutes = new Set(trips.flatMap(t => t.trail.routeIds));
    expect(usedRoutes.has('16MN15')).toBe(false);
  });

  it('prefers circuits that avoid re-walking the same path', () => {
    const trips = planner.generate({ startId: 'hotel-rarau', budgetMinutes: 300, days: 1 });
    expect(trips.length).toBeGreaterThan(0);
    const shares = trips.map(repeatShare);
    expect(Math.min(...shares)).toBe(0);          // a pure loop exists…
    expect(shares[0]).toBeLessThanOrEqual(1 / 3); // …and out-and-backs don't win
  });

  it('weaves the Pietrele Doamnei circuit into itineraries from the hotel', () => {
    const trips = planner.generate({ startId: 'hotel-rarau', budgetMinutes: 300, days: 1 });
    const names = trips.flatMap(t => t.trail.pointShortList ?? []);
    expect(names).toContain('Pietrele Doamnei');
  });

  it('plans one-day traverses between two different points', () => {
    const trips = planner.generate({
      startId: 'gara-campulung-est', endId: 'hotel-rarau', budgetMinutes: 480, days: 1
    });
    expect(trips.length).toBeGreaterThan(0);
    for (const trip of trips) {
      const points = trip.trail.pointShortList!;
      expect(points[0]).toBe('Gara Câmpulung Est');
      expect(points[points.length - 1]).toBe('Hotel Alpin Rarău');
      expect(trip.trail.isRoundTrip()).toBe(false);
      expect(trip.totalMinutes).toBeLessThanOrEqual(480);
      expect(repeatShare(trip)).toBe(0); // simple paths never reuse a segment
    }
  });

  it('plans two-day traverses with an overnight between start and destination', () => {
    const trips = planner.generate({
      startId: 'gara-campulung-est', endId: 'popas-zugreni', budgetMinutes: 480, days: 2
    });
    expect(trips.length).toBeGreaterThan(0);
    for (const trip of trips) {
      expect(trip.days.length).toBe(2);
      expect(trip.overnightAt).toBeDefined();
      const points = trip.trail.pointShortList!;
      expect(points[0]).toBe('Gara Câmpulung Est');
      expect(points[points.length - 1]).toBe('Popas Zugreni (Cheile Zugrenilor)');
      for (const day of trip.days) expect(day.minutes).toBeLessThanOrEqual(480);
    }
  });

  it('can start from a car park thanks to the access edges', () => {
    const trips = planner.generate({ startId: 'parcare-cota-1400', budgetMinutes: 360, days: 1 });
    expect(trips.length).toBeGreaterThan(0);
    for (const trip of trips) expect(trip.trail.isRoundTrip()).toBe(true);
  });
});
