// ── Constants ──────────────────────────────────────────────
export const SAMPLE_RATE = 44100;
export const HEADER_BITS = 32;

export const NOTE_FREQS = {
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00,
  A4: 440.00, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25,
  G5: 783.99, A5: 880.00
};

export const NOTE_LABELS = ['C4','D4','E4','F4','G4','A4','B4','C5','D5','E5','G5','A5'];

// ── Shared mutable state ───────────────────────────────────
export const state = {
  userMelody: [],
  encodedBuffer: null,
  decodedFile: null,
};
