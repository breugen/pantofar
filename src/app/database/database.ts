import { Injectable } from "@angular/core";

import { default as trails } from './trails' ;
import { default as cities } from './cities' ;

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
}