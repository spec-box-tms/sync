import assert from 'node:assert/strict';
import { test } from 'node:test';

import { mapGroup } from '../../src/lib/upload/upload-entities';

test('legacy upload keeps assertions and omits proposals', () => {
  assert.deepEqual(
    mapGroup({
      title: 'Flow',
      assertions: [
        { type: 'assert', title: 'Required', isAutomated: true },
        {
          type: 'proposal',
          title: 'Planned',
          description: 'Later',
          isAutomated: false,
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
