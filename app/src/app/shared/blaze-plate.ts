import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Blaze } from '../core/model/trail';

/**
 * The Romanian trail-marking plate: a white plate with the route's symbol.
 * Descendant of the 2020 BlazeComponent, drawn in CSS instead of Font Awesome.
 * Plate styles live in the global stylesheet (shared with static markup).
 */
@Component({
  selector: 'pm-blaze',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="plate" [class]="shapeClass()" [class.lg]="size() === 'lg'"
    [style.--c]="colorVar()" [title]="blaze()?.ro ?? ''"></span>`
})
export class BlazePlate {
  readonly blaze = input<Blaze | undefined>(undefined);
  readonly size = input<'md' | 'lg'>('md');

  readonly shapeClass = computed(() => {
    const b = this.blaze();
    if (!b) return 'unknown';
    return b.shape === 'triangle' ? 'tri' : b.shape;
  });

  readonly colorVar = computed(() => {
    switch (this.blaze()?.color) {
      case 'red': return 'var(--b-red)';
      case 'blue': return 'var(--b-blue)';
      case 'yellow': return 'var(--b-yellow)';
      default: return 'var(--ink-faint)';
    }
  });
}
