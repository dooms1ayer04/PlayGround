/* Tiny procedural WebAudio sound kit. No external assets. */
(() => {
  'use strict';

  class HellAudio {
    constructor() {
      this.ctx = null;
      this.master = null;
      this.noiseBuffer = null;
      this.ambient = null;
      this.muted = false;
    }

    init() {
      if (this.ctx) {
        if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
        return;
      }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try {
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.32;
        this.master.connect(this.ctx.destination);
        this.noiseBuffer = this.makeNoise(1.2);
        this.startAmbient();
      } catch {
        this.ctx = null;
      }
    }

    makeNoise(seconds) {
      const length = Math.floor(this.ctx.sampleRate * seconds);
      const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
      return buffer;
    }

    setMuted(value) {
      this.muted = value;
      if (this.master) this.master.gain.setTargetAtTime(value ? 0 : 0.32, this.ctx.currentTime, 0.03);
    }

    tone(freq, endFreq, duration, type = 'sawtooth', volume = 0.1, delay = 0) {
      if (!this.ctx || this.muted) return;
      const t = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(Math.max(20, freq), t);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t + duration);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(volume, t + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(t);
      osc.stop(t + duration + 0.03);
    }

    noise(duration, volume, frequency, q = 0.8, delay = 0, pan = 0) {
      if (!this.ctx || this.muted) return;
      const t = this.ctx.currentTime + delay;
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(frequency, t);
      filter.frequency.exponentialRampToValueAtTime(Math.max(60, frequency * 0.35), t + duration);
      filter.Q.value = q;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(volume, t + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      let node = src;
      if (this.ctx.createStereoPanner) {
        const panner = this.ctx.createStereoPanner();
        panner.pan.value = Math.max(-1, Math.min(1, pan));
        src.connect(filter);
        filter.connect(panner);
        node = panner;
      } else {
        src.connect(filter);
      }
      node.connect(gain);
      gain.connect(this.master);
      src.start(t);
      src.stop(t + duration + 0.02);
    }

    startAmbient() {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const gain = this.ctx.createGain();
      gain.gain.value = 0.0001;
      gain.gain.exponentialRampToValueAtTime(0.03, t + 1.6);
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 210;
      const a = this.ctx.createOscillator();
      const b = this.ctx.createOscillator();
      a.type = 'sine';
      b.type = 'triangle';
      a.frequency.value = 42;
      b.frequency.value = 63.4;
      a.connect(filter);
      b.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      a.start();
      b.start();
      this.ambient = { a, b, gain };
    }

    shoot() {
      this.noise(0.11, 0.34, 1450, 0.65);
      this.tone(155, 48, 0.12, 'sawtooth', 0.12);
      this.tone(880, 190, 0.07, 'square', 0.025);
    }

    enemyShoot(pan = 0) {
      this.noise(0.3, 0.13, 520, 0.7, 0, pan);
      this.tone(230, 74, 0.27, 'sawtooth', 0.045);
    }

    hit() {
      this.noise(0.07, 0.12, 2600, 1.3);
      this.tone(380, 130, 0.05, 'square', 0.022);
    }

    hurt() {
      this.noise(0.22, 0.24, 210, 0.5);
      this.tone(92, 39, 0.28, 'sine', 0.17);
    }

    death() {
      this.noise(0.55, 0.25, 240, 0.55);
      this.tone(108, 31, 0.48, 'sawtooth', 0.1);
      this.tone(48, 24, 0.7, 'sine', 0.14);
    }

    spawn() {
      this.tone(55, 155, 0.52, 'sine', 0.08);
      this.noise(0.48, 0.09, 340, 0.6);
    }

    pickup() {
      this.tone(420, 820, 0.16, 'sine', 0.06);
      this.tone(620, 1120, 0.2, 'triangle', 0.035, 0.05);
    }

    wave() {
      this.tone(72, 36, 1.2, 'sine', 0.12);
      this.tone(146, 72, 0.9, 'triangle', 0.04);
    }

    victory() {
      [196, 262, 330, 392].forEach((f, i) => this.tone(f, f * 1.01, 0.55, 'triangle', 0.06, i * 0.14));
    }
  }

  window.HellAudio = HellAudio;
})();
