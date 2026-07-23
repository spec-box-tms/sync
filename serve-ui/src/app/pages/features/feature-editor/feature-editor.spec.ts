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
  });
});
