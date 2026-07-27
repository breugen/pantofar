import { DbRoute, LocalizedText } from './model/db';

/**
 * The four outing types from the original Poteci concept (docs/Poteci.md),
 * in increasing order of duration. The database carries no type field —
 * membership is derived here from duration, difficulty and lodging, and a
 * route may naturally serve several types.
 */
export interface TrailType {
  type: 1 | 2 | 3 | 4;
  caption: LocalizedText;
  listTitle: LocalizedText;
  description: LocalizedText;
  /** Short line under the name on the home card (ui-concept-v1). */
  sub: LocalizedText;
  /** Duration range shown on the right of the home card. */
  dur: LocalizedText;
  icon: 'walk' | 'sun' | 'daisy' | 'star';
}

export const TRAIL_TYPES: TrailType[] = [
  {
    type: 1,
    icon: 'walk',
    caption: { ro: 'Plimbare', en: 'Stroll' },
    listTitle: { ro: 'Plimbări scurte', en: 'Short strolls' },
    sub: { ro: 'Ușoară, fără echipament special', en: 'Easy, no special gear' },
    dur: { ro: '1–2 h', en: '1–2 h' },
    description: {
      ro: 'Plimbări ușoare care nu necesită echipament profesionist și cazare.',
      en: 'Easy strolls that need no professional gear and no overnight stay.'
    }
  },
  {
    type: 2,
    icon: 'sun',
    caption: { ro: 'Drumeție de zi', en: 'Day hike' },
    listTitle: { ro: 'Drumeții de o zi', en: 'Day hikes' },
    sub: { ro: 'O zi plină, fără cazare', en: 'A full day, no overnight' },
    dur: { ro: '3–8 h', en: '3–8 h' },
    description: {
      ro: 'Drumeții de o zi care nu necesită cazare.',
      en: 'Full-day hikes that need no overnight stay.'
    }
  },
  {
    type: 3,
    icon: 'daisy',
    caption: { ro: 'Weekend margaretă', en: 'Daisy weekend' },
    listTitle: { ro: 'Drumeții de weekend', en: 'Weekend hikes' },
    sub: { ro: 'Două zile, dormi la pensiune', en: 'Two days, sleep at a guesthouse' },
    dur: { ro: '2 zile', en: '2 days' },
    description: {
      ro: 'Drumeții de weekend, de dificultate medie, cu posibilități de cazare în regim de pensiune.',
      en: 'Weekend hikes of medium difficulty, with guesthouse lodging in the valley villages.'
    }
  },
  {
    type: 4,
    icon: 'star',
    caption: { ro: 'Weekend stea', en: 'Star weekend' },
    listTitle: { ro: 'Plimbări de weekend', en: 'Weekend walks' },
    sub: { ro: 'Două zile, confort la hotel', en: 'Two days, hotel comfort' },
    dur: { ro: '2 zile', en: '2 days' },
    description: {
      ro: 'Plimbări de weekend cu posibilități de cazare într-un regim de confort sporit.',
      en: 'Weekend walks based at comfortable mountain lodging (Hotel Rarău, reachable by car).'
    }
  }
];

export function trailType(type: number): TrailType | undefined {
  return TRAIL_TYPES.find(t => t.type === type);
}

/** Derivation rules — deliberately simple and visible; refine at validation time. */
export function routeMatchesType(route: DbRoute, type: number): boolean {
  const minutes = route.durationListed.minutes ?? Number.POSITIVE_INFINITY;
  const easyShort = route.difficulty.value === 'ușor' && minutes <= 150;
  switch (type) {
    case 1: // strolls: genuinely easy and short
      return easyShort;
    case 2: // day hikes: anything walkable inside a day that outgrew type 1
      return minutes <= 480 && !easyShort;
    case 3: // daisy weekends: the serious medium legs around village guesthouses
      return minutes >= 360 && route.difficulty.value === 'mediu';
    case 4: // star weekends: everything based on (or reaching) Hotel Rarău
      return route.waypointSequence.includes('hotel-rarau');
    default:
      return false;
  }
}

const GIUMALAU_IDS = new Set([
  'vf-giumalau', 'cabana-giumalau', 'polita-caprelor', 'junction-zmarzii', 'poiana-ciungi'
]);
const RARAU_IDS = new Set([
  'hotel-rarau', 'vf-rarau', 'pietrele-doamnei', 'saua-ciobanilor', 'popii-raraului',
  'muntele-todirescu', 'saua-fundul-colbului', 'man-sihastria', 'schitul-rarau', 'curmatura-prislop'
]);

export function massifOfWaypoints(ids: string[]): string {
  const inG = ids.some(id => GIUMALAU_IDS.has(id));
  const inR = ids.some(id => RARAU_IDS.has(id));
  if (inG && inR) return 'Rarău–Giumalău';
  if (inG) return 'Giumalău';
  return 'Rarău';
}

export function massifOf(route: DbRoute): string {
  return massifOfWaypoints(route.waypointSequence);
}

/** Access settlements for the "near the town of…" filter (was: cities). */
export interface Locality {
  id: string;
  name: string;
  waypoints: string[];
}

export const LOCALITIES: Locality[] = [
  { id: 'campulung', name: 'Câmpulung Moldovenesc', waypoints: ['gara-campulung', 'gara-campulung-est', 'th-campulung-sirenei', 'th-campulung-valea-seaca', 'dn17-valea-caselor'] },
  { id: 'pojorata', name: 'Pojorâta', waypoints: ['sat-pojorata', 'gara-pojorata', 'dj175b-chilia'] },
  { id: 'valea-putnei', name: 'Valea Putnei', waypoints: ['sat-valea-putnei', 'halta-valea-putnei', 'pasul-mestecanis'] },
  { id: 'rusca', name: 'Rusca', waypoints: ['sat-rusca'] },
  { id: 'chiril', name: 'Chiril', waypoints: ['sat-chiril', 'th-chiril-dj175a', 'schitul-rarau'] },
  { id: 'slatioara', name: 'Slătioara', waypoints: ['sat-slatioara', 'th-slatioara'] },
  { id: 'zugreni', name: 'Cheile Zugrenilor', waypoints: ['popas-zugreni'] },
  { id: 'gemenea', name: 'Gemenea', waypoints: ['sat-gemenea'] }
];

export function routeNearLocality(route: DbRoute, locality: Locality): boolean {
  return locality.waypoints.includes(route.from) || locality.waypoints.includes(route.to);
}
