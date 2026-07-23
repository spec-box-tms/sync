import { Component, effect, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TuiAutoFocus } from '@taiga-ui/cdk';
import { TuiButton } from '@taiga-ui/core';
import { TuiInputInline } from '@taiga-ui/kit';
import { FeatureGroup as FeatureGroupModel } from '../../../model/feature-group.model';
import { Assert } from '../assert/assert';

@Component({
  selector: 'feature-group',
  templateUrl: 'feature-group.html',
  styleUrl: 'feature-group.scss',
  imports: [FormsModule, Assert, TuiAutoFocus, TuiButton, TuiInputInline],
})
export class FeatureGroup {
  readonly group = input.required<FeatureGroupModel>();
  readonly editing = signal(false);

  title: string = '';

  constructor() {
    effect(() => {
      this.title = this.group().title;
    });
  }

  toggleEditing() {
    this.editing.update((e) => !e);
  }
  onBlur(): void {
    this.editing.set(false);
    this.group().title = this.title;
  }
}
