import { Component, OnInit } from '@angular/core';

@Component({
    selector: 'blaze',
    styleUrls: [ './blaze.component.css' ],
    inputs: ['form', 'size', 'caretSize'],
    template: `
      <i class="fas fa-{{form}} fa-{{bestSize}}"></i>
    `
  })
  export class BlazeComponent implements OnInit {
    form: string;
    size: string;
    caretSize: string;
    bestSize: string;
    
    ngOnInit(): void {
      this.bestSize = this.form.startsWith('caret') ? this.caretSize : this.size;
    }
  }