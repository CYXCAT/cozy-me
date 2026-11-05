// A tiny generative lo-fi loop: Rhodes-ish chords, bass, soft drums and vinyl crackle.
export function createLofi() {
  let ctx = null;
  let master = null;
  let playing = false;
  let timer = null;
  let nextBar = 0;
  let bar = 0;

  const BPM = 72;
  const BEAT = 60 / BPM;
  const BAR = BEAT * 4;
  const CHORDS = [
    [53, 57, 60, 64], // Fmaj7
    [52, 55, 59, 62], // Em7
    [50, 53, 57, 60], // Dm7
    [48, 52, 55, 59], // Cmaj7
  ];
  const SCALE = [72, 74, 76, 79, 81, 84];
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  function init() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1500;
    lp.Q.value = 0.4;
    master.connect(lp).connect(ctx.destination);

    // vinyl crackle
    const len = ctx.sampleRate * 3;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * 0.01 + (Math.random() < 0.0005 ? (Math.random() * 2 - 1) * 0.45 : 0);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const g = ctx.createGain();
    g.gain.value = 0.5;
    src.connect(g).connect(master);
    src.start();
  }

  function tone(m, t, dur, vol, type = 'triangle') {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = mtof(m);
    o.detune.value = (Math.random() - 0.5) * 10;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  function kick(t) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.18);
    g.gain.setValueAtTime(0.32, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + 0.32);
  }

  function snare(t) {
    const len = Math.floor(ctx.sampleRate * 0.18);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
    const s = ctx.createBufferSource();
    s.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1800;
    const g = ctx.createGain();
    g.gain.value = 0.1;
    s.connect(f).connect(g).connect(master);
    s.start(t);
  }

  function scheduleBar(t) {
    const chord = CHORDS[bar % CHORDS.length];
    chord.forEach((n, i) => tone(n, t + i * 0.035, BAR * 1.05, 0.045));
    tone(chord[0] - 12, t, BEAT * 1.8, 0.11, 'sine');
    tone(chord[0] - 12, t + BEAT * 2.5, BEAT * 1.2, 0.08, 'sine');
    kick(t);
    kick(t + BEAT * 2.5);
    snare(t + BEAT);
    snare(t + BEAT * 3);
    // a few melody notes, swung 8ths
    for (let s = 0; s < 8; s++) {
      if (Math.random() < 0.28) {
        const swing = s % 2 ? BEAT * 0.08 : 0;
        const n = SCALE[Math.floor(Math.random() * SCALE.length)];
        tone(n, t + s * (BEAT / 2) + swing, BEAT * 1.4, 0.035, 'sine');
      }
    }
    bar++;
  }

  function tick() {
    while (nextBar < ctx.currentTime + 0.8) {
      scheduleBar(nextBar);
      nextBar += BAR;
    }
  }

  return {
    get playing() {
      return playing;
    },
    toggle() {
      if (!ctx) init();
      ctx.resume();
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      if (playing) {
        master.gain.linearRampToValueAtTime(0, now + 0.6);
        clearInterval(timer);
        playing = false;
      } else {
        master.gain.linearRampToValueAtTime(0.9, now + 0.8);
        nextBar = now + 0.1;
        timer = setInterval(tick, 200);
        tick();
        playing = true;
      }
      return playing;
    },
  };
}
