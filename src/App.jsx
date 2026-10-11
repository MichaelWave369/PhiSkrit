import React, { useMemo, useState } from 'react';
import ComposerLab from './components/ComposerLab.jsx';
import { useRhythmPlayback } from './hooks/useRhythmPlayback.js';
import { buildRhythmEvents } from './engines/rhythm.js';
import { createExperimentReceipt } from './engines/receipts.js';
import { runCrossEngineExperiment } from './engines/workbench.js';
import { auditExperimentReceipt } from './engines/receipt-audit.js';
import { createRhythmPacket, parseRhythmPacket, rhythmPacketSelection, MAX_PACKET_BYTES } from './engines/rhythm-packet.js';
import { rhythmPacketToMidi } from './engines/midi.js';
import { rhythmPacketToPng } from './engines/score-image.js';
import { applyDemoSandhi, DEMO_RULES } from './engines/grammar.js';
import { enumerateMeters, meterAt, meterCount, meterDuration } from './engines/prosody.js';
import { ARYABHATA_PI, piErrorPercent, circumference, earthRotationDegrees } from './engines/astronomy.js';

const SECTIONS = [
  { id: 'grammar', number: '01', name: 'Pāṇini', type: 'RULES', subtitle: 'Grammar as executable logic' },
  { id: 'prosody', number: '02', name: 'Piṅgala', type: 'PATTERNS', subtitle: 'Poetry as combinatorics' },
  { id: 'astronomy', number: '03', name: 'Āryabhaṭa', type: 'MATHEMATICS', subtitle: 'The cosmos as calculation' },
  { id: 'workbench', number: '04', name: 'Workbench', type: 'SYNTHESIS', subtitle: 'Cross-engine experiments and receipt audits' },
  { id: 'composer', number: '05', name: 'Composer', type: 'MUSIC LAB', subtitle: 'Layer and arrange rhythmic patterns' }
];

const REFERENCES = [
  { name: 'Pāṇini and the Aṣṭādhyāyī', description: 'Historical overview and formal-rule context', url: 'https://www.sciencedirect.com/science/article/pii/S0388000124000500' },
  { name: 'Piṅgala’s numbers', description: 'IIT Kharagpur lecture on binary-like prosody', url: 'https://cse.iitkgp.ac.in/~palash/Courses/2021Algorithms1-Theory/Files/Lec3.pdf' },
  { name: 'Āryabhaṭa, MacTutor', description: 'Biography, π approximation and astronomy', url: 'https://mathshistory.st-andrews.ac.uk/Biographies/Aryabhata_I/' }
];

function SectionHeading({ eyebrow, title, copy }) {
  return <div className="section-heading">
    <div className="eyebrow">{eyebrow}</div>
    <h2>{title}</h2>
    <p>{copy}</p>
  </div>;
}


function savePortableFile(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1200);
}

function RhythmBridge({ pattern, bpm, onImport }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Portable JSON · Standard MIDI file · Auralith-ready PNG image');
  const packet = useMemo(() => createRhythmPacket({ pattern, bpm }), [pattern, bpm]);

  async function exportAs(format) {
    setBusy(true);
    setMessage('');
    try {
      let blob, suffix;
      if (format === 'json') {
        blob = new Blob([JSON.stringify(packet, null, 2) + '\n'], { type: 'application/json' });
        suffix = 'json';
      } else if (format === 'midi') {
        blob = new Blob([rhythmPacketToMidi(packet)], { type: 'audio/midi' });
        suffix = 'mid';
      } else if (format === 'png') {
        blob = await rhythmPacketToPng(packet);
        suffix = 'png';
      } else throw new TypeError('Unknown export type');
      savePortableFile(blob, 'phiskrit-rhythm-' + pattern.toLowerCase() + '-' + bpm + 'bpm.' + suffix);
      setMessage(suffix.toUpperCase() + ' ready. Exported from the current ' + pattern + ' pattern.');
    } catch (error) {
      setMessage('Export failed: ' + (error?.message || 'Unknown error'));
    } finally {
      setBusy(false);
    }
  }

  async function importFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setMessage('Validating rhythm packet…');
    try {
      if (file.size > MAX_PACKET_BYTES) throw new RangeError('Packet must be smaller than 32 KiB.');
      const candidate = JSON.parse(await file.text());
      const imported = parseRhythmPacket(candidate);
      onImport(rhythmPacketSelection(imported));
      setMessage('Validated and loaded ' + imported.pattern + ' at ' + imported.bpm + ' BPM.');
    } catch (error) {
      setMessage('Import rejected: ' + (error?.message || 'Unknown error'));
    } finally {
      event.target.value = '';
      setBusy(false);
    }
  }

  return <div className="panel bridge-panel">
    <div className="panel-top"><span>PORTABLE RHYTHM / INTEROP v1</span><span>OFFLINE & SELF-CONTAINED</span></div>
    <h3>Send this pattern somewhere useful.</h3>
    <p className="muted">JSON for independent applications, MIDI for music software, and a PNG score that Auralith can import as an image. These are modern renderings, not historical music transcripts.</p>
    <div className="bridge-export-buttons">
      <button type="button" className="action-button" disabled={busy} onClick={() => exportAs('json')}>↓ Pattern JSON</button>
      <button type="button" className="action-button" disabled={busy} onClick={() => exportAs('midi')}>↓ Standard MIDI</button>
      <button type="button" className="action-button" disabled={busy} onClick={() => exportAs('png')}>↓ Auralith PNG</button>
    </div>
    <div className="bridge-import">
      <label htmlFor={'rhythm-import-' + pattern.length}>Import a PhiSkrit rhythm packet</label>
      <input id={'rhythm-import-' + pattern.length} type="file" accept=".json,application/json" disabled={busy} onChange={importFile} />
      <span>Only explicitly selected files are read; nothing is uploaded.</span>
    </div>
    <p className="bridge-status" role="status" aria-live="polite">{message}</p>
    <a className="bridge-link" href="https://michaelwave369.github.io/Auralith369/" target="_blank" rel="noopener noreferrer">Open Auralith to import the PNG as artwork ↗</a>
  </div>;
}

function ReceiptButton({ engine, inputs, outputs, trace }) {
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  async function exportReceipt() {
    setBusy(true);
    setStatus('');
    let url = null;
    try {
      const receipt = await createExperimentReceipt({ engine, inputs, outputs, trace });
      const blob = new Blob([JSON.stringify(receipt, null, 2) + '\n'], { type: 'application/json' });
      url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'phiskrit-' + engine + '-receipt.json';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setStatus('Receipt generated locally · SHA-256 attached');
    } catch (error) {
      setStatus('Export unavailable: ' + (error?.message || 'Unknown error'));
    } finally {
      if (url) window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setBusy(false);
    }
  }
  return <div className="receipt-row">
    <button type="button" className="action-button" onClick={exportReceipt} disabled={busy}>{busy ? 'Generating…' : '↓ Export experiment receipt'}</button>
    <span role="status">{status || 'Offline JSON · reproducible inputs and outputs'}</span>
  </div>;
}

function RuleDebugger({ result, step, setStep }) {
  const bounded = Math.min(step, result.trace.length - 1);
  const active = result.trace[bounded];
  return <div className="panel debugger-panel">
    <div className="panel-top"><span>RULE EXECUTION DEBUGGER</span><span>STEP {bounded + 1} / {result.trace.length}</span></div>
    <div className="debugger-controls">
      <button type="button" disabled={bounded === 0} onClick={() => setStep(0)}>↶ Reset</button>
      <button type="button" disabled={bounded === 0} onClick={() => setStep(n => Math.max(n - 1, 0))}>← Previous</button>
      <button type="button" disabled={bounded >= result.trace.length - 1} onClick={() => setStep(n => Math.min(n + 1, result.trace.length - 1))}>Next →</button>
      <button type="button" disabled={bounded === result.trace.length - 1} onClick={() => setStep(result.trace.length - 1)}>Run all ↗</button>
    </div>
    <div className="execution-path" aria-label="Rule execution steps">
      {result.trace.map((entry, index) => <button type="button" key={entry.id}
        className={'execution-node ' + (index === bounded ? 'selected' : '') + (index < bounded ? ' visited' : '')}
        onClick={() => setStep(index)} aria-pressed={index === bounded}>
        <span>{String(index + 1).padStart(2, '0')}</span>
        <strong>{entry.id}</strong>
        <small>{index > bounded ? 'UPCOMING' : entry.status.toUpperCase()}</small>
      </button>)}
    </div>
    <div className="debugger-inspector" role="status" aria-live="polite">
      <span className="eyebrow">INSPECTED STEP · {active.id}</span>
      <strong>{active.description}</strong>
      <p>{active.status === 'match' ? 'Rule condition matched this word boundary.' :
        active.status === 'skip' ? 'This condition did not match the word boundary.' :
        active.status === 'blocked' ? 'An input is missing. Nothing can be transformed.' :
        active.status === 'transformed' ? 'The selected demonstration rule produced the resulting form.' :
        'The original engine calculated the result. This view replays its trace; it does not alter the rule order.'}</p>
    </div>
    <p className="muted">Interactive inspection of a deterministically computed trace, not a historical reconstruction of Pāṇini’s complete rule-ordering system.</p>
  </div>;
}

function ReceiptInspector() {
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  async function inspect(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setResult(null);
    setBusy(true);
    try {
      if (file.size > 262144) throw new Error('Maximum file size is 256 KiB.');
      const data = JSON.parse(await file.text());
      const outcome = await auditExperimentReceipt(data);
      setResult({ ...outcome, name: file.name, engine: typeof data?.engine === 'string' ? data.engine : 'unknown',
        digest: typeof data?.integrity?.digest === 'string' ? data.integrity.digest : '' });
    } catch (error) {
      setResult({ status: 'read-failed', explanation: 'Unable to inspect the JSON receipt: ' + (error?.message || 'Unknown error') });
    } finally {
      setBusy(false);
      event.target.value = '';
    }
  }
  return <div className="panel audit-panel">
    <div className="panel-top"><span>RECEIPT INTEGRITY + DETERMINISTIC REPLAY</span><span>LOCAL FILE ONLY</span></div>
    <p className="muted">Import a JSON receipt exported from any PhiSkrit v0.2 or v0.3 engine. We check its SHA-256 digest, then independently recalculate supported engine results. Your file stays in your browser.</p>
    <label htmlFor="receipt-file" className="upload-label">Select PhiSkrit JSON receipt</label>
    <input id="receipt-file" type="file" accept=".json,application/json" disabled={busy} onChange={inspect} />
    <p className="muted">Maximum 256 KiB. A valid digest does not prove the source, authorship, historical accuracy, or that someone else did not recalculate the hash.</p>
    {busy && <p role="status">Checking the receipt…</p>}
    {result && <div className={'audit-result ' + result.status} role="status" aria-live="polite">
      <span className="eyebrow">{result.status.replaceAll('-', ' ').toUpperCase()}</span>
      <strong>{result.explanation}</strong>
      {result.name && <p>File: {result.name} · Engine: {result.engine}</p>}
      {result.digest && <code>SHA-256 (embedded): {result.digest}</code>}
    </div>}
  </div>;
}

function WorkbenchLab() {
  const [length, setLength] = useState(5);
  const [index, setIndex] = useState(10);
  const [bpm, setBpm] = useState(96);
  const result = useMemo(() => runCrossEngineExperiment({ length, index: Math.min(index, 2 ** length - 1), bpm }), [length, index, bpm]);
  const { outputs, trace, inputs } = result;
  const player = useRhythmPlayback(outputs.pattern, bpm);
  return <div className="workbench-wrap">
    <SectionHeading eyebrow="ENGINE 04 / REPRODUCIBLE SYNTHESIS" title="The cross-engine workbench" copy="One controlled pattern, three mathematical demonstrations. Generate L/G sequences, map them to existing demonstration rules, and independently check their combinatorial distribution. The mapping is a NEW educational invention, not a historical discovery." />
    <div className="lab-layout">
      <div className="lab-main">
        <div className="panel">
          <div className="panel-top"><span>EXPERIMENT INPUTS</span><span>{outputs.metrics.combinations} EXHAUSTIVE PATTERNS</span></div>
          <div className="control-head"><label htmlFor="bench-length">Pattern positions</label><strong>{length}</strong></div>
          <input id="bench-length" className="range" type="range" min="1" max="8" value={length}
            onChange={e => { const n = Number(e.target.value); setLength(n); setIndex(i => Math.min(i, 2 ** n - 1)); }} />
          <div className="control-head control-spaced"><label htmlFor="bench-index">Pattern index</label><strong>{inputs.index} / {2 ** length - 1}</strong></div>
          <input id="bench-index" className="range" type="range" min="0" max={2 ** length - 1} value={inputs.index}
            onChange={e => setIndex(Number(e.target.value))} />
          <div className="control-head control-spaced"><label htmlFor="bench-bpm">Modern playback tempo</label><strong>{bpm} BPM</strong></div>
          <input id="bench-bpm" className="range" type="range" min="60" max="180" step="2" value={bpm} onChange={e => setBpm(Number(e.target.value))} />
          <div className="bench-pattern" aria-label={'Selected pattern ' + outputs.pattern}>
            {[...outputs.pattern].map((letter, i) => <span key={i} className={'bench-syllable ' + (letter === 'G' ? 'heavy' : '')}>{letter}</span>)}
          </div>
          <div className="rhythm-playback">
            <button className="action-button" type="button" onClick={player.playing ? player.stop : player.play}>{player.playing ? '■ Stop pattern' : '▶ Hear pattern'}</button>
            <span role="status">{player.error || 'Synthesized in this browser, no prerecorded audio'}</span>
          </div>
          <div className="metrics"><div><span>GURU / HEAVY</span><strong>{outputs.metrics.guruCount}</strong></div><div><span>SYLLABLE UNITS</span><strong>{outputs.metrics.totalMatras}</strong></div><div><span>PLAY DURATION</span><strong>{outputs.metrics.durationSeconds.toFixed(2)}s</strong></div></div>
        </div>
        <div className="panel">
          <div className="panel-top"><span>GRAMMAR RULE MAP</span><span>ILLUSTRATIVE / DETERMINISTIC</span></div>
          <p className="muted">For this experiment, L maps to our DE​MO-01 vowel example and G maps to DEMO-02. This is a consciously invented translation between data representations.</p>
          <div className="bench-rule-steps">{trace.map(entry => <div key={entry.position} className="bench-rule-step">
            <span>{String(entry.position).padStart(2,'0')} · {entry.syllable}</span>
            <strong>{entry.input.join(' + ')} → {entry.output}</strong>
            <small>{entry.demoRule} · {entry.beats} {entry.beats === 1 ? 'beat' : 'beats'} · {entry.passes ? 'PASS' : 'FAIL'}</small>
          </div>)}</div>
        </div>
        <div className="panel">
          <div className="panel-top"><span>COMBINATORIAL BASELINE</span><span>{outputs.metrics.combinations} PATTERNS CHECKED</span></div>
          <p className="muted">Counting patterns by heavy syllables produces the binomial coefficients C(n,k). The bars are measured enumeration counts; the expected counts are calculated separately.</p>
          <div className="histogram">{outputs.distribution.map(row => <div key={row.guruCount} className="histogram-column">
            <div className="histogram-bar-wrap"><div className="histogram-bar" style={{ height: Math.max(4, 100 * row.observed / Math.max(...outputs.distribution.map(item => item.observed))) + '%' }} title={row.observed + ' patterns'}></div></div>
            <span>{row.guruCount}G</span><small>{row.observed} / {row.expected}</small>
          </div>)}</div>
          <div className="distribution-key">OBSERVED / EXPECTED · Number of patterns by guru count</div>
        </div>
        <RhythmBridge pattern={outputs.pattern} bpm={bpm} onImport={({length: n, index: i, bpm: tempo}) => { setLength(n); setIndex(i); setBpm(tempo); }} />
        <ReceiptButton engine="workbench" inputs={inputs} outputs={outputs} trace={trace} />
      </div>
      <aside className="lab-aside">
        <div className="aside-card"><div className="eyebrow">FOUR REPRODUCIBILITY CHECKS</div><h3>Independent baselines.</h3>
          <div className="check-list">{Object.entries(outputs.checks).map(([name, passed]) => <div key={name}><span>{passed ? '✓' : '×'}</span><span>{name.replace(/([A-Z])/g,' $1')}</span><strong>{passed ? 'PASS' : 'FAIL'}</strong></div>)}</div>
        </div>
        <div className="aside-card aside-spaced"><div className="eyebrow">ĀRYABHAṬA ARITHMETIC</div><h3>Numbers in motion.</h3>
          <p>Purely as a demonstration, treat the total syllable units ({outputs.metrics.totalMatras}) as a dimensionless circle diameter. Then apply 3.1416 and modern π.</p>
          <div className="rule-card"><span>3.1416 × {outputs.metrics.totalMatras}</span><strong>{outputs.mathematicalDemo.approximateCircumference.toFixed(4)}</strong></div>
          <div className="rule-card"><span>MODERN π RESULT</span><strong>{outputs.mathematicalDemo.modernCircumference.toFixed(4)}</strong></div>
          <p className="muted">A deliberate numerical analogy, not a claim that poetic meter determines astronomical measurements.</p>
        </div>
      </aside>
    </div>
    <div className="audit-divider"><div className="eyebrow">LEDGER / REPLAY</div><h2>Can your evidence reproduce?</h2></div>
    <ReceiptInspector />
  </div>;
}

function GrammarLab() {
  const [left, setLeft] = useState('deva');
  const [right, setRight] = useState('indra');
  const [step, setStep] = useState(3);
  const result = useMemo(() => applyDemoSandhi(left, right), [left, right]);
  const examples = [['deva', 'indra'], ['rāma', 'avatāra'], ['loka', 'upakāra']];
  return <div className="lab-layout">
    <div className="lab-main">
      <SectionHeading eyebrow="ENGINE 01 / RULE SYSTEM" title="The grammar engine" copy="Small rules. Predictable transformations. A complete execution trace. This teaching demo models three vowel-combination cases, not the full Aṣṭādhyāyī." />
      <div className="panel">
        <div className="panel-top"><span>INPUT STREAM</span><span>ROMANIZED TEXT / NFC</span></div>
        <div className="word-fields">
          <label>Left word<input value={left} maxLength={50} onChange={e => { setLeft(e.target.value); setStep(0); }} placeholder="deva" /></label>
          <div className="join-mark">+</div>
          <label>Right word<input value={right} maxLength={50} onChange={e => { setRight(e.target.value); setStep(0); }} placeholder="indra" /></label>
        </div>
        <div className="presets"><span>TRY A PAIR</span>{examples.map(([a,b]) =>
          <button key={a} onClick={() => { setLeft(a); setRight(b); setStep(0); }}>{a} + {b}</button>
        )}</div>
      </div>
      <div className="result-panel">
        <div className="panel-top"><span>RESULTING FORM</span><span>{result.appliedRule ?? 'NO RULE'}</span></div>
        <div className="result-word">{result.output || 'Enter two words'}</div>
        <p>{result.appliedRule ? 'A demonstration vowel rule was applied.' : 'No applicable demonstration rule was applied.'}</p>
      </div>
      <RuleDebugger result={result} step={step} setStep={setStep} />
      <ReceiptButton engine="grammar" inputs={{ left, right }} outputs={{ output: result.output, appliedRule: result.appliedRule }} trace={result.trace} />
    </div>
    <aside className="lab-aside">
      <div className="aside-card"><div className="eyebrow">THE RULESET</div>
        <h3>Priority matters.</h3>
        <p>The first matching rule wins. The trace makes both matching and skipped rules visible.</p>
        {DEMO_RULES.map(r => <div key={r.id} className="rule-card"><span>{r.id}</span><strong>{r.label}</strong></div>)}
      </div>
      <div className="aside-note">Historical boundary: the Aṣṭādhyāyī is a far more sophisticated system. These are modern, illustrative rules with explicit demo identifiers, not transcriptions of original sūtras.</div>
    </aside>
  </div>;
}

function ProsodyLab() {
  const [length, setLength] = useState(4);
  const [index, setIndex] = useState(5);
  const all = useMemo(() => enumerateMeters(length), [length]);
  const safeIndex = Math.min(index, meterCount(length) - 1);
  const pattern = meterAt(length, safeIndex);
  const [bpm, setBpm] = useState(96);
  const playback = useRhythmPlayback(pattern, bpm);
  const events = useMemo(() => buildRhythmEvents(pattern, bpm), [pattern, bpm]);
  return <div className="lab-layout">
    <div className="lab-main">
      <SectionHeading eyebrow="ENGINE 02 / COMBINATORICS" title="The pattern engine" copy="Laghu and guru: two kinds of syllable, many possible rhythms. Generate a complete space of metrical patterns and inspect any one of them." />
      <div className="panel">
        <div className="panel-top"><span>PATTERN CONTROLS</span><span>{meterCount(length)} COMBINATIONS</span></div>
        <div className="control-head"><label htmlFor="syllables">Syllable positions</label><strong>{length}</strong></div>
        <input id="syllables" className="range" type="range" min="1" max="8" value={length} onChange={e => { const next = Number(e.target.value); setLength(next); setIndex(i => Math.min(i, 2 ** next - 1)); }} />
        <div className="control-head control-spaced"><label htmlFor="pattern-index">Pattern index (modern zero-based ordering)</label><strong>{safeIndex} / {meterCount(length)-1}</strong></div>
        <input id="pattern-index" className="range" type="range" min="0" max={meterCount(length)-1} value={safeIndex} onChange={e => setIndex(Number(e.target.value))} />
        <div className="rhythm">{[...pattern].map((letter, i) => <div key={i} className={'syllable ' + (letter === 'G' ? 'long' : 'short')}><span>{letter}</span><small>{letter === 'G' ? 'GURU · 2' : 'LAGHU · 1'}</small></div>)}</div>
        <div className="metrics"><div><span>SELECTED PATTERN</span><strong>{pattern}</strong></div><div><span>TOTAL MĀTRĀS</span><strong>{meterDuration(pattern)}</strong></div><div><span>FORMULA</span><strong>2<sup>{length}</sup> = {meterCount(length)}</strong></div></div>
      </div>
      <div className="panel sound-panel">
        <div className="panel-top"><span>LIVE RHYTHM SEQUENCER</span><span>WEB AUDIO · NO SAMPLES / NO UPLOAD</span></div>
        <div className="control-head"><label htmlFor="rhythm-tempo">Tempo (quarter-note BPM)</label><strong>{bpm} BPM</strong></div>
        <input className="range" id="rhythm-tempo" type="range" min="60" max="180" step="2" value={bpm} onChange={e => setBpm(Number(e.target.value))} />
        <div className="rhythm-playback">
          <button type="button" className="action-button" aria-label={playback.playing ? 'Stop metrical rhythm' : 'Play metrical rhythm'} onClick={playback.playing ? playback.stop : playback.play}>
            {playback.playing ? '■ Stop playback' : '▶ Play this pattern'}
          </button>
          <span role="status">{playback.error || (playback.playing ? 'Playing the selected pattern' : 'Synthesized locally · light = 1 beat · heavy = 2 beats')}</span>
        </div>
        <div className="beat-track">{events.map(event => <div key={event.index} className={'beat-segment ' + (event.syllable === 'G' ? 'heavy' : 'light')} style={{ flexGrow: event.beats }}><span>{event.syllable}</span><small>{event.beats} {event.beats === 1 ? 'BEAT' : 'BEATS'}</small></div>)}</div>
        <p className="muted">Modern sonification: the 0/1 meter patterns determine timing, not a claim about instruments or music in Piṅgala's original treatise.</p>
      </div>
      <RhythmBridge pattern={pattern} bpm={bpm} onImport={({length: n, index: i, bpm: tempo}) => { setLength(n); setIndex(i); setBpm(tempo); }} />
      <ReceiptButton engine="prosody" inputs={{ length, index: safeIndex, bpm, mapping: 'L=1 beat, G=2 beats' }} outputs={{ pattern, matras: meterDuration(pattern), events }} trace={events} />
      <div className="panel">
        <div className="panel-top"><span>PATTERN ATLAS</span><span>{all.length} TOTAL / {Math.min(all.length, 32)} SHOWN</span></div>
        <div className="pattern-grid">{all.slice(0, 32).map(({ index: n, pattern: p }) =>
          <button key={n} className={'pattern-tile ' + (n === safeIndex ? 'chosen' : '')} onClick={() => setIndex(n)} aria-pressed={n === safeIndex}><small>{String(n).padStart(3,'0')}</small><strong>{p}</strong></button>
        )}</div>
        {all.length > 32 && <p className="muted">Use the pattern index slider to inspect the remaining {all.length - 32} combinations.</p>}
      </div>
    </div>
    <aside className="lab-aside">
      <div className="aside-card"><div className="eyebrow">TWO STATES</div><h3>Rhythm becomes data.</h3><p><strong>L · Laghu</strong> is a light syllable. <strong>G · Guru</strong> is a heavy syllable. In this visual model their durations are 1 and 2 units.</p>
      <div className="binary-key"><span>L = 0</span><span>G = 1</span></div></div>
      <div className="aside-note">The 0/1 mapping and left-to-right index displayed here are modern UI conventions. Do not mistake them for a faithful reconstruction of Piṅgala's historical enumeration procedure.</div>
    </aside>
  </div>;
}

function AstronomyLab() {
  const [diameter, setDiameter] = useState(20000);
  const [hours, setHours] = useState(6);
  const degrees = earthRotationDegrees(hours);
  const formatted = new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 });
  return <div className="lab-layout">
    <div className="lab-main">
      <SectionHeading eyebrow="ENGINE 03 / NUMBER & SKY" title="The mathematics engine" copy="Recreate a recorded approximation of π, explore circle measurements, and visualize the idea that Earth’s rotation changes our apparent sky." />
      <div className="panel">
        <div className="panel-top"><span>ĀRYABHAṬA’S π CALCULATION</span><span>REPRODUCIBLE</span></div>
        <div className="equation"><span>(104 × 8 + 62,000) ÷ 20,000</span><strong>{ARYABHATA_PI.toFixed(4)}</strong></div>
        <div className="metrics"><div><span>MODERN π</span><strong>{Math.PI.toFixed(8)}</strong></div><div><span>RELATIVE ERROR</span><strong>{piErrorPercent().toFixed(5)}%</strong></div></div>
        <div className="control-head control-spaced"><label htmlFor="diameter">Experiment: circle diameter</label><strong>{formatted.format(diameter)}</strong></div>
        <input className="range" id="diameter" type="range" min="1000" max="40000" step="1000" value={diameter} onChange={e => setDiameter(Number(e.target.value))} />
        <div className="comparison"><div><small>USING 3.1416</small><strong>{formatted.format(circumference(diameter))}</strong></div><div><small>USING MATH.PI</small><strong>{formatted.format(circumference(diameter, Math.PI))}</strong></div></div>
      </div>
      <div className="panel">
        <div className="panel-top"><span>ROTATION MODEL</span><span>SIMPLIFIED 24-HOUR DAY</span></div>
        <div className="orbit-stage">
          <div className="orbit" aria-label={'Earth has rotated ' + degrees.toFixed(0) + ' degrees in this model'}>
            <div className="orbit-track"></div><div className="orbit-star star-one">✧</div><div className="orbit-star star-two">✧</div>
            <div className="earth" style={{ transform: 'rotate(' + degrees + 'deg)' }}><span>◉</span><div className="earth-line"></div></div>
          </div>
          <div className="orbit-value"><strong>{degrees.toFixed(0)}°</strong><span>ILLUSTRATIVE ROTATION</span></div>
        </div>
        <div className="control-head"><label htmlFor="hours">Elapsed hours</label><strong>{hours} h</strong></div>
        <input className="range" id="hours" type="range" min="0" max="24" step="1" value={hours} onChange={e => setHours(Number(e.target.value))} />
        <p className="muted">A simple 15°/hour visual using a 24-hour day. This is not a precision sidereal or geocentric astronomy model.</p>
      </div>
      <ReceiptButton engine="astronomy" inputs={{ diameter, hours, model: '24-hour illustrative rotation' }} outputs={{ piApproximation: ARYABHATA_PI, piRelativeErrorPercent: piErrorPercent(), circumferenceApproximation: circumference(diameter), circumferenceModern: circumference(diameter, Math.PI), degrees }} trace={[{ formula: '(104×8+62000)/20000', result: ARYABHATA_PI }, { formula: '15 degrees per hour', degrees }]} />
    </div>
    <aside className="lab-aside">
      <div className="aside-card"><div className="eyebrow">THE PROVENANCE</div><h3>Exact math, cautious history.</h3><p>Āryabhaṭa's approximation is described as an approximate circumference of 62,832 for a diameter of 20,000. The resulting ratio is 3.1416.</p><div className="rule-card"><span>EXPERIMENT</span><strong>π ≈ C / D</strong></div></div>
      <div className="aside-note">We do not reproduce the viral claim that Earth's diameter was measured to within exactly 0.3%. The chronology and unit assumptions behind numerical comparisons need documented source analysis.</div>
    </aside>
  </div>;
}

export default function App() {
  const [active, setActive] = useState('grammar');
  const current = SECTIONS.find(x => x.id === active);
  return <div className="app">
    <header className="site-header"><a href="#top" className="logo"><span className="logo-symbol">Φ</span><span>Phi<span className="logo-accent">Skrit</span><small>THE SANSKRIT MACHINE</small></span></a><nav aria-label="Main navigation"><a href="#engines">Engines</a><a href="#evidence">Evidence</a><a href="https://github.com/MichaelWave369/PhiSkrit" target="_blank" rel="noopener noreferrer">GitHub ↗</a></nav><span className="version">V 0.5.1 · RHYTHM COMPOSER</span></header>
    <main id="top">
      <section className="hero">
        <div className="hero-content"><div className="eyebrow"><span className="status-dot"></span> AN OPEN LABORATORY FOR ANCIENT IDEAS</div><h1>Language is <em>logic.</em><br />Rhythm is <em>number.</em><br />The sky is <em>mathematics.</em></h1><p>Three remarkable intellectual traditions. Four runnable experiments. One place to ask how patterns become systems.</p><a className="primary-link" href="#engines">Explore the machines <span>↗</span></a></div>
        <div className="hero-art" aria-hidden="true"><div className="art-ring ring-1"></div><div className="art-ring ring-2"></div><div className="art-ring ring-3"></div><div className="art-cross"></div><div className="art-symbol">सं</div><span className="orbit-label orbit-a">RULE</span><span className="orbit-label orbit-b">FORM</span><span className="orbit-label orbit-c">NUMBER</span></div>
        <div className="hero-index"><span>01 / RULES</span><span>02 / PATTERNS</span><span>03 / MATHEMATICS</span></div>
      </section>
      <section id="engines" className="engines-section"><div className="section-kicker"><span>THE ENGINE ROOM</span><span>INTERACTIVE SYSTEMS / FIVE MODULES</span></div>
        <div className="engine-tabs" role="group" aria-label="Select experiment">{SECTIONS.map(section => <button key={section.id} className={'engine-tab ' + (active === section.id ? 'active' : '')} onClick={() => setActive(section.id)} aria-pressed={active === section.id}><span className="tab-number">{section.number}</span><strong>{section.name}</strong><small>{section.type}</small><span className="tab-arrow">↗</span></button>)}</div>
        <div className="active-summary"><span>NOW EXPLORING</span><strong>{current.subtitle}</strong><span className="live-dot">● LIVE MODEL</span></div>
        {active === 'grammar' ? <GrammarLab /> : active === 'prosody' ? <ProsodyLab /> : active === 'astronomy' ? <AstronomyLab /> : active === 'workbench' ? <WorkbenchLab /> : <ComposerLab />}
      </section>
      <section id="evidence" className="evidence-section"><div className="section-kicker"><span>EVIDENCE LEDGER</span><span>SOURCES · SCOPE · LIMITS</span></div><div className="evidence-intro"><div><div className="eyebrow">RESEARCH BEFORE MYTHOLOGY</div><h2>Every claim needs a source.<br /><em>Every model needs a boundary.</em></h2></div><p>PhiSkrit is an original educational implementation, not a Sanskrit translator, a full historical reconstruction, or proof that ancient texts secretly contained modern computers. We keep primary ideas, modern analogies, and speculative connections distinct.</p></div>
        <div className="source-grid">{REFERENCES.map((r,i) => <a className="source-card" key={r.url} href={r.url} target="_blank" rel="noopener noreferrer"><span>REFERENCE / 0{i+1}</span><strong>{r.name}</strong><p>{r.description}</p><span className="source-arrow">↗</span></a>)}</div>
        <p className="evidence-footer">MULTI-CLIP COMPOSER · PORTABLE RHYTHM · MIDI · PNG · VERSIONED JSON · LOCAL RECEIPTS · SHA-256 INTEGRITY · VERIFIED REPLAY · Computational outputs are demonstrations, not historical authentication · FUTURE RESEARCH · Comparative rule grammars · Historical metrical indexing · Formal provenance tags · Cross-engine experiments</p></section>
    </main>
    <footer><div><span className="logo-symbol">Φ</span><strong>PhiSkrit</strong><span>Independent implementation. Ledger above legend.</span></div><span>MIT LICENSE · © 2026 MichaelWave369</span></footer>
  </div>;
}
