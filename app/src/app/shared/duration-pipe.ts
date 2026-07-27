import { Pipe, PipeTransform } from '@angular/core';

/**
 * Minutes -> guidebook time, "4:35" style (ported from the 2020 DurationPipe,
 * which printed "4h:35m"). Null-safe: unknown durations render as a dash.
 */
@Pipe({ name: 'duration' })
export class DurationPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    if (value == null) return '—';
    const h = Math.floor(value / 60);
    const m = Math.round(value % 60);
    return `${h}:${String(m).padStart(2, '0')}`;
  }
}
