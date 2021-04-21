
// A blaze in the beginning meant "a mark made on a tree by slashing the bark"
enum Blaze {
  RED_CROSS = 'cruce rosie',
  RED_STRIPE = 'banda rosie',
  RED_DOT = 'punct rosu',
  RED_TRIANGLE = 'triunghi rosu',
  YELLOW_CROSS = 'cruce galbena',
  YELLOW_STRIPE = 'banda galbena',
  YELLOW_DOT = 'punct galben',
  YELLOW_TRIANGLE = 'triunghi galben',
  BLUE_CROSS = 'cruce albastra',
  BLUE_STRIPE = 'banda albastra',
  BLUE_DOT = 'punct albastru',
  BLUE_TRIANGLE = 'triunghi albastru'
}

interface TrailDetail {
  description?: string,
  // for things like 'forbidden in winter'
  restrictions?: string,
  water?: string,
  equipment?: string,
  wildlife?: string
}

// A lof of optional properties, since we can use this interface to define
// a segment of a trail as well, but also a full trail, so we keep things
// very flexible.
export interface Trail {
  id: number;
  type?: number;
  name?: string;
  massif?: string;
  blaze?: Blaze;
  pointShortList?: string[];
  pointLongList?: string[];
  segments: Trail[],
  // in minutes
  time?: number,
  reverseTime?: number,
  details: TrailDetail
}


