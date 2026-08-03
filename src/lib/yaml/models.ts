import * as d from 'io-ts/Decoder';

export const assertionDecoder = d.intersect(
  d.struct({
    assert: d.string,
  })
)(
  d.partial({
    description: d.string,
  })
);

export const proposalDecoder = d.intersect(
  d.struct({
    proposal: d.string,
  })
)(
  d.partial({
    description: d.string,
  })
);

export type Assertion = d.TypeOf<typeof assertionDecoder>;
export type Proposal = d.TypeOf<typeof proposalDecoder>;
export type Statement = Assertion | Proposal;

export const statementDecoder: d.Decoder<unknown, Statement> = d.parse<
  Record<string, unknown>,
  Statement
>(
  (value) => {
    const hasAssert = Object.prototype.hasOwnProperty.call(value, 'assert');
    const hasProposal = Object.prototype.hasOwnProperty.call(value, 'proposal');

    if (hasAssert === hasProposal) {
      return d.failure(value, 'exactly one of assert or proposal');
    }

    return hasAssert
      ? assertionDecoder.decode(value)
      : proposalDecoder.decode(value);
  }
)(d.UnknownRecord);

export const entityDecoder = d.intersect(
  d.struct({
    code: d.string,
    feature: d.string,
  })
)(
  d.partial({
    "specs-unit": d.record(d.array(statementDecoder)),
    definitions: d.record(d.array(d.string)),
    description: d.string,
  })
);

export type Entity = d.TypeOf<typeof entityDecoder>;
