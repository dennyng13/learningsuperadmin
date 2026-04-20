const audioCtx = () => new (window.AudioContext || (window as any).webkitAudioContext)();

export function playBeep(frequency = 880, duration = 200, volume = 0.3) {
  try {
    const ctx = audioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = frequency;
    osc.type = "sine";
    gain.gain.value = volume;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);
    osc.start();
    osc.stop(ctx.currentTime + duration / 1000);
    osc.onended = () => ctx.close();
  } catch {}
}

/** Double beep for recording start */
export function playStartBeep() {
  playBeep(880, 150, 0.3);
  setTimeout(() => playBeep(1100, 200, 0.3), 200);
}

/** Lower single beep for recording end */
export function playStopBeep() {
  playBeep(440, 300, 0.25);
}

/** Correct answer – rising cheerful tone */
export function playCorrectSound() {
  playBeep(523, 100, 0.25);
  setTimeout(() => playBeep(659, 100, 0.25), 100);
  setTimeout(() => playBeep(784, 150, 0.25), 200);
}

/** Wrong answer – descending buzz */
export function playWrongSound() {
  playBeep(330, 150, 0.2);
  setTimeout(() => playBeep(260, 200, 0.2), 150);
}

/** Game over fanfare */
export function playGameOverSound() {
  playBeep(392, 150, 0.2);
  setTimeout(() => playBeep(330, 150, 0.2), 150);
  setTimeout(() => playBeep(262, 300, 0.2), 300);
}

/** Combo / streak sound */
export function playComboSound() {
  playBeep(660, 80, 0.2);
  setTimeout(() => playBeep(880, 80, 0.2), 80);
  setTimeout(() => playBeep(1047, 120, 0.25), 160);
}

/** Victory fanfare – triumphant ascending arpeggio */
export function playVictorySound() {
  playBeep(523, 120, 0.25);
  setTimeout(() => playBeep(659, 120, 0.25), 130);
  setTimeout(() => playBeep(784, 120, 0.25), 260);
  setTimeout(() => playBeep(1047, 300, 0.3), 400);
}
