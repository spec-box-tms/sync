import { Component, computed, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Feature } from '../../../model/feature.model';
import { httpResource } from '@angular/common/http';
import { TuiBadge } from '@taiga-ui/kit';
import { FeatureHistory } from '../../../model/feature-history.model';

const assertions = (feature: Feature) =>
  new Map(
    feature.groups.flatMap((group) =>
      group.assertions.map((assertion) => [`${group.title}\u0000${assertion.title}`, assertion] as const),
    ),
  );

@Component({
  selector: 'feature-compare',
  templateUrl: 'feature-compare.html',
  styleUrl: 'feature-compare.scss',
  imports: [DatePipe, TuiBadge],
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

  readonly addedAssertions = computed(() => {
    const origin = this.originFeature();
    if (!origin) return 0;
    const originAssertions = assertions(origin);
    return [...assertions(this.feature()).keys()].filter((key) => !originAssertions.has(key)).length;
  });

  readonly removedAssertions = computed(() => {
    const origin = this.originFeature();
    if (!origin) return 0;
    const currentAssertions = assertions(this.feature());
    return [...assertions(origin).keys()].filter((key) => !currentAssertions.has(key)).length;
  });

  readonly changedAssertions = computed(() => {
    const origin = this.originFeature();
    if (!origin) return 0;
    const originAssertions = assertions(origin);
    return [...assertions(this.feature()).entries()].filter(([key, assertion]) => {
      const originAssertion = originAssertions.get(key);
      return originAssertion && (
        assertion.description !== originAssertion.description ||
        assertion.isAutomated !== originAssertion.isAutomated
      );
    }).length;
  });

  readonly addedAttributes = computed(() => {
    const origin = this.originFeature();
    if (!origin) return 0;
    return Object.keys(this.feature().attributes).filter((key) => !(key in origin.attributes)).length;
  });

  readonly removedAttributes = computed(() => {
    const origin = this.originFeature();
    if (!origin) return 0;
    return Object.keys(origin.attributes).filter((key) => !(key in this.feature().attributes)).length;
  });

  readonly changedAttributes = computed(() => {
    const origin = this.originFeature();
    if (!origin) return 0;
    return Object.keys(this.feature().attributes).filter((key) => {
      const originValue = origin.attributes[key];
      return originValue && JSON.stringify(this.feature().attributes[key]) !== JSON.stringify(originValue);
    }).length;
  });

  readonly titleChanged = computed(() => {
    const origin = this.originFeature();
    return origin !== null && origin.title !== this.feature().title;
  });

  readonly descriptionChanged = computed(() => {
    const origin = this.originFeature();
    return origin !== null && origin.description !== this.feature().description;
  });
}
