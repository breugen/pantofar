import { Injectable } from "@angular/core";

import { default as trails } from './trails.js' ;

@Injectable({
    providedIn: "root"
})
export class Database {

    getTrails() {
        return trails;
    }
}