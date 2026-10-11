import { useCallback, useEffect, useRef, useState } from 'react';
import { buildRhythmEvents } from '../engines/rhythm.js';

function releaseRun(run) {
  if (!run) return;
  if (run.timer !== null) clearTimeout(run.timer);
  for (const oscillator of run.oscillators) {
    try { oscillator.stop(); } catch { /* Already stopped. */ }
    oscillator.disconnect();
  }
  void run.context.close().catch(() => {});
}

// Browser-only audio. No network requests, microphone use, or sample downloads.
export function useRhythmPlayback(pattern, bpm) {
  const runRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState('');

  const stop = useCallback(() => {
    releaseRun(runRef.current);
    runRef.current = null;
    setPlaying(false);
  }, []);

  useEffect(() => {
    stop();
    return () => {
      releaseRun(runRef.current);
      runRef.current = null;
    };
  }, [pattern, bpm, stop]);

  const play = useCallback(async () => {
    stop();
    setError('');
    const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioContextClass) {
      setError('Web Audio is unavailable in this browser.');
      return;
    }
    let run;
    try {
      const events = buildRhythmEvents(pattern, bpm);
      const context = new AudioContextClass();
      run = { context, oscillators: [], timer: null };
      runRef.current = run;
      await context.resume();
      // An input change or stop may have invalidated this async attempt.
      if (runRef.current !== run) return;
      const start = context.currentTime + 0.08;
      for (const event of events) {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(event.frequencyHz, start + event.startSeconds);
        gain.gain.setValueAtTime(0, start + event.startSeconds);
        gain.gain.linearRampToValueAtTime(0.14, start + event.startSeconds + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.001, start + event.startSeconds + event.durationSeconds * 0.90);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(start + event.startSeconds);
        oscillator.stop(start + event.startSeconds + event.durationSeconds * 0.95);
        run.oscillators.push(oscillator);
      }
      const totalMs = (events.at(-1).startSeconds + events.at(-1).durationSeconds) * 1000 + 120;
      setPlaying(true);
      run.timer = setTimeout(() => {
        if (runRef.current === run) {
          releaseRun(run);
          runRef.current = null;
          setPlaying(false);
        }
      }, totalMs);
    } catch (cause) {
      if (runRef.current === run) runRef.current = null;
      releaseRun(run);
      setError('Cannot play audio: ' + (cause?.message || 'Audio playback failed.'));
      setPlaying(false);
    }
  }, [pattern, bpm, stop]);

  return { play, stop, playing, error };
}
