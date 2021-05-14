import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { map, mergeMap } from 'rxjs/operators';
import { plainToClass } from 'class-transformer'
import { ImageItem } from 'ng-gallery';

import { Trail, TrailDetail } from '../trail';
import { TrailService } from '../trail.service';

@Component({
  selector: 'trail-detail',
  templateUrl: './trail-detail.component.html',
  styleUrls: [ './trail-detail.component.css' ]
})
export class TrailDetailComponent implements OnInit {
  trail: Trail;
  trailDetail: TrailDetail;
  segments: Trail[];
  images: Object[];

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
    this.trailService.getTrail(id).pipe(
      map(trail => {
        this.trail = plainToClass(Trail, trail);
        if (Array.isArray(this.trail.segments)) {
          this.trail.mergeSegments();
          this.segments =
            this.trail.segments.map((segment: Trail) => plainToClass(Trail, segment));
        }
        return this.trail;
      }),
      mergeMap(trail => this.trailService.getTrailDetail(trail.trailDetailId))
    ).subscribe(trailDetail => {
      this.trailDetail = trailDetail;
      if (Array.isArray(this.trailDetail.pictures)) {
        this.images = this.trailDetail.pictures.map(picture => {
          // if you ever want to add an image title:
          // https://github.com/MurhafSousli/ngx-gallery/wiki/Advanced-Usage
          return new ImageItem({src: picture['url']});
        });
      }
    });
  }

  goBack(): void {
    this.location.back();
  }
}
