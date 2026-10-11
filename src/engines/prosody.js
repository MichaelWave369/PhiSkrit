// Binary-like syllabic-pattern explorer, not a historical reconstruction
// of Pingala's exact indexing convention or the entire Chandahshastra.
export function assertLength(length) {
  if (!Number.isInteger(length) || length < 1 || length > 8) {
    throw new RangeError('The lab supports 1 to 8 syllables.');
  }
}

export function meterCount(length) {
  assertLength(length);
  return 2 ** length;
}

export function meterAt(length, index) {
  assertLength(length);
  if (!Number.isInteger(index) || index < 0 || index >= meterCount(length)) {
    throw new RangeError('Pattern index is out of range.');
  }
  // Clearly defined modern display mapping: 0 = laghu, 1 = guru.
  return index.toString(2).padStart(length, '0')
    .replaceAll('0', 'L').replaceAll('1', 'G');
}

export function enumerateMeters(length) {
  return Array.from({ length: meterCount(length) }, (_, index) => ({
    index, pattern: meterAt(length, index)
  }));
}

export function meterDuration(pattern) {
  if (typeof pattern !== 'string' || !/^[LG]+$/.test(pattern)) {
    throw new TypeError('Expected a pattern containing only L and G.');
  }
  return [...pattern].reduce((total, syllable) => total + (syllable === 'G' ? 2 : 1), 0);
}
