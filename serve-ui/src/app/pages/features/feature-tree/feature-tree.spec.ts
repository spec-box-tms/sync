import '@angular/compiler';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ProjectService } from '../../../core/project.service';
import { ActiveFeatureService } from '../active-feature.service';
import { FeatureTree } from './feature-tree';

const tree = {
  code: 'by-area',
  title: 'По области',
  groupBy: [],
  totalCount: 0,
  automatedCount: 0,
  root: {
    valueCode: 'root',
    totalCount: 0,
    automatedCount: 0,
    features: [],
    children: [
      {
        valueCode: 'selected-parent',
        valueTitle: 'Выбранная ветка',
        totalCount: 0,
        automatedCount: 0,
        features: [],
        children: [
          {
            valueCode: 'selected-child',
            valueTitle: 'Ветка выбранной фичи',
            totalCount: 0,
            automatedCount: 0,
            features: ['selected'],
            children: [],
          },
          {
            valueCode: 'second-selected-child',
            valueTitle: 'Вторая ветка выбранной фичи',
            totalCount: 0,
            automatedCount: 0,
            features: ['selected'],
            children: [],
          },
          {
            valueCode: 'manual-child',
            valueTitle: 'Вручную открытая ветка',
            totalCount: 0,
            automatedCount: 0,
            features: ['manual'],
            children: [],
          },
        ],
      },
      {
        valueCode: 'other',
        valueTitle: 'Другая ветка',
        totalCount: 0,
        automatedCount: 0,
        features: ['other'],
        children: [],
      },
    ],
  },
};

const createTree = () => {
  const fixture = TestBed.configureTestingModule({
    providers: [
      ActiveFeatureService,
      { provide: Router, useValue: { navigate: () => Promise.resolve(true) } },
      {
        provide: ProjectService,
        useValue: {
          projectResource: {
            hasValue: () => true,
            value: () => ({
              features: [
                ...['selected', 'manual', 'other'].map((code) => ({
                  code,
                  title: `${code} фича`,
                  attributes: {},
                  groups: [],
                  fileName: `${code}.spec.yml`,
                  filePath: `specs/${code}.spec.yml`,
                  gitStatus: 'clean' as const,
                })),
              ],
            }),
          },
        },
      },
    ],
  }).createComponent(FeatureTree);
  fixture.componentRef.setInput('tree', tree);
  return fixture;
};

describe('FeatureTree', () => {
  it('expands every path containing the active feature', async () => {
    const fixture = createTree();
    fixture.componentRef.setInput('activeFeatureCode', 'selected');
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelectorAll('feature-item')).toHaveLength(2);
  });

  it('keeps the existing path open when the active feature is absent', async () => {
    const fixture = createTree();
    fixture.componentRef.setInput('activeFeatureCode', 'selected');
    await fixture.whenStable();

    fixture.componentRef.setInput('activeFeatureCode', 'absent');
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('selected фича');
  });

  it('allows collapsing the selected feature path after navigation', async () => {
    const fixture = createTree();
    fixture.componentRef.setInput('activeFeatureCode', 'selected');
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const selectedNode = [...element.querySelectorAll<HTMLElement>('feature-tree-node')]
      .find((node) => node.querySelector(':scope > .item')?.textContent?.includes('Выбранная ветка'));
    expect(selectedNode).toBeDefined();
    selectedNode?.querySelector<HTMLElement>(':scope > .item')?.click();
    await fixture.whenStable();

    expect(element.textContent).not.toContain('selected фича');
  });

  it('keeps a collapsed selected path after the tree reloads', async () => {
    const fixture = createTree();
    fixture.componentRef.setInput('activeFeatureCode', 'selected');
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const selectedNode = [...element.querySelectorAll<HTMLElement>('feature-tree-node')]
      .find((node) => node.querySelector(':scope > .item')?.textContent?.includes('Выбранная ветка'));
    selectedNode?.querySelector<HTMLElement>(':scope > .item')?.click();
    await fixture.whenStable();

    fixture.componentRef.setInput('tree', structuredClone(tree));
    await fixture.whenStable();

    expect(element.textContent).not.toContain('selected фича');
  });

  it('keeps another open branch expanded after navigation', async () => {
    const fixture = createTree();
    fixture.componentRef.setInput('activeFeatureCode', 'selected');
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const manualNode = [...element.querySelectorAll<HTMLElement>('feature-tree-node')]
      .find((node) => node.querySelector(':scope > .item')?.textContent?.includes('Вручную открытая ветка'));
    expect(manualNode).toBeDefined();
    manualNode?.querySelector<HTMLElement>(':scope > .item')?.click();
    await fixture.whenStable();
    expect(element.textContent).toContain('manual фича');

    fixture.componentRef.setInput('activeFeatureCode', 'other');
    await fixture.whenStable();

    expect(element.textContent).toContain('manual фича');
  });
});
