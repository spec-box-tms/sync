import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { Assert } from './assert';

describe('Assert', () => {
  it('renders a proposal as an empty neutral status with a hint', async () => {
    const fixture = TestBed.createComponent(Assert);
    fixture.componentRef.setInput('assertion', {
      type: 'proposal',
      title: 'Будущее поведение',
      description: 'Later details',
      isAutomated: false,
    });

    await fixture.whenStable();

    const status = fixture.nativeElement.querySelector('[tuiStatus]') as HTMLElement;
    expect(status).not.toBeNull();
    expect(status.getAttribute('appearance')).toBe('neutral');
    expect(status.textContent?.trim()).toBe('');
    expect(status.getAttribute('tuiHint')).toBe('Предложение');

    const content = fixture.nativeElement.textContent as string;
    expect(content).not.toContain('Предложение');
    expect(content).not.toContain('Нет автоматической проверки');

    (fixture.nativeElement.querySelector('.expander') as HTMLElement).click();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Later details');
  });

  it.each([
    { isAutomated: true, appearance: 'positive' },
    { isAutomated: false, appearance: 'negative' },
  ])('keeps the $appearance automation status for assertions', async ({ isAutomated, appearance }) => {
    const fixture = TestBed.createComponent(Assert);
    fixture.componentRef.setInput('assertion', {
      type: 'assert',
      title: 'Обязательное поведение',
      isAutomated,
    });

    await fixture.whenStable();

    const status = fixture.nativeElement.querySelector('[tuiStatus]');
    expect(status).not.toBeNull();
    expect(status.getAttribute('appearance')).toBe(appearance);
  });
});
