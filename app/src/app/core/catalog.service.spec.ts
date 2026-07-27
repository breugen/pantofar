import { TestBed } from '@angular/core/testing';
import { CatalogService } from './catalog.service';
import { DbService } from './db.service';
import { RarauDb } from './model/db';
import dbJson from '../../../../data/rarau.json';

/** The category catalog (engine-built track lists) on the real database. */
describe('CatalogService on the Rarău database', () => {
  let catalog: CatalogService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    TestBed.inject(DbService).loadData(dbJson as unknown as RarauDb);
    catalog = TestBed.inject(CatalogService);
  });

  it('builds a mixed list (official + engine suggestions) for every category', () => {
    for (const type of [1, 2, 3, 4]) {
      const offers = catalog.offersForType(type);
      expect(offers.length).toBeGreaterThan(0);
      expect(offers.some(o => o.kind === 'generated')).toBe(true);
    }
    expect(catalog.offersForType(2).some(o => o.id === '16MN17')).toBe(true);
  });

  it('keeps engine strolls inside the stroll budget', () => {
    for (const o of catalog.offersForType(1).filter(o => o.kind === 'generated')) {
      expect(o.minutes!).toBeLessThanOrEqual(180);
      expect(o.days).toBe(1);
    }
  });

  it('addresses composed tracks by a parseable, deterministic chain id', () => {
    const generated = catalog.offersForType(2).filter(o => o.kind === 'generated');
    expect(generated.length).toBeGreaterThan(0);
    for (const o of generated) {
      const days = catalog.parseComposedId(o.id);
      expect(days).not.toBeNull();
      const wps = catalog.chainWaypoints(days!);
      expect(wps[0]).toBe(o.endpoints[0]);
      expect(wps[wps.length - 1]).toBe(o.endpoints[1]);
      expect(catalog.titleFor(days!).length).toBeGreaterThan(0);
    }
  });

  it('rejects malformed composed ids', () => {
    expect(catalog.parseComposedId('16MN17')).toBeNull();
    expect(catalog.parseComposedId('s01.sXX')).toBeNull();
    expect(catalog.parseComposedId('s01.s999')).toBeNull();
  });

  it('gives weekend categories two-day offers', () => {
    const daisy = catalog.offersForType(3).filter(o => o.kind === 'generated');
    const star = catalog.offersForType(4).filter(o => o.kind === 'generated');
    expect(daisy.every(o => o.days === 2 && o.roundtrip)).toBe(true);
    expect(star.some(o => o.days === 2)).toBe(true);
  });
});
