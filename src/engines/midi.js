// Independently authored Standard MIDI File 0 writer.
// Supports a strictly validated single track with 480 ticks per beat.
import { parseRhythmPacket, TICKS_PER_BEAT } from './rhythm-packet.js';

function be16(n) { return [(n >> 8) & 255, n & 255]; }
function be32(n) { return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]; }
function varLength(n) {
  if (!Number.isSafeInteger(n) || n < 0 || n > 0x0fffffff) {
    throw new RangeError('Invalid MIDI delta time.');
  }
  const out = [n & 127];
  while ((n >>>= 7) > 0) out.unshift((n & 127) | 128);
  return out;
}

// Deliberately internal: caller must pass an already validated canonical packet.
function encodeTimeline({ bpm, ticksPerBeat, totalTicks, events }) {
  if (!Number.isInteger(bpm) || bpm < 40 || bpm > 200 ||
      ticksPerBeat !== TICKS_PER_BEAT ||
      !Number.isSafeInteger(totalTicks) || totalTicks < 1 ||
      !Array.isArray(events) || events.length < 1 || events.length > 128) {
    throw new RangeError('Invalid MIDI timeline.');
  }
  const tempo = Math.round(60_000_000 / bpm);
  const messages = [
    { tick: 0, priority: 0, bytes: [0xff, 0x51, 0x03, (tempo >> 16) & 255, (tempo >> 8) & 255, tempo & 255] }
  ];
  let previousStart = -1;
  for (const event of events) {
    if (!Number.isSafeInteger(event.startTick) || event.startTick < 0 ||
        event.startTick <= previousStart ||
        !Number.isInteger(event.durationTicks) || event.durationTicks < 1 ||
        event.startTick + event.durationTicks > totalTicks ||
        !Number.isInteger(event.midiNote) || event.midiNote < 0 || event.midiNote > 127 ||
        !Number.isInteger(event.velocity) || event.velocity < 1 || event.velocity > 127) {
      throw new RangeError('Invalid MIDI note event.');
    }
    previousStart = event.startTick;
    const offTick = event.startTick + Math.max(1, Math.round(event.durationTicks * 0.9));
    messages.push({ tick: event.startTick, priority: 2, bytes: [0x90, event.midiNote, event.velocity] });
    messages.push({ tick: offTick, priority: 1, bytes: [0x80, event.midiNote, 0] });
  }
  messages.push({ tick: totalTicks, priority: 3, bytes: [0xff, 0x2f, 0x00] });
  messages.sort((a, b) => a.tick - b.tick || a.priority - b.priority);
  const track = [];
  let previous = 0;
  for (const message of messages) {
    track.push(...varLength(message.tick - previous), ...message.bytes);
    previous = message.tick;
  }
  return new Uint8Array([
    0x4d, 0x54, 0x68, 0x64, ...be32(6), ...be16(0), ...be16(1), ...be16(ticksPerBeat),
    0x4d, 0x54, 0x72, 0x6b, ...be32(track.length), ...track
  ]);
}

export function rhythmPacketToMidi(input) {
  const packet = parseRhythmPacket(input);
  return encodeTimeline({ ...packet, events: packet.steps });
}

// A distinct composition format, validated before encoding. MBL's mix-v1 is
// intentionally NOT interchangeable with this musical note arrangement.
export function compositionToMidi(input) {
  // Import here to avoid a module-level dependency cycle:
  // composition -> rhythm-packet, midi -> rhythm-packet.
  // This normal static import is safe and tree-shakeable.
  return encodeTimelineFromComposition(input);
}

import { parseComposition } from './composition.js';
function encodeTimelineFromComposition(input) {
  return encodeTimeline(parseComposition(input));
}
