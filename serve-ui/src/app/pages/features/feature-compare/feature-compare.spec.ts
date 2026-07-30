import { TestBed } from '@angular/core/testing';
import { Feature } from '../../../model/feature.model';
import { FeatureHistory } from '../../../model/feature-history.model';
import { FeatureCompare } from './feature-compare';

const feature = (overrides: Partial<Feature>): Feature => ({
  code: 'login',
  title: 'Вход',
  description: 'Описание',
  attributes: {},
  groups: [],
  fileName: 'login.spec.yml',
  filePath: 'specs/login.spec.yml',
  ...overrides,
  gitStatus: overrides.gitStatus ?? 'clean',
});

const originCommit: FeatureHistory = {
  commit: 'abcdef0123456789',
  author: 'Иван Петров',
  date: '2026-07-24T12:30:00+03:00',
  message: 'Уточнить сценарий входа',
};

describe('FeatureCompare', () => {
  it('ignores changes to assertion automation', () => {
    const current = feature({
      groups: [{ title: 'Вход', assertions: [{ title: 'Проверка', isAutomated: true }] }],
    });
    const origin = feature({
      groups: [{ title: 'Вход', assertions: [{ title: 'Проверка', isAutomated: false }] }],
    });
    const fixture = TestBed.createComponent(FeatureCompare);
    fixture.componentRef.setInput('feature', current);
    fixture.componentRef.setInput('origin', originCommit);
    Object.defineProperty(fixture.componentInstance, 'originFeatureResource', {
      value: { hasValue: () => true, value: () => origin },
    });
    fixture.detectChanges();

    expect(fixture.componentInstance.changedAssertions()).toBe(0);
    expect(fixture.nativeElement.textContent).not.toContain('Проверки');
  });

  it('does not report changes until the origin feature is loaded', () => {
    const fixture = TestBed.createComponent(FeatureCompare);
    fixture.componentRef.setInput('feature', feature({}));
    fixture.componentRef.setInput('origin', originCommit);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(component.titleChanged()).toBe(false);
    expect(component.descriptionChanged()).toBe(false);
  });

  it('counts added, removed and changed feature parts', () => {
    const current = feature({
      title: 'Авторизация',
      description: 'Новое описание',
      attributes: { unchanged: ['value'], changed: ['new'], added: ['value'] },
      groups: [{
        title: 'Вход',
        assertions: [
          { title: 'Не изменилось', isAutomated: false },
          { title: 'Изменилось', description: 'новое', isAutomated: true },
          { title: 'Добавлено', isAutomated: false },
        ],
      }],
    });
    const origin = feature({
      attributes: { unchanged: ['value'], changed: ['old'], removed: ['value'] },
      groups: [{
        title: 'Вход',
        assertions: [
          { title: 'Не изменилось', isAutomated: false },
          { title: 'Изменилось', description: 'старое', isAutomated: false },
          { title: 'Удалено', isAutomated: false },
        ],
      }],
    });

    const fixture = TestBed.createComponent(FeatureCompare);
    fixture.componentRef.setInput('feature', current);
    fixture.componentRef.setInput('origin', originCommit);
    Object.defineProperty(fixture.componentInstance, 'originFeatureResource', {
      value: { hasValue: () => true, value: () => origin },
    });
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(component.addedAssertions()).toBe(1);
    expect(component.removedAssertions()).toBe(1);
    expect(component.changedAssertions()).toBe(1);
    expect(component.addedAttributes()).toBe(1);
    expect(component.removedAttributes()).toBe(1);
    expect(component.changedAttributes()).toBe(1);
    expect(component.titleChanged()).toBe(true);
    expect(component.descriptionChanged()).toBe(true);

    const content = fixture.nativeElement.textContent as string;
    expect(content).toContain('Сравнение с версией');
    expect(content).toContain('Уточнить сценарий входа');
    expect(content).toContain('abcdef0');
    expect(content).toContain('Иван Петров');
    expect(content).toContain('24.07.2026');
    expect(content).toContain('Проверки +1');
    expect(content).toContain('Атрибуты +1');
    expect(content).toContain('Проверки −1');
    expect(content).toContain('Атрибуты −1');
    expect(content).toContain('Проверки изменены: 1');
    expect(content).toContain('Атрибуты изменены: 1');
    expect(content).toContain('Заголовок');
    expect(content).toContain('Описание');
    expect(content).toContain('Атрибуты');
    expect(content).toContain('Проверки');
    expect(content).toContain('Вход:Добавлено');
    expect(content).toContain('added: value');
    expect(content).toContain('Проверки изменены: 1');
    expect(content).toContain('Вход:Изменилось');
    expect(content).toContain('старое');
    expect(content).toContain('новое');
    expect(content).toContain('changed: old');
    expect(content).toContain('changed: new');
    expect(content).toContain('Вход:Удалено');
    expect(content).toContain('removed: value');
    expect(fixture.nativeElement.querySelectorAll('.diff-line.added').length).toBeGreaterThan(0);
    expect(fixture.nativeElement.querySelectorAll('.diff-line.removed').length).toBeGreaterThan(0);
  });
});
