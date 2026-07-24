import { Component, computed, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Feature } from '../../../model/feature.model';
import { httpResource } from '@angular/common/http';
import { TuiBadge } from '@taiga-ui/kit';
import { Assertion } from '../../../model/assertion.model';
import { FeatureHistory } from '../../../model/feature-history.model';
import { Markdown } from '../../../ui/markdown/markdown.component';

type AssertionItem = { groupTitle: string; assertion: Assertion };
type AttributeItem = { code: string; values: string[] };

const assertions = (feature: Feature) =>
  new Map(
    feature.groups.flatMap((group) =>
      group.assertions.map(
        (assertion) =>
          [
            `${group.title}\u0000${assertion.title}`,
            { groupTitle: group.title, assertion },
          ] as const,
      ),
    ),
  );

@Component({
  selector: 'feature-compare',
  templateUrl: 'feature-compare.html',
  styleUrl: 'feature-compare.scss',
  imports: [DatePipe, TuiBadge, Markdown],
})
export class FeatureCompare {
  readonly feature = input.required<Feature>();
  readonly origin = input.required<FeatureHistory>();

  readonly shortOriginCommit = computed(() => this.origin().commit.slice(0, 7));

  readonly originFeatureResource = httpResource<Feature>(
    () => `/api/features/${this.feature().code}?revision=${this.origin().commit}`,
  );

  readonly originFeature = computed(() => {
    if (this.originFeatureResource.hasValue()) {
      return this.originFeatureResource.value();
    }
    return null;
  });

  readonly addedAssertionItems = computed(() => {
    const origin = this.originFeature();
    if (!origin) return [] as AssertionItem[];
    const originAssertions = assertions(origin);
    return [...assertions(this.feature()).entries()]
      .filter(([key]) => !originAssertions.has(key))
      .map(([, item]) => item);
  });

  readonly removedAssertionItems = computed(() => {
    const origin = this.originFeature();
    if (!origin) return [] as AssertionItem[];
    const currentAssertions = assertions(this.feature());
    return [...assertions(origin).entries()]
      .filter(([key]) => !currentAssertions.has(key))
      .map(([, item]) => item);
  });

  readonly changedAssertionItems = computed(() => {
    const origin = this.originFeature();
    if (!origin) return [] as Array<AssertionItem & { origin: Assertion }>;
    const originAssertions = assertions(origin);
    return [...assertions(this.feature()).values()].flatMap((item) => {
      const originItem = originAssertions.get(`${item.groupTitle}\u0000${item.assertion.title}`);
      if (!originItem || item.assertion.description === originItem.assertion.description) return [];
      return [{ ...item, origin: originItem.assertion }];
    });
  });

  readonly addedAttributeItems = computed(() => {
    const origin = this.originFeature();
    if (!origin) return [] as AttributeItem[];
    return Object.entries(this.feature().attributes)
      .filter(([key]) => !(key in origin.attributes))
      .map(([code, values]) => ({ code, values }));
  });

  readonly removedAttributeItems = computed(() => {
    const origin = this.originFeature();
    if (!origin) return [] as AttributeItem[];
    return Object.entries(origin.attributes)
      .filter(([key]) => !(key in this.feature().attributes))
      .map(([code, values]) => ({ code, values }));
  });

  readonly changedAttributeItems = computed(() => {
    const origin = this.originFeature();
    if (!origin) return [] as Array<AttributeItem & { origin: string[] }>;
    return Object.entries(this.feature().attributes).flatMap(([code, values]) => {
      const originValue = origin.attributes[code];
      if (!originValue || JSON.stringify(values) === JSON.stringify(originValue)) return [];
      return [{ code, values, origin: originValue }];
    });
  });

  readonly addedAssertions = computed(() => this.addedAssertionItems().length);
  readonly removedAssertions = computed(() => this.removedAssertionItems().length);
  readonly changedAssertions = computed(() => this.changedAssertionItems().length);
  readonly addedAttributes = computed(() => this.addedAttributeItems().length);
  readonly removedAttributes = computed(() => this.removedAttributeItems().length);
  readonly changedAttributes = computed(() => this.changedAttributeItems().length);

  readonly titleChanged = computed(() => {
    const origin = this.originFeature();
    return origin !== null && origin.title !== this.feature().title;
  });

  readonly descriptionChanged = computed(() => {
    const origin = this.originFeature();
    return origin !== null && origin.description !== this.feature().description;
  });
}
