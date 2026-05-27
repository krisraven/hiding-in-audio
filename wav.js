import { SAMPLE_RATE } from './constants.js';

// ── Build a 16-bit mono WAV file from Int16Array PCM data ──
// WAV uses a 44-byte RIFF header followed by raw sample data.
// Uncompressed format ensures LSB data survives intact.
export function buildWav(pcmInt16) {
  const numSamples = pcmInt16.length;
  const dataSize = numSamples * 2; // 2 bytes per int16 sample
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  function writeStr(offset, str) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  // RIFF chunk descriptor
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);   // total file size minus 8 bytes
  writeStr(8, 'WAVE');

  // fmt sub-chunk
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);             // sub-chunk size (16 for PCM)
  view.setUint16(20, 1, true);              // audio format: 1 = PCM
  view.setUint16(22, 1, true);              // number of channels: mono
  view.setUint32(24, SAMPLE_RATE, true);    // sample rate (Hz)
  view.setUint32(28, SAMPLE_RATE * 2, true);// byte rate = sampleRate * blockAlign
  view.setUint16(32, 2, true);              // block align = channels * bitsPerSample/8
  view.setUint16(34, 16, true);             // bits per sample

  // data sub-chunk
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  // Write PCM samples as little-endian int16
  for (let i = 0; i < numSamples; i++) {
    view.setInt16(44 + i * 2, pcmInt16[i], true);
  }

  return buffer;
}

// ── Parse a WAV file ArrayBuffer into an Int16Array ────────
// Walks the RIFF chunk structure to find the 'data' chunk,
// handles non-standard chunk ordering, and validates format.
export function parseWav(arrayBuffer) {
  const view = new DataView(arrayBuffer);

  function readStr(offset, len) {
    let s = '';
    for (let i = 0; i < len; i++) {
      s += String.fromCharCode(view.getUint8(offset + i));
    }
    return s;
  }

  if (readStr(0, 4) !== 'RIFF' || readStr(8, 4) !== 'WAVE') {
    throw new Error('Not a valid WAV file.');
  }

  const audioFormat = view.getUint16(20, true);
  if (audioFormat !== 1) {
    throw new Error('Only uncompressed PCM WAV files are supported.');
  }

  const bitsPerSample = view.getUint16(34, true);
  if (bitsPerSample !== 16) {
    throw new Error('Only 16-bit WAV files are supported.');
  }

  // Walk chunks to find 'data' (may not always be at offset 36)
  let dataOffset = 12;
  while (dataOffset < arrayBuffer.byteLength - 8) {
    const chunkId = readStr(dataOffset, 4);
    const chunkSize = view.getUint32(dataOffset + 4, true);
    if (chunkId === 'data') {
      dataOffset += 8;
      break;
    }
    dataOffset += 8 + chunkSize;
  }

  const numSamples = (arrayBuffer.byteLength - dataOffset) / 2;
  const pcm = new Int16Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    pcm[i] = view.getInt16(dataOffset + i * 2, true);
  }

  return pcm;
}
