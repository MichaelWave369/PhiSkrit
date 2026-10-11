import React, { useMemo, useState } from 'react';
import { applyDemoSandhi, DEMO_RULES } from './engines/grammar.js';
import { enumerateMeters, meterAt, meterCount, meterDuration } from './engines/prosody.js';
import { ARYABHATA_PI, piErrorPercent, circumference, earthRotationDegrees } from './engines/astronomy.js';

const SECTIONS = [
  { id: 'grammar', number: '01', name: 'Pāṇini', type: 'RULES', subtitle: 'Grammar as executable logic' },
  { id: 'prosody', number: '02', name: 'Piṅgala', type: 'PATTERNS', subtitle: 'Poetry as combinatorics' },
  { id: 'astronomy', number: '03', name: 'Āryabhaṭa', type: 'MATHEMATICS', subtitle: 'The cosmos as calculation' }
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

function GrammarLab() {
  const [left, setLeft] = useState('deva');
  const [right, setRight] = useState('indra');
  const result = useMemo(() => applyDemoSandhi(left, right), [left, right]);
  const examples = [['deva', 'indra'], ['rāma', 'avatāra'], ['loka', 'upakāra']];
  return <div className="lab-layout">
    <div className="lab-main">
      <SectionHeading eyebrow="ENGINE 01 / RULE SYSTEM" title="The grammar engine" copy="Small rules. Predictable transformations. A complete execution trace. This teaching demo models three vowel-combination cases, not the full Aṣṭādhyāyī." />
      <div className="panel">
        <div className="panel-top"><span>INPUT STREAM</span><span>ROMANIZED TEXT / NFC</span></div>
        <div className="word-fields">
          <label>Left word<input value={left} maxLength={50} onChange={e => setLeft(e.target.value)} placeholder="deva" /></label>
          <div className="join-mark">+</div>
          <label>Right word<input value={right} maxLength={50} onChange={e => setRight(e.target.value)} placeholder="indra" /></label>
        </div>
        <div className="presets"><span>TRY A PAIR</span>{examples.map(([a,b]) =>
          <button key={a} onClick={() => { setLeft(a); setRight(b); }}>{a} + {b}</button>
        )}</div>
      </div>
      <div className="result-panel">
        <div className="panel-top"><span>RESULTING FORM</span><span>{result.appliedRule ?? 'NO RULE'}</span></div>
        <div className="result-word">{result.output || 'Enter two words'}</div>
        <p>{result.appliedRule ? 'A demonstration vowel rule was applied.' : 'No applicable demonstration rule was applied.'}</p>
      </div>
      <div className="panel">
        <div className="panel-top"><span>EXECUTION TRACE</span><span>{result.trace.length} ENTRIES</span></div>
        <div className="trace">{result.trace.map((item, index) => <div key={item.id} className="trace-row">
          <span className="mono trace-number">{String(index + 1).padStart(2,'0')}</span>
          <span className="trace-name">{item.description}</span>
          <span className={'trace-status ' + item.status}>{item.status}</span>
        </div>)}</div>
      </div>
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
    <header className="site-header"><a href="#top" className="logo"><span className="logo-symbol">Φ</span><span>Phi<span className="logo-accent">Skrit</span><small>THE SANSKRIT MACHINE</small></span></a><nav aria-label="Main navigation"><a href="#engines">Engines</a><a href="#evidence">Evidence</a><a href="https://github.com/MichaelWave369/PhiSkrit" target="_blank" rel="noopener noreferrer">GitHub ↗</a></nav><span className="version">V 0.1.0 · PUBLIC LAB</span></header>
    <main id="top">
      <section className="hero">
        <div className="hero-content"><div className="eyebrow"><span className="status-dot"></span> AN OPEN LABORATORY FOR ANCIENT IDEAS</div><h1>Language is <em>logic.</em><br />Rhythm is <em>number.</em><br />The sky is <em>mathematics.</em></h1><p>Three remarkable intellectual traditions. Three runnable experiments. One place to ask how patterns become systems.</p><a className="primary-link" href="#engines">Explore the machines <span>↗</span></a></div>
        <div className="hero-art" aria-hidden="true"><div className="art-ring ring-1"></div><div className="art-ring ring-2"></div><div className="art-ring ring-3"></div><div className="art-cross"></div><div className="art-symbol">सं</div><span className="orbit-label orbit-a">RULE</span><span className="orbit-label orbit-b">FORM</span><span className="orbit-label orbit-c">NUMBER</span></div>
        <div className="hero-index"><span>01 / RULES</span><span>02 / PATTERNS</span><span>03 / MATHEMATICS</span></div>
      </section>
      <section id="engines" className="engines-section"><div className="section-kicker"><span>THE ENGINE ROOM</span><span>INTERACTIVE SYSTEMS / THREE MODULES</span></div>
        <div className="engine-tabs" role="group" aria-label="Select experiment">{SECTIONS.map(section => <button key={section.id} className={'engine-tab ' + (active === section.id ? 'active' : '')} onClick={() => setActive(section.id)} aria-pressed={active === section.id}><span className="tab-number">{section.number}</span><strong>{section.name}</strong><small>{section.type}</small><span className="tab-arrow">↗</span></button>)}</div>
        <div className="active-summary"><span>NOW EXPLORING</span><strong>{current.subtitle}</strong><span className="live-dot">● LIVE MODEL</span></div>
        {active === 'grammar' ? <GrammarLab /> : active === 'prosody' ? <ProsodyLab /> : <AstronomyLab />}
      </section>
      <section id="evidence" className="evidence-section"><div className="section-kicker"><span>EVIDENCE LEDGER</span><span>SOURCES · SCOPE · LIMITS</span></div><div className="evidence-intro"><div><div className="eyebrow">RESEARCH BEFORE MYTHOLOGY</div><h2>Every claim needs a source.<br /><em>Every model needs a boundary.</em></h2></div><p>PhiSkrit is an original educational implementation, not a Sanskrit translator, a full historical reconstruction, or proof that ancient texts secretly contained modern computers. We keep primary ideas, modern analogies, and speculative connections distinct.</p></div>
        <div className="source-grid">{REFERENCES.map((r,i) => <a className="source-card" key={r.url} href={r.url} target="_blank" rel="noopener noreferrer"><span>REFERENCE / 0{i+1}</span><strong>{r.name}</strong><p>{r.description}</p><span className="source-arrow">↗</span></a>)}</div>
        <p className="evidence-footer">FUTURE RESEARCH · Comparative rule grammars · Historical metrical indexing · Formal provenance tags · Cross-engine experiments</p></section>
    </main>
    <footer><div><span className="logo-symbol">Φ</span><strong>PhiSkrit</strong><span>Independent implementation. Ledger above legend.</span></div><span>MIT LICENSE · © 2026 MichaelWave369</span></footer>
  </div>;
}
