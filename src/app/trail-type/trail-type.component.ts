import { Component, Inject, OnInit } from '@angular/core';
import { MAT_SNACK_BAR_DATA } from '@angular/material/snack-bar';

@Component({
    template: `
      <div class="description">
        {{description}}
      </div>
    `
  })
  export class TrailTypeComponent implements OnInit {

    constructor(@Inject(MAT_SNACK_BAR_DATA) public data: Object) { }
    description: string;

    ngOnInit(): void {
        switch (this.data['type']) {
            case 1:
                this.description = 'type 1';
                break;
            case 2:
                this.description = 'type 2';
                break;
            case 3:
                this.description = 'type 3';
                break;
            case 4:
                this.description = 'type 4';
        };
    }

  }