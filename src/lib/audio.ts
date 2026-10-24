"use client";

class SoundAndHapticsEngine {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  // Off until the player turns it on (the 🔊 button next to Swap); a saved choice wins
  public soundEnabled: boolean = false;
  public hapticsEnabled: boolean = true;

  constructor() {
    if (typeof window !== "undefined") {
      try {
        const savedSound = window.localStorage.getItem("ost_sound_enabled");
        const savedHaptics = window.localStorage.getItem("ost_haptics_enabled");
        if (savedSound !== null) this.soundEnabled = savedSound === "true";
        if (savedHaptics !== null) this.hapticsEnabled = savedHaptics === "true";
      } catch {
        // Ignore storage errors in restricted environments
      }
    }
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

  private getContext(): AudioContext | null {
    if (!this.soundEnabled || typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
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
    gain.connect(ctx.destination);

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
    gain.connect(ctx.destination);

    source.start(now);
    source.stop(now + options.duration + 0.01);
  }

  /**
   * Triggered when extending the path to a new cell
   */
  public playSwipeTick(stepIndex: number, isLethalPreview: boolean = false): void {
    if (isLethalPreview) {
      this.vibrate([16, 12, 16]);
      this.playTone({
        type: "sawtooth",
        freqStart: 150,
        freqEnd: 95,
        duration: 0.09,
        gainPeak: 0.14,
      });
      return;
    }

    this.vibrate(8);
    // Pentatonic-inspired ascending pitch ladder
    const scaleMultipliers = [
      1, 1.122, 1.26, 1.498, 1.682, 2, 2.245, 2.52, 2.996, 3.364,
    ];
    const octaveBoost = Math.floor(stepIndex / scaleMultipliers.length) * 0.35;
    const mult =
      scaleMultipliers[stepIndex % scaleMultipliers.length] + octaveBoost;
    const baseFreq = 260 * mult;

    this.playTone({
      type: "sine",
      freqStart: baseFreq,
      freqEnd: baseFreq * 1.08,
      duration: 0.055,
      gainPeak: 0.12,
    });
    this.playTone({
      type: "triangle",
      freqStart: baseFreq * 2,
      freqEnd: baseFreq * 1.95,
      duration: 0.035,
      gainPeak: 0.04,
    });
  }

  /**
   * Triggered when backtracking one cell to undo the last segment
   */
  public playUndoTick(): void {
    this.vibrate(5);
    this.playTone({
      type: "sine",
      freqStart: 280,
      freqEnd: 175,
      duration: 0.05,
      gainPeak: 0.1,
    });
  }

  /**
   * Triggered when releasing pointer on an invalid cell or with lethal HP
   */
  public playRetractPath(): void {
    this.vibrate([10, 20, 10]);
    this.playTone({
      type: "triangle",
      freqStart: 320,
      freqEnd: 110,
      duration: 0.16,
      gainPeak: 0.12,
    });
  }

  /**
   * Triggered when releasing pointer on EXIT with Projected HP > 0
   */
  public playCommitPath(): void {
    this.vibrate([12, 20, 22]);
    this.playTone({
      type: "triangle",
      freqStart: 440,
      freqEnd: 440,
      duration: 0.11,
      gainPeak: 0.14,
    });
    this.playTone({
      type: "sine",
      freqStart: 659.25,
      freqEnd: 880,
      duration: 0.15,
      gainPeak: 0.15,
      delay: 0.05,
    });
  }

  /**
   * Subtle rhythmic step pulse during Auto-Battle Resolution
   */
  public playStepPulse(stepIndex: number): void {
    this.vibrate(6);
    const pitch = 115 + Math.min(stepIndex * 4, 80);
    this.playTone({
      type: "sine",
      freqStart: pitch,
      freqEnd: 58,
      duration: 0.07,
      gainPeak: 0.09,
    });
  }

  /**
   * Triggered when resolving combat against an ENEMY
   */
  public playSwordHit(usedWeapon: boolean = false): void {
    this.vibrate(usedWeapon ? [20, 15, 30] : [18, 12]);
    // Crisp metallic noise impact
    this.playNoiseBurst({
      duration: 0.11,
      gainPeak: 0.22,
      filterFreq: usedWeapon ? 2400 : 1400,
      filterType: "bandpass",
      q: 2.2,
    });
    // Low impact punch
    this.playTone({
      type: "sawtooth",
      freqStart: usedWeapon ? 420 : 260,
      freqEnd: 65,
      duration: 0.13,
      gainPeak: 0.18,
    });
    if (usedWeapon) {
      this.playTone({
        type: "triangle",
        freqStart: 920,
        freqEnd: 310,
        duration: 0.1,
        gainPeak: 0.14,
        delay: 0.02,
      });
    }
  }

  /**
   * Triggered when picking up a SHIELD node
   */
  public playShieldClink(): void {
    this.vibrate(14);
    this.playTone({
      type: "triangle",
      freqStart: 783.99, // G5
      freqEnd: 780,
      duration: 0.14,
      gainPeak: 0.14,
    });
    this.playTone({
      type: "sine",
      freqStart: 1174.66, // D6
      freqEnd: 1180,
      duration: 0.18,
      gainPeak: 0.12,
      delay: 0.03,
    });
  }

  /**
   * Triggered when GLASS_ARMOR shatters shield on every 3rd step
   */
  public playGlassShatter(): void {
    this.vibrate([12, 10, 12]);
    this.playNoiseBurst({
      duration: 0.14,
      gainPeak: 0.18,
      filterFreq: 3800,
      filterType: "highpass",
      q: 3.0,
    });
    this.playTone({
      type: "sine",
      freqStart: 1960,
      freqEnd: 1120,
      duration: 0.09,
      gainPeak: 0.1,
    });
    this.playTone({
      type: "triangle",
      freqStart: 1540,
      freqEnd: 880,
      duration: 0.11,
      gainPeak: 0.09,
      delay: 0.03,
    });
  }

  /**
   * Triggered when picking up a WEAPON (Sword) node or triggering MOMENTUM
   */
  public playWeaponPickup(): void {
    this.vibrate(15);
    this.playTone({
      type: "sawtooth",
      freqStart: 310,
      freqEnd: 740,
      duration: 0.11,
      gainPeak: 0.11,
    });
    this.playNoiseBurst({
      duration: 0.08,
      gainPeak: 0.12,
      filterFreq: 3200,
      filterType: "highpass",
      delay: 0.02,
    });
  }

  /**
   * Triggered when picking up a POTION node (or taking poison under BLOOD_GOLD)
   */
  public playPotionEffect(isPoisoned: boolean = false): void {
    if (isPoisoned) {
      this.vibrate([20, 15, 20]);
      this.playTone({
        type: "sawtooth",
        freqStart: 220,
        freqEnd: 130,
        duration: 0.14,
        gainPeak: 0.14,
      });
      return;
    }

    this.vibrate(12);
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((freq, idx) => {
      this.playTone({
        type: "sine",
        freqStart: freq,
        freqEnd: freq * 1.02,
        duration: 0.1,
        gainPeak: 0.12,
        delay: idx * 0.035,
      });
    });
  }

  /**
   * Triggered when picking up GOLD (with ascending pitch chime for consecutive GOLD combos)
   */
  public playGoldPickup(comboCount: number = 1): void {
    this.vibrate(comboCount >= 2 ? [12, 16, 18] : 10);
    // Ascending pitch multiplier for consecutive gold combos (x1, x2, x3, x4+)
    const comboStep = Math.max(0, Math.min(comboCount - 1, 5));
    const semitoneBoost = Math.pow(1.059463, comboStep * 2); // whole-tone steps up per combo
    const baseA = 987.77 * semitoneBoost; // B5+
    const baseB = 1318.51 * semitoneBoost; // E6+

    this.playTone({
      type: "sine",
      freqStart: baseA,
      freqEnd: baseA,
      duration: 0.08,
      gainPeak: 0.13,
    });
    this.playTone({
      type: "sine",
      freqStart: baseB,
      freqEnd: baseB * (comboCount >= 2 ? 1.04 : 1),
      duration: 0.17,
      gainPeak: 0.14,
      delay: 0.045,
    });

    if (comboCount >= 2) {
      // Extra sparkling harmonic overtone on combo x2, x3+
      this.playTone({
        type: "triangle",
        freqStart: baseB * 1.25,
        freqEnd: baseB * 1.5,
        duration: 0.18,
        gainPeak: 0.11,
        delay: 0.085,
      });
    }
  }

  /**
   * Triggered when illuminating the 4-cell Scout Hint path
   */
  public playHintReveal(): void {
    this.vibrate([10, 20, 14]);
    const notes = [587.33, 739.99, 880, 1174.66]; // D5, F#5, A5, D6
    notes.forEach((freq, idx) => {
      this.playTone({
        type: "sine",
        freqStart: freq,
        freqEnd: freq * 1.01,
        duration: 0.16,
        gainPeak: 0.1,
        delay: idx * 0.045,
      });
    });
  }

  /**
   * Triggered when reaching the EXIT portal during resolution (Portal Burst)
   */
  public playPortalBurst(): void {
    this.vibrate([15, 20, 30]);
    const notes = [440, 554.37, 659.25, 880, 1108.73];
    notes.forEach((freq, idx) => {
      this.playTone({
        type: idx % 2 === 0 ? "sine" : "triangle",
        freqStart: freq,
        freqEnd: freq * 1.06,
        duration: 0.22,
        gainPeak: 0.11,
        delay: idx * 0.03,
      });
    });
  }

  /**
   * Triggered when crossing a TRAP cell
   */
  public playTrapEffect(dodgedDiagonally: boolean): void {
    if (dodgedDiagonally) {
      this.vibrate(10);
      this.playTone({
        type: "sine",
        freqStart: 480,
        freqEnd: 860,
        duration: 0.09,
        gainPeak: 0.11,
      });
      return;
    }

    this.vibrate([30, 15, 35]);
    this.playNoiseBurst({
      duration: 0.12,
      gainPeak: 0.2,
      filterFreq: 950,
      filterType: "bandpass",
    });
    this.playTone({
      type: "sawtooth",
      freqStart: 195,
      freqEnd: 62,
      duration: 0.16,
      gainPeak: 0.2,
    });
  }

  /**
   * Triggered on clearing Floor 1 or Floor 2
   */
  public playFloorClear(): void {
    this.vibrate([15, 25, 20, 25, 35]);
    const chord = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    chord.forEach((freq, idx) => {
      this.playTone({
        type: "triangle",
        freqStart: freq,
        freqEnd: freq,
        duration: 0.26,
        gainPeak: 0.12,
        delay: idx * 0.055,
      });
    });
  }

  /**
   * Triggered on completing Floor 3 (Dungeon Victory)
   */
  public playVictoryChord(): void {
    this.vibrate([20, 30, 20, 30, 50, 40, 80]);
    const notes = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      this.playTone({
        type: idx % 2 === 0 ? "triangle" : "sine",
        freqStart: freq,
        freqEnd: freq,
        duration: 0.48,
        gainPeak: 0.12,
        delay: idx * 0.06,
      });
    });
  }

  /**
   * Soft, soothing harp/marimba arpeggio chime when a Mosaic Gem or Bloomed Briar flies to the Sanctuary Mosaic Bar
   */
  public playSanctuaryHarpChime(comboStep: number = 1): void {
    this.vibrate(10);
    const pentatonicHz = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66];
    const baseIdx = Math.min(Math.max(0, comboStep - 1), pentatonicHz.length - 3);
    const chord = [
      pentatonicHz[baseIdx],
      pentatonicHz[baseIdx + 1],
      pentatonicHz[baseIdx + 2],
    ];
    chord.forEach((freq, idx) => {
      this.playTone({
        type: "sine",
        freqStart: freq,
        freqEnd: freq * 1.015,
        duration: 0.22,
        gainPeak: 0.11,
        delay: idx * 0.04,
      });
      this.playTone({
        type: "triangle",
        freqStart: freq * 2,
        freqEnd: freq * 2,
        duration: 0.14,
        gainPeak: 0.04,
        delay: idx * 0.04 + 0.01,
      });
    });
  }

  /**
   * Triggered when Hero HP drops to 0 during resolution
   */
  public playDefeatSound(): void {
    this.vibrate([50, 30, 70, 30, 110]);
    const notes = [196.0, 174.61, 146.83, 110.0];
    notes.forEach((freq, idx) => {
      this.playTone({
        type: "sawtooth",
        freqStart: freq,
        freqEnd: freq * 0.92,
        duration: 0.24,
        gainPeak: 0.13,
        delay: idx * 0.09,
      });
    });
  }
}

export const soundEngine = new SoundAndHapticsEngine();

