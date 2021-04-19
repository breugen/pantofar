import {Component, ViewChild, AfterViewInit, AfterContentInit} from '@angular/core';
import {MatPaginator} from '@angular/material/paginator';
import {MatSort} from '@angular/material/sort';
import {fromEventPattern, merge, Observable, of as observableOf} from 'rxjs';
import {catchError, map, startWith, switchMap} from 'rxjs/operators';
import { Trail } from '../trail';
import { TrailService } from '../trail.service';

/**
 * @title Table retrieving data through HTTP
 */
@Component({
  selector: 'trails',
  styleUrls: ['trails.component.css'],
  templateUrl: 'trails.component.html',
})
export class TrailsComponent implements AfterViewInit  {
  displayedColumns: string[] = ['id', 'name'];
  filteredAndPagedIssues: Observable<Trail[]>;

  resultsLength = 0;
  isLoadingResults = true;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  constructor(
    private trailService: TrailService
  ) {}

  ngOnInit() {
    this.filteredAndPagedIssues = observableOf([]);
  }

  ngAfterViewInit() {
    this.filteredAndPagedIssues = merge(this.sort.sortChange, this.paginator.page)
      .pipe(
        startWith({}),
        switchMap(() => {
          this.isLoadingResults = true;
          return this.trailService.getTrails(this.sort.active, this.sort.direction, this.paginator.pageIndex);
        }),
        map(data => {
          // Flip flag to show that loading has finished.
          this.isLoadingResults = false;
          this.resultsLength = data.length;
          return data;
        }),
        catchError(() => {
          this.isLoadingResults = false;
          return observableOf([]);
        })
      );
  }

  resetPaging(): void {
    this.paginator.pageIndex = 0;
  }
}