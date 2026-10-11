// Client-side receipt verifier. A matching digest establishes file integrity
// relative to the embedded digest, NOT authorship or historical truth.
import { verifyExperimentReceipt } from './receipts.js';
import { applyDemoSandhi } from './grammar.js';
import { meterAt, meterDuration } from './prosody.js';
import { buildRhythmEvents } from './rhythm.js';
import { ARYABHATA_PI, piErrorPercent, circumference, earthRotationDegrees } from './astronomy.js';
import { runCrossEngineExperiment } from './workbench.js';

function replay(receipt) {
  const i = receipt.inputs;
  if (!i || typeof i !== 'object') return null;
  switch (receipt.engine) {
    case 'grammar': {
      if (typeof i.left !== 'string' || typeof i.right !== 'string') return null;
      const r = applyDemoSandhi(i.left, i.right);
      return { outputs: { output: r.output, appliedRule: r.appliedRule }, trace: r.trace };
    }
    case 'prosody': {
      if (!Number.isInteger(i.length) || !Number.isInteger(i.index) || !Number.isInteger(i.bpm)) return null;
      const pattern = meterAt(i.length, i.index);
      const events = buildRhythmEvents(pattern, i.bpm);
      return { outputs: { pattern, matras: meterDuration(pattern), events }, trace: events };
    }
    case 'astronomy': {
      if (typeof i.diameter !== 'number' || typeof i.hours !== 'number') return null;
      const degrees = earthRotationDegrees(i.hours);
      return {
        outputs: {
          piApproximation: ARYABHATA_PI,
          piRelativeErrorPercent: piErrorPercent(),
          circumferenceApproximation: circumference(i.diameter),
          circumferenceModern: circumference(i.diameter, Math.PI),
          degrees
        },
        trace: [
          { formula: '(104×8+62000)/20000', result: ARYABHATA_PI },
          { formula: '15 degrees per hour', degrees }
        ]
      };
    }
    case 'workbench': {
      if (!Number.isInteger(i.length) || !Number.isInteger(i.index) || !Number.isInteger(i.bpm)) return null;
      const r = runCrossEngineExperiment(i);
      return { outputs: r.outputs, trace: r.trace };
    }
    default: return null;
  }
}

export async function auditExperimentReceipt(receipt) {
  const integrity = await verifyExperimentReceipt(receipt);
  if (!integrity) return {
    status: 'integrity-failed', integrity: false, replayed: false,
    explanation: 'The schema, declared provenance, or SHA-256 digest did not validate.'
  };
  try {
    const expected = replay(receipt);
    if (!expected) return {
      status: 'integrity-only', integrity: true, replayed: false,
      explanation: 'Integrity passed, but this receipt lacks inputs required for deterministic replay.'
    };
    const matches = JSON.stringify(receipt.outputs) === JSON.stringify(expected.outputs) &&
      JSON.stringify(receipt.trace) === JSON.stringify(expected.trace);
    return {
      status: matches ? 'replay-pass' : 'replay-failed',
      integrity: true, replayed: matches,
      explanation: matches
        ? 'Digest matches and the current engine reproduces the recorded outputs and trace.'
        : 'Digest matches, but current engine calculations disagree with the recorded outputs or trace.'
    };
  } catch (error) {
    return {
      status: 'replay-failed', integrity: true, replayed: false,
      explanation: 'Replay inputs are invalid or incompatible: ' + (error?.message || 'Unknown error')
    };
  }
}
