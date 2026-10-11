import test from 'node:test';
import assert from 'node:assert/strict';
import { createComposition, parseComposition, COMPOSITION_SCHEMA, MAX_EVENTS } from '../src/engines/composition.js';
import { compositionToMidi, rhythmPacketToMidi } from '../src/engines/midi.js';
import { createRhythmPacket } from '../src/engines/rhythm-packet.js';
import { enumerateMeters } from '../src/engines/prosody.js';

const sample = () => createComposition({
  title: 'Nested Rhythm No. 1', bpm: 120,
  clips: [{ pattern: 'LGL', repeats: 2 }, { pattern: 'GGLL', repeats: 1 }]
});

test('composer expands clips with deterministic global tick offsets', () => {
  const result = sample();
  assert.equal(result.schema, COMPOSITION_SCHEMA);
  assert.equal(result.eventCount, 10);
  assert.equal(result.totalTicks, 6720);
  assert.deepEqual(result.events.map(e => e.startTick),
    [0, 480, 1440, 1920, 2400, 3360, 3840, 4800, 5760, 6240]);
  assert.deepEqual(result.events.map(e => e.clipIndex), [0,0,0,0,0,0,1,1,1,1]);
  assert.equal(result.events.every(e => Number.isInteger(e.startTick) && Number.isInteger(e.durationTicks)), true);
});

test('single-clip composition MIDI exactly matches the v0.4 rhythm packet MIDI', () => {
  for (let length = 1; length <= 8; length++) {
    for (const { pattern } of enumerateMeters(length)) {
      const composition = createComposition({ title: 'Control', bpm: 120, clips: [{ pattern, repeats: 1 }] });
      const packet = createRhythmPacket({ pattern, bpm: 120 });
      assert.deepEqual(compositionToMidi(composition), rhythmPacketToMidi(packet), pattern);
    }
  }
});

test('v1 composition round-trips with no metadata or event loss', () => {
  const result = sample();
  assert.deepEqual(parseComposition(JSON.parse(JSON.stringify(result))), result);
  const clone = { ...result, clips: result.clips.map(c => ({ repeats: c.repeats, pattern: c.pattern })) };
  assert.deepEqual(parseComposition(clone), result);
});

test('event changes, URL injection, bogus interpretation, and clip changes reject import', () => {
  const result = sample();
  const tamper = candidate => structuredClone(candidate);
  const changed = tamper(result);
  changed.events[0].startTick += 480;
  assert.throws(() => parseComposition(changed), /differ/);
  assert.throws(() => parseComposition({ ...result, remoteAudioUrl: 'https://example.com' }), /differ/);
  assert.throws(() => parseComposition({ ...result, interpretation: 'VERIFIED_ANCIENT_METHOD' }), /differ/);
  const changedClip = tamper(result);
  changedClip.clips[0].repeats = 3;
  assert.throws(() => parseComposition(changedClip), /differ/);
  assert.throws(() => parseComposition({ schema: 'mbl-mix-v1', clips: [] }), /Unrecognized/);
});

test('composition limits reject unbounded clips, repeats, events and control characters', () => {
  assert.throws(() => createComposition({ clips: [] }), RangeError);
  assert.throws(() => createComposition({ clips: Array.from({ length: 9 }, () => ({ pattern: 'L', repeats: 1 })) }), RangeError);
  assert.throws(() => createComposition({ clips: [{ pattern: 'LG', repeats: 5 }] }), RangeError);
  assert.throws(() => createComposition({ title: 'unsafe\nheader' }), TypeError);
  assert.throws(() => createComposition({ bpm: 0 }), RangeError);
  assert.throws(() => createComposition({ clips: Array.from({ length: 5 }, () => ({ pattern: 'GGGGGGGG', repeats: 4 })) }), RangeError);
  assert.equal(createComposition({ clips: Array.from({ length: 4 }, () => ({ pattern: 'GGGGGGGG', repeats: 4 })) }).eventCount, MAX_EVENTS);
});

function inspectMidi(bytes) {
  const buffer = Buffer.from(bytes);
  assert.equal(buffer.toString('ascii', 0, 4), 'MThd');
  assert.equal(buffer.readUInt32BE(4), 6);
  assert.equal(buffer.readUInt16BE(8), 0);
  assert.equal(buffer.readUInt16BE(10), 1);
  assert.equal(buffer.readUInt16BE(12), 480);
  assert.equal(buffer.toString('ascii', 14, 18), 'MTrk');
  assert.equal(buffer.readUInt32BE(18), buffer.length - 22);
  let cursor = 22, tick = 0, tempo = 0, end = false;
  const onsets = [], offsets = [];
  function vlq() {
    let n = 0;
    for (let i = 0; i < 4; i++) {
      assert.ok(cursor < buffer.length);
      const byte = buffer[cursor++];
      n = (n << 7) | (byte & 127);
      if (!(byte & 128)) return n;
    }
    throw new Error('VLQ overlong');
  }
  while (cursor < buffer.length) {
    tick += vlq();
    const kind = buffer[cursor++];
    if (kind === 0xff) {
      const type = buffer[cursor++], count = vlq();
      if (type === 0x51) {
        assert.equal(count, 3);
        tempo = buffer.readUIntBE(cursor, 3);
      }
      if (type === 0x2f) {
        assert.equal(count, 0);
        end = true;
        break;
      }
      cursor += count;
    } else if (kind === 0x90 || kind === 0x80) {
      const note = buffer[cursor++], velocity = buffer[cursor++];
      (kind === 0x90 ? onsets : offsets).push({ tick, note, velocity });
    } else throw new Error('Unexpected MIDI event ' + kind);
  }
  assert.equal(cursor, buffer.length);
  assert.equal(end, true);
  return { tick, tempo, onsets, offsets };
}

test('multi-clip MIDI has correct tempo, note onsets and final marker', () => {
  const composed = sample();
  const parsed = inspectMidi(compositionToMidi(composed));
  assert.equal(parsed.tempo, 500000);
  assert.equal(parsed.tick, composed.totalTicks);
  assert.deepEqual(parsed.onsets.map(note => note.tick), composed.events.map(event => event.startTick));
  assert.deepEqual(parsed.onsets.map(note => note.note), composed.events.map(event => event.midiNote));
  assert.equal(parsed.offsets.length, composed.events.length);
  assert.equal(parsed.offsets.every((note, i) =>
    note.tick > parsed.onsets[i].tick &&
    note.tick < parsed.onsets[i].tick + composed.events[i].durationTicks), true);
});

test('maximum valid 128-event composition emits exactly 128 note-on and note-off pairs', () => {
  const composed = createComposition({
    bpm: 96,
    clips: Array.from({ length: 4 }, () => ({ pattern: 'LGGGGGGL', repeats: 4 }))
  });
  const midi = inspectMidi(compositionToMidi(composed));
  assert.equal(midi.tempo, 625000);
  assert.equal(midi.onsets.length, 128);
  assert.equal(midi.offsets.length, 128);
  assert.equal(midi.tick, composed.totalTicks);
});
