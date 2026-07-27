import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TRAIL_TYPES } from '../../core/categories';
import { I18nService } from '../../core/i18n.service';
import { Icon } from '../../shared/icon';

/**
 * The home screen from ui-concept-v1, grown into a guidebook cover: a
 * layered mountain-scene hero with the badger seal, the signpost region
 * marker, and the four outing-type cards set like a table of contents.
 * Picking a card opens that category's track list (built by the graph engine).
 */
@Component({
  selector: 'pm-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class DashboardPage {
  protected readonly i18n = inject(I18nService);
  protected readonly types = TRAIL_TYPES;
  protected readonly numerals = ['I', 'II', 'III', 'IV'];
}
