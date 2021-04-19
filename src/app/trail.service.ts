import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

import { Trail } from './trail';
import { MessageService } from './message.service';


@Injectable({ providedIn: 'root' })
export class TrailService {

  private trailsUrl = 'api/trails';  // URL to web api

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient,
    private messageService: MessageService) { }

  /** GET trails from the server */
  getTrails(active: string, direction: string): Observable<Trail[]> {
    return this.http.get<Trail[]>(this.trailsUrl)
      .pipe(
        map(data => {
          return data.sort((trailA: Object, trailB: Object) => {
            if (direction === 'asc') {
              return trailA[active] < trailB[active] ? -1 : 1;
            } else {
              return trailA[active] > trailB[active] ? -1 : 1;
            }
          });
        }),
        tap(_ => this.log('fetched trails')),
        catchError(this.handleError<Trail[]>('getTrails', []))
      );
  }

  /** GET trail by id. Return `undefined` when id not found */
  getTrailNo404<Data>(id: number): Observable<Trail> {
    const url = `${this.trailsUrl}/?id=${id}`;
    return this.http.get<Trail[]>(url)
      .pipe(
        map(trails => trails[0]), // returns a {0|1} element array
        tap(h => {
          const outcome = h ? `fetched` : `did not find`;
          this.log(`${outcome} trail id=${id}`);
        }),
        catchError(this.handleError<Trail>(`getTrail id=${id}`))
      );
  }

  /** GET trail by id. Will 404 if id not found */
  getTrail(id: number): Observable<Trail> {
    const url = `${this.trailsUrl}/${id}`;
    return this.http.get<Trail>(url).pipe(
      tap(_ => this.log(`fetched trail id=${id}`)),
      catchError(this.handleError<Trail>(`getTrail id=${id}`))
    );
  }

  /* GET trails whose name contains search term */
  searchTrails(term: string): Observable<Trail[]> {
    if (!term.trim()) {
      // if not search term, return empty trail array.
      return of([]);
    }
    return this.http.get<Trail[]>(`${this.trailsUrl}/?name=${term}`).pipe(
      tap(x => x.length ?
         this.log(`found trails matching "${term}"`) :
         this.log(`no trails matching "${term}"`)),
      catchError(this.handleError<Trail[]>('searchTrails', []))
    );
  }

  //////// Save methods //////////

  /** POST: add a new trail to the server */
  addTrail(trail: Trail): Observable<Trail> {
    return this.http.post<Trail>(this.trailsUrl, trail, this.httpOptions).pipe(
      tap((newTrail: Trail) => this.log(`added trail w/ id=${newTrail.id}`)),
      catchError(this.handleError<Trail>('addTrail'))
    );
  }

  /** DELETE: delete the trail from the server */
  deleteTrail(id: number): Observable<Trail> {
    const url = `${this.trailsUrl}/${id}`;

    return this.http.delete<Trail>(url, this.httpOptions).pipe(
      tap(_ => this.log(`deleted trail id=${id}`)),
      catchError(this.handleError<Trail>('deleteTrail'))
    );
  }

  /** PUT: update the trail on the server */
  updateTrail(trail: Trail): Observable<any> {
    return this.http.put(this.trailsUrl, trail, this.httpOptions).pipe(
      tap(_ => this.log(`updated trail id=${trail.id}`)),
      catchError(this.handleError<any>('updateTrail'))
    );
  }

  /**
   * Handle Http operation that failed.
   * Let the app continue.
   * @param operation - name of the operation that failed
   * @param result - optional value to return as the observable result
   */
  private handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {

      // TODO: send the error to remote logging infrastructure
      console.error(error); // log to console instead

      // TODO: better job of transforming error for user consumption
      this.log(`${operation} failed: ${error.message}`);

      // Let the app keep running by returning an empty result.
      return of(result as T);
    };
  }

  /** Log a TrailService message with the MessageService */
  private log(message: string) {
    this.messageService.add(`TrailService: ${message}`);
  }
}
