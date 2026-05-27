import { HEADER_BITS } from './constants.js';

// ── Convert a text message to a binary string ──────────────
export function messageToBits(msg) {
  let bits = '';
  for (let i = 0; i < msg.length; i++) {
    bits += msg.charCodeAt(i).toString(2).padStart(8, '0');
  }
  return bits;
}

// ── Integer ↔ binary string helpers ───────────────────────
export function intToBits(n, len) {
  return (n >>> 0).toString(2).padStart(len, '0');
}

export function bitsToInt(bits) {
  return parseInt(bits, 2);
}

// ── Embed message bits into PCM samples via LSB ────────────
// The first HEADER_BITS samples store the message length.
// Subsequent samples each carry one bit of the message.
export function embedLSB(pcm, messageBits) {
  const totalCapacity = pcm.length - HEADER_BITS;
  if (messageBits.length > totalCapacity) {
    throw new Error(
      `Message too long. Max ${Math.floor(totalCapacity / 8)} characters for this duration.`
    );
  }

  const out = new Int16Array(pcm);
  const lengthBits = intToBits(messageBits.length, HEADER_BITS);

  // Write length header into first HEADER_BITS samples
  for (let i = 0; i < HEADER_BITS; i++) {
    out[i] = (out[i] & ~1) | parseInt(lengthBits[i]);
  }

  // Write message bits one per sample
  for (let i = 0; i < messageBits.length; i++) {
    const sampleIdx = HEADER_BITS + i;
    out[sampleIdx] = (out[sampleIdx] & ~1) | parseInt(messageBits[i]);
  }

  return out;
}

// ── Extract a hidden message from PCM samples ──────────────
export function extractLSB(pcm) {
  // Read message bit-length from the header
  let lengthBits = '';
  for (let i = 0; i < HEADER_BITS; i++) {
    lengthBits += (pcm[i] & 1).toString();
  }
  const msgBitLen = bitsToInt(lengthBits);

  if (msgBitLen <= 0 || msgBitLen > pcm.length - HEADER_BITS) {
    throw new Error('No hidden message found, or file was not encoded with this tool.');
  }

  // Read message bits
  let msgBits = '';
  for (let i = 0; i < msgBitLen; i++) {
    msgBits += (pcm[HEADER_BITS + i] & 1).toString();
  }

  // Reconstruct characters from 8-bit chunks
  let message = '';
  for (let i = 0; i < msgBits.length; i += 8) {
    const byte = msgBits.slice(i, i + 8);
    if (byte.length === 8) {
      message += String.fromCharCode(bitsToInt(byte));
    }
  }

  return message;
}
