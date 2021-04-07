import { Component, OnInit } from '@angular/core';

import { Trail } from '../trail';
import { TrailService } from '../trail.service';

@Component({
  selector: 'app-trails',
  templateUrl: './trails.component.html',
  styleUrls: ['./trails.component.css']
})
export class TrailsComponent implements OnInit {
  trails: Trail[];

  constructor(private trailService: TrailService) { }

  ngOnInit() {
    this.getTrails();
  }

  getTrails(): void {
    this.trailService.getTrails()
    .subscribe(trails => this.trails = trails);
  }

  add(name: string): void {
    name = name.trim();
    if (!name) { return; }
    this.trailService.addTrail({ name } as Trail)
      .subscribe(trail => {
        this.trails.push(trail);
      });
  }

  delete(trail: Trail): void {
    this.trails = this.trails.filter(h => h !== trail);
    this.trailService.deleteTrail(trail.id).subscribe();
  }

}
