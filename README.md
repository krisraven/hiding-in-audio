# Audio Steganography

Hide secret messages inside music. The message is encoded into a WAV file using LSB (least significant bit) steganography — invisible to ears, readable by code.

No server, no dependencies, no build step. Open `audio-steg.html` in a browser and it works.

---

## How to use

**Hide a message**
1. Type your secret message in the Encode panel
2. Optionally pick notes to build a cover melody (or leave it blank for a random one)
3. Set the audio duration (longer = more capacity)
4. Click **Generate & hide** — a WAV file is produced with your message embedded inside
5. Download the WAV and share it

**Reveal a message**
1. Drop a WAV file onto the Decode panel (or click to browse)
2. Click **Decode message**
3. The hidden text appears

---

## How it works

### 1. Synthesise audio

A melody is built from sine waves using the Web Audio API. Each note is a sine wave at a fixed frequency (e.g. A4 = 440 Hz), rendered into a flat array of 16-bit PCM integers at 44,100 samples per second. If no notes are chosen, a random selection is used.

### 2. Convert the message to binary

Each character in the message is converted to its ASCII code, then to 8 binary digits:

```
"H" → 72 → 01001000
```

The full message becomes a long string of 0s and 1s.

### 3. Write a length header

The first 32 audio samples store the message length in binary. Without this, the decoder would not know where the message ends and where unmodified audio begins.

### 4. Flip the LSBs

For each bit of the message, one audio sample has its last bit forced to match:

```
bit = 1  →  sample = sample | 1
bit = 0  →  sample = sample & ~1
```

This changes a sample by at most 1 unit out of 32,767 — a difference of 0.003%, which is completely inaudible.

### 5. Export as WAV

The modified samples are packed into an uncompressed WAV file. WAV stores every sample exactly as-is. MP3 and other lossy formats would destroy the LSB data during compression, so WAV is the only viable container here.

### 6. Decode

To extract the message: read the first 32 sample LSBs to get the message bit-length, then read that many LSBs from the samples that follow. Group the bits into 8-bit chunks, convert each to its ASCII character, and concatenate.

---

## Capacity

| Duration | Samples | Max characters |
|---|---|---|
| 2 s | 88,200 | ~1,100 |
| 8 s | 352,800 | ~4,400 |
| 30 s | 1,323,000 | ~16,500 |

Capacity = `(total samples − 32 header samples) ÷ 8`

---

## File structure

```
audio-steg.html    UI layout and styles
audio.js           Melody synthesis and PCM conversion
steganography.js   LSB embed and extract logic
wav.js             WAV file binary packing
ui.js              DOM event handlers, waveform canvas, download
constants.js       Sample rate, note frequencies, shared state
```

---

## Limitations

- **WAV only.** Converting the output to MP3 or any lossy format will destroy the hidden message.
- **ASCII only.** Characters outside the standard ASCII range (0–127) will encode but may not decode cleanly depending on the browser's `String.fromCharCode` handling.
- **No encryption.** The message is hidden, not secured. Anyone with this tool can decode a file. Add your own encryption layer before embedding if secrecy matters.
- **No error correction.** A single flipped bit corrupts a character. Do not edit the WAV file after encoding.
