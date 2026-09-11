// Efeitos sonoros sintetizados via WebAudio — sem assets externos.
let audioCtx: AudioContext | null = null;

function tone(freq: number, dur: number, type: OscillatorType = 'sine') {
  try {
    audioCtx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = 0.06;
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
    o.stop(audioCtx.currentTime + dur);
  } catch {
    /* navegador bloqueou áudio autônomo — silencioso */
  }
}

export function sfxCorrect(): void {
  tone(660, 0.12, 'triangle');
  setTimeout(() => tone(880, 0.16, 'triangle'), 110);
}
export function sfxWrong(): void {
  tone(160, 0.28, 'sawtooth');
}
export function sfxStamp(): void {
  tone(90, 0.09, 'square');
}
