import test from 'node:test';
import assert from 'node:assert/strict';
import { createRhythmPacket, parseRhythmPacket, rhythmPacketSelection, TICKS_PER_BEAT } from '../src/engines/rhythm-packet.js';
import { rhythmPacketToMidi } from '../src/engines/midi.js';
import { rhythmPacketToPng } from '../src/engines/score-image.js';
import { enumerateMeters, meterDuration } from '../src/engines/prosody.js';

test('v1 packet reproduces all 510 supported patterns and accurate tick totals', () => {
  let total = 0;
  for (let length = 1; length <= 8; length++) {
    for (const { index, pattern } of enumerateMeters(length)) {
      const packet = createRhythmPacket({ pattern, bpm: 120 });
      const parsed = parseRhythmPacket(JSON.parse(JSON.stringify(packet)));
      assert.deepEqual(parsed, packet);
      assert.deepEqual(rhythmPacketSelection(packet), { length, index, bpm: 120 });
      assert.equal(packet.totalTicks, meterDuration(pattern) * TICKS_PER_BEAT);
      assert.equal(packet.steps.length, length);
      let last = 0;
      for (const step of packet.steps) {
        assert.equal(step.startTick, last);
        assert.equal(step.durationTicks, (step.syllable === 'G' ? 2 : 1) * TICKS_PER_BEAT);
        last += step.durationTicks;
      }
      total++;
    }
  }
  assert.equal(total, 510);
});

test('v1 import accepts reordered keys but rejects edited steps, unknown fields and altered provenance', () => {
  const packet = createRhythmPacket({ pattern: 'LGL', bpm: 120 });
  const reordered = { ...packet, steps: packet.steps.map(step => ({ velocity: step.velocity, ...step })) };
  assert.deepEqual(parseRhythmPacket(reordered), packet);
  const tampered = structuredClone(packet);
  tampered.steps[1].durationTicks = 480;
  assert.throws(() => parseRhythmPacket(tampered), /differ/);
  assert.throws(() => parseRhythmPacket({ ...packet, externalUrl: 'https://example.com' }), /differ/);
  assert.throws(() => parseRhythmPacket({ ...packet, interpretation: 'HISTORICALLY_VERIFIED' }), /differ/);
});

test('v1 input validation refuses long patterns, illegal tempo and unknown schema', () => {
  assert.throws(() => createRhythmPacket({ pattern: 'LLGGLLGGL', bpm: 120 }), TypeError);
  assert.throws(() => createRhythmPacket({ pattern: 'LGL', bpm: 220 }), RangeError);
  assert.throws(() => parseRhythmPacket({ schema: 'other.v1', pattern: 'LGL' }), TypeError);
  assert.throws(() => parseRhythmPacket(null), TypeError);
});

function decodeMidi(bytes) {
  const b = Buffer.from(bytes);
  assert.equal(b.toString('ascii', 0, 4), 'MThd');
  assert.equal(b.readUInt32BE(4), 6);
  assert.equal(b.readUInt16BE(8), 0);
  assert.equal(b.readUInt16BE(10), 1);
  assert.equal(b.readUInt16BE(12), 480);
  assert.equal(b.toString('ascii', 14, 18), 'MTrk');
  assert.equal(b.readUInt32BE(18), b.length - 22);
  let offset = 22, tick = 0, tempo = null;
  const notesOn = [], notesOff = [];
  let ended = false;
  function vlq() {
    let result = 0, part;
    for (let n = 0; n < 4; n++) {
      assert.ok(offset < b.length, 'unexpected end of track');
      part = b[offset++];
      result = (result << 7) | (part & 127);
      if ((part & 128) === 0) return result;
    }
    throw new Error('MIDI VLQ too long');
  }
  while (offset < b.length) {
    tick += vlq();
    const status = b[offset++];
    if (status === 0xff) {
      const kind = b[offset++];
      const size = vlq();
      if (kind === 0x51) {
        assert.equal(size, 3);
        tempo = b.readUIntBE(offset, 3);
      }
      if (kind === 0x2f) {
        assert.equal(size, 0);
        ended = true;
        break;
      }
      offset += size;
    } else if (status === 0x90 || status === 0x80) {
      const note = b[offset++], velocity = b[offset++];
      const event = { tick, note, velocity };
      if (status === 0x90) notesOn.push(event);
      else notesOff.push(event);
    } else throw new Error('Unknown MIDI status ' + status.toString(16));
  }
  assert.equal(offset, b.length);
  assert.equal(ended, true);
  return { tick, tempo, notesOn, notesOff };
}

test('MIDI bytes decode to correct tempo, notes and end-of-track', () => {
  const packet = createRhythmPacket({ pattern: 'LGL', bpm: 120 });
  const midi = rhythmPacketToMidi(packet);
  const result = decodeMidi(midi);
  assert.equal(result.tempo, 500000);
  assert.equal(result.tick, 1920);
  assert.deepEqual(result.notesOn, [
    { tick: 0, note: 67, velocity: 78 },
    { tick: 480, note: 60, velocity: 108 },
    { tick: 1440, note: 67, velocity: 78 }
  ]);
  assert.deepEqual(result.notesOff.map(x => x.tick), [432, 1344, 1872]);
});

test('MIDI type-0 file structure and note count remain valid across patterns', () => {
  for (let n = 1; n <= 8; n++) {
    for (const { pattern } of enumerateMeters(n)) {
      const packet = createRhythmPacket({ pattern, bpm: 96 });
      const decoded = decodeMidi(rhythmPacketToMidi(packet));
      assert.equal(decoded.tempo, 625000);
      assert.equal(decoded.tick, packet.totalTicks);
      assert.equal(decoded.notesOn.length, n);
      assert.equal(decoded.notesOff.length, n);
      assert.ok(decoded.notesOff.every((event, i) =>
        event.tick > decoded.notesOn[i].tick &&
        event.tick < packet.steps[i].startTick + packet.steps[i].durationTicks));
    }
  }
});

test('PNG export requires browser canvas and refuses invalid dimensions first', async () => {
  const packet = createRhythmPacket({ pattern: 'LG', bpm: 96 });
  await assert.rejects(() => rhythmPacketToPng(packet, { width: 20 }), RangeError);
  await assert.rejects(() => rhythmPacketToPng(packet), /browser canvas/);
});
