import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type IconName =
  | 'walk' | 'sun' | 'daisy' | 'star'
  | 'train' | 'car' | 'drop' | 'hut' | 'tree' | 'peak'
  | 'loop' | 'chev' | 'back' | 'ridge';

/** Line icons from docs/design/ui-concept-v1.html, drawn in currentColor. */
@Component({
  selector: 'pm-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg [attr.width]="name() === 'ridge' ? size() * 4.6 : size()" [attr.height]="size()"
      [attr.viewBox]="name() === 'ridge' ? '0 0 120 26' : (name() === 'peak' ? '0 0 48 48' : '0 0 24 24')"
      aria-hidden="true">
      @switch (name()) {
        @case ('walk') {
          <circle cx="13" cy="4.2" r="2.1" fill="currentColor"/>
          <path d="M12.6 7.5 L9.4 10.6 M12.6 7.5 L15.4 10.2 L17.5 10.8 M12.6 7.5 L11.6 13 L14 16.5 L13.4 21 M11.6 13 L8.8 16 L7.6 20.6" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>
        }
        @case ('sun') {
          <circle cx="12" cy="9" r="3.4" fill="none" stroke="currentColor" stroke-width="1.9"/>
          <path d="M12 2.4v2 M18 5l-1.4 1.4 M6 5l1.4 1.4 M20.8 9h-2 M5.2 9h-2" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>
          <path d="M2.8 20 L8.4 13.6 L12 17.4 L15.4 14.4 L21.2 20 Z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/>
        }
        @case ('daisy') {
          <circle cx="12" cy="12" r="2.6" fill="currentColor"/>
          <g fill="none" stroke="currentColor" stroke-width="1.8">
            <ellipse cx="12" cy="5.4" rx="2.3" ry="3.2"/><ellipse cx="12" cy="18.6" rx="2.3" ry="3.2"/>
            <ellipse cx="5.4" cy="12" rx="3.2" ry="2.3"/><ellipse cx="18.6" cy="12" rx="3.2" ry="2.3"/>
          </g>
        }
        @case ('star') {
          <path d="M12 2.8 L14.6 9 L21.2 9.6 L16.2 14 L17.7 20.6 L12 17.1 L6.3 20.6 L7.8 14 L2.8 9.6 L9.4 9 Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
        }
        @case ('train') {
          <rect x="5.5" y="3.5" width="13" height="13.5" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/>
          <path d="M5.5 11h13" stroke="currentColor" stroke-width="1.8"/>
          <circle cx="9" cy="14" r="1.15" fill="currentColor"/><circle cx="15" cy="14" r="1.15" fill="currentColor"/>
          <path d="M8.5 17.5 L6 21 M15.5 17.5 L18 21" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        }
        @case ('car') {
          <path d="M4 13 L5.6 8.2 A2 2 0 0 1 7.5 6.8 h9 a2 2 0 0 1 1.9 1.4 L20 13 v4.5 h-2.6 M4 13 v4.5 h2.6 M4 13 h16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>
          <circle cx="8" cy="17.3" r="1.7" fill="none" stroke="currentColor" stroke-width="1.8"/>
          <circle cx="16" cy="17.3" r="1.7" fill="none" stroke="currentColor" stroke-width="1.8"/>
        }
        @case ('drop') {
          <path d="M12 3 C12 3 5.8 10.4 5.8 14.6 A6.2 6.2 0 0 0 18.2 14.6 C18.2 10.4 12 3 12 3 Z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/>
        }
        @case ('hut') {
          <path d="M3 12 L12 4 L21 12" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" stroke-linecap="round"/>
          <path d="M6 10.4 V20 h12 V10.4" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/>
          <path d="M10.3 20 v-5.4 h3.4 V20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/>
        }
        @case ('tree') {
          <path d="M12 2.6 L7.2 9.4 h2.2 L5.6 15 h2.6 L4.8 20 h14.4 L15.8 15 h2.6 L14.6 9.4 h2.2 Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
        }
        @case ('peak') {
          <path d="M4 36 L17 14 L23 24 L29 10 L44 36 Z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/>
          <path d="M26 15 L29 10 L32 15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/>
        }
        @case ('loop') {
          <path d="M19 12 a7 7 0 1 1 -2.4-5.3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <path d="M17 2.6 L17 7.2 L12.6 6.4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        }
        @case ('chev') {
          <path d="M9 5 L16 12 L9 19" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
        }
        @case ('back') {
          <path d="M15 5 L8 12 L15 19" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
        }
        @case ('ridge') {
          <path d="M2 23 L20 8 L30 16 L46 4 L60 14 L74 7 L92 20 L104 12 L118 23" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
        }
      }
    </svg>`
})
export class Icon {
  readonly name = input.required<IconName>();
  readonly size = input(14);
}
