import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class WeatherService {

  private weatherBaseUrl = 'https://api.weatherbit.io/v2.0/forecast/daily?';
  private APPID = 'd38d322193f04aa283603a1c6b073a16';

  constructor() { }

  /** GET weather from the open free API with limitations */
  getWeather(city: String): Promise<Object> {
    const currentDay = new Date().getDay();
    let nrOfDaysToFetch = currentDay ? (7 - currentDay) : 6;
    return fetch(this.weatherBaseUrl + 'city=' + city +
        '&country=RO&key=' + this.APPID + '&days=' + nrOfDaysToFetch)
        .then(response => response.json())
        .then(weatherResponse =>
            weatherResponse.data[weatherResponse.data.length - 1].weather)
        .catch((err) => {
            console.error(err); 
            return null;
        });
  }
}