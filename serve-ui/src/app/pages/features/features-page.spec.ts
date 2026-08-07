import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { Title } from '@angular/platform-browser';
import { ProjectService } from '../../core/project.service';
import { FeaturesPage } from './features-page';

describe('FeaturesPage mode', () => {
  const queryParams = new BehaviorSubject<Record<string, string>>({});
  const readOnly = signal(true);

  beforeEach(() => {
    queryParams.next({});
    readOnly.set(true);
    TestBed.configureTestingModule({
      imports: [FeaturesPage],
      providers: [
        { provide: ActivatedRoute, useValue: { queryParams } },
        { provide: ProjectService, useValue: { readOnly, projectResource: { hasValue: () => false } } },
        { provide: Title, useValue: { setTitle: () => undefined } },
      ],
    });
    TestBed.overrideComponent(FeaturesPage, {
      set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
    });
  });

  const createPage = () => TestBed.createComponent(FeaturesPage).componentInstance;

  it('changes read-only edit mode to view before passing it to child components', () => {
    queryParams.next({ mode: 'edit' });

    expect(createPage().mode()).toBe('view');
  });

  it.each(['graph', 'compare'])('preserves read-only %s mode', (mode) => {
    queryParams.next({ mode });

    expect(createPage().mode()).toBe(mode);
  });

  it('preserves edit mode when editing is enabled', () => {
    readOnly.set(false);
    queryParams.next({ mode: 'edit' });

    expect(createPage().mode()).toBe('edit');
  });
});
