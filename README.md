# PhiSkrit — The Sanskrit Machine

**Three runnable educational experiments inspired by classical Indian intellectual traditions.**

## v0.4.0: portable rhythm interoperability

Both the Piṅgala and Workbench tabs now export:

- **Rhythm JSON** using `phiskrit.rhythm.packet.v1` for independent applications. Re-import to restore a selected pattern and BPM; imported timing and note data are strictly validated.
- **Standard MIDI** (.mid, SMF type 0) with tempo, note on/off, 480 PPQ and end-of-track markers. Import into a MIDI-compatible music editor or workstation.
- **Auralith-compatible PNG** (1280×720). Open the image manually in [Auralith369](https://michaelwave369.github.io/Auralith369/) using its existing image importer. Auralith is an **image-editing** application; PhiSkrit does not pretend it has a music sequencer, modify Auralith files or cross app trust boundaries.

This is a standalone, modern sonification. It does **not** claim to reconstruct Sanskrit chanting or historical instrumentation. No user data is uploaded.

For the transport schema, exact event timing and security limits, see [Rhythm Packet v1](docs/RHYTHM_PACKET_V1.md).

## v0.3.0: cross-engine workbench + receipt replay

- **Cross-engine workbench:** a reproducible, bounded experiment combining enumerated L/G prosodic patterns, a consciously invented syllable-to-demo-rule mapping, synthesized timing, and arithmetic using Āryabhaṭa's recorded π approximation.
- **Independent numerical control:** compare empirical guru-count histograms from complete enumeration to separately computed binomial coefficients; four clear pass/fail invariants.
- **Local receipt audit:** import a PhiSkrit JSON receipt (up to 256 KiB), validate its existing SHA-256 digest, and recompute compatible v0.2/v0.3 engine outputs and traces. Digest validation alone is NOT authentication; replay checks agreement with *current code*, not historical truth.
- **Non-breaking schema:** v0.2 receipts remain verifiable. The v1 receipt format also supports the new "workbench" engine.
- **Pure-JavaScript engine:** no external datasets or new dependencies, no network request for audio or receipts.

The cross-engine mapping is an original teaching analogy and should **not** be interpreted as any recovered ancient procedure, physical phenomenon, or established connection to NBG. A rigorous research hypothesis will need its own baseline and receipts.

## v0.2.0: play, inspect, export

- **Rule debugger:** inspect the result of each demonstration rule evaluation with reset, previous, next, run-all, and direct step selection. The model is computed deterministically; UI inspection does not mutate the engine.
- **Rhythm sequencer:** click to synthesize the selected L/G metrical sequence in-browser using Web Audio, with 60–180 BPM tempo control, 1-beat laghu / 2-beat guru timing, and no recorded audio dependencies.
- **Experiment receipts:** export a machine-readable JSON document from each engine containing versioned schema, inputs, outputs, trace, provenance limitations and a local SHA-256 integrity checksum. The checksum detects alteration, **not** the truth of a historical claim or authorship.

All calculations and receipt schemas are independent of React and do not require a backend.

- **Pāṇini engine:** a deliberately small rule-priority and transformation-trace demo for three common Sanskrit vowel-combination cases. It is not a full Aṣṭādhyāyī implementation, a Sanskrit parser, or an authoritative linguistic reconstruction.
- **Piṅgala engine:** complete laghu/guru pattern enumeration for 1–8 syllabic positions, indexed exploration, and simple duration totals. Display mapping L=0 / G=1 is a modern UI convention, not a claim about the exact historical algorithm.
- **Āryabhaṭa engine:** repeatable approximation (104 × 8 + 62,000) / 20,000 = 3.1416, circle calculations, and an explicitly simplified rotation model.

Original code. No copied third-party implementation. Client-side only. No API keys or tracking. MIT licensed.

## Quick start

Requires Node 20.19+ or Node 22+.

    npm install
    npm test
    npm run dev

Build for production:

    npm run build
    npm run preview

Vite is configured for the GitHub Pages project path /PhiSkrit/.

## Deployment

.github/workflows/pages.yml checks tests and builds on pull requests. On pushes to main, it publishes the dist directory using the official GitHub Pages Actions deployment flow.

In repository **Settings → Pages → Build and deployment**, select **GitHub Actions** as the source if not already configured.

Intended URL: https://michaelwave369.github.io/PhiSkrit/

This URL is not guaranteed to work until the workflow succeeds and Pages is enabled.

## Design boundaries

- **OBSERVED/DERIVED:** engine outputs are reproducible and tested using explicit formulas and rule definitions.
- **DOCUMENTED:** original sources motivate the experiments; the source links are supplied in the app.
- **ILLUSTRATIVE:** the rule engine, modern pattern ordering, and rotation visualization make deliberate simplifications.
- **NOT CLAIMED:** the app does not assert that ancient authors invented modern programming languages, nor that the disputed 0.3% Earth-diameter statement is established.

The architecture keeps pure logic in src/engines/ so later experimental integrations can reuse it without React. Any future NBG/Altermath link must be a separately labeled hypothesis with an independent baseline.

## Research starting points

- [Remarks on Pāṇini's grammar, Linguistics](https://www.sciencedirect.com/science/article/pii/S0388000124000500)
- [Piṅgala's Numbers, IIT Kharagpur lecture](https://cse.iitkgp.ac.in/~palash/Courses/2021Algorithms1-Theory/Files/Lec3.pdf)
- [Āryabhaṭa biography, MacTutor](https://mathshistory.st-andrews.ac.uk/Biographies/Aryabhata_I/)

## Development priorities

1. Verify a green React Pages deployment and mobile UI.
2. Expand grammar experiments only alongside source citations and regression cases.
3. Add historically faithful, independently validated Piṅgala enumeration as a distinct mode.
4. Extend the receipt replayer with a documented migration policy for future engine revisions and optional comparison to saved baselines.
5. Explore cross-engine rule/pattern analogies without equating them to historical fact.

Copyright 2026 MichaelWave369. MIT license.
