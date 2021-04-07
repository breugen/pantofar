import { Component, OnInit } from '@angular/core';
import { Trail } from '../trail';
import { TrailService } from '../trail.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: [ './dashboard.component.css' ]
})
export class DashboardComponent implements OnInit {
  trails: Trail[] = [];

  constructor(private trailService: TrailService) { }

  ngOnInit() {
    this.getTrails();
  }

  getTrails(): void {
    this.trailService.getTrails()
      .subscribe(trails => this.trails = trails.slice(1, 5));
  }
}
