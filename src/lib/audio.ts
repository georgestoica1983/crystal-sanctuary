"use client";

/** Garden key: D major pentatonic (D E F# A B), the notes every sound and the music use */
export const GARDEN_SCALE_HZ = [146.83, 164.81, 185.0, 220.0, 246.94];
/** Note `step` of the garden scale, climbing octaves past the fifth note */
export const gardenNote = (step: number, base = 2) =>
  GARDEN_SCALE_HZ[((step % 5) + 5) % 5] * 2 ** (base + Math.floor(step / 5) - 1);

/**
 * Sound graph: effects → sfx bus, music → music bus; both feed a soft room
 * echo and a master chain (warm low-pass → gentle compressor → speakers).
 * The music dips briefly whenever an effect plays.
 */
interface AudioGraph {
  sfx: GainNode;
  music: GainNode;
  master: GainNode;
}

const MUSIC_LEVEL = 0.32;

class SoundAndHapticsEngine {
  private ctx: AudioContext | null = null;
  private graph: AudioGraph | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private musicChord = 0;
  // Off until the player turns them on; a saved choice wins
  public soundEnabled: boolean = false;
  public musicEnabled: boolean = false;
  public hapticsEnabled: boolean = true;

  constructor() {
    if (typeof window !== "undefined") {
      try {
        const savedSound = window.localStorage.getItem("ost_sound_enabled");
        const savedMusic = window.localStorage.getItem("ost_music_enabled");
        const savedHaptics = window.localStorage.getItem("ost_haptics_enabled");
        if (savedSound !== null) this.soundEnabled = savedSound === "true";
        if (savedMusic !== null) this.musicEnabled = savedMusic === "true";
        if (savedHaptics !== null) this.hapticsEnabled = savedHaptics === "true";
      } catch {
        // Ignore storage errors in restricted environments
      }
      // Browsers only start audio after a tap; quiet while the app is in the background
      const wake = () => {
        if (this.musicEnabled) this.startMusic();
        else if (this.ctx?.state === "suspended" && this.soundEnabled) this.ctx.resume().catch(() => {});
      };
      window.addEventListener("pointerdown", wake, { passive: true });
      document.addEventListener("visibilitychange", () => {
        if (!this.ctx) return;
        if (document.hidden) this.ctx.suspend().catch(() => {});
        else if (this.soundEnabled || this.musicEnabled) this.ctx.resume().catch(() => {});
      });
    }
  }

  public setMusicEnabled(enabled: boolean): void {
    this.musicEnabled = enabled;
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem("ost_music_enabled", String(enabled));
      } catch {
        // Ignore
      }
    }
    if (enabled) this.startMusic();
    else this.stopMusic();
  }

  public setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem("ost_sound_enabled", String(enabled));
      } catch {
        // Ignore
      }
    }
  }

  public setHapticsEnabled(enabled: boolean): void {
    this.hapticsEnabled = enabled;
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem("ost_haptics_enabled", String(enabled));
      } catch {
        // Ignore
      }
    }
  }

  /** The audio context and its graph, created on first use */
  private ensureAudio(): { ctx: AudioContext; graph: AudioGraph } | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.graph = this.buildGraph(this.ctx);
    }
    if (this.ctx.state === "suspended" && !document.hidden) {
      this.ctx.resume().catch(() => {});
    }
    return { ctx: this.ctx, graph: this.graph! };
  }

  /** Context for a sound effect (null when sound is off) */
  private getContext(): AudioContext | null {
    if (!this.soundEnabled) return null;
    const audio = this.ensureAudio();
    if (!audio) return null;
    this.duckMusic();
    return audio.ctx;
  }

  private buildGraph(ctx: AudioContext): AudioGraph {
    const warm = ctx.createBiquadFilter();
    warm.type = "lowpass";
    warm.frequency.value = 8500;
    warm.Q.value = 0.5;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -20;
    comp.knee.value = 14;
    comp.ratio.value = 3;
    comp.attack.value = 0.01;
    comp.release.value = 0.25;
    const master = ctx.createGain();
    master.gain.value = 0.9;
    warm.connect(comp);
    comp.connect(master);
    master.connect(ctx.destination);

    // Soft room echo: a short decaying noise impulse, a little darker than the dry sound
    const room = ctx.createConvolver();
    const len = Math.floor(ctx.sampleRate * 1.8);
    const impulse = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = impulse.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    room.buffer = impulse;
    const roomTone = ctx.createBiquadFilter();
    roomTone.type = "lowpass";
    roomTone.frequency.value = 3200;
    room.connect(roomTone);
    roomTone.connect(warm);

    const sfx = ctx.createGain();
    sfx.gain.value = 1;
    sfx.connect(warm);
    const sfxRoom = ctx.createGain();
    sfxRoom.gain.value = 0.22;
    sfx.connect(sfxRoom);
    sfxRoom.connect(room);

    const music = ctx.createGain();
    music.gain.value = 0;
    music.connect(warm);
    const musicRoom = ctx.createGain();
    musicRoom.gain.value = 0.45;
    music.connect(musicRoom);
    musicRoom.connect(room);

    return { sfx, music, master };
  }

  /** Effects come through: the music dips for a moment, then swells back */
  private duckMusic(): void {
    if (!this.ctx || !this.graph || !this.musicEnabled) return;
    const g = this.graph.music.gain;
    const now = this.ctx.currentTime;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(MUSIC_LEVEL * 0.55, now + 0.04);
    g.linearRampToValueAtTime(MUSIC_LEVEL, now + 0.6);
  }

  // ── Music ─────────────────────────────────────────────────────────────────
  // For now a slow, soft pad that drifts between four garden chords; the full
  // generated kalimba score replaces it later.
  private static readonly PAD_CHORDS = [
    [0, 2, 4, 6], // D F# B E
    [3, 5, 7, 9], // A D F# B
    [4, 6, 8, 10], // B E A D
    [2, 4, 6, 8], // F# B E A
  ];

  private startMusic(): void {
    const audio = this.ensureAudio();
    if (!audio || this.musicTimer) return;
    const { ctx, graph } = audio;
    const now = ctx.currentTime;
    graph.music.gain.cancelScheduledValues(now);
    graph.music.gain.setValueAtTime(graph.music.gain.value, now);
    graph.music.gain.linearRampToValueAtTime(MUSIC_LEVEL, now + 3);
    this.playPadChord();
    this.musicTimer = setInterval(() => this.playPadChord(), 8000);
  }

  private stopMusic(): void {
    if (this.musicTimer) clearInterval(this.musicTimer);
    this.musicTimer = null;
    if (!this.ctx || !this.graph) return;
    const g = this.graph.music.gain;
    const now = this.ctx.currentTime;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(0, now + 1.2);
  }

  private playPadChord(): void {
    if (!this.ctx || !this.graph || document.hidden) return;
    const ctx = this.ctx;
    const chord = SoundAndHapticsEngine.PAD_CHORDS[this.musicChord++ % SoundAndHapticsEngine.PAD_CHORDS.length];
    const now = ctx.currentTime;
    const hold = 10; // overlaps the next chord by 2 s
    const tone = ctx.createBiquadFilter();
    tone.type = "lowpass";
    tone.frequency.value = 1100;
    tone.connect(this.graph.music);
    chord.forEach((step, i) => {
      for (const detune of [-6, 6]) {
        const osc = ctx.createOscillator();
        osc.type = i === 0 ? "sine" : "triangle";
        osc.frequency.value = gardenNote(step, 1);
        osc.detune.value = detune;
        const g = ctx.createGain();
        const peak = (i === 0 ? 0.09 : 0.05) / 2;
        g.gain.setValueAtTime(0.0001, now);
        g.gain.linearRampToValueAtTime(peak, now + 3);
        g.gain.setValueAtTime(peak, now + hold - 3);
        g.gain.linearRampToValueAtTime(0.0001, now + hold);
        osc.connect(g);
        g.connect(tone);
        osc.start(now);
        osc.stop(now + hold + 0.05);
      }
    });
  }

  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer) return this.noiseBuffer;
    const bufferSize = ctx.sampleRate * 0.5;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
    return buffer;
  }

  public vibrate(pattern: number | number[]): void {
    if (!this.hapticsEnabled || typeof window === "undefined") return;
    try {
      if (
        typeof navigator !== "undefined" &&
        typeof navigator.vibrate === "function"
      ) {
        navigator.vibrate(pattern);
      }
    } catch {
      // Ignore on unsupported devices
    }
  }

  private playTone(options: {
    type: OscillatorType;
    freqStart: number;
    freqEnd?: number;
    duration: number;
    gainPeak: number;
    delay?: number;
    attack?: number;
  }): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime + (options.delay ?? 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = options.type;
    osc.frequency.setValueAtTime(options.freqStart, now);
    if (options.freqEnd && options.freqEnd !== options.freqStart) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(20, options.freqEnd),
        now + options.duration
      );
    }

    const attackTime = options.attack ?? 0.008;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(options.gainPeak, now + attackTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + options.duration);

    osc.connect(gain);
    gain.connect(this.graph!.sfx);

    osc.start(now);
    osc.stop(now + options.duration + 0.01);
  }

  private playNoiseBurst(options: {
    duration: number;
    gainPeak: number;
    filterFreq: number;
    filterType: BiquadFilterType;
    q?: number;
    delay?: number;
  }): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime + (options.delay ?? 0);
    const source = ctx.createBufferSource();
    source.buffer = this.getNoiseBuffer(ctx);

    const filter = ctx.createBiquadFilter();
    filter.type = options.filterType;
    filter.frequency.setValueAtTime(options.filterFreq, now);
    filter.Q.setValueAtTime(options.q ?? 1.5, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(options.gainPeak, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + options.duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.graph!.sfx);

    source.start(now);
    source.stop(now + options.duration + 0.01);
  }

  // ── Voices: every effect is built from these, all in the garden key ───────

  /** Kalimba tine: a warm fundamental, a soft octave and a quick bright "ping" */
  private pluck(freq: number, opts: { delay?: number; gain?: number; decay?: number } = {}): void {
    const gain = opts.gain ?? 0.12;
    const decay = opts.decay ?? 0.7;
    const delay = opts.delay ?? 0;
    this.playTone({ type: "sine", freqStart: freq, duration: decay, gainPeak: gain, delay, attack: 0.004 });
    this.playTone({ type: "sine", freqStart: freq * 2, duration: decay * 0.35, gainPeak: gain * 0.28, delay, attack: 0.003 });
    this.playTone({ type: "sine", freqStart: freq * 5.4, duration: 0.05, gainPeak: gain * 0.12, delay, attack: 0.002 });
  }

  /** Soft bell: slow decay with gentle inharmonic shimmer */
  private bell(freq: number, opts: { delay?: number; gain?: number } = {}): void {
    const gain = opts.gain ?? 0.08;
    const delay = opts.delay ?? 0;
    this.playTone({ type: "sine", freqStart: freq, duration: 1.6, gainPeak: gain, delay, attack: 0.006 });
    this.playTone({ type: "sine", freqStart: freq * 2.76, duration: 0.7, gainPeak: gain * 0.3, delay, attack: 0.004 });
    this.playTone({ type: "sine", freqStart: freq * 5.4, duration: 0.3, gainPeak: gain * 0.12, delay, attack: 0.003 });
  }

  /** Hollow wood-block tap */
  private wood(freq: number, opts: { delay?: number; gain?: number } = {}): void {
    const gain = opts.gain ?? 0.12;
    const delay = opts.delay ?? 0;
    this.playTone({ type: "sine", freqStart: freq * 1.15, freqEnd: freq, duration: 0.12, gainPeak: gain, delay, attack: 0.002 });
    this.playNoiseBurst({ duration: 0.025, gainPeak: gain * 0.35, filterFreq: freq * 3, filterType: "bandpass", q: 4, delay });
  }

  /** Muted low thud (damage): felt, not heard as harsh */
  private thud(opts: { delay?: number; gain?: number } = {}): void {
    const gain = opts.gain ?? 0.2;
    const delay = opts.delay ?? 0;
    this.playTone({ type: "sine", freqStart: 120, freqEnd: 58, duration: 0.22, gainPeak: gain, delay, attack: 0.004 });
    this.playNoiseBurst({ duration: 0.12, gainPeak: gain * 0.25, filterFreq: 320, filterType: "lowpass", q: 0.7, delay });
  }

  /** Leaf rustle */
  private rustle(opts: { delay?: number; gain?: number; duration?: number } = {}): void {
    this.playNoiseBurst({
      duration: opts.duration ?? 0.18,
      gainPeak: opts.gain ?? 0.05,
      filterFreq: 3200,
      filterType: "bandpass",
      q: 0.9,
      delay: opts.delay,
    });
  }

  /** Small garden-shears "snip" */
  private snip(opts: { delay?: number; gain?: number } = {}): void {
    const gain = opts.gain ?? 0.08;
    const delay = opts.delay ?? 0;
    this.playNoiseBurst({ duration: 0.03, gainPeak: gain, filterFreq: 6500, filterType: "highpass", q: 0.8, delay });
    this.playNoiseBurst({ duration: 0.025, gainPeak: gain * 0.8, filterFreq: 5200, filterType: "highpass", q: 0.8, delay: delay + 0.045 });
  }

  // ── Drawing the line ──────────────────────────────────────────────────────

  /** Each new tile: a kalimba note one step up the scale (longer lines climb higher) */
  public playSwipeTick(stepIndex: number, isLethalPreview: boolean = false): void {
    if (isLethalPreview) {
      this.vibrate([14, 10, 14]);
      this.thud({ gain: 0.14 });
      return;
    }
    this.vibrate(6);
    // Climbs three octaves, then keeps sparkling in the top one
    const step = stepIndex < 15 ? stepIndex : 10 + ((stepIndex - 15) % 5);
    this.pluck(gardenNote(step, 2), { gain: 0.1, decay: 0.55 });
    // Every fifth tile (a new octave) adds a soft harmony a third above
    if (stepIndex > 0 && stepIndex % 5 === 0) this.pluck(gardenNote(step + 2, 2), { gain: 0.05, decay: 0.5, delay: 0.03 });
  }

  /** Backing up one tile */
  public playUndoTick(): void {
    this.vibrate(4);
    this.wood(gardenNote(0, 3), { gain: 0.06 });
  }

  /** Clearing the whole line */
  public playRetractPath(): void {
    this.vibrate(8);
    [4, 2, 0].forEach((s, i) => this.pluck(gardenNote(s, 2), { gain: 0.06, decay: 0.35, delay: i * 0.06 }));
  }

  /** Letting go: the line is planted */
  public playCommitPath(): void {
    this.vibrate([10, 20, 12]);
    this.pluck(gardenNote(5, 2), { gain: 0.11 });
    this.pluck(gardenNote(8, 2), { gain: 0.09, delay: 0.09 });
  }

  // ── The line plays out ────────────────────────────────────────────────────

  /** Each tile the line passes as it plays out */
  public playStepPulse(stepIndex: number): void {
    this.pluck(gardenNote(Math.min(stepIndex, 14), 2), { gain: 0.045, decay: 0.3 });
  }

  /** Passing a Thorn: a soft thud and rustle, or a snip and chime when Shears cut it */
  public playSwordHit(usedWeapon: boolean = false): void {
    if (usedWeapon) {
      this.vibrate([10, 10, 14]);
      this.snip();
      this.bell(gardenNote(9, 2), { gain: 0.06, delay: 0.06 });
      return;
    }
    this.vibrate([16, 10]);
    this.thud({ gain: 0.18 });
    this.rustle({ gain: 0.04, delay: 0.02 });
  }

  /** Gloves block: a warm wood tap */
  public playShieldClink(): void {
    this.vibrate(10);
    this.wood(gardenNote(7, 2), { gain: 0.1 });
  }

  /** Gloves used up: two falling wood taps */
  public playGlassShatter(): void {
    this.vibrate([12, 12]);
    this.wood(gardenNote(7, 2), { gain: 0.08 });
    this.wood(gardenNote(4, 2), { gain: 0.07, delay: 0.09 });
    this.rustle({ gain: 0.03, delay: 0.05 });
  }

  /** Picking up Shears */
  public playWeaponPickup(): void {
    this.vibrate(10);
    this.snip({ gain: 0.06 });
    this.pluck(gardenNote(8, 2), { gain: 0.08, delay: 0.05 });
  }

  /** A Berry: a warm rising "bloop" (a bad Berry falls instead) */
  public playPotionEffect(isPoisoned: boolean = false): void {
    this.vibrate(isPoisoned ? [12, 14] : 10);
    const from = isPoisoned ? gardenNote(5, 2) : gardenNote(2, 2);
    const to = isPoisoned ? gardenNote(0, 2) : gardenNote(7, 2);
    this.playTone({ type: "sine", freqStart: from, freqEnd: to, duration: 0.16, gainPeak: 0.1, attack: 0.01 });
    if (!isPoisoned) this.pluck(gardenNote(9, 2), { gain: 0.05, delay: 0.1, decay: 0.4 });
  }

  /** An Acorn: a wooden tock that steps up with each one in a row */
  public playGoldPickup(comboCount: number = 1): void {
    this.vibrate(8);
    const step = 5 + Math.min(Math.max(1, comboCount) - 1, 9);
    this.wood(gardenNote(step, 2), { gain: 0.1 });
    this.pluck(gardenNote(step + 2, 2), { gain: 0.04, delay: 0.03, decay: 0.3 });
  }

  /** A Spike: a soft thud when it hurts, a light leaf hop when crossed diagonally */
  public playTrapEffect(dodgedDiagonally: boolean): void {
    if (dodgedDiagonally) {
      this.vibrate(6);
      this.rustle({ gain: 0.04, duration: 0.12 });
      this.pluck(gardenNote(11, 2), { gain: 0.06, delay: 0.04, decay: 0.35 });
      return;
    }
    this.vibrate([18, 10]);
    this.thud({ gain: 0.2 });
  }

  /** Reaching the Exit gate: a quick climbing run that lands on a bell */
  public playPortalBurst(): void {
    this.vibrate([10, 30, 16]);
    [5, 7, 9, 10].forEach((s, i) => this.pluck(gardenNote(s, 2), { gain: 0.07, decay: 0.35, delay: i * 0.05 }));
    this.bell(gardenNote(12, 2), { gain: 0.07, delay: 0.22 });
  }

  // ── Rewards ───────────────────────────────────────────────────────────────

  /** A hint appears */
  public playHintReveal(): void {
    this.vibrate(8);
    [7, 9, 12].forEach((s, i) => this.bell(gardenNote(s, 2), { gain: 0.045, delay: i * 0.08 }));
  }

  /** Points and blooms flying to the score (a fuller chord for longer combos) */
  public playSanctuaryHarpChime(comboStep: number = 1): void {
    this.vibrate(8);
    const base = 5 + Math.min(Math.max(1, comboStep) - 1, 6);
    [0, 2, 4].forEach((d, i) => this.pluck(gardenNote(base + d, 2), { gain: 0.07, decay: 0.5, delay: i * 0.045 }));
  }

  /** A Garden Bed cleared: a blooming arpeggio over two octaves, then a bell */
  public playFloorClear(): void {
    this.vibrate([14, 40, 20]);
    [0, 2, 3, 5, 7, 8, 10].forEach((s, i) => this.pluck(gardenNote(s, 2), { gain: 0.08, decay: 0.8, delay: i * 0.07 }));
    this.bell(gardenNote(12, 2), { gain: 0.08, delay: 0.52 });
  }

  /** A big win: a wide, resolved garden chord */
  public playVictoryChord(): void {
    this.vibrate([16, 50, 24]);
    [0, 3, 7, 9, 12].forEach((s, i) => {
      this.pluck(gardenNote(s, 1), { gain: 0.08, decay: 1.4, delay: i * 0.05 });
      this.bell(gardenNote(s + 5, 1), { gain: 0.035, delay: i * 0.05 + 0.02 });
    });
  }

  /**
   * A number counting up: `notes` kalimba notes climbing from `fromStep`,
   * spread over `durationMs` (Value counts low, Length continues higher)
   */
  public playCountRun(fromStep: number, notes: number, durationMs: number): void {
    const gap = durationMs / 1000 / Math.max(1, notes);
    for (let i = 0; i < notes; i++) {
      this.pluck(gardenNote(fromStep + i, 2), { gain: 0.055, decay: 0.3, delay: i * gap });
    }
    this.vibrate(6);
  }

  /** A relic multiplier pops in: a sparkle that rises with each one */
  public playMultiplierSparkle(index: number = 0): void {
    this.vibrate(10);
    const step = 10 + Math.min(index, 4) * 2;
    this.bell(gardenNote(step, 2), { gain: 0.06 });
    this.pluck(gardenNote(step + 5, 2), { gain: 0.03, decay: 0.2, delay: 0.02 });
  }

  /**
   * The line's total lands on a chord. `strength` is the line's share of the
   * bed's target: a small line gets two notes, a huge one a full chord.
   */
  public playTallyTotal(strength: number = 0.3): void {
    const notes = strength >= 1 ? 6 : strength >= 0.6 ? 5 : strength >= 0.35 ? 4 : strength >= 0.15 ? 3 : 2;
    this.vibrate(notes >= 5 ? [16, 30, 24] : [12, 20]);
    [0, 4, 7, 9, 12, 14].slice(0, notes).forEach((s, i) => {
      this.pluck(gardenNote(s, 1 + (i >= 3 ? 1 : 0)), { gain: 0.08, decay: 1.1, delay: i * 0.03 });
    });
    if (notes >= 5) this.bell(gardenNote(14, 2), { gain: 0.06, delay: 0.12 });
  }

  /** A star lands on the bed-cleared screen (1, 2, 3 climb higher) */
  public playStarLand(star: number): void {
    this.vibrate(10 + star * 4);
    this.bell(gardenNote(5 + star * 2, 2), { gain: 0.07 });
  }

  /** Buying in the Shop: a soft card swoosh and a chime */
  public playShopBuy(): void {
    this.vibrate([8, 16]);
    this.playNoiseBurst({ duration: 0.16, gainPeak: 0.035, filterFreq: 1400, filterType: "bandpass", q: 0.7 });
    this.pluck(gardenNote(7, 2), { gain: 0.08, delay: 0.08 });
    this.pluck(gardenNote(9, 2), { gain: 0.06, delay: 0.14 });
  }

  /** Three relics with one theme: the "set" motif, a rising three-note call answered by a bell */
  public playSetComplete(): void {
    this.vibrate([12, 30, 12, 30, 24]);
    [5, 7, 9].forEach((s, i) => this.pluck(gardenNote(s, 2), { gain: 0.09, decay: 0.6, delay: i * 0.12 }));
    this.bell(gardenNote(12, 2), { gain: 0.08, delay: 0.38 });
    this.bell(gardenNote(9, 2), { gain: 0.04, delay: 0.4 });
  }

  /** The Run is over: a gentle falling phrase, never punishing */
  public playDefeatSound(): void {
    this.vibrate([20, 40]);
    [9, 7, 5, 3, 0].forEach((s, i) => this.pluck(gardenNote(s, 1), { gain: 0.08, decay: 0.9, delay: i * 0.16 }));
  }
}

export const soundEngine = new SoundAndHapticsEngine();

