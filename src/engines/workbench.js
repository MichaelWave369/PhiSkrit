// Modern, deliberately invented cross-engine mapping for teaching and testing.
// NOT evidence of a historical connection between grammar, prosody and astronomy.
import { applyDemoSandhi } from './grammar.js';
import { enumerateMeters, meterAt, meterCount, meterDuration } from './prosody.js';
import { buildRhythmEvents } from './rhythm.js';
import { ARYABHATA_PI, circumference, piErrorPercent } from './astronomy.js';

const TEACHING_MAPPING = Object.freeze({
  L: Object.freeze({ left: 'rāma', right: 'avatāra', expectedRule: 'DEMO-01', expectedOutput: 'rāmāvatāra' }),
  G: Object.freeze({ left: 'deva', right: 'indra', expectedRule: 'DEMO-02', expectedOutput: 'devendra' })
});

// A small independent numerical baseline for enumerated pattern counts.
export function binomialCount(n, k) {
  if (!Number.isInteger(n) || n < 0 || n > 8 ||
      !Number.isInteger(k) || k < 0 || k > n) {
    throw new RangeError('Expected 0 ≤ k ≤ n ≤ 8.');
  }
  const j = Math.min(k, n - k);
  let result = 1;
  for (let i = 1; i <= j; i++) result = result * (n - j + i) / i;
  return Math.round(result);
}

export function runCrossEngineExperiment({ length = 4, index = 5, bpm = 96 } = {}) {
  const pattern = meterAt(length, index); // validates n and index
  const events = buildRhythmEvents(pattern, bpm); // validates tempo
  const totalMatras = meterDuration(pattern);
  const all = enumerateMeters(length);
  const distribution = Array.from({ length: length + 1 }, (_, guruCount) => {
    const observed = all.reduce((sum, item) =>
      sum + ([...item.pattern].filter(s => s === 'G').length === guruCount ? 1 : 0), 0);
    return {
      guruCount, matras: length + guruCount,
      observed, expected: binomialCount(length, guruCount)
    };
  });
  const trace = events.map(event => {
    const example = TEACHING_MAPPING[event.syllable];
    const transformed = applyDemoSandhi(example.left, example.right);
    return {
      position: event.index + 1,
      syllable: event.syllable,
      startBeat: event.startBeat,
      beats: event.beats,
      demoRule: transformed.appliedRule,
      input: [example.left, example.right],
      output: transformed.output,
      passes: transformed.appliedRule === example.expectedRule &&
        transformed.output === example.expectedOutput
    };
  });
  const outputs = {
    pattern,
    metrics: {
      combinations: meterCount(length),
      lightCount: [...pattern].filter(s => s === 'L').length,
      guruCount: [...pattern].filter(s => s === 'G').length,
      totalMatras,
      durationSeconds: events.reduce((sum, event) => sum + event.durationSeconds, 0)
    },
    distribution,
    // Explicitly invented numerical mapping: metrical duration as unitless diameter.
    // This demonstrates reusing Aryabhata's π approximation, not an ancient assertion.
    mathematicalDemo: {
      assumedDiameter: totalMatras,
      aryabhataPi: ARYABHATA_PI,
      approximateCircumference: circumference(totalMatras),
      modernCircumference: circumference(totalMatras, Math.PI),
      relativePiErrorPercent: piErrorPercent()
    },
    checks: {
      enumerationCount: all.length === 2 ** length,
      independentBinomialBaseline: distribution.every(row => row.observed === row.expected),
      rhythmDuration: totalMatras === events.reduce((sum, event) => sum + event.beats, 0),
      demonstrationRules: trace.every(entry => entry.passes)
    }
  };
  return { inputs: { length, index, bpm }, outputs, trace };
}
