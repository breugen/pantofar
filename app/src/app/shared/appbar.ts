import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { I18nService } from '../core/i18n.service';
import { Icon } from './icon';

/** Inner-screen header from ui-concept-v1: back circle, overline, title, language pill. */
@Component({
  selector: 'pm-appbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <div class="appbar">
      <button class="appbar-back" type="button" (click)="goBack()" aria-label="Înapoi">
        <pm-icon name="back" [size]="16" />
      </button>
      <div class="appbar-titles">
        <div class="appbar-over">{{ over() }}</div>
        <h2>{{ title() }}</h2>
      </div>
      <span class="lang" role="group" aria-label="Limbă">
        <button type="button" [class.on]="i18n.lang() === 'ro'" (click)="i18n.setLang('ro')">RO</button>
        <button type="button" [class.on]="i18n.lang() === 'en'" (click)="i18n.setLang('en')">EN</button>
      </span>
    </div>`
})
export class Appbar {
  protected readonly i18n = inject(I18nService);
  private readonly location = inject(Location);
  private readonly router = inject(Router);

  readonly over = input('');
  readonly title = input('');
  /** Fixed back target; when unset, browser history decides. */
  readonly backTo = input<string | undefined>(undefined);

  protected goBack(): void {
    const target = this.backTo();
    if (target) void this.router.navigateByUrl(target);
    else this.location.back();
  }
}
