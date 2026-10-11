# PhiSkrit — The Sanskrit Machine

**Three runnable educational experiments inspired by classical Indian intellectual traditions.**

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
4. Provide a downloadable, versioned experiment/trace receipt format.
5. Explore cross-engine rule/pattern analogies without equating them to historical fact.

Copyright 2026 MichaelWave369. MIT license.
