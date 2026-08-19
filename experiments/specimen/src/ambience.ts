import type { GestureKind } from "./impulses";
import type { MoodName } from "./mind";

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

export interface AmbienceState {
  mood: MoodName;
  breath: number;
  agitation: number;
  /** An impulse fired inside it this frame. */
  fired: boolean;
  pan: number;
  /** How close to the pane it is: everything else reaches you through the glass. */
  atGlass: number;
  knocked: boolean;
  gesture: GestureKind | null;
  /** How hard the hand is dragging across the skin, 0 to 1. */
  rub: number;
  familiarity: number;
}

const DRONE_LEVEL = 0.042;
const AIR_LEVEL = 0.03;
const RUB_LEVEL = 0.05;
const SPARK_LEVEL = 0.055;
const FLINCH_LEVEL = 0.045;
const KNOCK_LEVEL = 0.075;

/**
 * Everything that can be heard: a drone tuned to its mood, its breath, the impulses that cross
 * it. All of it arrives through the pane, so it is muffled until the creature comes up to the
 * glass. Nothing here has a voice; the knock is the only sound made on your side.
 */
export class Ambience {
  private ctx: AudioContext | null = null;
  private out: StereoPannerNode | null = null;
  private pane: BiquadFilterNode | null = null;
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
    if (!this.rub || !this.rubBand || !this.pane) return;

    const now = ctx.currentTime;
    const timbre = TIMBRES[state.mood];

    this.partials[0]?.frequency.setTargetAtTime(timbre.root, now, 0.9);
    this.partials[1]?.frequency.setTargetAtTime(timbre.root * timbre.interval, now, 0.9);
    this.partials[2]?.frequency.setTargetAtTime(timbre.root * 2, now, 0.9);
    this.partials[1]?.detune.setTargetAtTime(6 + timbre.shimmer * 14, now, 1.2);
    this.partials[2]?.detune.setTargetAtTime(-9 - timbre.shimmer * 11, now, 1.2);

    // Swelling is quick and bright, emptying is long and dull.
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

    // The pane keeps most of it to itself until the creature is right against it.
    this.pane.frequency.setTargetAtTime(300 + state.atGlass * 4300, now, 0.3);
    this.out.pan.setTargetAtTime(state.pan * 0.35, now, 0.4);
    this.master.gain.setTargetAtTime(0.85 + state.agitation * 0.15, now, 0.8);

    if (state.fired) this.spark(now, timbre, 0.55 + state.agitation * 0.45);
    if (state.gesture === "discharge") this.spark(now + 0.01, timbre, 1.4);
    if (state.gesture === "flare") this.swell(now, timbre);
    if (state.knocked) {
      this.knock(now);
      this.flinch(now + 0.05, timbre, 1 - state.familiarity * 0.5);
    }
  }

  private build(): void {
    const ctx = new AudioContext({ latencyHint: "interactive" });
    this.ctx = ctx;
    this.grain = this.noiseBuffer(ctx, 3);

    const out = ctx.createStereoPanner();
    out.connect(ctx.destination);
    this.out = out;

    // Everything the creature makes crosses the glass on its way out.
    const pane = ctx.createBiquadFilter();
    pane.type = "lowpass";
    pane.Q.value = 0.7;
    pane.frequency.value = 400;
    pane.connect(out);
    this.pane = pane;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0.85, ctx.currentTime + 4);
    master.connect(pane);
    this.master = master;

    const reverb = ctx.createConvolver();
    reverb.buffer = this.roomBuffer(ctx, 2.6);
    const wet = ctx.createGain();
    wet.gain.value = 0.4;
    reverb.connect(wet).connect(pane);

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

  /** An impulse crossing it: a crack, not a beat. */
  private spark(at: number, timbre: Timbre, level: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || !this.reverbIn || !this.grain) return;

    const noise = ctx.createBufferSource();
    noise.buffer = this.grain;
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.Q.value = 5.5 + Math.random() * 4;
    const pitch = 900 + Math.random() * 2600;
    band.frequency.setValueAtTime(pitch, at);
    band.frequency.exponentialRampToValueAtTime(pitch * 0.55, at + 0.1);

    const shell = ctx.createGain();
    shell.gain.setValueAtTime(0.0001, at);
    shell.gain.linearRampToValueAtTime(SPARK_LEVEL * level, at + 0.004);
    shell.gain.exponentialRampToValueAtTime(0.0001, at + 0.07 + Math.random() * 0.06);

    const send = ctx.createGain();
    send.gain.value = 0.45;
    noise.connect(band).connect(shell).connect(this.master);
    shell.connect(send).connect(this.reverbIn);
    noise.start(at, Math.random() * 2);
    noise.stop(at + 0.2);

    // Just enough body underneath to say the crack came from something.
    const low = ctx.createOscillator();
    low.type = "sine";
    low.frequency.setValueAtTime(timbre.root * 2.1, at);
    low.frequency.exponentialRampToValueAtTime(timbre.root * 1.2, at + 0.09);
    const belly = ctx.createGain();
    belly.gain.setValueAtTime(0.0001, at);
    belly.gain.linearRampToValueAtTime(SPARK_LEVEL * level * 0.5, at + 0.006);
    belly.gain.exponentialRampToValueAtTime(0.0001, at + 0.12);
    low.connect(belly).connect(this.master);
    low.start(at);
    low.stop(at + 0.16);
  }

  /** A flare: light rising, heard as a band opening upward. */
  private swell(at: number, timbre: Timbre): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || !this.reverbIn || !this.grain) return;

    const noise = ctx.createBufferSource();
    noise.buffer = this.grain;
    noise.loop = true;
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.Q.value = 3.2;
    band.frequency.setValueAtTime(timbre.cutoff * 0.8, at);
    band.frequency.exponentialRampToValueAtTime(timbre.cutoff * 3.4, at + 0.7);
    band.frequency.exponentialRampToValueAtTime(timbre.cutoff * 1.1, at + 1.5);

    const shell = ctx.createGain();
    shell.gain.setValueAtTime(0.0001, at);
    shell.gain.linearRampToValueAtTime(0.032, at + 0.35);
    shell.gain.setTargetAtTime(0.0001, at + 0.75, 0.4);

    const send = ctx.createGain();
    send.gain.value = 0.6;
    noise.connect(band).connect(shell).connect(this.master);
    shell.connect(send).connect(this.reverbIn);
    noise.start(at, Math.random() * 2);
    noise.stop(at + 1.9);
  }

  /** Its own recoil, heard from inside the tank. */
  private flinch(at: number, timbre: Timbre, scale: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || !this.grain || scale <= 0.05) return;
    const noise = ctx.createBufferSource();
    noise.buffer = this.grain;
    const sweep = ctx.createBiquadFilter();
    sweep.type = "bandpass";
    sweep.Q.value = 1.4;
    sweep.frequency.setValueAtTime(timbre.cutoff * 2.4, at);
    sweep.frequency.exponentialRampToValueAtTime(timbre.cutoff * 0.6, at + 0.5);
    const shell = ctx.createGain();
    shell.gain.setValueAtTime(0.0001, at);
    shell.gain.linearRampToValueAtTime(FLINCH_LEVEL * scale, at + 0.03);
    shell.gain.exponentialRampToValueAtTime(0.0001, at + 0.6);
    noise.connect(sweep).connect(shell).connect(this.master);
    noise.start(at);
    noise.stop(at + 0.65);
  }

  /** Your knuckle on the pane. The only sound made on your side of the glass. */
  private knock(at: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.out || !this.grain) return;

    const body = ctx.createOscillator();
    body.type = "sine";
    body.frequency.setValueAtTime(184, at);
    body.frequency.exponentialRampToValueAtTime(78, at + 0.14);
    const shell = ctx.createGain();
    shell.gain.setValueAtTime(0.0001, at);
    shell.gain.linearRampToValueAtTime(KNOCK_LEVEL, at + 0.004);
    shell.gain.exponentialRampToValueAtTime(0.0001, at + 0.24);
    body.connect(shell).connect(this.out);
    body.start(at);
    body.stop(at + 0.28);

    const tap = ctx.createBufferSource();
    tap.buffer = this.grain;
    const edge = ctx.createBiquadFilter();
    edge.type = "highpass";
    edge.frequency.value = 2600;
    const click = ctx.createGain();
    click.gain.setValueAtTime(KNOCK_LEVEL * 0.8, at);
    click.gain.exponentialRampToValueAtTime(0.0001, at + 0.035);
    tap.connect(edge).connect(click).connect(this.out);
    tap.start(at, Math.random() * 2);
    tap.stop(at + 0.06);
  }
}
