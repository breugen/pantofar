import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

import { TrailSearchComponent } from '../trail-search/trail-search.component';
import { TrailService } from '../trail.service';
import { HEROES } from '../mock-trails';

import { DashboardComponent } from './dashboard.component';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let trailService;
  let getTrailsSpy;

  beforeEach(waitForAsync(() => {
    trailService = jasmine.createSpyObj('TrailService', ['getTrails']);
    getTrailsSpy = trailService.getTrails.and.returnValue(of(HEROES));
    TestBed
        .configureTestingModule({
          declarations: [DashboardComponent, TrailSearchComponent],
          imports: [RouterTestingModule.withRoutes([])],
          providers: [{provide: TrailService, useValue: trailService}]
        })
        .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  it('should display "Top Trails" as headline', () => {
    expect(fixture.nativeElement.querySelector('h2').textContent).toEqual('Top Trails');
  });

  it('should call trailService', waitForAsync(() => {
       expect(getTrailsSpy.calls.any()).toBe(true);
     }));

  it('should display 4 links', waitForAsync(() => {
       expect(fixture.nativeElement.querySelectorAll('a').length).toEqual(4);
     }));
});
