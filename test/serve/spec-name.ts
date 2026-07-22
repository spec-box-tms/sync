import { test } from 'node:test';

export const specTest = (
  code: string,
  feature: string,
  group: string,
  assertion: string,
  fn: () => Promise<void> | void,
) => test([code, feature, group, assertion].join(' '), fn);
