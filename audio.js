import { SAMPLE_RATE, NOTE_FREQS, NOTE_LABELS } from './constants.js';

// ── Audio context (lazy init — requires user gesture) ──────
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

// ── Play a single note through the speakers ───────────────
export function playNote(note, durationSecs = 0.4) {
  const freq = NOTE_FREQS[note];
  if (!freq) return;
  const ctx = getAudioCtx();

  // Primary oscillator
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  gain.gain.setValueAtTime(0.001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationSecs);
  osc.connect(gain);
  gain.connect(ctx.destination);

  // Soft overtone (octave up) for warmth
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(freq * 2, ctx.currentTime);
  gain2.gain.setValueAtTime(0.15, ctx.currentTime);
  gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationSecs);
  osc2.connect(gain2);
  gain2.connect(ctx.destination);

  osc.start(ctx.currentTime);
  osc2.start(ctx.currentTime);
  osc.stop(ctx.currentTime + durationSecs);
  osc2.stop(ctx.currentTime + durationSecs);
}

// ── Generate a melody as float32 PCM samples ──────────────
export function generateMelody(durationSecs, userMelody = []) {
  const totalSamples = durationSecs * SAMPLE_RATE;
  const samples = new Float32Array(totalSamples);

  const melody = userMelody.length > 0
    ? userMelody
    : shuffleArray([...NOTE_LABELS]).slice(0, 6 + Math.floor(Math.random() * 4));

  const noteLen = Math.floor(totalSamples / melody.length);

  melody.forEach((note, i) => {
    const freq = NOTE_FREQS[note];
    const start = i * noteLen;
    const end = Math.min(start + noteLen, totalSamples);
    for (let s = start; s < end; s++) {
      const t = (s - start) / SAMPLE_RATE;
      const envelope = Math.min(t * 20, 1) * Math.min((end - s) / (SAMPLE_RATE * 0.05), 1);
      samples[s] = envelope * (
        0.7 * Math.sin(2 * Math.PI * freq * t) +
        0.2 * Math.sin(4 * Math.PI * freq * t) +
        0.1 * Math.sin(6 * Math.PI * freq * t)
      ) * 0.4;
    }
  });

  return samples;
}

// ── Convert float32 [-1,1] samples to int16 PCM ───────────
export function floatToInt16(samples) {
  const pcm = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    pcm[i] = Math.round(clamped * 32767);
  }
  return pcm;
}

// ── Utility ────────────────────────────────────────────────
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
