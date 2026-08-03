import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { FeatureGroup } from './feature-group';

describe('FeatureGroup', () => {
  it('renders assertions and proposals in source order', async () => {
    const fixture = TestBed.createComponent(FeatureGroup);
    fixture.componentRef.setInput('group', {
      title: 'Поток',
      assertions: [
        { type: 'assert', title: 'First', isAutomated: true },
        { type: 'proposal', title: 'Later', isAutomated: false },
        { type: 'assert', title: 'Third', isAutomated: false },
      ],
    });

    await fixture.whenStable();

    const text = fixture.nativeElement.textContent as string;
    const positions = [text.indexOf('First'), text.indexOf('Later'), text.indexOf('Third')];
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });
});
