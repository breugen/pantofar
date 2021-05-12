import { Injectable } from '@angular/core';
import { InMemoryDbService } from 'angular-in-memory-web-api';
import { Trail } from './trail';
import { Database } from './database/database';

@Injectable({
  providedIn: 'root',
})
export class InMemoryDataService implements InMemoryDbService {

  createDb() {
    const database = new Database();
    const trails = database.getTrails();
    const cities = database.getCities();
    const trailDetails = database.getTrailDetails();
    return {
      trails,
      cities,
      trailDetails
    };
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
