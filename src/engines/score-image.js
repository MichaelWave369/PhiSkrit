// Browser-only raster score for Auralith's supported PNG image importer.
// No access to Auralith projects, SDK, files or internal app state.
import { parseRhythmPacket } from './rhythm-packet.js';

export async function rhythmPacketToPng(input, { width = 1280, height = 720 } = {}) {
  const packet = parseRhythmPacket(input);
  if (!Number.isInteger(width) || width < 640 || width > 2048 ||
      !Number.isInteger(height) || height < 480 || height > 2048) {
    throw new RangeError('Score image dimensions must be within the supported bounds.');
  }
  if (typeof document === 'undefined') throw new Error('PNG export needs a browser canvas.');
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D unavailable.');
  const inset = 70;
  ctx.fillStyle = '#11222d';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#e7bd7c';
  ctx.font = 'bold 23px system-ui, sans-serif';
  ctx.fillText('Φ PHISKRIT', inset, 70);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#aebfbc';
  ctx.font = '17px ui-monospace, monospace';
  ctx.fillText('RHYTHM SCORE / v1', width - inset, 70);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#f1eee5';
  ctx.font = 'bold 54px Georgia, serif';
  ctx.fillText('Laghu / Guru', inset, 165);
  ctx.fillStyle = '#b3c6c7';
  ctx.font = '20px system-ui, sans-serif';
  ctx.fillText('Modern rhythm score, not a historical transcription', inset, 207);
  ctx.fillStyle = '#e6c18a';
  ctx.font = '24px ui-monospace, monospace';
  ctx.fillText(packet.pattern + '    |    ' + packet.bpm + ' BPM    |    ' +
    packet.totalTicks / packet.ticksPerBeat + ' beats', inset, 273);
  const gap = 14;
  const span = (width - inset * 2 - gap * (packet.steps.length - 1)) / packet.steps.length;
  const top = 330, bottom = 520;
  for (const step of packet.steps) {
    const x = inset + step.position * (span + gap);
    const heavy = step.syllable === 'G';
    ctx.fillStyle = heavy ? '#d5a466' : '#81bba4';
    ctx.fillRect(x, top, span, bottom - top);
    ctx.fillStyle = '#142832';
    ctx.font = 'bold 55px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(step.syllable, x + span / 2, top + 100);
    ctx.font = '13px ui-monospace, monospace';
    ctx.fillText(heavy ? '2 BEATS' : '1 BEAT', x + span / 2, top + 143);
    ctx.textAlign = 'left';
  }
  ctx.strokeStyle = '#44606a';
  ctx.beginPath();
  ctx.moveTo(inset, 568);
  ctx.lineTo(width - inset, 568);
  ctx.stroke();
  ctx.fillStyle = '#c5c2b7';
  ctx.font = '19px system-ui, sans-serif';
  ctx.fillText('Light (L): one beat    •    Heavy (G): two beats', inset, 617);
  ctx.fillStyle = '#91a7a9';
  ctx.font = '15px ui-monospace, monospace';
  ctx.fillText('PHISKRIT.RHYTHM.PACKET.V1 · LOCAL EXPORT · NO EXTERNAL ASSETS', inset, 665);
  return new Promise((resolve, reject) => {
    if (typeof canvas.toBlob !== 'function') {
      reject(new Error('This browser does not support canvas PNG export.'));
      return;
    }
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Canvas PNG export failed.')), 'image/png');
  });
}
