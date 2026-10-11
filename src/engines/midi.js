// Standards-compatible Standard MIDI File format 0 (SMF), no library required.
// 480 PPQ, a tempo event, note-on/note-off messages, and End-of-Track.
// Music is an original modern rendering of the L/G pattern.
import { parseRhythmPacket } from './rhythm-packet.js';

function be16(n) { return [(n >> 8) & 255, n & 255]; }
function be32(n) { return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]; }
function varLength(n) {
  if (!Number.isSafeInteger(n) || n < 0 || n > 0x0fffffff) throw new RangeError('Invalid MIDI delta time.');
  const result = [n & 127];
  while ((n >>>= 7) > 0) result.unshift((n & 127) | 128);
  return result;
}

export function rhythmPacketToMidi(input) {
  const packet = parseRhythmPacket(input);
  const tempo = Math.round(60_000_000 / packet.bpm);
  const eventList = [{ tick: 0, kind: 0, bytes: [0xff, 0x51, 0x03, (tempo >> 16) & 255, (tempo >> 8) & 255, tempo & 255] }];
  for (const step of packet.steps) {
    // Note stops at 90% of each syllable slot to leave an audible separation.
    const off = step.startTick + Math.round(step.durationTicks * 0.9);
    eventList.push({ tick: step.startTick, kind: 2, bytes: [0x90, step.midiNote, step.velocity] });
    eventList.push({ tick: off, kind: 1, bytes: [0x80, step.midiNote, 0] });
  }
  eventList.push({ tick: packet.totalTicks, kind: 3, bytes: [0xff, 0x2f, 0x00] });
  eventList.sort((a, b) => a.tick - b.tick || a.kind - b.kind);
  let previous = 0;
  const track = [];
  for (const event of eventList) {
    track.push(...varLength(event.tick - previous), ...event.bytes);
    previous = event.tick;
  }
  return new Uint8Array([
    ...[0x4d, 0x54, 0x68, 0x64], ...be32(6), ...be16(0), ...be16(1), ...be16(packet.ticksPerBeat),
    ...[0x4d, 0x54, 0x72, 0x6b], ...be32(track.length), ...track
  ]);
}
