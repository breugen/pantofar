import { Component, OnInit } from '@angular/core';

import { Observable, Subject } from 'rxjs';

import {
   debounceTime, distinctUntilChanged, switchMap
 } from 'rxjs/operators';

import { Trail } from '../trail';
import { TrailService } from '../trail.service';

@Component({
  selector: 'app-trail-search',
  templateUrl: './trail-search.component.html',
  styleUrls: [ './trail-search.component.css' ]
})
export class TrailSearchComponent implements OnInit {
  trails$: Observable<Trail[]>;
  private searchTerms = new Subject<string>();

  constructor(private trailService: TrailService) {}

  // Push a search term into the observable stream.
  search(term: string): void {
    this.searchTerms.next(term);
  }

  ngOnInit(): void {
    this.trails$ = this.searchTerms.pipe(
      // wait 300ms after each keystroke before considering the term
      debounceTime(300),

      // ignore new term if same as previous term
      distinctUntilChanged(),

      // switch to new search observable each time the term changes
      switchMap((term: string) => this.trailService.searchTrails(term)),
    );
  }
}
