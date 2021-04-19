import { Injectable } from '@angular/core';
import { InMemoryDbService } from 'angular-in-memory-web-api';
import { Trail } from './trail';

@Injectable({
  providedIn: 'root',
})
export class InMemoryDataService implements InMemoryDbService {
  createDb() {
    const trails = [
      { id: 11, name: 'Dr Nice', type: 1 },
      { id: 12, name: 'Narco', type: 2 },
      { id: 13, name: 'Bombasto', type: 1 },
      { id: 14, name: 'Celeritas', type: 2 },
      { id: 15, name: 'Magneta', type: 1 },
      { id: 16, name: 'RubberMan', type: 1 },
      { id: 17, name: 'Dynama', type: 1 },
      { id: 18, name: 'Dr IQ', type: 1 },
      { id: 19, name: 'Magma', type: 1 },
      { id: 20, name: 'Tornado', type: 1 }
    ];
    return {trails};
  }

  // Overrides the genId method to ensure that a trail always has an id.
  // If the trails array is empty,
  // the method below returns the initial number (11).
  // if the trails array is not empty, the method below returns the highest
  // trail id + 1.
  genId(trails: Trail[]): number {
    return trails.length > 0 ? Math.max(...trails.map(trail => trail.id)) + 1 : 11;
  }
}
