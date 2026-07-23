import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Feature } from '../../../model/feature.model';
import { API_URL } from '../../../core/api-url.token';
import { FeatureEditor } from './feature-editor';

const feature = (code: string): Feature => ({
  code,
  title: code,
  description: '',
  groups: [],
  attributes: {},
  fileName: `${code}.yaml`,
  filePath: `${code}.yaml`,
});

describe('FeatureEditor', () => {
  let fixture: ComponentFixture<FeatureEditor>;
  let component: FeatureEditor & {
    yaml: { set(value: string): void; (): string };
    message: { (): string };
    save(): void;
  };
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FeatureEditor],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '' },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FeatureEditor);
    component = fixture.componentInstance as typeof component;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('sends loaded ETag when saving edited YAML', () => {
    fixture.componentRef.setInput('feature', feature('feature-one'));
    fixture.detectChanges();
    httpMock.expectOne('/api/features/feature-one/yaml').flush('code: feature-one\n', {
      headers: { ETag: '"lock"' },
    });

    component.yaml.set('code: feature-one\nfeature: Changed\n');
    component.save();
    const save = httpMock.expectOne('/api/features/feature-one/yaml');
    expect(save.request.headers.get('If-Match')).toBe('"lock"');
    save.flush({});
    httpMock.expectOne('/api/features/feature-one/yaml').flush('code: feature-one\n', {
      headers: { ETag: '"new-lock"' },
    });
  });

  it('reloads YAML when the selected feature changes', () => {
    fixture.componentRef.setInput('feature', feature('feature-one'));
    fixture.detectChanges();
    httpMock.expectOne('/api/features/feature-one/yaml').flush('code: feature-one\n');

    fixture.componentRef.setInput('feature', feature('feature-two'));
    fixture.detectChanges();
    const reload = httpMock.expectOne('/api/features/feature-two/yaml');
    reload.flush('code: feature-two\n');
    expect(component.yaml()).toBe('code: feature-two\n');
  });

  it('keeps edited YAML after a save conflict', () => {
    fixture.componentRef.setInput('feature', feature('feature-one'));
    fixture.detectChanges();
    httpMock.expectOne('/api/features/feature-one/yaml').flush('code: feature-one\n', {
      headers: { ETag: '"lock"' },
    });

    const edited = 'code: feature-one\nfeature: Changed\n';
    component.yaml.set(edited);
    component.save();
    httpMock.expectOne('/api/features/feature-one/yaml').flush(null, { status: 409, statusText: 'Conflict' });

    expect(component.yaml()).toBe(edited);
    expect(component.message()).toContain('Перезагрузите');
  });

  it('preserves unsaved text when the selected feature refreshes with the same code', () => {
    fixture.componentRef.setInput('feature', feature('feature-one'));
    fixture.detectChanges();
    httpMock.expectOne('/api/features/feature-one/yaml').flush('code: feature-one\n', {
      headers: { ETag: '"lock"' },
    });

    const edited = 'code: feature-one\nfeature: Changed\n';
    component.yaml.set(edited);
    fixture.componentRef.setInput('feature', feature('feature-one'));
    fixture.detectChanges();

    httpMock.expectNone('/api/features/feature-one/yaml');
    expect(component.yaml()).toBe(edited);
  });

  it('does not save stale YAML while loading a new selection', () => {
    fixture.componentRef.setInput('feature', feature('feature-one'));
    fixture.detectChanges();
    httpMock.expectOne('/api/features/feature-one/yaml').flush('code: feature-one\n', {
      headers: { ETag: '"lock"' },
    });
    component.yaml.set('code: feature-one\nfeature: Changed\n');

    fixture.componentRef.setInput('feature', feature('feature-two'));
    fixture.detectChanges();
    const reload = httpMock.expectOne('/api/features/feature-two/yaml');
    component.save();

    httpMock.expectNone((request) => request.method === 'PUT');
    reload.flush('code: feature-two\n', { headers: { ETag: '"lock-two"' } });
  });

  it('uses the refreshed ETag for a second save', () => {
    fixture.componentRef.setInput('feature', feature('feature-one'));
    fixture.detectChanges();
    httpMock.expectOne('/api/features/feature-one/yaml').flush('code: feature-one\n', {
      headers: { ETag: '"lock-one"' },
    });

    component.yaml.set('code: feature-one\nfeature: First\n');
    component.save();
    const firstSave = httpMock.expectOne('/api/features/feature-one/yaml');
    expect(firstSave.request.headers.get('If-Match')).toBe('"lock-one"');
    firstSave.flush({});
    httpMock.expectOne('/api/features/feature-one/yaml').flush('code: feature-one\nfeature: First\n', {
      headers: { ETag: '"lock-two"' },
    });

    component.yaml.set('code: feature-one\nfeature: Second\n');
    component.save();
    const secondSave = httpMock.expectOne('/api/features/feature-one/yaml');
    expect(secondSave.request.headers.get('If-Match')).toBe('"lock-two"');
    secondSave.flush({});
    httpMock.expectOne('/api/features/feature-one/yaml').flush('code: feature-one\nfeature: Second\n', {
      headers: { ETag: '"lock-three"' },
    });
  });

  it('locks text until the post-save YAML refresh completes', () => {
    fixture.componentRef.setInput('feature', feature('feature-one'));
    fixture.detectChanges();
    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea.disabled).toBe(true);
    httpMock.expectOne('/api/features/feature-one/yaml').flush('code: feature-one\n', {
      headers: { ETag: '"lock-one"' },
    });

    const edited = 'code: feature-one\nfeature: Changed\n';
    component.yaml.set(edited);
    fixture.detectChanges();
    component.save();
    httpMock.expectOne('/api/features/feature-one/yaml').flush({});
    const reload = httpMock.expectOne('/api/features/feature-one/yaml');
    fixture.detectChanges();

    expect(textarea.disabled).toBe(true);
    textarea.value = 'code: feature-one\nfeature: Stale\n';
    textarea.dispatchEvent(new Event('input'));
    expect(component.yaml()).toBe(edited);

    reload.flush('code: feature-one\nfeature: Refreshed\n', { headers: { ETag: '"lock-two"' } });
    fixture.detectChanges();
    expect(textarea.disabled).toBe(false);
    expect(component.yaml()).toBe('code: feature-one\nfeature: Refreshed\n');
  });
});
