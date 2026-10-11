# PhiSkrit Rhythm Packet v1

## Purpose

An **original, platform-neutral, modern rhythm interface** for moving a PhiSkrit laghu/guru pattern into creative applications. This contract is **not** a historical reconstruction of Sanskrit recitation or musical practice.

## Example packet

    {
      "schema": "phiskrit.rhythm.packet.v1",
      "source": "PhiSkrit",
      "interpretation": "MODERN_SONIFICATION_NOT_HISTORICAL_RECONSTRUCTION",
      "pattern": "LGL",
      "bpm": 120,
      "ticksPerBeat": 480,
      "totalTicks": 1920,
      "steps": [
        { "position": 0, "syllable": "L", "startTick": 0, "durationTicks": 480, "midiNote": 67, "velocity": 78 },
        { "position": 1, "syllable": "G", "startTick": 480, "durationTicks": 960, "midiNote": 60, "velocity": 108 },
        { "position": 2, "syllable": "L", "startTick": 1440, "durationTicks": 480, "midiNote": 67, "velocity": 78 }
      ]
    }

## Timing and mapping

- 1–8 positions, each exactly uppercase L or G; integer BPM 40–200 (site slider is 60–180); JSON file import limit 32 KiB.
- 480 ticks per quarter-note beat. L is one beat and MIDI note 67 (G4) at velocity 78. G is two beats and MIDI note 60 (C4) at velocity 108.
- Note-on starts at the syllable start; note-off is at 90% of that syllable interval, preserving short gaps. Other musical mappings need their own documented version.
- Canonical packets include no timestamps, account IDs, signatures, executable code, URLs or imported dependencies.

## Import validation and security

`parseRhythmPacket()` rebuilds the entire expected packet using the exact declared pattern and tempo. It compares all fields, including start ticks, durations, notes, velocities and metadata. Object key order is ignored; unknown or altered fields are rejected. Applications receiving the format should implement their own equivalent validator rather than trusting the `source` string or filename.

## Output formats

- **JSON**: the versioned structured data packet. Importing it restores the selected pattern and BPM in either PhiSkrit engine.
- **MIDI**: Standard MIDI File format 0, a single track, 480 PPQ, tempo meta event, note-on and note-off on channel 1, and an end-of-track marker at totalTicks.
- **PNG**: locally rendered 1280×720 bitmap rhythm score. Suitable for Auralith369's supported PNG image importer or any normal image editor.

## Authority boundaries

- This is an **invented music visualization**, not an ancient algorithm recovery or evidence of an NBG/physical theory.
- A rhythm packet is **not a PhiSkrit experiment receipt** and carries no cryptographic signature, authentication, or history verification.
- Export is initiated by the human; JSON import is local and explicit. No cross-origin messaging, remote image fetch, or automatic file delivery is used.
- **Auralith itself is unchanged.** Its current documented public asset/image import accepts ordinary PNG files. Open the image in Auralith manually if desired.

Compatibility: v1 remains frozen; future changes must introduce a new versioned schema.
