import '@angular/compiler';
import { describe, expect, it } from 'vitest';
import { Feature } from '../../../model/feature.model';
import { NavControls } from './nav-controls';

const feature = (overrides: Partial<Feature>): Feature => ({
  code: 'reset-password',
  title: 'Восстановление доступа',
  description: 'Описание сценария',
  attributes: {},
  groups: [],
  fileName: 'reset-password.spec.yml',
  filePath: 'specs/reset-password.spec.yml',
  ...overrides,
  gitStatus: overrides.gitStatus ?? 'clean',
});

describe('NavControls', () => {
  it('finds a feature when every search term appears across its content', () => {
    const features = [
      feature({
        groups: [
          {
            title: 'Учётная запись',
            assertions: [{title: 'Сброс', description: 'Отправить пароль', isAutomated: false}],
          },
        ],
      }),
      feature({code: 'other', title: 'Другой доступ'}),
    ];
    const matchFeatures = (
      NavControls.prototype as unknown as {
        matchFeatures: (search: string, values: Feature[]) => Feature[];
      }
    ).matchFeatures;

    expect(matchFeatures('reset доступ описание учётная сброс пароль', features).map((item) => item.code)).toEqual([
      'reset-password',
    ]);
  });
});
