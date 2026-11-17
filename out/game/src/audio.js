// Synthesised sound, no audio files: a tiny WebAudio bell, thud and chime.
// Created lazily on the first user gesture, so browsers allow it.
export function createAudio() {
  let context = null;

  function ensure() {
    if (context) return context;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      context = new AudioContext();
    } catch {
      context = null;
    }
    return context;
  }

  function tone(freq, seconds, type, gainValue, when = 0) {
    const ctx = ensure();
    if (!ctx) return;
    if (ctx.state === 'suspended') void ctx.resume();
    const start = ctx.currentTime + when;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(start + seconds + 0.05);
  }

  return {
    unlock() {
      ensure();
    },
    /** A soft pop when the keeper swats a moth. */
    swat() {
      tone(660, 0.09, 'triangle', 0.12);
      tone(990, 0.07, 'sine', 0.07, 0.02);
    },
    /** A firefly caught: a bright ping. */
    pickup() {
      tone(1180, 0.12, 'sine', 0.09);
    },
    /** A lantern goes out: a low thud. */
    lanternOut() {
      tone(140, 0.35, 'sine', 0.16);
      tone(90, 0.4, 'triangle', 0.1, 0.05);
    },
    /** A lantern relit: a warm two-note chime. */
    relight() {
      tone(523, 0.18, 'sine', 0.1);
      tone(784, 0.28, 'sine', 0.1, 0.09);
    },
    /** A new wave: a small bell. */
    wave() {
      tone(392, 0.2, 'triangle', 0.09);
      tone(587, 0.3, 'triangle', 0.07, 0.08);
    },
    /** Dawn, the win: a rising arpeggio. */
    dawn() {
      [523, 659, 784, 1046].forEach((freq, i) => tone(freq, 0.4, 'sine', 0.1, i * 0.13));
    },
  };
}
