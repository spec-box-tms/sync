import assert from 'node:assert/strict';

import { parse } from 'yaml';

import { processYamlFiles } from '../../src/lib/domain';
import { parseObject } from '../../src/lib/utils';
import { Validator } from '../../src/lib/validators';
import { entityDecoder } from '../../src/lib/yaml/models';
import { specTest } from '../serve/spec-name';

type RuntimeStatement = {
  type?: 'assert' | 'propose';
  title: string;
  description?: string;
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
        content: decode(`- propose: Planned ${link}\n  description: Details ${link}`),
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
  'propose-notation',
  'Propose в YAML-спецификации',
  'Формат YAML',
  'Элементы assert и propose могут находиться в одной группе specs-unit в любом порядке',
  () => {
    assert.deepEqual(
      statements('- propose: Later\n- assert: Now').map(({ type }) => type),
      ['propose', 'assert'],
    );
  },
);

specTest(
  'propose-notation',
  'Propose в YAML-спецификации',
  'Формат YAML',
  'Элемент propose содержит строковое название в поле propose и может содержать строковое поле description',
  () => {
    assert.deepEqual(statements('- propose: Later\n  description: Details')[0], {
      type: 'propose',
      title: 'Later',
      description: 'Details',
    });
  },
);

specTest(
  'propose-notation',
  'Propose в YAML-спецификации',
  'Формат YAML',
  'Каждый элемент группы specs-unit содержит ровно одно из полей assert или propose',
  () => {
    assert.doesNotThrow(() => decode('- assert: Now'));
    assert.doesNotThrow(() => decode('- propose: Later'));
  },
);

specTest(
  'propose-notation',
  'Propose в YAML-спецификации',
  'Формат YAML',
  'Элемент с одновременными полями assert и propose или без обоих полей отклоняется как некорректный YAML спецификации',
  () => {
    assert.throws(() => decode('- assert: Now\n  propose: Later'));
    assert.throws(() => decode('- description: Missing title'));
  },
);

specTest(
  'propose-notation',
  'Propose в YAML-спецификации',
  'Формат YAML',
  'Существующие спецификации только с элементами assert остаются корректными без миграции',
  () => {
    assert.equal(statements('- assert: Now')[0].title, 'Now');
  },
);

specTest(
  'propose-notation',
  'Propose в YAML-спецификации',
  'Правила утверждений',
  'Порядок assert и propose из YAML сохраняется в модели проекта',
  () => {
    assert.deepEqual(
      statements('- assert: First\n- propose: Second\n- assert: Third').map(({ title }) => title),
      ['First', 'Second', 'Third'],
    );
  },
);

specTest(
  'propose-notation',
  'Propose в YAML-спецификации',
  'Правила утверждений',
  'Два элемента одной группы с одинаковым названием считаются дубликатами независимо от их типа',
  () => {
    const data = project('- assert: Same\n- propose: Same');
    const validator = new Validator({});
    validator.validate(data);
    assert.ok(validator.errors.some(({ type }) => type === 'assertion-duplicate'));
  },
);

specTest(
  'propose-notation',
  'Propose в YAML-спецификации',
  'Правила утверждений',
  'Замена поля propose на assert переводит существующее утверждение из запланированного в обязательное',
  () => {
    assert.equal(statements('- propose: Same')[0].type, 'propose');
    assert.equal(statements('- assert: Same')[0].type, 'assert');
  },
);

specTest(
  'propose-notation',
  'Propose в YAML-спецификации',
  'Правила утверждений',
  'Ссылки на фичи в названии и description элемента propose валидируются так же, как ссылки элемента assert',
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
  'propose-notation',
  'Propose в YAML-спецификации',
  'Правила утверждений',
  'Ссылки на фичи в названии и description элемента propose валидируются так же, как ссылки элемента assert',
  () => {
    const validator = new Validator({});
    validator.validate(linkedProject('$missing'));
    assert.equal(
      validator.errors.filter(({ type }) => type === 'feature-missing-link').length,
      2,
    );
  },
);
