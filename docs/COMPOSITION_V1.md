# PhiSkrit Rhythm Composition v1

## Purpose and boundaries

Schema: \`phiskrit.rhythm.composition.v1\`.

A self-contained sequence of **modern** laghu/guru pattern clips with tempo, repeat counts, a derived event timeline and optional export as MIDI Type 0. It is **not** historical Sanskrit performance evidence, a recording, or a More Bounce Labs catalog mix.

No third-party application code or audio files are used. The composer is local-first, has no persistent browser storage, and requires explicit human interaction to play, export or import.

## Canonical fields

The exported JSON includes:

- \`schema\`: exact version identifier.
- \`source\`: \`PhiSkrit\` (informational, not authentication).
- \`interpretation\`: \`ORIGINAL_MODERN_LG_ARRANGEMENT_NOT_HISTORICAL\`.
- \`title\`: 1–80 characters; control characters prohibited.
- \`bpm\`: integer 40–200 (browser UI uses 60–180).
- \`ticksPerBeat\`: 480.
- \`clips\`: 1–8 ordered objects \`{ "pattern": "LGL", "repeats": 2 }\`. Patterns use 1–8 capital L/G syllables. Repeats are 1–4.
- \`eventCount\`: number of note onsets, no more than 128.
- \`totalTicks\`: total sequential rhythm duration, in 480 PPQ ticks.
- \`events\`: derived ordered event list with \`clipIndex\`, \`repetition\`, \`position\`, \`syllable\`, \`startTick\`, \`durationTicks\`, \`midiNote\`, and \`velocity\`.

For example, two LGL repetitions followed by one GGLL clip produce 10 note events, lasting 14 beats or 6,720 ticks.

All derived fields are **fully recomputed** on import by \`parseComposition\`. Missing fields, extra properties, inconsistent timing, modified MIDI notes/velocity, unsupported versions, and overlarge arrangements fail closed before updating the UI. Browser file import is bounded to 96 KiB.

## MIDI mapping

Uses the original PhiSkrit Rhythm Packet v1 mapping:

- L = 1 beat, MIDI note 67 (G4), velocity 78
- G = 2 beats, MIDI note 60 (C4), velocity 108
- 480 ticks per quarter note, standard MIDI file **type 0**, one track.
- Track includes tempo, explicit note-on/off events (90% gate), and end-of-track at \`totalTicks\`.

This is a deliberately invented sonification, **not** a Sanskrit musical transcription.

## More Bounce Labs status

The current More Bounce Labs Agent Mix Studio expects \`mbl-mix-v1\`: a listening set referencing **real album IDs and track indexes** from its catalog. PhiSkrit composition JSON has none of those identities, so **do not** import it as an MBL mix or fabricate catalog entries.

**Available as of the PhiSkrit v0.5.1 handoff:** More Bounce Labs now has a separate **Desk → PhiSkrit Review** workspace. It independently validates `phiskrit.rhythm.composition.v1` and displays the arrangement as a read-only timeline. Export the JSON locally, open MBL Desk, select **PhiSkrit Review**, and import the file manually. This operation does not start audio, queue tracks, or modify the MBL Agent Mix Studio. MIDI export remains usable in regular MIDI-compatible music tools.

## Testing

Tests cover all 510 possible single-clip patterns (for 1–8 syllables), ensure their single-clip MIDI exactly matches the earlier v0.4 exporter, check multi-clip timing, enforce all clip and note bounds, and reject altered import payloads.
