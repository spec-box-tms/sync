import { skip, test } from 'node:test';

export const specTest = (
  code: string,
  feature: string,
  group: string,
  assertion: string,
  fn: () => Promise<void> | void,
) => test([code, feature, group, assertion].join(' '), fn);

export const skipTest = (
  code: string,
  feature: string,
  group: string,
  assertion: string,
  fn: () => Promise<void> | void,
) => skip([code, feature, group, assertion].join(' '), fn);
