// An original, strictly bounded composition format for modern L/G patterns.
// Not a reconstruction of historical Sanskrit meter performance or an MBL mix.
import { createRhythmPacket, TICKS_PER_BEAT } from './rhythm-packet.js';

export const COMPOSITION_SCHEMA = 'phiskrit.rhythm.composition.v1';
export const MAX_COMPOSITION_BYTES = 98304;
export const MAX_CLIPS = 8;
export const MAX_EVENTS = 128;
export const MAX_REPEATS = 4;

function validTitle(value) {
  if (typeof value !== 'string' || value.length < 1 || value.length > 80 ||
      !value.trim() || /[\u0000-\u001f\u007f]/.test(value)) {
    throw new TypeError('A composition title must be 1–80 non-control characters.');
  }
  return value;
}

export function createComposition({
  title = 'Untitled Rhythm',
  bpm = 96,
  clips = [{ pattern: 'LGL', repeats: 2 }]
} = {}) {
  validTitle(title);
  if (!Number.isInteger(bpm) || bpm < 40 || bpm > 200) {
    throw new RangeError('Tempo must be an integer between 40 and 200 BPM.');
  }
  if (!Array.isArray(clips) || clips.length < 1 || clips.length > MAX_CLIPS) {
    throw new RangeError('A composition requires 1–8 ordered clips.');
  }

  let nextTick = 0;
  const events = [];
  const canonicalClips = clips.map((clip, clipIndex) => {
    if (!clip || typeof clip !== 'object' || Array.isArray(clip)) {
      throw new TypeError('Every clip must be an object.');
    }
    if (!Number.isInteger(clip.repeats) || clip.repeats < 1 || clip.repeats > MAX_REPEATS) {
      throw new RangeError('Each clip requires 1–4 repeats.');
    }
    const packet = createRhythmPacket({ pattern: clip.pattern, bpm });
    for (let repetition = 0; repetition < clip.repeats; repetition++) {
      const start = nextTick;
      for (const step of packet.steps) {
        events.push({
          clipIndex, repetition, position: step.position,
          syllable: step.syllable, startTick: start + step.startTick,
          durationTicks: step.durationTicks,
          midiNote: step.midiNote, velocity: step.velocity
        });
        if (events.length > MAX_EVENTS) {
          throw new RangeError('Composition exceeds 128 syllable events.');
        }
      }
      nextTick += packet.totalTicks;
    }
    return { pattern: packet.pattern, repeats: clip.repeats };
  });

  return {
    schema: COMPOSITION_SCHEMA,
    source: 'PhiSkrit',
    interpretation: 'ORIGINAL_MODERN_LG_ARRANGEMENT_NOT_HISTORICAL',
    title, bpm,
    ticksPerBeat: TICKS_PER_BEAT,
    clips: canonicalClips,
    eventCount: events.length,
    totalTicks: nextTick,
    events
  };
}

function equivalent(a, b) {
  if (Object.is(a, b)) return true;
  if (Array.isArray(b)) {
    return Array.isArray(a) && a.length === b.length &&
      b.every((value, index) => equivalent(a[index], value));
  }
  if (!b || typeof b !== 'object') return false;
  if (!a || typeof a !== 'object' || Array.isArray(a)) return false;
  const x = Object.keys(a).sort(), y = Object.keys(b).sort();
  return x.length === y.length &&
    x.every((key, index) => key === y[index] && equivalent(a[key], b[key]));
}

// Invalid packets fail closed; no partial or privileged import.
export function parseComposition(candidate) {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate) ||
      candidate.schema !== COMPOSITION_SCHEMA) {
    throw new TypeError('Unrecognized PhiSkrit composition schema.');
  }
  const expected = createComposition({
    title: candidate.title, bpm: candidate.bpm, clips: candidate.clips
  });
  if (!equivalent(candidate, expected)) {
    throw new TypeError('Composition fields or event timing differ from the v1 contract.');
  }
  return expected;
}
