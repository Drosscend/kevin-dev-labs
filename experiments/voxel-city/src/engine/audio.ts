import { type Camera, Vector3 } from "three";
import type { SoundKind } from "./materials";

export interface LoopSound {
  move(pos: Vector3): void;
  stop(): void;
}

export interface NoiseOptions {
  filter: BiquadFilterType;
  freq: number;
  /** Frequency reached at the end of the sound. */
  freqEnd?: number;
  q?: number;
  gain: number;
  attack?: number;
  decay: number;
  delay?: number;
}

export interface ToneOptions {
  type?: OscillatorType;
  freq: number;
  freqEnd?: number;
  gain: number;
  attack?: number;
  decay: number;
  delay?: number;
}

const SILENT_LOOP: LoopSound = { move() {}, stop() {} };

/** Band-pass center and resonance per material family. */
export const SOUND_COLOR: Record<SoundKind, { freq: number; q: number }> = {
  stone: { freq: 900, q: 1.2 },
  wood: { freq: 500, q: 3 },
  glass: { freq: 3200, q: 6 },
  metal: { freq: 1800, q: 12 },
  soft: { freq: 300, q: 0.8 },
  dirt: { freq: 400, q: 0.7 },
};

/** Procedural sound effects through Web Audio, positioned in 3D. `pos` null plays without spatialisation. */
export class GameAudio {
  private ctx?: AudioContext;
  private master!: GainNode;
  private reverb!: ConvolverNode;
  private noiseBuffer!: AudioBuffer;
  private readonly forward = new Vector3();
  private lastRubble = 0;
  private lastImpact = 0;

  /** Must be called from a user gesture. */
  unlock(): void {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    const ctx = new AudioContext();
    this.ctx = ctx;
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -16;
    compressor.ratio.value = 8;
    compressor.connect(ctx.destination);
    this.master = ctx.createGain();
    this.master.gain.value = 0.8;
    this.master.connect(compressor);

    this.noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 5, ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    const length = ctx.sampleRate * 2.5;
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const ch = impulse.getChannelData(c);
      for (let i = 0; i < length; i++)
        ch[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3;
    }
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = impulse;
    const wet = ctx.createGain();
    wet.gain.value = 0.3;
    this.reverb.connect(wet).connect(this.master);
  }

  setListener(camera: Camera): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const l = ctx.listener;
    const p = camera.position;
    camera.getWorldDirection(this.forward);
    const f = this.forward;
    if (!l.positionX) {
      l.setPosition(p.x, p.y, p.z);
      l.setOrientation(f.x, f.y, f.z, 0, 1, 0);
      return;
    }
    const t = ctx.currentTime;
    l.positionX.setValueAtTime(p.x, t);
    l.positionY.setValueAtTime(p.y, t);
    l.positionZ.setValueAtTime(p.z, t);
    l.forwardX.setValueAtTime(f.x, t);
    l.forwardY.setValueAtTime(f.y, t);
    l.forwardZ.setValueAtTime(f.z, t);
    l.upX.setValueAtTime(0, t);
    l.upY.setValueAtTime(1, t);
    l.upZ.setValueAtTime(0, t);
  }

  /** Filtered noise burst: the building block for shots, impacts and whooshes. */
  noise(pos: Vector3 | null, o: NoiseOptions): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime + (o.delay ?? 0);
    const src = this.noiseSource(t, (o.attack ?? 0.002) + o.decay + 0.05);
    const filter = ctx.createBiquadFilter();
    filter.type = o.filter;
    filter.Q.value = o.q ?? 1;
    filter.frequency.setValueAtTime(o.freq, t);
    if (o.freqEnd)
      filter.frequency.exponentialRampToValueAtTime(
        o.freqEnd,
        t + (o.attack ?? 0.002) + o.decay,
      );
    src
      .connect(filter)
      .connect(this.envelope(t, o.gain, o.attack ?? 0.002, o.decay))
      .connect(this.output(pos));
  }

  tone(pos: Vector3 | null, o: ToneOptions): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime + (o.delay ?? 0);
    const osc = ctx.createOscillator();
    osc.type = o.type ?? "sine";
    osc.frequency.setValueAtTime(o.freq, t);
    if (o.freqEnd)
      osc.frequency.exponentialRampToValueAtTime(
        o.freqEnd,
        t + (o.attack ?? 0.002) + o.decay,
      );
    osc
      .connect(this.envelope(t, o.gain, o.attack ?? 0.002, o.decay))
      .connect(this.output(pos));
    osc.start(t);
    osc.stop(t + (o.attack ?? 0.002) + o.decay + 0.05);
  }

  /** `size` 1 matches a dynamite stick. */
  explosion(pos: Vector3, size = 1): void {
    const g = Math.min(1.6, 0.6 + size * 0.5);
    this.noise(pos, {
      filter: "lowpass",
      freq: 5000,
      freqEnd: 110,
      gain: 1.6 * g,
      attack: 0.004,
      decay: 2.2,
    });
    this.noise(pos, {
      filter: "highpass",
      freq: 1800,
      gain: 0.9 * g,
      attack: 0.001,
      decay: 0.12,
    });
    this.tone(pos, {
      freq: 110,
      freqEnd: 26,
      gain: 2.2 * g,
      attack: 0.005,
      decay: 0.9,
    });
    this.noise(null, {
      filter: "lowpass",
      freq: 90,
      gain: 1.2 * g,
      attack: 0.2,
      decay: 3,
      delay: 0.05,
    });
    this.rubble(pos, 1, 0.35);
  }

  /** Low groan of a structure about to give way. */
  creak(pos: Vector3): void {
    this.noise(pos, {
      filter: "lowpass",
      freq: 260,
      freqEnd: 70,
      gain: 1.1,
      attack: 0.5,
      decay: 2.4,
    });
    for (let i = 0; i < 3; i++)
      this.tone(pos, {
        type: "sawtooth",
        freq: 48 + Math.random() * 30,
        freqEnd: 30 + Math.random() * 10,
        gain: 0.18,
        attack: 0.3,
        decay: 1.2 + Math.random(),
        delay: i * 0.35,
      });
    this.rubble(pos, 0.4, 1.4);
  }

  /** A whole floor slamming down. */
  crash(pos: Vector3): void {
    this.explosion(pos, 2.4);
    this.noise(pos, {
      filter: "lowpass",
      freq: 700,
      freqEnd: 50,
      gain: 1.4,
      attack: 0.02,
      decay: 4,
    });
    this.lastRubble = 0;
    this.rubble(pos, 1, 2.5);
  }

  /** A block or piece hitting something. */
  impact(pos: Vector3, size: number, speed: number, kind: SoundKind): void {
    const ctx = this.ctx;
    if (!ctx || ctx.currentTime - this.lastImpact < 0.03) return;
    this.lastImpact = ctx.currentTime;
    const weight = Math.min(1, Math.log10(size + 1) / 5);
    const g = Math.min(1.5, (0.15 + weight) * Math.min(1, speed / 5));
    const color = SOUND_COLOR[kind];
    this.noise(pos, {
      filter: "bandpass",
      freq: color.freq * (1.2 - weight * 0.7),
      freqEnd: color.freq * 0.4,
      q: color.q,
      gain: g,
      decay: 0.12 + weight * 0.6,
    });
    if (weight > 0.3)
      this.tone(pos, {
        freq: 70,
        freqEnd: 32,
        gain: g * 1.4,
        decay: 0.3 + weight * 0.4,
      });
    if (kind === "glass") this.glass(pos, Math.min(1, size / 200));
    else this.rubble(pos, weight, 0.4);
  }

  /** Small pieces clattering, `amount` from 0 to 1. */
  rubble(pos: Vector3, amount: number, spread = 0.3): void {
    const ctx = this.ctx;
    if (!ctx || ctx.currentTime - this.lastRubble < 0.05) return;
    this.lastRubble = ctx.currentTime;
    const hits = Math.round(3 + amount * 18);
    for (let i = 0; i < hits; i++)
      this.noise(pos, {
        filter: "bandpass",
        freq: 600 + Math.random() * 2600,
        q: 3,
        gain: 0.25 + Math.random() * 0.35,
        attack: 0.001,
        decay: 0.05,
        delay: Math.random() * spread,
      });
  }

  /** Breaking glass tinkles. */
  glass(pos: Vector3, amount: number): void {
    const hits = Math.round(4 + amount * 16);
    for (let i = 0; i < hits; i++) {
      const delay = Math.random() * (0.15 + amount * 0.5);
      this.tone(pos, {
        type: "triangle",
        freq: 2500 + Math.random() * 4000,
        gain: 0.08 + Math.random() * 0.1,
        decay: 0.08 + Math.random() * 0.15,
        delay,
      });
      this.noise(pos, {
        filter: "highpass",
        freq: 5000,
        gain: 0.15,
        decay: 0.03,
        delay,
      });
    }
  }

  /** Fizzing fuse that follows `move`. */
  fuse(pos: Vector3): LoopSound {
    return this.loop(pos, "bandpass", 3200, 0.8, 0.18, 23, 0.08);
  }

  /** Rocket motor roar that follows `move`. */
  motor(pos: Vector3): LoopSound {
    return this.loop(pos, "lowpass", 900, 0.7, 0.55, 31, 0.2);
  }

  private loop(
    pos: Vector3,
    type: BiquadFilterType,
    freq: number,
    q: number,
    level: number,
    wobble: number,
    wobbleDepth: number,
  ): LoopSound {
    const ctx = this.ctx;
    if (!ctx) return SILENT_LOOP;
    const t = ctx.currentTime;
    const panner = this.panner(pos);
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = q;
    const gain = ctx.createGain();
    gain.gain.value = level;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = wobble;
    const depth = ctx.createGain();
    depth.gain.value = wobbleDepth;
    lfo.connect(depth).connect(gain.gain);
    src.connect(filter).connect(gain).connect(panner);
    src.start(t);
    lfo.start(t);
    return {
      move: (p) => {
        const now = ctx.currentTime;
        panner.positionX.setValueAtTime(p.x, now);
        panner.positionY.setValueAtTime(p.y, now);
        panner.positionZ.setValueAtTime(p.z, now);
      },
      stop: () => {
        src.stop();
        lfo.stop();
      },
    };
  }

  whoosh(): void {
    this.noise(null, {
      filter: "bandpass",
      freq: 300,
      freqEnd: 1600,
      q: 2,
      gain: 0.35,
      attack: 0.05,
      decay: 0.25,
    });
  }

  bounce(pos: Vector3, strength: number): void {
    this.tone(pos, {
      type: "triangle",
      freq: 320,
      freqEnd: 110,
      gain: Math.min(0.6, strength / 8),
      decay: 0.09,
    });
  }

  pickup(): void {
    this.tone(null, {
      type: "square",
      freq: 660,
      gain: 0.12,
      attack: 0.005,
      decay: 0.1,
    });
    this.tone(null, {
      type: "square",
      freq: 990,
      gain: 0.12,
      attack: 0.005,
      decay: 0.1,
      delay: 0.08,
    });
  }

  click(): void {
    this.tone(null, {
      type: "square",
      freq: 1400,
      freqEnd: 900,
      gain: 0.08,
      decay: 0.03,
    });
  }

  private output(pos: Vector3 | null): AudioNode {
    return pos ? this.panner(pos) : this.master;
  }

  private panner(pos: Vector3): PannerNode {
    const ctx = this.ctx as AudioContext;
    const panner = ctx.createPanner();
    panner.panningModel = "HRTF";
    panner.distanceModel = "inverse";
    panner.refDistance = 3;
    panner.rolloffFactor = 1;
    panner.positionX.value = pos.x;
    panner.positionY.value = pos.y;
    panner.positionZ.value = pos.z;
    panner.connect(this.master);
    panner.connect(this.reverb);
    return panner;
  }

  private noiseSource(at: number, duration: number): AudioBufferSourceNode {
    const ctx = this.ctx as AudioContext;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.start(at, Math.random() * 1.5, Math.min(3.4, duration));
    return src;
  }

  private envelope(
    at: number,
    peak: number,
    attack: number,
    decay: number,
  ): GainNode {
    const ctx = this.ctx as AudioContext;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), at + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay);
    return g;
  }
}
