// A deliberately small, original teaching engine inspired by ordered
// transformations. These DEMO IDs are NOT Aṣṭādhyāyī sūtra numbers.
// This is not a Sanskrit parser or an authoritative sandhi implementation.
export const DEMO_RULES = Object.freeze([
  { id: 'DEMO-01', label: 'a/ā + a/ā → ā', tails: ['a', 'ā'], heads: ['a', 'ā'], result: 'ā' },
  { id: 'DEMO-02', label: 'a/ā + i/ī → e', tails: ['a', 'ā'], heads: ['i', 'ī'], result: 'e' },
  { id: 'DEMO-03', label: 'a/ā + u/ū → o', tails: ['a', 'ā'], heads: ['u', 'ū'], result: 'o' }
]);

export function applyDemoSandhi(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string') {
    throw new TypeError('Both inputs must be strings.');
  }
  const a = left.trim().normalize('NFC');
  const b = right.trim().normalize('NFC');
  if (!a || !b) return {
    input: [a, b], output: '', appliedRule: null,
    trace: [{ id: 'INPUT', status: 'blocked', description: 'Both words are required.' }]
  };
  const tail = [...a].at(-1);
  const head = [...b][0];
  let chosen = null;
  const trace = DEMO_RULES.map(rule => {
    const matches = rule.tails.includes(tail) && rule.heads.includes(head);
    if (!chosen && matches) chosen = rule;
    return { id: rule.id, status: matches ? 'match' : 'skip', description: rule.label };
  });
  const output = chosen
    ? [...a].slice(0, -1).join('') + chosen.result + [...b].slice(1).join('')
    : a + b;
  trace.push({
    id: 'OUTPUT',
    status: chosen ? 'transformed' : 'unchanged',
    description: chosen ? 'The first matching demonstration rule was applied.' : 'No demonstration rule matched; the words were joined unchanged.'
  });
  return { input: [a, b], output, appliedRule: chosen?.id ?? null, trace };
}
