import assert from 'node:assert/strict';

import { parse } from 'yaml';

import { processYamlFiles } from '../../src/lib/domain';
import { parseObject } from '../../src/lib/utils';
import { Validator } from '../../src/lib/validators';
import { entityDecoder } from '../../src/lib/yaml/models';
import { specTest } from '../serve/spec-name';

type RuntimeStatement = {
  type?: 'assert' | 'proposal';
  title: string;
  description?: string;
  isAutomated: boolean;
};

const decode = (items: string) =>
  parseObject(
    parse(
      [
        'code: checkout',
        'feature: Checkout',
        'specs-unit:',
        '  Flow:',
        ...items.split('\n').map((line) => `    ${line}`),
      ].join('\n'),
    ),
    entityDecoder,
  );

const project = (items: string) =>
  processYamlFiles(
    [{ content: decode(items), fileName: 'checkout', filePath: 'checkout.spec.yml' }],
    { filePath: '.spec-box-meta.yml', meta: {} },
  );

const statements = (items: string) =>
  project(items).features[0].groups[0].assertions as RuntimeStatement[];

const linkedProject = (link: string) =>
  processYamlFiles(
    [
      {
        content: decode(`- proposal: Planned ${link}\n  description: Details ${link}`),
        fileName: 'checkout',
        filePath: 'checkout.yml',
      },
      {
        content: parseObject(parse('code: known\nfeature: Known'), entityDecoder),
        fileName: 'known',
        filePath: 'known.yml',
      },
    ],
    { filePath: '.spec-box-meta.yml', meta: {} },
  );

specTest(
  'proposal-notation',
  'Предложения в YAML-спецификации',
  'Формат YAML',
  'Элементы assert и proposal могут находиться в одной группе specs-unit в любом порядке',
  () => {
    assert.deepEqual(
      statements('- proposal: Later\n- assert: Now').map(({ type }) => type),
      ['proposal', 'assert'],
    );
  },
);

specTest(
  'proposal-notation',
  'Предложения в YAML-спецификации',
  'Формат YAML',
  'Элемент proposal содержит строковое название в поле proposal и может содержать строковое поле description',
  () => {
    assert.deepEqual(statements('- proposal: Later\n  description: Details')[0], {
      type: 'proposal',
      title: 'Later',
      description: 'Details',
      isAutomated: false,
    });
  },
);

specTest(
  'proposal-notation',
  'Предложения в YAML-спецификации',
  'Формат YAML',
  'Каждый элемент группы specs-unit содержит ровно одно из полей assert и proposal',
  () => {
    assert.doesNotThrow(() => decode('- assert: Now'));
    assert.doesNotThrow(() => decode('- proposal: Later'));
  },
);

specTest(
  'proposal-notation',
  'Предложения в YAML-спецификации',
  'Формат YAML',
  'Элемент с одновременными полями assert и proposal или без обоих полей отклоняется как некорректный YAML спецификации',
  () => {
    assert.throws(() => decode('- assert: Now\n  proposal: Later'));
    assert.throws(() => decode('- description: Missing title'));
  },
);

specTest(
  'proposal-notation',
  'Предложения в YAML-спецификации',
  'Формат YAML',
  'Существующие спецификации только с элементами assert остаются корректными без миграции',
  () => {
    assert.equal(statements('- assert: Now')[0].title, 'Now');
  },
);

specTest(
  'proposal-notation',
  'Предложения в YAML-спецификации',
  'Правила утверждений',
  'Порядок assert и proposal из YAML сохраняется в модели проекта',
  () => {
    assert.deepEqual(
      statements('- assert: First\n- proposal: Second\n- assert: Third').map(({ title }) => title),
      ['First', 'Second', 'Third'],
    );
  },
);

specTest(
  'proposal-notation',
  'Предложения в YAML-спецификации',
  'Правила утверждений',
  'Два элемента одной группы с одинаковым названием считаются дубликатами независимо от их типа',
  () => {
    const data = project('- assert: Same\n- proposal: Same');
    const validator = new Validator({});
    validator.validate(data);
    assert.ok(validator.errors.some(({ type }) => type === 'assertion-duplicate'));
  },
);

specTest(
  'proposal-notation',
  'Предложения в YAML-спецификации',
  'Правила утверждений',
  'Замена поля proposal на assert переводит существующее утверждение из запланированного в обязательное',
  () => {
    assert.equal(statements('- proposal: Same')[0].type, 'proposal');
    assert.equal(statements('- assert: Same')[0].type, 'assert');
  },
);

specTest(
  'proposal-notation',
  'Предложения в YAML-спецификации',
  'Правила утверждений',
  'Ссылки на фичи в названии и description элемента proposal валидируются так же, как ссылки элемента assert',
  () => {
    const validator = new Validator({});
    validator.validate(linkedProject('$known'));
    assert.equal(
      validator.errors.some(({ type }) => type === 'feature-missing-link'),
      false,
    );
  },
);

specTest(
  'proposal-notation',
  'Предложения в YAML-спецификации',
  'Правила утверждений',
  'Неразрешённая ссылка из proposal создаёт существующую диагностику отсутствующей ссылки',
  () => {
    const validator = new Validator({});
    validator.validate(linkedProject('$missing'));
    assert.equal(
      validator.errors.filter(({ type }) => type === 'feature-missing-link').length,
      2,
    );
  },
);
