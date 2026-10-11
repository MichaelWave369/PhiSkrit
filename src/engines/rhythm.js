// Original modern sonification of laghu/guru patterns.
// Does not claim historical pitches, tempo, or instruments.
export function buildRhythmEvents(pattern, bpm = 96) {
  if (typeof pattern !== 'string' || !/^[LG]{1,8}$/.test(pattern)) {
    throw new TypeError('Expected a pattern of 1 to 8 L/G syllables.');
  }
  if (!Number.isInteger(bpm) || bpm < 40 || bpm > 200) {
    throw new RangeError('Tempo must be an integer between 40 and 200 BPM.');
  }
  const secondPerBeat = 60 / bpm;
  let beat = 0;
  return [...pattern].map((syllable, index) => {
    const beats = syllable === 'G' ? 2 : 1;
    const event = {
      index, syllable, beats,
      startBeat: beat,
      startSeconds: beat * secondPerBeat,
      durationSeconds: beats * secondPerBeat,
      frequencyHz: syllable === 'G' ? 262 : 392
    };
    beat += beats;
    return event;
  });
}
