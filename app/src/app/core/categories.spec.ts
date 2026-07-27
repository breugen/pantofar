import { TRAIL_TYPES, massifOf, routeMatchesType } from './categories';
import { RarauDb } from './model/db';
import dbJson from '../../../../data/rarau.json';

const db = dbJson as unknown as RarauDb;

describe('trail type derivation on the Rarău database', () => {
  it('places every route in at least one of the four types', () => {
    for (const route of db.routes) {
      const types = TRAIL_TYPES.filter(t => routeMatchesType(route, t.type));
      expect(types.length).toBeGreaterThan(0);
    }
  });

  it('keeps strolls genuinely easy', () => {
    const strolls = db.routes.filter(r => routeMatchesType(r, 1));
    expect(strolls.map(r => r.id)).toContain('16MN21');
    for (const r of strolls) {
      expect(r.difficulty.value).toBe('ușor');
      expect(r.durationListed.minutes!).toBeLessThanOrEqual(150);
    }
    // the chained Pietrele Doamnei circuit is short but rated dificil
    expect(strolls.map(r => r.id)).not.toContain('16MN20');
  });

  it('bases star weekends on Hotel Rarău', () => {
    for (const r of db.routes.filter(r => routeMatchesType(r, 4))) {
      expect(r.waypointSequence).toContain('hotel-rarau');
    }
  });

  it('assigns massifs from the waypoint sequence', () => {
    const byId = new Map(db.routes.map(r => [r.id, r]));
    expect(massifOf(byId.get('16MN05')!)).toBe('Giumalău');
    expect(massifOf(byId.get('16MN17')!)).toBe('Rarău');
    expect(massifOf(byId.get('16MN03')!)).toBe('Rarău–Giumalău');
  });
});
