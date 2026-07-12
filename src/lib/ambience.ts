"use client";

/**
 * Generative ocean ambience — built entirely from WebAudio primitives so
 * the experience ships with zero audio assets and loads instantly.
 *
 * Layers:
 *  - filtered brown noise, slowly swelling  → the sea
 *  - two detuned low sine drones            → distant orchestral pedal
 *  - occasional airy high shimmer           → wind over water
 */

class AmbienceEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private depthFilter: BiquadFilterNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private nodes: AudioNode[] = [];
  private swellTimer: ReturnType<typeof setInterval> | null = null;

  get running(): boolean {
    return this.ctx !== null;
  }

  /** Distant thunder: a filtered noise swell. Intensity 0..1. */
  thunder(intensity: number) {
    const ctx = this.ctx;
    if (!ctx || !this.master || !this.noiseBuf) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 90 + intensity * 120;
    const gain = ctx.createGain();
    const t = ctx.currentTime;
    const peak = 0.25 + intensity * 0.45;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(peak, t + 0.08 + Math.random() * 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 2.4 + Math.random() * 2);
    src.connect(filter).connect(gain).connect(this.master);
    src.start();
    src.stop(t + 5);
  }

  /** Muffle the world when the visitor dives. */
  setUnderwater(under: boolean) {
    const ctx = this.ctx;
    if (!ctx || !this.depthFilter) return;
    this.depthFilter.frequency.linearRampToValueAtTime(
      under ? 320 : 18000,
      ctx.currentTime + 0.8,
    );
  }

  start() {
    if (this.ctx) return;
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    this.ctx = ctx;

    const master = ctx.createGain();
    master.gain.value = 0;
    // Depth filter sits between the bed and the speakers so diving can
    // muffle everything at once
    const depthFilter = ctx.createBiquadFilter();
    depthFilter.type = "lowpass";
    depthFilter.frequency.value = 18000;
    master.connect(depthFilter).connect(ctx.destination);
    this.master = master;
    this.depthFilter = depthFilter;
    // Fade the whole bed in over 4 seconds
    master.gain.linearRampToValueAtTime(0.55, ctx.currentTime + 4);

    /* --- The sea: brown noise through a slow-breathing lowpass --- */
    const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
    this.noiseBuf = noiseBuf;
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;
    noise.loop = true;
    const seaFilter = ctx.createBiquadFilter();
    seaFilter.type = "lowpass";
    seaFilter.frequency.value = 420;
    seaFilter.Q.value = 0.4;
    const seaGain = ctx.createGain();
    seaGain.gain.value = 0.5;
    noise.connect(seaFilter).connect(seaGain).connect(master);
    noise.start();

    // Breathing swell: modulate the filter cutoff and gain on a slow cycle
    const swellLfo = ctx.createOscillator();
    swellLfo.frequency.value = 0.07; // ~14s cycle
    const swellDepth = ctx.createGain();
    swellDepth.gain.value = 220;
    swellLfo.connect(swellDepth).connect(seaFilter.frequency);
    swellLfo.start();

    /* --- The drone: two detuned sines an octave apart --- */
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.05;
    droneGain.connect(master);
    for (const [freq, detune] of [
      [55, 0], // A1
      [110, 5], // A2, slightly sharp — slow beating
      [164.8, -4], // E3, a fifth — quiet colour
    ] as const) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      osc.detune.value = detune;
      const g = ctx.createGain();
      g.gain.value = freq > 150 ? 0.35 : 1;
      osc.connect(g).connect(droneGain);
      osc.start();
      this.nodes.push(osc);
    }

    /* --- Wind shimmer: bandpassed noise faded in and out at random --- */
    const shimmer = ctx.createBufferSource();
    shimmer.buffer = noiseBuf;
    shimmer.loop = true;
    const shimmerFilter = ctx.createBiquadFilter();
    shimmerFilter.type = "bandpass";
    shimmerFilter.frequency.value = 1400;
    shimmerFilter.Q.value = 1.2;
    const shimmerGain = ctx.createGain();
    shimmerGain.gain.value = 0;
    shimmer.connect(shimmerFilter).connect(shimmerGain).connect(master);
    shimmer.start();

    this.swellTimer = setInterval(() => {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const peak = 0.02 + Math.random() * 0.05;
      shimmerGain.gain.cancelScheduledValues(t);
      shimmerGain.gain.setValueAtTime(shimmerGain.gain.value, t);
      shimmerGain.gain.linearRampToValueAtTime(peak, t + 3 + Math.random() * 3);
      shimmerGain.gain.linearRampToValueAtTime(0.004, t + 10 + Math.random() * 5);
    }, 12000);

    this.nodes.push(noise, swellLfo, shimmer);
  }

  stop() {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    if (this.swellTimer) clearInterval(this.swellTimer);
    this.swellTimer = null;
    const t = ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setValueAtTime(this.master.gain.value, t);
    this.master.gain.linearRampToValueAtTime(0, t + 1.2);
    const toClose = ctx;
    this.ctx = null;
    this.master = null;
    this.depthFilter = null;
    this.noiseBuf = null;
    this.nodes = [];
    setTimeout(() => void toClose.close().catch(() => {}), 1500);
  }
}

export const ambience = new AmbienceEngine();
