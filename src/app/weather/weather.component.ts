import { Component, Inject, OnInit } from '@angular/core';
import { MAT_SNACK_BAR_DATA } from '@angular/material/snack-bar';
import { Weather } from '../weather';

@Component({
    selector: 'weather',
    styleUrls: [ './weather.component.css' ],
    template: `
      <div class="description">
        {{weather.city}} weekend weather: <br>
        {{weather.description}}
      </div>
      <i class="fas fa-{{icon}} fa-2x">
    `
  })
  export class WeatherComponent implements OnInit {

    constructor(@Inject(MAT_SNACK_BAR_DATA) public weather: Weather) { }
    icon: string;

    ngOnInit(): void {
      this.icon = this.getIconForCode(this.weather.code);
    }

    getIconForCode(code): string {
      if ([900, 300, 301, 302, 500, 501, 511, 520].includes(code)) {
        return 'cloud-rain';
      }

      if ((code === 804) || (code === 803)) {
        return 'cloud'
      }

      if ([230, 231, 232, 233, 502, 522].includes(code)) {
        return 'cloud-showers-heavy';
      }

      if ([801, 802].includes(code)) {
        return 'cloud-sun'
      }

      if ([200, 201, 202, 521].includes(code)) {
        return 'cloud-sun-rain'
      }

      if (code === 800) {
        return 'sun'
      }

      if ((600 <= code) && (code < 700)) {
        return 'snowflake'
      }

      if ((700 <= code) && (code < 800)) {
        return 'smog'
      }

      return 'exclamation-circle';
    }
  }