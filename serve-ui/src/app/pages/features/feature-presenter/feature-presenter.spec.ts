import { Component, NO_ERRORS_SCHEMA, input, output, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ProjectService } from '../../../core/project.service';
import { Feature } from '../../../model/feature.model';
import { ProjectSnapshot } from '../../../model/project-snapshot.model';
import { FeaturePresenter } from './feature-presenter';

const feature: Feature = {
  code: 'login',
  title: 'Вход',
  description: 'Описание',
  attributes: {},
  groups: [],
  fileName: 'login.spec.yml',
  filePath: 'specs/login.spec.yml',
  gitStatus: 'clean',
};

const project: ProjectSnapshot = {
  revision: 1,
  attributes: [],
  treeDefinitions: [],
  features: [feature],
  diagnostics: [],
  coverage: { total: 1, automated: 0, uncovered: 1 },
  storageAreas: [],
  trees: [],
  dependencyGraph: { nodes: [], edges: [] },
};

@Component({ selector: 'feature-editor', template: '' })
class FeatureEditorStub {
  readonly featureCode = input.required<string>();
  readonly canClose = output();
  readonly hasChanges = signal(false);

  saveChanges() {}
}

describe('FeaturePresenter', () => {
  const readOnly = signal(true);

  beforeEach(() => {
    readOnly.set(true);
    TestBed.configureTestingModule({
      providers: [
        { provide: ProjectService, useValue: { readOnly } },
        { provide: Router, useValue: { navigate: () => Promise.resolve(true) } },
      ],
    });
    TestBed.overrideComponent(FeaturePresenter, {
      set: { imports: [FeatureEditorStub], schemas: [NO_ERRORS_SCHEMA] },
    });
  });

  const createPresenter = async (mode: 'view' | 'edit') => {
    const fixture = TestBed.createComponent(FeaturePresenter);
    fixture.componentRef.setInput('project', project);
    fixture.componentRef.setInput('feature', feature);
    fixture.componentRef.setInput('mode', mode);
    await fixture.whenStable();
    return fixture;
  };

  it('hides the edit link in read-only view mode', async () => {
    const fixture = await createPresenter('view');
    const element = fixture.nativeElement as HTMLElement;
    const editLink = [...element.querySelectorAll<HTMLAnchorElement>('a')].find(
      (anchor) => anchor.textContent?.includes('Редактировать'),
    );

    expect(editLink).toBeUndefined();
  });

  it('uses edit mode passed by its parent even when read-only', async () => {
    const fixture = await createPresenter('edit');
    const element = fixture.nativeElement as HTMLElement;
    const saveButton = [...element.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.textContent?.includes('Сохранить'),
    );

    expect(saveButton).toBeDefined();
    expect(element.querySelector('feature-editor')).not.toBeNull();
  });

  it('shows the edit link when the server enables editing', async () => {
    readOnly.set(false);
    const fixture = await createPresenter('view');
    const element = fixture.nativeElement as HTMLElement;
    const editLink = [...element.querySelectorAll<HTMLAnchorElement>('a')].find(
      (anchor) => anchor.textContent?.includes('Редактировать'),
    );

    expect(editLink).toBeDefined();
  });

  it('shows the editor and save control when editing is enabled', async () => {
    readOnly.set(false);
    const fixture = await createPresenter('edit');
    const element = fixture.nativeElement as HTMLElement;
    const saveButton = [...element.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.textContent?.includes('Сохранить'),
    );

    expect(saveButton).toBeDefined();
    expect(element.querySelector('feature-editor')).not.toBeNull();
  });
});
