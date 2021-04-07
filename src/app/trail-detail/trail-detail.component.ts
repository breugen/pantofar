import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';

import { Trail } from '../trail';
import { TrailService } from '../trail.service';

@Component({
  selector: 'app-trail-detail',
  templateUrl: './trail-detail.component.html',
  styleUrls: [ './trail-detail.component.css' ]
})
export class TrailDetailComponent implements OnInit {
  trail: Trail;

  constructor(
    private route: ActivatedRoute,
    private trailService: TrailService,
    private location: Location
  ) {}

  ngOnInit(): void {
    this.getTrail();
  }

  getTrail(): void {
    const id = +this.route.snapshot.paramMap.get('id');
    this.trailService.getTrail(id)
      .subscribe(trail => this.trail = trail);
  }

  goBack(): void {
    this.location.back();
  }

  save(): void {
    this.trailService.updateTrail(this.trail)
      .subscribe(() => this.goBack());
  }
}
