import { Component, OnInit, Input } from '@angular/core';
import { Trail } from '../trail';

@Component({
    selector: 'segment',
    styleUrls: [ './segment.component.css' ],
    template: `
        <blaze form="{{trailSegment.blaze}}" size="lg" caretSize="2x"></blaze>
        <i>{{trailSegment.time | duration}}</i> |
        <span *ngIf="trailSegment.pointLongList?.length >= trailSegment.pointShortList?.length">
          {{trailSegment.pointLongList.join(' - ')}}
        </span>
        <span *ngIf="trailSegment.pointLongList?.length < trailSegment.pointShortList?.length">
          {{trailSegment.pointShortList.join(' - ')}}
        </span>
    `
  })
  export class SegmentComponent implements OnInit {
    @Input() trailSegment: Trail;
    
    ngOnInit(): void {
      
    }
  }