import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type VignetteName = 'frieze' | 'edelweiss';

/**
 * Faded engraved-style spot illustrations, after the plates of the old
 * pocket guidebooks: a walking-hiker frieze for list pages and an
 * edelweiss spot ornament for the track sheet. Decorative only —
 * drawn in currentColor, faded by the host's class.
 */
@Component({
  selector: 'pm-vignette',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (name()) {
      @case ('frieze') {
        <svg viewBox="0 0 360 44" aria-hidden="true" focusable="false"
          fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <path d="M6 38 H354" stroke-dasharray="2 8" opacity=".7" stroke-width="1.3" />
          <path d="M30 14 L23.4 25 h4 L22 34 h16 L32.6 25 h4 Z" />
          <path d="M52 20 L47 28.4 h3 L44.9 35 h14.2 L57 28.4 h3 Z" stroke-width="1.4" />
          <path d="M120 34 L165 15 L190 26 L226 8 L262 30 L301 19 L340 34" stroke-width="1.4" />
          <circle cx="90" cy="19" r="2.7" fill="currentColor" stroke="none" />
          <rect x="86.2" y="23" width="3.1" height="5.8" rx="1.3" fill="currentColor" stroke="none" />
          <path d="M90 22.6 V31 M90 25 l4.4 2 M95.3 21.8 L93.2 36.4 M90 31 l-3.6 6.4 M90 31 l3.4 6.2" />
          <circle cx="318" cy="12" r="4.4" stroke-width="1.4" />
          <path d="M318 4.6 v-2 M325 12 h2 M311 12 h-2 M323 7 l1.4 -1.4 M313 7 l-1.4 -1.4" stroke-width="1.4" />
          <path d="M248 13 q4 -4 8 0 q4 -4 8 0" stroke-width="1.3" />
        </svg>
      }
      @case ('edelweiss') {
        <svg viewBox="0 0 44 44" aria-hidden="true" focusable="false"
          fill="none" stroke="currentColor" stroke-width="1.5">
          <ellipse cx="22" cy="10.5" rx="3" ry="7.3" />
          <ellipse cx="22" cy="10.5" rx="3" ry="7.3" transform="rotate(51.4 22 22)" />
          <ellipse cx="22" cy="10.5" rx="3" ry="7.3" transform="rotate(102.8 22 22)" />
          <ellipse cx="22" cy="10.5" rx="3" ry="7.3" transform="rotate(154.3 22 22)" />
          <ellipse cx="22" cy="10.5" rx="3" ry="7.3" transform="rotate(205.7 22 22)" />
          <ellipse cx="22" cy="10.5" rx="3" ry="7.3" transform="rotate(257.1 22 22)" />
          <ellipse cx="22" cy="10.5" rx="3" ry="7.3" transform="rotate(308.6 22 22)" />
          <circle cx="22" cy="22" r="3.6" />
          <circle cx="22" cy="20.6" r=".8" fill="currentColor" stroke="none" />
          <circle cx="23.4" cy="22.8" r=".8" fill="currentColor" stroke="none" />
          <circle cx="20.6" cy="22.8" r=".8" fill="currentColor" stroke="none" />
        </svg>
      }
    }`
})
export class Vignette {
  readonly name = input.required<VignetteName>();
}
