import {Component, ViewChild, AfterViewInit, AfterContentInit} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {MatPaginator} from '@angular/material/paginator';
import {MatSort} from '@angular/material/sort';
import {fromEventPattern, merge, Observable, of as observableOf} from 'rxjs';
import {catchError, map, startWith, switchMap} from 'rxjs/operators';
import { Trail, City } from '../trail';
import { TrailService } from '../trail.service';
import { MatSelect } from '@angular/material/select';
import { MatCheckbox } from '@angular/material/checkbox';

/**
 * @title Table retrieving data through HTTP
 */
@Component({
  selector: 'trails',
  styleUrls: ['trails.component.css'],
  templateUrl: 'trails.component.html',
})
export class TrailsComponent implements AfterViewInit  {

  // if you change page size you also need to update the template, Or pass it!
  static readonly pageSize: number = 5;
  displayedColumns: string[] = ['title', 'massif', 'time'];
  filteredAndPagedIssues: Observable<Trail[]>;
  cities: Observable<City[]>;

  resultsLength = 0;
  isLoadingResults = true;
  selectedCity = 'IS';
  isRoundTrip = true;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatSelect) select: MatSelect;
  @ViewChild(MatCheckbox) checkbox: MatCheckbox;

  constructor(
    private route: ActivatedRoute,
    private trailService: TrailService
  ) {}

  static pageSlice(data: Trail[], pageIndex: number) {
    return data.slice(pageIndex * this.pageSize, (pageIndex + 1) * this.pageSize);
  }

  ngOnInit() {
    this.filteredAndPagedIssues = observableOf([]);
    this.cities = this.trailService.getCities();
  }

  ngAfterViewInit() {
    this.filteredAndPagedIssues = merge(
      this.sort.sortChange,
      this.paginator.page,
      this.select.selectionChange,
      this.checkbox.change)
      .pipe(
        startWith({}),
        switchMap(() => {
          const type = +this.route.snapshot.paramMap.get('type');
          this.isLoadingResults = true;
          return this.trailService.getTrails(type, this.sort.active,
            this.sort.direction, this.selectedCity ? this.selectedCity : 'IS',
            this.isRoundTrip);
        }),
        map(data => {
          // Flip flag to show that loading has finished.
          this.isLoadingResults = false;
          this.resultsLength = data.length;
          return TrailsComponent.pageSlice(data, this.paginator.pageIndex);
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