import { Assertion } from './assertion.model';

export type FeatureGroup = {
  title: string;
  assertions: Assertion[];
};
