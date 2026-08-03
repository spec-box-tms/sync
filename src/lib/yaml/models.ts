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

export const proposeDecoder = d.intersect(
  d.struct({
    propose: d.string,
  })
)(
  d.partial({
    description: d.string,
  })
);

export type Assertion = d.TypeOf<typeof assertionDecoder>;
export type Propose = d.TypeOf<typeof proposeDecoder>;
export type Statement = Assertion | Propose;

export const statementDecoder: d.Decoder<unknown, Statement> = d.parse<
  Record<string, unknown>,
  Statement
>(
  (value) => {
    const hasAssert = Object.prototype.hasOwnProperty.call(value, 'assert');
    const hasPropose = Object.prototype.hasOwnProperty.call(value, 'propose');

    if (hasAssert === hasPropose) {
      return d.failure(value, 'exactly one of assert or propose');
    }

    return hasAssert
      ? assertionDecoder.decode(value)
      : proposeDecoder.decode(value);
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
