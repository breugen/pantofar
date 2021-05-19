import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Trail } from '../trail';
import { TrailTypeComponent } from '../trail-type/trail-type.component';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: [ './dashboard.component.css' ]
})
export class DashboardComponent implements OnInit {
  trails: Trail[] = [];

  constructor(private _snackBar: MatSnackBar) {}

  ngOnInit() {}

  showTypeInfo(evt: Event, type: number) {
    evt.stopPropagation();
    evt.preventDefault();
    this._snackBar.openFromComponent(TrailTypeComponent, {
        duration: 5000,
        data: { type }
    })
  }
}
