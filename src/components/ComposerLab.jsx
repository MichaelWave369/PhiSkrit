import React, { useMemo, useState } from 'react';
import { enumerateMeters, meterAt } from '../engines/prosody.js';
import { createComposition, parseComposition, MAX_CLIPS, MAX_EVENTS, MAX_COMPOSITION_BYTES } from '../engines/composition.js';
import { compositionToMidi } from '../engines/midi.js';
import { useCompositionPlayback } from '../hooks/useCompositionPlayback.js';

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1200);
}

function eventTotal(clips) {
  return clips.reduce((sum, clip) => sum + clip.pattern.length * clip.repeats, 0);
}

export default function ComposerLab() {
  const [title, setTitle] = useState('Nested Rhythm No. 1');
  const [bpm, setBpm] = useState(96);
  const [clips, setClips] = useState([
    { pattern: 'LGL', repeats: 2 },
    { pattern: 'GGLL', repeats: 1 }
  ]);
  const [length, setLength] = useState(4);
  const [index, setIndex] = useState(5);
  const [message, setMessage] = useState('All changes stay local to this browser until you export them.');
  const [busy, setBusy] = useState(false);

  const candidate = meterAt(length, index);
  const arrangement = useMemo(
    () => createComposition({ title: title.trim() || 'Untitled Rhythm', bpm, clips }),
    [title, bpm, clips]
  );
  const playback = useCompositionPlayback(arrangement);
  const durationSec = arrangement.totalTicks * 60 / (arrangement.ticksPerBeat * bpm);
  const canAdd = clips.length < MAX_CLIPS && eventTotal(clips) + candidate.length <= MAX_EVENTS;

  function addClip() {
    if (!canAdd) return;
    setClips(before => [...before, { pattern: candidate, repeats: 1 }]);
    setMessage('Added ' + candidate + ' to the arrangement.');
  }
  function removeClip(position) {
    if (clips.length === 1) return;
    setClips(before => before.filter((_, i) => i !== position));
  }
  function moveClip(position, shift) {
    const next = position + shift;
    if (next < 0 || next >= clips.length) return;
    setClips(before => {
      const array = [...before];
      [array[position], array[next]] = [array[next], array[position]];
      return array;
    });
  }
  function changeRepeats(position, change) {
    setClips(before => {
      const next = before.map((clip, i) =>
        i === position ? { ...clip, repeats: Math.max(1, Math.min(4, clip.repeats + change)) } : clip);
      return eventTotal(next) <= MAX_EVENTS ? next : before;
    });
  }
  async function importFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      if (file.size > MAX_COMPOSITION_BYTES) throw new RangeError('Composition JSON exceeds 96 KiB.');
      const imported = parseComposition(JSON.parse(await file.text()));
      setTitle(imported.title);
      setBpm(imported.bpm);
      setClips(imported.clips);
      setMessage('Validated and loaded "' + imported.title + '". Playback has not started.');
    } catch (error) {
      setMessage('Import rejected: ' + (error?.message || 'Invalid composition'));
    } finally {
      event.target.value = '';
      setBusy(false);
    }
  }
  function exportFile(format) {
    setMessage('');
    try {
      const filename = 'phiskrit-composition-' + (arrangement.title.toLowerCase()
        .normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'untitled');
      const blob = format === 'json'
        ? new Blob([JSON.stringify(arrangement, null, 2) + '\n'], { type: 'application/json' })
        : new Blob([compositionToMidi(arrangement)], { type: 'audio/midi' });
      download(blob, filename + (format === 'json' ? '.json' : '.mid'));
      setMessage((format === 'json' ? 'Composition JSON' : 'Type 0 MIDI') + ' exported locally.');
    } catch (error) {
      setMessage('Export failed: ' + (error?.message || 'Unknown error'));
    }
  }
  const meterOptions = enumerateMeters(length).slice(0, 16);
  return <div className="composer-lab">
    <div className="section-heading">
      <div className="eyebrow">ENGINE 05 / ORIGINAL MUSIC LAB</div>
      <h2>The rhythm composer</h2>
      <p>Stack, repeat and rearrange metrical patterns to build an original sequence. Listen in your browser, export real MIDI, or save a versioned composition. The musical mapping is modern and experimental, not a historical reconstruction.</p>
    </div>
    <div className="lab-layout">
      <div className="lab-main">
        <div className="panel">
          <div className="panel-top"><span>COMPOSITION SETTINGS</span><span>LOCAL / NO ACCOUNT REQUIRED</span></div>
          <div className="composer-field-row">
            <label className="composer-title-field">Composition name
              <input type="text" maxLength={80} value={title} onChange={event => setTitle(event.target.value)}
                placeholder="Untitled Rhythm"/>
            </label>
            <div className="composer-tempo-field">
              <div className="control-head"><label htmlFor="composer-tempo">Tempo</label><strong>{bpm} BPM</strong></div>
              <input id="composer-tempo" className="range" type="range" min="60" max="180" step="2" value={bpm}
                onChange={event => setBpm(Number(event.target.value))} />
            </div>
          </div>
          <div className="composer-stats">
            <div><span>CLIPS</span><strong>{clips.length} / {MAX_CLIPS}</strong></div>
            <div><span>SYLLABLE EVENTS</span><strong>{arrangement.eventCount} / {MAX_EVENTS}</strong></div>
            <div><span>BEATS</span><strong>{arrangement.totalTicks / arrangement.ticksPerBeat}</strong></div>
            <div><span>DURATION</span><strong>{durationSec.toFixed(1)}s</strong></div>
          </div>
        </div>
        <div className="panel">
          <div className="panel-top"><span>COMPOSITION TIMELINE</span><span>ORDERED / DETERMINISTIC</span></div>
          <div className="composer-timeline" role="list" aria-label="Sequence of syllable events">
            {arrangement.events.map((event, i) =>
              <div role="listitem" key={i}
                className={'composer-timeline-event ' + (event.syllable === 'G' ? 'heavy' : '')}
                style={{ width: (event.durationTicks / arrangement.ticksPerBeat) * 43 + 'px' }}
                title={'Clip ' + (event.clipIndex + 1) + ', repeat ' + (event.repetition + 1) + ', tick ' + event.startTick}>
                {event.syllable}<small>{event.startTick / arrangement.ticksPerBeat}</small>
              </div>)}
          </div>
          <p className="muted">Timeline numbers show beat offsets. Scroll horizontally to inspect long arrangements. L = one beat, G = two.</p>
          <div className="composer-controls">
            <button className="action-button" type="button" onClick={playback.playing ? playback.stop : playback.play}>
              {playback.playing ? '■ Stop composition' : '▶ Play composition'}
            </button>
            <span role="status">{playback.error || (playback.playing ? 'Playing the composed sequence' : 'Web Audio playback only starts when you press Play')}</span>
          </div>
        </div>
        <div className="panel">
          <div className="panel-top"><span>CLIP ARRANGEMENT</span><span>REORDER / REPEAT / REMOVE</span></div>
          <div className="composer-clips">{clips.map((clip, i) =>
            <div className="composer-clip" key={i}>
              <span className="composer-clip-index">{String(i + 1).padStart(2, '0')}</span>
              <strong>{clip.pattern}</strong>
              <span>{clip.repeats}× · {clip.pattern.length * clip.repeats} events</span>
              <div className="composer-clip-buttons">
                <button type="button" onClick={() => moveClip(i, -1)} disabled={i === 0} aria-label={'Move clip ' + (i + 1) + ' earlier'}>↑</button>
                <button type="button" onClick={() => moveClip(i, 1)} disabled={i === clips.length - 1} aria-label={'Move clip ' + (i + 1) + ' later'}>↓</button>
                <button type="button" onClick={() => changeRepeats(i, -1)} disabled={clip.repeats === 1} aria-label={'Reduce repeats on clip ' + (i + 1)}>−</button>
                <button type="button" onClick={() => changeRepeats(i, 1)}
                  disabled={clip.repeats === 4 || eventTotal(clips) + clip.pattern.length > MAX_EVENTS}
                  aria-label={'Add repeat to clip ' + (i + 1)}>+</button>
                <button type="button" onClick={() => removeClip(i)} disabled={clips.length === 1}
                  aria-label={'Remove clip ' + (i + 1)}>×</button>
              </div>
            </div>)}</div>
        </div>
        <div className="panel">
          <div className="panel-top"><span>ADD A PATTERN</span><span>UP TO 8 SYLLABLES</span></div>
          <div className="control-head"><label htmlFor="composer-length">Pattern length</label><strong>{length}</strong></div>
          <input className="range" type="range" id="composer-length" min="1" max="8" value={length}
            onChange={event => { const n = Number(event.target.value); setLength(n); setIndex(i => Math.min(i, 2 ** n - 1)); }} />
          <div className="control-head control-spaced"><label htmlFor="composer-index">Pattern index</label><strong>{index} / {2 ** length - 1}</strong></div>
          <input className="range" type="range" id="composer-index" min="0" max={2 ** length - 1} value={index}
            onChange={event => setIndex(Number(event.target.value))} />
          <div className="composer-pattern-bank">
            {meterOptions.map(({ index: option, pattern }) =>
              <button type="button" className={option === index ? 'selected' : ''} key={option}
                onClick={() => setIndex(option)} aria-pressed={option === index}>{pattern}</button>)}
          </div>
          <p className="muted">The bank shows the first {meterOptions.length} patterns. The index slider reaches the full set.</p>
          <button className="action-button" type="button" onClick={addClip} disabled={!canAdd}>
            + Add {candidate} to composition
          </button>
        </div>
        <div className="panel composer-export-panel">
          <div className="panel-top"><span>EXPORT / IMPORT</span><span>NO BACKGROUND TRANSFERS</span></div>
          <div className="composer-controls">
            <button className="action-button" type="button" onClick={() => exportFile('json')}>↓ Composition JSON</button>
            <button className="action-button" type="button" onClick={() => exportFile('midi')}>↓ Standard MIDI</button>
          </div>
          <label className="composer-import-label" htmlFor="composer-import">Import a PhiSkrit composition</label>
          <input id="composer-import" type="file" accept=".json,application/json" disabled={busy} onChange={importFile}/>
          <p className="muted">Import limit 96 KiB. Timing, notes, clip counts, and all metadata are reconstructed and verified before loading. Import does not start audio.</p>
          <p role="status" className="composer-status">{message}</p>
        </div>
      </div>
      <aside className="lab-aside">
        <div className="aside-card">
          <div className="eyebrow">COMPOSITION CONTRACT</div>
          <h3>Small, portable, repeatable.</h3>
          <p>A composition contains 1–8 clips, each repeating 1–4 times, with no more than 128 events. The MIDI writer uses the same note and tick mapping as PhiSkrit v0.4.</p>
          <div className="rule-card"><span>DATA FORMAT</span><strong>phiskrit.rhythm.composition.v1</strong></div>
          <div className="rule-card"><span>OUTPUT</span><strong>MIDI type 0 · 480 PPQ</strong></div>
        </div>
        <div className="aside-card aside-spaced">
          <div className="eyebrow">MORE BOUNCE LABS / FUTURE RECEIVER</div>
          <h3>Two studios, one honest boundary.</h3>
          <p>More Bounce Labs currently accepts <strong>catalog-based listening-set mixes</strong>, not arbitrary MIDI compositions. Save the composition here and use MIDI in compatible audio software. A future More Bounce receiver can support this format without changing its existing mix trust rules.</p>
          <a href="https://michaelwave369.github.io/MoreBounceLabs/" target="_blank" rel="noopener noreferrer" className="bridge-link">Open More Bounce Labs ↗</a>
        </div>
      </aside>
    </div>
  </div>;
}
