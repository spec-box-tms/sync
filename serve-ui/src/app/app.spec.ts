import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { ProjectService } from './core/project.service';

describe('App', () => {
  beforeEach(async () => {
    TestBed.overrideComponent(App, {
      set: {
        imports: [],
        schemas: [NO_ERRORS_SCHEMA],
      },
    });

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        {
          provide: ProjectService,
          useValue: {projectResource: {hasValue: () => false}},
        },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the brand logo', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const logo = compiled.querySelector<HTMLImageElement>('.header__logo');

    expect(logo?.getAttribute('src')).toBe('favicon.ico');
    expect(logo?.alt).toBe('Spec Box TMS');
  });
});
