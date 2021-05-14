
// A blaze in the beginning meant "a mark made on a tree by slashing the bark"
export enum Blaze {
  RED_CROSS = 'plus red',
  RED_STRIPE = 'minus red',
  RED_DOT = 'circle red',
  RED_TRIANGLE = 'caret-up red',
  YELLOW_CROSS = 'plus yellow',
  YELLOW_STRIPE = 'minus yellow',
  YELLOW_DOT = 'circle yellow',
  YELLOW_TRIANGLE = 'caret-up yellow',
  BLUE_CROSS = 'plus blue',
  BLUE_STRIPE = 'minus blue',
  BLUE_DOT = 'circle blue',
  BLUE_TRIANGLE = 'caret-up blue'
}

export class City {
  code: string;
  active?: boolean;
  name: string;

  constructor() {
  }
}

export interface TrailDetail {
  id: number,
  pictures?: Array<Object>,
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
export class Trail {
  id: number;
  trailDetailId?: number;
  type?: number;
  name?: string;
  massif?: string;
  blaze?: Blaze;
  pointShortList?: string[];
  pointLongList?: string[];
  segments: Trail[];
  // in minutes
  time?: number;
  reverseTime?: number;
  details: TrailDetail;
  cityCodes: string[];
  
  constructor() {
  }

  get startBlaze(): Blaze {
    return this.blaze ? this.blaze : this.segments[0].blaze;
  }

  get title(): string {
    return this.name ? this.name : this.pointShortList.join(' - ');
  }

  isRoundTrip(): boolean {
    if (!Array.isArray(this.pointShortList) || !this.pointShortList.length) {
      return false;
    } else {
      return this.pointShortList[0] ===
        this.pointShortList[this.pointShortList.length - 1];
    }
  }

  mergeSegments(): void {
    if (Array.isArray(this.segments) && this.segments.length) {
      // this trails is defined with segments -> calculate the totals
      // Usually there should not be more then 2-3 segments, we can loop
      // multiple times over this list without any penalty.
      if (!Array.isArray(this.pointShortList) || !this.pointShortList.length) {
        this.pointShortList = [];
        this.segments.forEach((segment, index) => {
          if (Array.isArray(segment.pointShortList) && segment.pointShortList.length) {
            // segment N starts with the last point of segment N-1 -> ignore it
            this.pointShortList = 
              this.pointShortList.concat(segment.pointShortList.slice(index ? 1 : 0));
          }
        });
      }

      if (!Array.isArray(this.pointShortList) || !this.pointShortList.length) {
        this.pointLongList = [];
        this.segments.forEach((segment, index) => {
          if (Array.isArray(segment.pointLongList) && segment.pointLongList.length) {
            // segment N starts with the last point of segment N-1 -> ignore it
            this.pointShortList = 
              this.pointLongList.concat(segment.pointLongList.slice(index ? 1 : 0));
          }
        });
      }

      if (!this.time && this.segments[0].time) {
        this.time = 0;
        this.segments.forEach((segment) => {
          this.time += segment.time;
        });
      }

      if (!this.reverseTime && this.segments[0].reverseTime) {
        this.reverseTime = 0;
        this.segments.forEach((segment) => {
          this.reverseTime += segment.reverseTime;
        });
      }
    }
  }
}


