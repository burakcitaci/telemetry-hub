import assert from 'node:assert/strict';
import { test } from 'node:test';
import { crossesThreshold } from './monitor-state';

for (const [comparator, expected] of [
  ['GT', [false, false, true]], ['GTE', [false, true, true]],
  ['LT', [true, false, false]], ['LTE', [true, true, false]],
] as const) {
  test(`${comparator} handles both crossing directions and equality`, () => {
    assert.deepEqual([9, 10, 11].map(value => crossesThreshold(value, 10, comparator)), expected);
  });
}

test('comparison rejects non-finite values and invalid comparators', () => {
  for (const value of [NaN, Infinity, -Infinity]) {
    assert.throws(() => crossesThreshold(value, 10, 'GT'));
    assert.throws(() => crossesThreshold(10, value, 'GT'));
  }
  assert.throws(() => crossesThreshold(10, 10, 'invalid' as any));
});
