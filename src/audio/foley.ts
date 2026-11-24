/**
 * Procedural cozy tabletop ASMR UI foley.
 *
 * Strictly instrumental / acoustic synthesis (zero speech synthesis): warm low-passed pink noise
 * and F-Lydian sine/triangle tones only. Every node is created inside `rig.build(...)` so transient
 * voices disconnect and release cleanly on `onended`.
 */
import type { UiFoleyKind } from '../contracts/audio';
import { expTo, linTo, setAt, type Rig } from './graph';
import { lydianFreq } from './scale';
import { envAD } from './voices';

interface FoleyState {
  step: number;
  jar: number;
  wisp: number;
}

const foleyState = new WeakMap<Rig, FoleyState>();

function stateFor(rig: Rig): FoleyState {
  let st = foleyState.get(rig);
  if (!st) {
    st = { step: 0, jar: 0, wisp: 0 };
    foleyState.set(rig, st);
  }
  return st;
}

/** Deterministic offset inside the shared 2.5 s pink-noise buffer so consecutive taps feel organic. */
function noiseOffset(step: number, salt: number): number {
  return ((step * 0.43 + salt) % 1.9 + 1.9) % 1.9;
}

/** F-Lydian fifth pairs for hollow glass-jar clinks: F5/C6, G5/D6, A5/E6. */
const JAR_FIFTHS: ReadonlyArray<readonly [number, number]> = [
  [7, 11],
  [8, 12],
  [9, 13],
];

/** Staggered F-Lydian wind-chime voicings: C5 -> E5 -> B5, C5 -> G5 -> B5. */
const WISP_CHIMES: ReadonlyArray<readonly [number, number, number]> = [
  [4, 6, 10],
  [4, 8, 10],
];

/** Heavy-cotton sketchbook paper rustle: two gentle overlapping bandpass + low-pass noise puffs (~245 ms). */
function playPaperRustle(rig: Rig, t: number, step: number): void {
  rig.build((g) => {
    const lp = g.filter('lowpass', 2100, 0.6);
    lp.connect(rig.out);

    const s1 = g.noise(0.95);
    const bp1 = g.filter('bandpass', 920, 1.15);
    const e1 = g.gain(0);
    setAt(bp1.frequency, 920, t);
    expTo(bp1.frequency, 1580, t + 0.055);
    expTo(bp1.frequency, 960, t + 0.165);
    setAt(e1.gain, 0, t);
    linTo(e1.gain, 0.16, t + 0.032);
    expTo(e1.gain, 0.035, t + 0.115);
    linTo(e1.gain, 0, t + 0.175);
    s1.connect(bp1);
    bp1.connect(e1);
    e1.connect(lp);
    g.play(s1, t, t + 0.19, noiseOffset(step, 0.17));

    const t2 = t + 0.055;
    const s2 = g.noise(1.04);
    const bp2 = g.filter('bandpass', 1120, 1.25);
    const e2 = g.gain(0);
    setAt(bp2.frequency, 1120, t2);
    expTo(bp2.frequency, 1740, t2 + 0.05);
    expTo(bp2.frequency, 860, t2 + 0.185);
    setAt(e2.gain, 0, t2);
    linTo(e2.gain, 0.13, t2 + 0.04);
    expTo(e2.gain, 0.014, t2 + 0.14);
    linTo(e2.gain, 0, t2 + 0.19);
    s2.connect(bp2);
    bp2.connect(e2);
    e2.connect(lp);
    g.play(s2, t2, t2 + 0.205, noiseOffset(step, 1.03));
  });
}

/** Warm cedar-wood knock (~247 -> 220 Hz over 45 ms) + whisper-soft 60 ms natural-bristle brush. */
function playWoodTap(rig: Rig, t: number, step: number): void {
  rig.build((g) => {
    const woodLp = g.filter('lowpass', 740, 1.35);
    woodLp.connect(rig.out);

    const fStart = lydianFreq(-4); // B3 (246.94 Hz)
    const fEnd = lydianFreq(-5); // A3 (220.00 Hz)
    const body = g.osc('triangle', fStart);
    const bodyEnv = g.gain(0);
    setAt(body.frequency, fStart, t);
    expTo(body.frequency, fEnd, t + 0.045);
    const bodyEnd = envAD(bodyEnv.gain, t, 0.145, 0.004, 0.068) + 0.015;
    body.connect(bodyEnv);
    bodyEnv.connect(woodLp);
    g.play(body, t, bodyEnd);

    const over = g.osc('sine', lydianFreq(2)); // A4 hollow wood tap warmth
    const overEnv = g.gain(0);
    const overEnd = envAD(overEnv.gain, t, 0.042, 0.003, 0.026) + 0.012;
    over.connect(overEnv);
    overEnv.connect(woodLp);
    g.play(over, t, overEnd);

    const tb = t + 0.006;
    const bristle = g.noise(1.12);
    const bp = g.filter('bandpass', 1340, 1.35);
    const lp = g.filter('lowpass', 2350, 0.6);
    const bEnv = g.gain(0);
    setAt(bp.frequency, 1340, tb);
    expTo(bp.frequency, 1820, tb + 0.055);
    setAt(bEnv.gain, 0, tb);
    linTo(bEnv.gain, 0.055, tb + 0.016);
    expTo(bEnv.gain, 1e-4, tb + 0.058);
    linTo(bEnv.gain, 0, tb + 0.062);
    bristle.connect(bp);
    bp.connect(lp);
    lp.connect(bEnv);
    bEnv.connect(rig.out);
    g.play(bristle, tb, tb + 0.075, noiseOffset(step, 0.59));
  });
}

/** Delicate hollow glass-jar clink rotating in F-Lydian fifths (F5/C6, G5/D6, A5/E6) at gentle gain. */
function playJarClink(rig: Rig, t: number, step: number): void {
  const pair = JAR_FIFTHS[step % JAR_FIFTHS.length] ?? JAR_FIFTHS[0]!;
  const [loDeg, hiDeg] = pair;
  const fLo = lydianFreq(loDeg);
  const fHi = lydianFreq(hiDeg);
  const fShim = lydianFreq(loDeg + 7);
  rig.build((g) => {
    const lp = g.filter('lowpass', 3300, 0.65);
    lp.connect(rig.out);

    const o1 = g.osc('sine', fLo);
    const e1 = g.gain(0);
    const end1 = envAD(e1.gain, t, 0.056, 0.003, 0.165) + 0.025;
    o1.connect(e1);
    e1.connect(lp);
    g.play(o1, t, end1);

    const t2 = t + 0.007;
    const o2 = g.osc('sine', fHi);
    const e2 = g.gain(0);
    const end2 = envAD(e2.gain, t2, 0.036, 0.003, 0.135) + 0.025;
    o2.connect(e2);
    e2.connect(lp);
    g.play(o2, t2, end2);

    const o3 = g.osc('sine', fShim);
    const e3 = g.gain(0);
    const end3 = envAD(e3.gain, t, 0.014, 0.002, 0.075) + 0.02;
    o3.connect(e3);
    e3.connect(lp);
    g.play(o3, t, end3);
  });
}

/** Crisp wax-paper backing peel zip (~70 ms upward bandpass) followed by a warm low-passed pat (~40 ms). */
function playStickerPeel(rig: Rig, t: number, step: number): void {
  rig.build((g) => {
    const peel = g.noise(1.24);
    const bp = g.filter('bandpass', 1450, 2.2);
    const lp = g.filter('lowpass', 3500, 0.7);
    const peelEnv = g.gain(0);
    setAt(bp.frequency, 1450, t);
    expTo(bp.frequency, 3100, t + 0.066);
    setAt(peelEnv.gain, 0, t);
    linTo(peelEnv.gain, 0.125, t + 0.016);
    linTo(peelEnv.gain, 0.085, t + 0.052);
    linTo(peelEnv.gain, 0, t + 0.07);
    peel.connect(bp);
    bp.connect(lp);
    lp.connect(peelEnv);
    peelEnv.connect(rig.out);
    g.play(peel, t, t + 0.085, noiseOffset(step, 0.29));

    const tp = t + 0.074;
    const patLp = g.filter('lowpass', 680, 0.85);
    patLp.connect(rig.out);

    const patNoise = g.noise(0.86);
    const patEnv = g.gain(0);
    setAt(patEnv.gain, 0, tp);
    linTo(patEnv.gain, 0.105, tp + 0.01);
    expTo(patEnv.gain, 1e-4, tp + 0.038);
    linTo(patEnv.gain, 0, tp + 0.042);
    patNoise.connect(patEnv);
    patEnv.connect(patLp);
    g.play(patNoise, tp, tp + 0.055, noiseOffset(step, 1.37));

    const patTone = g.osc('sine', lydianFreq(-7)); // F3 gentle fingertip press warmth
    const toneEnv = g.gain(0);
    const toneEnd = envAD(toneEnv.gain, tp, 0.045, 0.005, 0.032) + 0.012;
    patTone.connect(toneEnv);
    toneEnv.connect(patLp);
    g.play(patTone, tp, toneEnd);
  });
}

/** Breathy wooden/crystal wind-chime shimmer: airy noise breath + 3 staggered F-Lydian overtones. */
function playWispChime(rig: Rig, t: number, step: number, voicing: number): void {
  const degrees = WISP_CHIMES[voicing % WISP_CHIMES.length] ?? WISP_CHIMES[0]!;
  rig.build((g) => {
    const breath = g.noise(0.92);
    const bp = g.filter('bandpass', 960, 1.3);
    const breathLp = g.filter('lowpass', 2100, 0.55);
    const bEnv = g.gain(0);
    setAt(bp.frequency, 960, t);
    expTo(bp.frequency, 1520, t + 0.11);
    expTo(bp.frequency, 1020, t + 0.3);
    setAt(bEnv.gain, 0, t);
    linTo(bEnv.gain, 0.062, t + 0.068);
    expTo(bEnv.gain, 1e-4, t + 0.3);
    linTo(bEnv.gain, 0, t + 0.32);
    breath.connect(bp);
    bp.connect(breathLp);
    breathLp.connect(bEnv);
    bEnv.connect(rig.out);
    g.play(breath, t, t + 0.34, noiseOffset(step, 0.71));

    const chimeLp = g.filter('lowpass', 2800, 0.6);
    chimeLp.connect(rig.out);

    const starts = [0.015, 0.075, 0.14] as const;
    const gains = [0.054, 0.046, 0.034] as const;
    const decays = [0.36, 0.38, 0.42] as const;
    const types: readonly OscillatorType[] = ['triangle', 'sine', 'sine'];

    degrees.forEach((deg, i) => {
      const tNote = t + (starts[i] ?? 0);
      const osc = g.osc(types[i] ?? 'sine', lydianFreq(deg));
      const env = g.gain(0);
      const end = envAD(env.gain, tNote, gains[i] ?? 0.04, 0.008, decays[i] ?? 0.36) + 0.03;
      osc.connect(env);
      env.connect(chimeLp);
      g.play(osc, tNote, end);
    });
  });
}

/** Vintage hinged metal Astral Pencil Tin lid clasp: soft low-resonance snap + tiny hollow tin ring (~120 ms). */
function playTinSnap(rig: Rig, t: number, step: number): void {
  rig.build((g) => {
    const snap = g.noise(1.18);
    const bp = g.filter('bandpass', 1680, 2.8);
    const snapLp = g.filter('lowpass', 2550, 0.7);
    const snapEnv = g.gain(0);
    setAt(snapEnv.gain, 0, t);
    linTo(snapEnv.gain, 0.105, t + 0.004);
    expTo(snapEnv.gain, 1e-4, t + 0.028);
    linTo(snapEnv.gain, 0, t + 0.032);
    snap.connect(bp);
    bp.connect(snapLp);
    snapLp.connect(snapEnv);
    snapEnv.connect(rig.out);
    g.play(snap, t, t + 0.045, noiseOffset(step, 1.51));

    const tinLp = g.filter('lowpass', 2250, 1.25);
    tinLp.connect(rig.out);

    const body = g.osc('triangle', lydianFreq(0)); // F4
    const bodyEnv = g.gain(0);
    const bodyEnd = envAD(bodyEnv.gain, t, 0.062, 0.003, 0.115) + 0.025;
    body.connect(bodyEnv);
    bodyEnv.connect(tinLp);
    g.play(body, t, bodyEnd);

    const lid = g.osc('sine', lydianFreq(6)); // E5 hollow tin resonance
    const lidEnv = g.gain(0);
    const lidEnd = envAD(lidEnv.gain, t + 0.002, 0.04, 0.003, 0.12) + 0.025;
    lid.connect(lidEnv);
    lidEnv.connect(tinLp);
    g.play(lid, t + 0.002, lidEnd);

    const glint = g.osc('sine', lydianFreq(11)); // C6 clasp glint
    const glintEnv = g.gain(0);
    const glintEnd = envAD(glintEnv.gain, t, 0.02, 0.002, 0.062) + 0.02;
    glint.connect(glintEnv);
    glintEnv.connect(tinLp);
    g.play(glint, t, glintEnd);
  });
}

/** Play one procedural tabletop ASMR foley gesture, ignoring unknown kinds safely. */
export function playUiFoley(rig: Rig, kind: UiFoleyKind): void {
  const t = rig.now() + 0.006;
  const st = stateFor(rig);
  switch (kind) {
    case 'paperRustle':
      playPaperRustle(rig, t, st.step++);
      return;
    case 'woodTap':
      playWoodTap(rig, t, st.step++);
      return;
    case 'jarClink':
      playJarClink(rig, t, st.jar++);
      return;
    case 'stickerPeel':
      playStickerPeel(rig, t, st.step++);
      return;
    case 'wispChime':
      playWispChime(rig, t, st.step++, st.wisp++);
      return;
    case 'tinSnap':
      playTinSnap(rig, t, st.step++);
      return;
    default:
      return;
  }
}
