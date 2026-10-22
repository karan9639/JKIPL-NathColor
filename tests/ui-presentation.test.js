import test from 'node:test';
import assert from 'node:assert/strict';
import { formatNumber, rowField } from '../src/utils/format.js';

test('unavailable quantities stay unavailable rather than becoming zero', () => {
  for (const value of [null, undefined, '', ' ', 'not supplied', NaN, Infinity]) assert.equal(formatNumber(value), '—');
});
test('verified zero and negative reconciliation quantities remain visible', () => {
  assert.equal(formatNumber(0), '0');
  assert.equal(formatNumber('0'), '0');
  assert.equal(formatNumber(-12.25), '-12.25');
});
test('ERP comma quantities retain decimal precision', () => {
  assert.equal(formatNumber('1,234.567', 3), '1,234.567');
});
test('nested inventory fields preserve missing values and flat ERP keys', () => {
  assert.equal(rowField({ closing: { qty: null } }, 'closing.qty'), null);
  assert.equal(rowField({}, 'closing.qty'), undefined);
  assert.equal(rowField({ 'closing.qty': 12, closing: { qty: 5 } }, 'closing.qty'), 12);
});
