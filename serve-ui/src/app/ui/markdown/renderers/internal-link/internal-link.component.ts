/* eslint-disable @angular-eslint/component-selector */
import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { InternalLinkToken } from '../../extensions/internal-link';
import { RendererBase } from '../renderer-base';
import { TuiLink } from '@taiga-ui/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'md-internal-link',
  standalone: true,
  imports: [RouterLink, TuiLink],
  templateUrl: './internal-link.component.html',
  styleUrl: './internal-link.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InternalLinkComponent extends RendererBase<InternalLinkToken> {
  featureCode = computed(() => this.token().identifier.slice(1));
}
