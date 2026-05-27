import { NOTE_FREQS, NOTE_LABELS, state } from './constants.js';
import { playNote, generateMelody, floatToInt16 } from './audio.js';
import { messageToBits, embedLSB, extractLSB } from './steganography.js';
import { buildWav, parseWav } from './wav.js';

// ── Status boxes ───────────────────────────────────────────
export function showStatus(side, type, msg) {
  const el = document.getElementById(`${side}-status`);
  el.className = `status-box ${type}`;
  el.textContent = msg;
}

export function clearStatus(side) {
  const el = document.getElementById(`${side}-status`);
  el.className = 'status-box';
  el.textContent = '';
}

// ── Progress bar ───────────────────────────────────────────
export function setProgress(side, pct) {
  const bar = document.getElementById(`${side}-progress`);
  const fill = document.getElementById(`${side}-fill`);
  bar.classList.toggle('active', pct > 0 && pct < 100);
  fill.style.width = pct + '%';
}

// ── Sleep utility ──────────────────────────────────────────
export function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ── Melody display ─────────────────────────────────────────
export function updateMelodyDisplay() {
  const el = document.getElementById('melody-display');
  if (state.userMelody.length === 0) {
    el.textContent = 'no notes — a random melody will be used';
    el.classList.remove('has-notes');
  } else {
    el.textContent = state.userMelody.join('  ·  ');
    el.classList.add('has-notes');
  }
}

// ── Note buttons ───────────────────────────────────────────
export function buildNoteButtons() {
  const row = document.getElementById('melody-row');
  NOTE_LABELS.forEach(note => {
    const btn = document.createElement('button');
    btn.className = 'note-btn';
    btn.textContent = note;
    btn.dataset.note = note;
    btn.onclick = () => addNote(note, btn);
    row.appendChild(btn);
  });
}

export function addNote(note, btn) {
  playNote(note);
  state.userMelody.push(note);
  btn.classList.add('active');
  setTimeout(() => btn.classList.remove('active'), 180);
  updateMelodyDisplay();
}

export function undoLastNote() {
  if (state.userMelody.length === 0) return;
  state.userMelody.pop();
  updateMelodyDisplay();
}

export function clearMelody() {
  state.userMelody = [];
  document.querySelectorAll('.note-btn').forEach(b => b.classList.remove('active'));
  updateMelodyDisplay();
}

// ── Waveform canvas ────────────────────────────────────────
export function drawWaveform(pcmInt16) {
  const canvas = document.getElementById('waveform');
  const ctx = canvas.getContext('2d');
  canvas.width = canvas.offsetWidth * window.devicePixelRatio;
  canvas.height = 48 * window.devicePixelRatio;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

  const w = canvas.offsetWidth;
  const h = 48;
  const step = Math.max(1, Math.floor(pcmInt16.length / w));

  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = '#c8f0a0';
  ctx.lineWidth = 1;
  ctx.beginPath();

  for (let x = 0; x < w; x++) {
    const sampleIdx = x * step;
    const val = pcmInt16[sampleIdx] / 32767;
    const y = (1 - val) * h / 2;
    if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

// ── Duration slider ────────────────────────────────────────
export function initDurationSlider() {
  const SAMPLE_RATE = 44100;
  const HEADER_BITS = 32;
  document.getElementById('duration').addEventListener('input', function () {
    const secs = parseInt(this.value);
    const maxChars = Math.floor((secs * SAMPLE_RATE - HEADER_BITS) / 8);
    document.getElementById('duration-label').textContent =
      `${secs} second${secs > 1 ? 's' : ''} — fits up to ~${maxChars.toLocaleString()} characters`;
  });
}

// ── Explainer toggle ───────────────────────────────────────
export function toggleExplainer() {
  const body = document.getElementById('explainer-body');
  const arrow = document.getElementById('explainer-arrow');
  body.classList.toggle('open');
  arrow.textContent = body.classList.contains('open') ? '↑' : '↓';
}

// ── Encode flow ────────────────────────────────────────────
export async function encode() {
  const msg = document.getElementById('secret-msg').value.trim();
  if (!msg) { showStatus('enc', 'error', 'Please enter a secret message.'); return; }

  const durationSecs = parseInt(document.getElementById('duration').value);
  showStatus('enc', 'info', 'Generating melody and embedding message...');
  setProgress('enc', 20);
  await sleep(10);

  try {
    const floatSamples = generateMelody(durationSecs, state.userMelody);
    setProgress('enc', 50);
    await sleep(10);

    const pcm = floatToInt16(floatSamples);
    const messageBits = messageToBits(msg);
    setProgress('enc', 70);
    await sleep(10);

    const encodedPcm = embedLSB(pcm, messageBits);
    setProgress('enc', 90);
    await sleep(10);

    state.encodedBuffer = buildWav(encodedPcm);
    setProgress('enc', 100);

    showStatus('enc', 'success',
      `Message embedded. ${msg.length} character${msg.length > 1 ? 's' : ''} hidden in ${durationSecs}s of audio.`
    );

    document.getElementById('download-area').style.display = 'block';
    drawWaveform(encodedPcm);

  } catch (err) {
    showStatus('enc', 'error', err.message);
    setProgress('enc', 0);
  }
}

export function downloadWav() {
  if (!state.encodedBuffer) return;
  const blob = new Blob([state.encodedBuffer], { type: 'audio/wav' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'hidden-message.wav';
  a.click();
  URL.revokeObjectURL(url);
}

// ── Decode flow ────────────────────────────────────────────
export function fileSelected(event) {
  state.decodedFile = event.target.files[0];
  if (state.decodedFile) {
    document.getElementById('file-name').textContent = state.decodedFile.name;
    document.getElementById('file-info').style.display = 'block';
    document.getElementById('revealed').style.display = 'none';
    clearStatus('dec');
  }
}

export function dragOver(e) {
  e.preventDefault();
  document.getElementById('upload-zone').classList.add('drag');
}

export function dragLeave() {
  document.getElementById('upload-zone').classList.remove('drag');
}

export function dropFile(e) {
  e.preventDefault();
  dragLeave();
  const file = e.dataTransfer.files[0];
  if (file) {
    state.decodedFile = file;
    document.getElementById('file-name').textContent = file.name;
    document.getElementById('file-info').style.display = 'block';
    document.getElementById('revealed').style.display = 'none';
    clearStatus('dec');
  }
}

export async function decode() {
  if (!state.decodedFile) { showStatus('dec', 'error', 'Please upload a WAV file first.'); return; }

  showStatus('dec', 'info', 'Reading file...');
  setProgress('dec', 20);

  try {
    const arrayBuffer = await state.decodedFile.arrayBuffer();
    setProgress('dec', 50);
    await sleep(10);

    const pcm = parseWav(arrayBuffer);
    setProgress('dec', 80);
    await sleep(10);

    const message = extractLSB(pcm);
    setProgress('dec', 100);

    showStatus('dec', 'success', 'Message decoded successfully.');
    document.getElementById('msg-text').textContent = message;
    document.getElementById('revealed').style.display = 'block';

  } catch (err) {
    showStatus('dec', 'error', err.message);
    setProgress('dec', 0);
  }
}

export function copyMsg() {
  const text = document.getElementById('msg-text').textContent;
  navigator.clipboard.writeText(text).then(() => {
    const btn = event.target;
    btn.textContent = 'Copied!';
    setTimeout(() => btn.textContent = 'Copy text', 1800);
  });
}
