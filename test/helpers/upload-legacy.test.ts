import assert from 'node:assert/strict';
import { test } from 'node:test';

import { mapGroup } from '../../src/lib/upload/upload-entities';

test('legacy upload keeps assertions and omits proposes', () => {
  assert.deepEqual(
    mapGroup({
      title: 'Flow',
      assertions: [
        { type: 'assert', title: 'Required', status: 'automated' },
        {
          type: 'propose',
          title: 'Planned',
          description: 'Later',
        },
      ],
    }),
    {
      title: 'Flow',
      assertions: [
        { title: 'Required', description: undefined, isAutomated: true },
      ],
    },
  );
});
