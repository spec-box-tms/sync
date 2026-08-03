import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { ProjectService } from '../../../core/project.service';
import { ActiveFeatureService } from '../active-feature.service';
import { FeatureItem } from './feature-item';

describe('FeatureItem', () => {
  it('counts only assertions for automation coverage', async () => {
    const feature = {
      code: 'checkout',
      title: 'Оформление заказа',
      attributes: {},
      fileName: 'checkout.spec.yml',
      filePath: 'specs/checkout.spec.yml',
      gitStatus: 'clean' as const,
      groups: [{
        title: 'Поток',
        assertions: [
          { type: 'assert' as const, title: 'Required', isAutomated: true },
          { type: 'propose' as const, title: 'Later', isAutomated: false as const },
          { type: 'propose' as const, title: 'Much later', isAutomated: false as const },
        ],
      }],
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: ProjectService, useValue: { projectResource: { hasValue: () => true, value: () => ({ features: [feature] }) } } },
        ActiveFeatureService,
        { provide: Router, useValue: { navigate: () => Promise.resolve(true) } },
      ],
    });
    const fixture = TestBed.createComponent(FeatureItem);
    fixture.componentRef.setInput('featureCode', feature.code);

    await fixture.whenStable();

    expect(fixture.componentInstance.totalCount()).toBe(1);
    expect(fixture.componentInstance.automatedCount()).toBe(1);
  });
});
