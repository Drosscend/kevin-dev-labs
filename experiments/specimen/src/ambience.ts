import type { GestureKind } from "./impulses";
import type { MoodName } from "./moods";

interface Timbre {
  root: number;
  interval: number;
  cutoff: number;
  shimmer: number;
  air: number;
}

const TIMBRES: Record<MoodName, Timbre> = {
  dreaming: { root: 49.0, interval: 1.5, cutoff: 185, shimmer: 0.15, air: 0.45 },
  resting: { root: 55.0, interval: 1.5, cutoff: 290, shimmer: 0.25, air: 0.7 },
  curious: { root: 61.74, interval: 1.25, cutoff: 450, shimmer: 0.45, air: 0.85 },
  playful: { root: 73.42, interval: 1.5, cutoff: 720, shimmer: 0.75, air: 1.0 },
  startled: { root: 58.27, interval: Math.SQRT2, cutoff: 880, shimmer: 1.0, air: 1.25 },
};

interface VoiceShape {
  span: number;
  level: number;
  /** Pitch path, in multiples of the current root: start, middle, end. */
  glide: [number, number, number];
  formants: [number, number];
  /** How far the formants open up, the way a mouth would. */
  open: number;
  buzz: number;
  /** How much of the sound is moving air rather than tone. */
  air: number;
  tremolo: number;
}

const VOICES: Record<GestureKind, VoiceShape> = {
  chirp: {
    span: 0.34,
    level: 0.13,
    glide: [3.4, 7.2, 5.4],
    formants: [720, 1950],
    open: 0.3,
    buzz: 0.4,
    air: 0.15,
    tremolo: 0,
  },
  sigh: {
    span: 1.5,
    level: 0.13,
    glide: [2.6, 2.9, 1.9],
    formants: [430, 900],
    open: -0.28,
    buzz: 0.15,
    air: 0.95,
    tremolo: 0,
  },
  yawn: {
    span: 2.0,
    level: 0.15,
    glide: [2.2, 3.1, 1.8],
    formants: [320, 1050],
    open: 1.3,
    buzz: 0.3,
    air: 0.7,
    tremolo: 0,
  },
  shiver: {
    span: 0.7,
    level: 0.1,
    glide: [3.0, 3.2, 2.8],
    formants: [520, 1400],
    open: 0,
    buzz: 0.25,
    air: 0.3,
    tremolo: 17,
  },
  stretch: {
    span: 1.3,
    level: 0.11,
    glide: [2.4, 3.3, 3.0],
    formants: [480, 1150],
    open: 0.5,
    buzz: 0.2,
    air: 0.4,
    tremolo: 0,
  },
  twitch: {
    span: 0.14,
    level: 0.085,
    glide: [5.5, 6.0, 3.2],
    formants: [900, 2400],
    open: 0,
    buzz: 0.5,
    air: 0.5,
    tremolo: 0,
  },
};

export interface AmbienceState {
  mood: MoodName;
  breath: number;
  agitation: number;
  beat: boolean;
  pan: number;
  flinched: boolean;
  gesture: GestureKind | null;
  /** How hard the pointer is dragging across the skin, 0 to 1. */
  rub: number;
  familiarity: number;
}

const DRONE_LEVEL = 0.042;
const AIR_LEVEL = 0.03;
const RUB_LEVEL = 0.05;
const BEAT_LEVEL = 0.05;
const FLINCH_LEVEL = 0.045;

/** Everything the orb makes audible: a drone tuned to its mood, its breath, its heart, its voice. */
export class Ambience {
  private ctx: AudioContext | null = null;
  private out: StereoPannerNode | null = null;
  private master: GainNode | null = null;
  private reverbIn: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private air: GainNode | null = null;
  private airBand: BiquadFilterNode | null = null;
  private rub: GainNode | null = null;
  private rubBand: BiquadFilterNode | null = null;
  private partials: OscillatorNode[] = [];
  private grain: AudioBuffer | null = null;
  private lastBreath = 0;
  private lastVoice = -99;

  /** Browsers only allow audio after a gesture, so this is safe to call on every pointer event. */
  wake(): void {
    if (!this.ctx) {
      this.build();
      return;
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  suspend(): void {
    if (this.ctx && this.ctx.state === "running") void this.ctx.suspend();
  }

  update(state: AmbienceState): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || !this.filter || !this.air || !this.airBand || !this.out) return;
    if (!this.rub || !this.rubBand) return;

    const now = ctx.currentTime;
    const timbre = TIMBRES[state.mood];

    this.partials[0]?.frequency.setTargetAtTime(timbre.root, now, 0.9);
    this.partials[1]?.frequency.setTargetAtTime(timbre.root * timbre.interval, now, 0.9);
    this.partials[2]?.frequency.setTargetAtTime(timbre.root * 2, now, 0.9);
    this.partials[1]?.detune.setTargetAtTime(6 + timbre.shimmer * 14, now, 1.2);
    this.partials[2]?.detune.setTargetAtTime(-9 - timbre.shimmer * 11, now, 1.2);

    // Breathing in is quick and bright, breathing out is long and dull.
    const rising = state.breath > this.lastBreath;
    this.lastBreath = state.breath;
    const open = state.breath * 0.5 + 0.5;

    this.filter.frequency.setTargetAtTime(timbre.cutoff * (1 + state.breath * 0.12), now, 0.5);
    this.airBand.frequency.setTargetAtTime(330 + open * (rising ? 640 : 360), now, 0.15);
    this.air.gain.setTargetAtTime(
      AIR_LEVEL * timbre.air * (0.22 + open * (rising ? 1.15 : 0.7)),
      now,
      rising ? 0.09 : 0.32,
    );

    this.rub.gain.setTargetAtTime(RUB_LEVEL * state.rub, now, 0.06);
    this.rubBand.frequency.setTargetAtTime(760 + state.rub * 2100, now, 0.1);

    this.out.pan.setTargetAtTime(state.pan * 0.35, now, 0.4);
    this.master.gain.setTargetAtTime(0.85 + state.agitation * 0.15, now, 0.8);

    if (state.beat) this.beat(now, timbre, state.agitation);
    if (state.gesture) this.voice(now, state.gesture, timbre, 1);
    if (state.flinched) {
      this.flinch(now, timbre);
      this.voice(now + 0.02, "twitch", timbre, 1 - state.familiarity * 0.65);
    }
  }

  private build(): void {
    const ctx = new AudioContext({ latencyHint: "interactive" });
    this.ctx = ctx;
    this.grain = this.noiseBuffer(ctx, 3);

    const out = ctx.createStereoPanner();
    out.connect(ctx.destination);
    this.out = out;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0.85, ctx.currentTime + 4);
    master.connect(out);
    this.master = master;

    const reverb = ctx.createConvolver();
    reverb.buffer = this.roomBuffer(ctx, 2.6);
    const wet = ctx.createGain();
    wet.gain.value = 0.4;
    reverb.connect(wet).connect(out);

    const reverbIn = ctx.createGain();
    reverbIn.connect(reverb);
    this.reverbIn = reverbIn;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.Q.value = 0.8;
    filter.frequency.value = TIMBRES.dreaming.cutoff;
    filter.connect(master);
    this.filter = filter;

    const drone = ctx.createGain();
    drone.gain.value = DRONE_LEVEL;
    drone.connect(filter);

    const shapes: OscillatorType[] = ["sine", "sine", "triangle"];
    const base = TIMBRES.dreaming;
    const ratios = [1, base.interval, 2];
    this.partials = shapes.map((shape, index) => {
      const osc = ctx.createOscillator();
      osc.type = shape;
      osc.frequency.value = base.root * ratios[index];
      const level = ctx.createGain();
      level.gain.value = index === 0 ? 1 : 0.45 / index;
      osc.connect(level).connect(drone);
      osc.start();
      return osc;
    });

    const sway = ctx.createOscillator();
    sway.type = "sine";
    sway.frequency.value = 0.07;
    const swayDepth = ctx.createGain();
    swayDepth.gain.value = 9;
    sway.connect(swayDepth).connect(this.partials[1].detune);
    sway.start();

    const air = ctx.createGain();
    air.gain.value = AIR_LEVEL;
    air.connect(master);
    air.connect(reverbIn);
    this.air = air;

    const airband = ctx.createBiquadFilter();
    airband.type = "bandpass";
    airband.frequency.value = 520;
    airband.Q.value = 0.9;
    airband.connect(air);
    this.airBand = airband;

    const breeze = ctx.createBufferSource();
    breeze.buffer = this.grain;
    breeze.loop = true;
    breeze.connect(airband);
    breeze.start();

    const rub = ctx.createGain();
    rub.gain.value = 0;
    rub.connect(master);
    rub.connect(reverbIn);
    this.rub = rub;

    const rubband = ctx.createBiquadFilter();
    rubband.type = "bandpass";
    rubband.frequency.value = 900;
    rubband.Q.value = 0.7;
    rubband.connect(rub);
    this.rubBand = rubband;

    const friction = ctx.createBufferSource();
    friction.buffer = this.grain;
    friction.loop = true;
    friction.connect(rubband);
    friction.start();
  }

  private noiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
    const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      last = (last + (Math.random() * 2 - 1) * 0.06) * 0.985;
      data[i] = last;
    }
    return buffer;
  }

  /** A room to sit in: decayed noise, not a recording. */
  private roomBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        const t = i / length;
        data[i] = (Math.random() * 2 - 1) * (1 - t) ** 3.2 * (i < 400 ? i / 400 : 1);
      }
    }
    return buffer;
  }

  private beat(at: number, timbre: Timbre, agitation: number): void {
    const thump = (time: number, level: number) => {
      const ctx = this.ctx;
      if (!ctx || !this.master || !this.reverbIn) return;
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(timbre.root * 1.35, time);
      osc.frequency.exponentialRampToValueAtTime(timbre.root * 0.7, time + 0.18);
      const shell = ctx.createGain();
      shell.gain.setValueAtTime(0.0001, time);
      shell.gain.linearRampToValueAtTime(level, time + 0.014);
      shell.gain.exponentialRampToValueAtTime(0.0001, time + 0.26);
      const send = ctx.createGain();
      send.gain.value = 0.3;
      osc.connect(shell).connect(this.master);
      shell.connect(send).connect(this.reverbIn);
      osc.start(time);
      osc.stop(time + 0.3);
    };
    const level = BEAT_LEVEL * (0.7 + agitation * 0.5);
    thump(at, level);
    thump(at + 0.17, level * 0.55);
  }

  private flinch(at: number, timbre: Timbre): void {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const noise = ctx.createBufferSource();
    noise.buffer = this.grain;
    const sweep = ctx.createBiquadFilter();
    sweep.type = "bandpass";
    sweep.Q.value = 1.4;
    sweep.frequency.setValueAtTime(timbre.cutoff * 2.4, at);
    sweep.frequency.exponentialRampToValueAtTime(timbre.cutoff * 0.6, at + 0.5);
    const shell = ctx.createGain();
    shell.gain.setValueAtTime(0.0001, at);
    shell.gain.linearRampToValueAtTime(FLINCH_LEVEL, at + 0.03);
    shell.gain.exponentialRampToValueAtTime(0.0001, at + 0.6);
    noise.connect(sweep).connect(shell).connect(this.master);
    noise.start(at);
    noise.stop(at + 0.65);
  }

  /**
   * A sound with a throat: one tone pushed through two moving formants. Not speech, just a
   * body with a cavity in it, which is all an ear needs to hear an animal.
   */
  private voice(at: number, kind: GestureKind, timbre: Timbre, scale: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || !this.reverbIn || scale <= 0.02) return;

    // One voice at a time, and never two on top of each other.
    if (at - this.lastVoice < 2.6) return;
    this.lastVoice = at;

    const shape = VOICES[kind];
    const root = timbre.root * (0.86 + Math.random() * 0.3);
    const level = shape.level * scale;
    const span = shape.span * (0.85 + Math.random() * 0.32);

    const osc = ctx.createOscillator();
    osc.type = shape.buzz > 0.3 ? "sawtooth" : "triangle";
    osc.frequency.setValueAtTime(root * shape.glide[0], at);
    osc.frequency.exponentialRampToValueAtTime(root * shape.glide[1], at + span * 0.3);
    osc.frequency.exponentialRampToValueAtTime(root * shape.glide[2], at + span);

    const shell = ctx.createGain();
    shell.gain.setValueAtTime(0.0001, at);
    shell.gain.linearRampToValueAtTime(level, at + Math.min(0.09, span * 0.3));
    shell.gain.setTargetAtTime(0.0001, at + span * 0.55, span * 0.26);

    const throat = ctx.createGain();
    osc.connect(throat);

    shape.formants.forEach((base, index) => {
      const band = ctx.createBiquadFilter();
      band.type = "bandpass";
      band.Q.value = 7 - index * 2;
      band.frequency.setValueAtTime(base, at);
      band.frequency.linearRampToValueAtTime(base * (1 + shape.open), at + span * 0.6);
      const mix = ctx.createGain();
      mix.gain.value = index === 0 ? 1 : 0.55;
      throat.connect(band).connect(mix).connect(shell);
    });

    const direct = ctx.createGain();
    direct.gain.value = 0.22;
    throat.connect(direct).connect(shell);

    if (shape.air > 0 && this.grain) {
      const breathy = ctx.createBufferSource();
      breathy.buffer = this.grain;
      breathy.loop = true;
      const airway = ctx.createGain();
      airway.gain.value = shape.air * 2.4;
      breathy.connect(airway).connect(throat);
      breathy.start(at, Math.random() * 2);
      breathy.stop(at + span + 0.3);
    }

    if (shape.tremolo > 0) {
      const lfo = ctx.createOscillator();
      lfo.frequency.value = shape.tremolo;
      const depth = ctx.createGain();
      depth.gain.value = level * 0.6;
      lfo.connect(depth).connect(shell.gain);
      lfo.start(at);
      lfo.stop(at + span + 0.3);
    }

    const send = ctx.createGain();
    send.gain.value = 0.5;
    shell.connect(this.master);
    shell.connect(send).connect(this.reverbIn);

    osc.start(at);
    osc.stop(at + span + 0.4);
  }
}
