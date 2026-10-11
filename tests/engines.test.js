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

import { buildRhythmEvents } from '../src/engines/rhythm.js';
import { createReceiptPayload, createExperimentReceipt, verifyExperimentReceipt } from '../src/engines/receipts.js';

test('syllabic events preserve order, durations, and accent', () => {
  const events = buildRhythmEvents('LGL', 120);
  assert.deepEqual(events.map(e => e.startBeat), [0, 1, 3]);
  assert.deepEqual(events.map(e => e.beats), [1, 2, 1]);
  assert.deepEqual(events.map(e => e.startSeconds), [0, 0.5, 1.5]);
  assert.deepEqual(events.map(e => e.durationSeconds), [0.5, 1, 0.5]);
});
test('meter event duration agrees with mathematical model', () => {
  for (const { pattern } of enumerateMeters(4)) {
    const events = buildRhythmEvents(pattern, 120);
    const totalBeats = events.reduce((n, e) => n + e.beats, 0);
    assert.equal(totalBeats, meterDuration(pattern));
  }
});
test('rhythm events reject illegal patterns or tempo', () => {
  assert.throws(() => buildRhythmEvents('XYZ', 120), TypeError);
  assert.throws(() => buildRhythmEvents('L', 0), RangeError);
  assert.throws(() => buildRhythmEvents('L'.repeat(9), 120), TypeError);
});
test('receipt canonical payload includes transparent evidence boundaries', () => {
  const p = createReceiptPayload({ engine: 'grammar', inputs: { left: 'deva', right: 'indra' },
    outputs: { output: 'devendra' }, trace: [], createdAt: '2026-10-10T00:00:00.000Z' });
  assert.equal(p.schema, 'phiskrit.experiment.receipt.v1');
  assert.equal(p.provenance.computation, 'SIMULATED');
  assert.match(p.provenance.scope, /not the complete/);
});
test('receipt validates integrity and rejects modified output', async () => {
  const receipt = await createExperimentReceipt({
    engine: 'prosody', inputs: { pattern: 'LGL' }, outputs: { beats: 4 },
    trace: [{ id: 1, syllable: 'G' }], createdAt: '2026-10-10T00:00:00.000Z'
  });
  assert.equal(await verifyExperimentReceipt(receipt), true);
  assert.equal(await verifyExperimentReceipt({ ...receipt, outputs: { beats: 5 } }), false);
  assert.equal(await verifyExperimentReceipt({ ...receipt, integrity: { algorithm: 'SHA-256', digest: '00' } }), false);
});
test('receipt rejects unknown engine and malformed inputs', () => {
  assert.throws(() => createReceiptPayload({ engine: 'unavailable', createdAt: '2026-10-10T00:00:00Z' }), RangeError);
  assert.throws(() => createReceiptPayload({ engine: 'grammar', inputs: [], outputs: {}, createdAt: '2026-10-10T00:00:00Z' }), TypeError);
});


import { binomialCount, runCrossEngineExperiment } from '../src/engines/workbench.js';
import { auditExperimentReceipt } from '../src/engines/receipt-audit.js';

test('binomial baseline has known exact values for n <= 8', () => {
  assert.deepEqual(Array.from({ length: 5 }, (_, k) => binomialCount(4, k)), [1, 4, 6, 4, 1]);
  assert.deepEqual(Array.from({ length: 9 }, (_, k) => binomialCount(8, k)), [1, 8, 28, 56, 70, 56, 28, 8, 1]);
  assert.throws(() => binomialCount(9, 2), RangeError);
  assert.throws(() => binomialCount(4, -1), RangeError);
});
test('cross-engine experiment has matching independent controls for each supported pattern length', () => {
  for (let n = 1; n <= 8; n++) {
    for (let i = 0; i < 2 ** n; i++) {
      const run = runCrossEngineExperiment({ length: n, index: i, bpm: 120 });
      assert.equal(run.outputs.metrics.combinations, 2 ** n);
      assert.equal(run.outputs.metrics.totalMatras, meterDuration(run.outputs.pattern));
      assert.equal(run.trace.length, n);
      assert.deepEqual(Object.values(run.outputs.checks), [true, true, true, true]);
      assert.equal(run.outputs.distribution.reduce((sum, row) => sum + row.observed, 0), 2 ** n);
    }
  }
});
test('cross-engine workbench transparently records invented rule examples and pi mapping', () => {
  const run = runCrossEngineExperiment({ length: 3, index: 5, bpm: 120 }); // GLG
  assert.equal(run.outputs.pattern, 'GLG');
  assert.deepEqual(run.trace.map(s => s.demoRule), ['DEMO-02', 'DEMO-01', 'DEMO-02']);
  assert.deepEqual(run.trace.map(s => s.beats), [2,1,2]);
  assert.equal(run.outputs.mathematicalDemo.assumedDiameter, 5);
  assert.equal(run.outputs.mathematicalDemo.approximateCircumference, circumference(5));
});
test('cross-engine workbench rejects invalid indices and tempos', () => {
  assert.throws(() => runCrossEngineExperiment({ length: 2, index: 4 }), RangeError);
  assert.throws(() => runCrossEngineExperiment({ length: 2, index: 1, bpm: 0 }), RangeError);
});
test('v0.3 cross-engine receipt has integrity and deterministic replay', async () => {
  const run = runCrossEngineExperiment({ length: 5, index: 10, bpm: 100 });
  const receipt = await createExperimentReceipt({ engine: 'workbench', ...run, createdAt: '2026-10-10T00:00:00.000Z' });
  const outcome = await auditExperimentReceipt(receipt);
  assert.equal(outcome.status, 'replay-pass');
  assert.equal(outcome.integrity, true);
  assert.equal(outcome.replayed, true);
});
test('tampered and internally inconsistent receipts are distinguished', async () => {
  const run = runCrossEngineExperiment({ length: 3, index: 5, bpm: 120 });
  const valid = await createExperimentReceipt({ engine: 'workbench', ...run, createdAt: '2026-10-10T00:00:00.000Z' });
  assert.equal((await auditExperimentReceipt({ ...valid, outputs: { fake: true } })).status, 'integrity-failed');
  const inconsistent = await createExperimentReceipt({ engine: 'workbench', inputs: run.inputs, outputs: { fake: true }, trace: run.trace, createdAt: valid.createdAt });
  const result = await auditExperimentReceipt(inconsistent);
  assert.equal(result.integrity, true);
  assert.equal(result.status, 'replay-failed');
});
test('receipts for v0.2 grammar, prosody, astronomy are replayable', async () => {
  const g = applyDemoSandhi('deva', 'indra');
  const p = meterAt(3, 5), events = buildRhythmEvents(p, 120);
  const examples = [
    { engine: 'grammar', inputs: { left: 'deva', right: 'indra' }, outputs: { output: g.output, appliedRule: g.appliedRule }, trace: g.trace },
    { engine: 'prosody', inputs: { length: 3, index: 5, bpm: 120, mapping: 'L=1 beat, G=2 beats' }, outputs: { pattern: p, matras: meterDuration(p), events }, trace: events },
    { engine: 'astronomy', inputs: { diameter: 20000, hours: 6, model: '24-hour illustrative rotation' },
      outputs: { piApproximation: ARYABHATA_PI, piRelativeErrorPercent: piErrorPercent(), circumferenceApproximation: circumference(20000), circumferenceModern: circumference(20000, Math.PI), degrees: earthRotationDegrees(6) },
      trace: [{ formula: '(104×8+62000)/20000', result: ARYABHATA_PI }, { formula: '15 degrees per hour', degrees: earthRotationDegrees(6) }] }
  ];
  for (const args of examples) {
    const receipt = await createExperimentReceipt({ ...args, createdAt: '2026-10-10T00:00:00.000Z' });
    const audit = await auditExperimentReceipt(receipt);
    assert.equal(audit.status, 'replay-pass', args.engine + ' did not replay');
  }
});
test('older integrity-valid but incomplete receipts report integrity-only', async () => {
  const receipt = await createExperimentReceipt({ engine: 'prosody', inputs: { pattern: 'LGL' }, outputs: { beats: 4 }, createdAt: '2026-10-10T00:00:00.000Z' });
  assert.equal((await auditExperimentReceipt(receipt)).status, 'integrity-only');
});
