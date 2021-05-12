import { Injectable } from "@angular/core";

import { default as trails } from './trails' ;
import { default as cities } from './cities' ;
import { default as trailDetails } from './trailDetails' ;

@Injectable({
    providedIn: "root"
})
export class Database {

    getTrails() {
        return trails;
    }

    getCities() {
        return cities;
    }

    getTrailDetails() {
        return trailDetails;
    }
}