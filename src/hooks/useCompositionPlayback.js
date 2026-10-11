import { useCallback, useEffect, useRef, useState } from 'react';

// Deterministic Web Audio timeline for a validated modern composition.
// Scheduling occurs only after a user explicitly presses Play.
function dispose(run) {
  if (!run) return;
  if (run.timer !== null) clearTimeout(run.timer);
  for (const oscillator of run.oscillators) {
    try { oscillator.stop(); } catch { /* Already finished. */ }
    oscillator.disconnect();
  }
  void run.context.close().catch(() => {});
}

export function useCompositionPlayback(composition) {
  const runRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState('');

  const stop = useCallback(() => {
    dispose(runRef.current);
    runRef.current = null;
    setPlaying(false);
  }, []);

  useEffect(() => {
    stop();
    return () => {
      dispose(runRef.current);
      runRef.current = null;
    };
  }, [composition, stop]);

  const play = useCallback(async () => {
    stop();
    setError('');
    const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Context) { setError('This browser does not support Web Audio.'); return; }
    let run;
    try {
      const context = new Context();
      run = { context, oscillators: [], timer: null };
      runRef.current = run;
      await context.resume();
      if (runRef.current !== run) return;
      const start = context.currentTime + 0.08;
      const secondPerTick = 60 / (composition.bpm * composition.ticksPerBeat);
      for (const event of composition.events) {
        const onset = start + event.startTick * secondPerTick;
        const duration = event.durationTicks * secondPerTick;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(
          440 * Math.pow(2, (event.midiNote - 69) / 12), onset);
        gain.gain.setValueAtTime(0.001, onset);
        gain.gain.linearRampToValueAtTime(event.velocity / 127 * 0.13, onset + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.001, onset + duration * 0.88);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(onset);
        oscillator.stop(onset + duration * 0.9);
        run.oscillators.push(oscillator);
      }
      setPlaying(true);
      run.timer = setTimeout(() => {
        if (runRef.current === run) {
          dispose(run);
          runRef.current = null;
          setPlaying(false);
        }
      }, composition.totalTicks * secondPerTick * 1000 + 130);
    } catch (cause) {
      if (runRef.current === run) runRef.current = null;
      dispose(run);
      setPlaying(false);
      setError('Unable to play: ' + (cause?.message || 'Audio error'));
    }
  }, [composition, stop]);

  return { play, stop, playing, error };
}
