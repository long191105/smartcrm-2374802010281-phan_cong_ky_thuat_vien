const assert = require('node:assert/strict');
const test = require('node:test');
const {
  addMinutesToVietnamDateTimeLocalValue,
  defaultVietnamDateTimeLocalValue,
  fromVietnamDateTimeLocalValue,
  toVietnamDateTimeLocalValue,
} = require('../src/components/date-time.mjs');

test('Vietnam local appointment time maps to the correct UTC instant regardless of host timezone', () => {
  const value = fromVietnamDateTimeLocalValue('2030-01-03T10:00');
  assert.equal(value.toISOString(), '2030-01-03T03:00:00.000Z');
  assert.equal(toVietnamDateTimeLocalValue(value), '2030-01-03T10:00');
});

test('adding appointment duration crosses dates using Vietnam wall-clock time', () => {
  assert.equal(
    addMinutesToVietnamDateTimeLocalValue('2030-01-03T23:45', 30),
    '2030-01-04T00:15',
  );
});

test('invalid Vietnam appointment dates are rejected', () => {
  assert.equal(fromVietnamDateTimeLocalValue('2030-02-30T10:00'), null);
  assert.equal(fromVietnamDateTimeLocalValue('not-a-date'), null);
});

test('default appointment time uses Vietnam wall-clock time rounded to a quarter-hour', () => {
  const now = new Date('2030-01-03T02:52:00.000Z');
  assert.equal(defaultVietnamDateTimeLocalValue(now), '2030-01-03T10:15');
});
