// Generative ambient space music + soft sound effects, made live with the Web Audio API.
// No audio files needed (and no copyright worries). Swap in your own track with setTrack(url) if you like.

const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const CHORDS = [
  [50, 57, 64, 66, 73],   // Dmaj9
  [47, 54, 61, 64, 69],   // Bm11
  [43, 50, 54, 61, 66],   // Gmaj7#11
  [45, 52, 59, 64, 71],   // A add9
];
const SPARKLE = [74, 76, 78, 81, 83, 86, 88, 90, 93];

export class SpaceAudio {
  constructor() { this.ctx = null; this.musicOn = true; this.chord = 0; }

  start() {
    if (this.ctx) { this.ctx.resume(); return; }
    const ctx = this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = ctx.createGain(); this.master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3;
    this.master.connect(comp).connect(ctx.destination);
    this.music = ctx.createGain(); this.music.gain.value = 0;
    this.sfx = ctx.createGain(); this.sfx.gain.value = 0.7;
    this.reverb = ctx.createConvolver(); this.reverb.buffer = this.impulse(6.5);
    const wet = ctx.createGain(); wet.gain.value = 0.8;
    this.reverb.connect(wet).connect(this.master);
    this.music.connect(this.master); this.music.connect(this.reverb);
    this.sfx.connect(this.master); this.sfx.connect(this.reverb);
    // echo for sparkles
    this.delay = ctx.createDelay(2); this.delay.delayTime.value = 0.46;
    const fb = ctx.createGain(); fb.gain.value = 0.42;
    this.delay.connect(fb).connect(this.delay); this.delay.connect(this.reverb);
    this.noise = this.noiseBuffer();
    this.drone();
    this.nextChord();
    this.sparkleLoop();
    this.setMusic(this.musicOn);
  }

  impulse(sec) {
    const { ctx } = this, len = ctx.sampleRate * sec, buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.8);
    }
    return buf;
  }
  noiseBuffer() {
    const { ctx } = this, buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  setMusic(on) {
    this.musicOn = on;
    if (!this.ctx) return;
    const g = this.music.gain, t = this.ctx.currentTime;
    g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(on ? 0.55 : 0, t + 2.5);
  }

  drone() {
    const { ctx } = this;
    const g = ctx.createGain(); g.gain.value = 0.05; g.connect(this.music);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 400; lp.connect(g);
    [mtof(38), mtof(45), mtof(38) * 1.003].forEach((f, i) => {
      const o = ctx.createOscillator(); o.type = i === 1 ? 'sine' : 'triangle'; o.frequency.value = f;
      o.connect(lp); o.start();
    });
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.05;
    const lg = ctx.createGain(); lg.gain.value = 180; lfo.connect(lg).connect(lp.frequency); lfo.start();
  }

  nextChord() {
    const { ctx } = this, t = ctx.currentTime, dur = 13;
    for (const m of CHORDS[this.chord]) {
      const g = ctx.createGain(); g.gain.value = 0;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700 + Math.random() * 500; lp.Q.value = 0.3;
      g.connect(lp).connect(this.music);
      for (const det of [-6, 7]) {
        const o = ctx.createOscillator(); o.type = det < 0 ? 'sine' : 'triangle';
        o.frequency.value = mtof(m); o.detune.value = det;
        o.connect(g); o.start(t); o.stop(t + dur + 7);
      }
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.035, t + 4.5);
      g.gain.setValueAtTime(0.035, t + dur - 1);
      g.gain.linearRampToValueAtTime(0, t + dur + 6);
    }
    this.chord = (this.chord + 1) % CHORDS.length;
    setTimeout(() => this.nextChord(), (dur - 1) * 1000);
  }

  bell(m, vol = 0.05, when = 0, toDelay = true) {
    const { ctx } = this, t = ctx.currentTime + when;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.5);
    const out = toDelay ? this.music : this.sfx;
    g.connect(out); if (toDelay) g.connect(this.delay);
    [[1, 1], [2.76, 0.25], [5.4, 0.08]].forEach(([r, a]) => {
      const o = ctx.createOscillator(); o.frequency.value = mtof(m) * r;
      const og = ctx.createGain(); og.gain.value = a; o.connect(og).connect(g); o.start(t); o.stop(t + 3.6);
    });
  }

  sparkleLoop() {
    if (this.musicOn) {
      const n = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) this.bell(SPARKLE[Math.floor(Math.random() * SPARKLE.length)], 0.018 + Math.random() * 0.02, i * 0.23);
    }
    setTimeout(() => this.sparkleLoop(), 2500 + Math.random() * 4500);
  }

  whoosh(dur, f0, f1, vol, q = 6) {
    const { ctx } = this, t = ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = this.noise;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = q;
    bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + dur * 0.25); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp).connect(g).connect(this.sfx); src.start(t); src.stop(t + dur + 0.1);
  }

  // --- sound effects ---
  shootingStar() { if (!this.ctx) return; this.whoosh(1.4, 6000, 900, 0.10, 4); this.bell(93, 0.02, 0.05, false); }
  hover() { if (!this.ctx) return; this.bell(86, 0.012, 0, false); }
  select() { if (!this.ctx) return; this.bell(78, 0.05, 0, false); this.bell(85, 0.04, 0.12, false); this.whoosh(0.9, 400, 3000, 0.05, 2); }
  info() { if (!this.ctx) return; this.bell(81, 0.04, 0, false); this.bell(88, 0.03, 0.09, false); }
  back() { if (!this.ctx) return; this.bell(81, 0.035, 0, false); this.bell(74, 0.03, 0.1, false); }
  twinkle() { if (!this.ctx) return; this.bell(SPARKLE[5 + Math.floor(Math.random() * 4)], 0.012, 0, false); }
}
