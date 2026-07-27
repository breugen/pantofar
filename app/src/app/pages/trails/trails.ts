import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CatalogService, TrackOffer, TrackTag } from '../../core/catalog.service';
import { LOCALITIES, trailType } from '../../core/categories';
import { I18nService } from '../../core/i18n.service';
import { BlazePlate } from '../../shared/blaze-plate';
import { DurationPipe } from '../../shared/duration-pipe';
import { Icon, IconName } from '../../shared/icon';
import { Appbar } from '../../shared/appbar';
import { Vignette } from '../../shared/vignette';

const TAG_ICON: Record<TrackTag, IconName> = {
  tren: 'train', parcare: 'car', apa: 'drop', cabana: 'hut', padure: 'tree'
};

/**
 * The category track list (/trails/:type) as the ui-concept-v1 ledger.
 * Picking a category runs the graph engine: official routes and composed
 * suggestions appear side by side, suggestions wearing the draft badge.
 */
@Component({
  selector: 'pm-trails',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Appbar, BlazePlate, DurationPipe, Icon, Vignette],
  templateUrl: './trails.html',
  styleUrl: './trails.scss'
})
export class TrailsPage {
  /** Bound from the :type route parameter (1..4). */
  readonly type = input.required<string>();

  protected readonly i18n = inject(I18nService);
  private readonly catalog = inject(CatalogService);
  private readonly router = inject(Router);

  protected readonly localities = LOCALITIES;
  protected readonly city = signal('toate');
  protected readonly circuitOnly = signal(false);
  protected readonly sortDir = signal<1 | -1>(1);
  protected readonly shown = signal(5);

  protected readonly typeDef = computed(() => trailType(Number(this.type())));

  private readonly offers = computed(() => this.catalog.offersForType(Number(this.type())));

  protected readonly filtered = computed<TrackOffer[]>(() => {
    const locality = LOCALITIES.find(l => l.id === this.city());
    let offers = this.offers();
    if (locality) offers = offers.filter(o => o.endpoints.some(e => locality.waypoints.includes(e)));
    if (this.circuitOnly()) offers = offers.filter(o => o.roundtrip);
    const dir = this.sortDir();
    return [...offers].sort((a, b) =>
      dir * ((a.minutes ?? Number.POSITIVE_INFINITY) - (b.minutes ?? Number.POSITIVE_INFINITY)));
  });

  protected readonly rows = computed(() => this.filtered().slice(0, this.shown()));

  protected tagIcon(tag: TrackTag): IconName { return TAG_ICON[tag]; }

  protected onCity(event: Event): void {
    this.city.set((event.target as HTMLSelectElement).value);
    this.shown.set(5);
  }

  protected toggleCircuit(): void {
    this.circuitOnly.update(v => !v);
    this.shown.set(5);
  }

  protected toggleSort(): void {
    this.sortDir.update(d => d === 1 ? -1 : 1);
    this.shown.set(5);
  }

  protected more(): void {
    this.shown.update(n => n + 5);
  }

  protected open(offer: TrackOffer): void {
    void this.router.navigate(['/detail', offer.id],
      offer.kind === 'generated' ? { queryParams: { t: offer.type } } : {});
  }
}
