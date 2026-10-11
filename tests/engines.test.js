import test from 'node:test';
import assert from 'node:assert/strict';
import { applyDemoSandhi } from '../src/engines/grammar.js';
import { assertLength, meterAt, enumerateMeters, meterCount, meterDuration } from '../src/engines/prosody.js';
import { ARYABHATA_PI, circumference, earthRotationDegrees, piErrorPercent } from '../src/engines/astronomy.js';

test('demonstration sandhi: a + i', () => {
  const result = applyDemoSandhi('deva', 'indra');
  assert.equal(result.output, 'devendra');
  assert.equal(result.appliedRule, 'DEMO-02');
});
test('demonstration sandhi: a + a', () => {
  assert.equal(applyDemoSandhi('rāma', 'avatāra').output, 'rāmāvatāra');
});
test('demonstration sandhi: a + u', () => {
  assert.equal(applyDemoSandhi('loka', 'upakāra').output, 'lokopakāra');
});
test('unmatched rules are transparent, not hallucinated', () => {
  const result = applyDemoSandhi('tat', 'tvam');
  assert.equal(result.output, 'tattvam');
  assert.equal(result.appliedRule, null);
});
test('empty grammar input is blocked', () => {
  const result = applyDemoSandhi(' ', 'indra');
  assert.equal(result.output, '');
  assert.equal(result.trace[0].status, 'blocked');
});
test('patterns span a complete set without repeats', () => {
  const meters = enumerateMeters(5);
  assert.equal(meters.length, 32);
  assert.equal(new Set(meters.map(item => item.pattern)).size, 32);
});
test('indexed patterns match the declared modern binary mapping', () => {
  assert.equal(meterAt(3, 0), 'LLL');
  assert.equal(meterAt(3, 5), 'GLG');
  assert.equal(meterAt(3, 7), 'GGG');
  assert.equal(meterDuration('LGLG'), 6);
});
test('prosody rejects invalid lengths and indexes', () => {
  assert.throws(() => assertLength(0), RangeError);
  assert.throws(() => meterCount(9), RangeError);
  assert.throws(() => meterAt(2, 4), RangeError);
});
test('recorded Aryabhata arithmetic reproduces 3.1416', () => {
  assert.equal(ARYABHATA_PI, 3.1416);
  assert.ok(piErrorPercent() < 0.001);
});
test('circumference is linear in diameter', () => {
  assert.equal(circumference(20000), 62832);
  assert.equal(circumference(0), 0);
  assert.throws(() => circumference(-1), RangeError);
});
test('24-hour display model wraps one revolution', () => {
  assert.equal(earthRotationDegrees(6), 90);
  assert.equal(earthRotationDegrees(24), 0);
  assert.equal(earthRotationDegrees(-6), 270);
});
