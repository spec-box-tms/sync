import { Component, computed, inject, input, OnInit } from '@angular/core';
import { ProjectService } from '../../../core/project.service';
import { TuiBadge } from '@taiga-ui/kit';

@Component({
  selector: 'attribute',
  templateUrl: 'attribute.html',
  imports: [TuiBadge],
})
export class Attribute {
  private readonly projectService = inject(ProjectService);

  readonly attributeCode = input.required<string>();
  readonly attributeValues = input.required<string[]>();

  readonly attribute = computed(() => {
    if (!this.projectService.projectResource.hasValue()) {
      return null;
    }
    const project = this.projectService.projectResource.value();

    const attributeCode = this.attributeCode();

    const attribute = project.attributes.find((a) => a.code === attributeCode);

    return attribute ?? null;
  });

  readonly attributeTitle = computed(() => {
    return this.attribute()?.title ?? this.attributeCode();
  });

  readonly attributeValue = computed(() => {
    const attribute = this.attribute();
    if (attribute) {
      return this.attributeValues()
        .map((value) => attribute.values.find((av) => av.code === value)?.title ?? value)
        .join(', ');
    }
    return this.attributeValues().join(', ');
  });
}
