import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DbService } from './core/db.service';
import { I18nService } from './core/i18n.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly i18n = inject(I18nService);
  protected readonly dbs = inject(DbService);
}
