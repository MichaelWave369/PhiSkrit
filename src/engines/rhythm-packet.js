// PhiSkrit's independent transport format. Deliberate modern choices,
// NOT an assertion about historical Sanskrit music or binary systems.
import { buildRhythmEvents } from './rhythm.js';

export const RHYTHM_PACKET_SCHEMA = 'phiskrit.rhythm.packet.v1';
export const TICKS_PER_BEAT = 480;
export const MAX_PACKET_BYTES = 32768;

export function createRhythmPacket({ pattern, bpm = 96 } = {}) {
  const events = buildRhythmEvents(pattern, bpm);
  let startTick = 0;
  const steps = events.map((event, position) => {
    const durationTicks = event.beats * TICKS_PER_BEAT;
    const step = {
      position, syllable: event.syllable,
      startTick, durationTicks,
      midiNote: event.syllable === 'G' ? 60 : 67,
      velocity: event.syllable === 'G' ? 108 : 78
    };
    startTick += durationTicks;
    return step;
  });
  return {
    schema: RHYTHM_PACKET_SCHEMA,
    source: 'PhiSkrit',
    interpretation: 'MODERN_SONIFICATION_NOT_HISTORICAL_RECONSTRUCTION',
    pattern,
    bpm,
    ticksPerBeat: TICKS_PER_BEAT,
    totalTicks: startTick,
    steps
  };
}

function structuralMatch(received, expected) {
  if (Object.is(received, expected)) return true;
  if (Array.isArray(expected)) return Array.isArray(received) && received.length === expected.length
    && expected.every((v, i) => structuralMatch(received[i], v));
  if (!expected || typeof expected !== 'object') return false;
  if (!received || typeof received !== 'object' || Array.isArray(received)) return false;
  const keys = Object.keys(expected).sort();
  const receivedKeys = Object.keys(received).sort();
  return keys.length === receivedKeys.length &&
    keys.every((key, i) => key === receivedKeys[i] && structuralMatch(received[key], expected[key]));
}

// A parser for untrusted transport data. It accepts key reorderings, but no
// extra fields, timings or notes that disagree with the documented model.
export function parseRhythmPacket(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      value.schema !== RHYTHM_PACKET_SCHEMA) {
    throw new TypeError('Unrecognized PhiSkrit rhythm packet schema.');
  }
  let canonical;
  try { canonical = createRhythmPacket({ pattern: value.pattern, bpm: value.bpm }); }
  catch (cause) { throw new TypeError('Invalid rhythm packet inputs: ' + cause.message); }
  if (!structuralMatch(value, canonical)) {
    throw new TypeError('Packet timing, metadata, notes, or layout differ from the v1 contract.');
  }
  return canonical;
}

export function rhythmPacketSelection(value) {
  const packet = parseRhythmPacket(value);
  return {
    length: packet.pattern.length,
    index: parseInt(packet.pattern.replaceAll('L', '0').replaceAll('G', '1'), 2),
    bpm: packet.bpm
  };
}
