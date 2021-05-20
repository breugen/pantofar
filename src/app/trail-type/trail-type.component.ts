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
                this.description =`
                  Plimbari usoare care nu necesita echipament profesionist si cazare.
                `;
                break;
            case 2:
                this.description = `
                  Drumetii de o zi care nu necesita cazare.
                `;
                break;
            case 3:
                this.description = `
                  Drumetii de weekend, de dificultate medie, cu posibilitati de
                  cazare in regim de pensiune. 
                `;
                break;
            case 4:
                this.description = `
                  Plimbari de weekend cu posibilitati de cazare intr-un regim
                  de confort sporit.
                `;
        };
    }

  }