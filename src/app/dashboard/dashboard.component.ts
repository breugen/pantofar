import { Component, OnInit } from '@angular/core';
import { Trail } from '../trail';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: [ './dashboard.component.css' ]
})
export class DashboardComponent implements OnInit {
  trails: Trail[] = [];

  constructor() { }

  ngOnInit() {}
}
