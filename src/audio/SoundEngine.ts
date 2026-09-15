// Procedural Sound Engine using Web Audio API
// Generates realistic, physical sound effects without external audio files.

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;
  private rollingGain: GainNode | null = null;
  private rollingFilter: BiquadFilterNode | null = null;
  private rollingSource: AudioBufferSourceNode | null = null;
  private fanGain: GainNode | null = null;
  private fanSource: AudioBufferSourceNode | null = null;
  private isRollingActive: boolean = false;

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  private initContext() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.isMuted ? 0 : 0.7;
      this.masterGain.connect(this.ctx.destination);

      this.setupRollingSound();
      this.setupFanSound();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.7, this.ctx?.currentTime || 0, 0.05);
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  // Generate pink/white noise buffer
  private createNoiseBuffer(durationSeconds = 2): AudioBuffer {
    if (!this.ctx) throw new Error("Context not ready");
    const bufferSize = this.ctx.sampleRate * durationSeconds;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
    return buffer;
  }

  // Loop for continuous marble rolling sound
  private setupRollingSound() {
    if (!this.ctx || !this.masterGain) return;
    try {
      const noiseBuffer = this.createNoiseBuffer(2);
      this.rollingSource = this.ctx.createBufferSource();
      this.rollingSource.buffer = noiseBuffer;
      this.rollingSource.loop = true;

      this.rollingFilter = this.ctx.createBiquadFilter();
      this.rollingFilter.type = 'bandpass';
      this.rollingFilter.frequency.value = 800;
      this.rollingFilter.Q.value = 3.0;

      this.rollingGain = this.ctx.createGain();
      this.rollingGain.gain.value = 0;

      this.rollingSource.connect(this.rollingFilter);
      this.rollingFilter.connect(this.rollingGain);
      this.rollingGain.connect(this.masterGain);

      this.rollingSource.start(0);
    } catch {
      // Ignore if cannot start immediately
    }
  }

  // Marble rolling sound modulation
  public updateRollingSound(speed: number, isGrounded: boolean) {
    if (!this.ctx || !this.rollingGain || !this.rollingFilter) return;
    const now = this.ctx.currentTime;
    if (!isGrounded || speed < 0.2) {
      this.rollingGain.gain.setTargetAtTime(0, now, 0.05);
      return;
    }

    const normSpeed = Math.min(speed / 15, 1.0);
    const targetGain = normSpeed * 0.25;
    const targetFreq = 400 + normSpeed * 1200;

    this.rollingGain.gain.setTargetAtTime(targetGain, now, 0.03);
    this.rollingFilter.frequency.setTargetAtTime(targetFreq, now, 0.03);
  }

  // Fan background hum
  private setupFanSound() {
    if (!this.ctx || !this.masterGain) return;
    try {
      const noiseBuffer = this.createNoiseBuffer(3);
      this.fanSource = this.ctx.createBufferSource();
      this.fanSource.buffer = noiseBuffer;
      this.fanSource.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 350;

      this.fanGain = this.ctx.createGain();
      this.fanGain.gain.value = 0;

      this.fanSource.connect(filter);
      filter.connect(this.fanGain);
      this.fanGain.connect(this.masterGain);

      this.fanSource.start(0);
    } catch {
      // Ignore
    }
  }

  public setFanActive(hasFansRunning: boolean) {
    if (!this.ctx || !this.fanGain) return;
    const now = this.ctx.currentTime;
    this.fanGain.gain.setTargetAtTime(hasFansRunning ? 0.08 : 0, now, 0.2);
  }

  // Wood & Marble collision (コツン / カチャッ)
  public playWoodImpact(velocity: number) {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const volume = Math.min(Math.max(velocity / 12, 0.05), 1.0) * 0.4;

    // Resonant wooden body
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    const baseFreq = 650 + Math.random() * 150;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.4, now + 0.06);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(baseFreq, now);
    filter.Q.value = 6;

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.07);
  }

  // Domino topple click & clatter (リアルなドミノの「カタッ」「パタッ」という小気味よい硬質衝突音)
  public playDominoClick(velocity: number = 5) {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const volume = Math.min(Math.max(velocity / 6, 0.25), 1.0) * 0.48;

    // 1. Sharp high-frequency transient click (硬質なアタック音)
    const clickOsc = this.ctx.createOscillator();
    const clickGain = this.ctx.createGain();
    const clickFilter = this.ctx.createBiquadFilter();

    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(2800 + Math.random() * 800, now);
    clickOsc.frequency.exponentialRampToValueAtTime(1200, now + 0.012);

    clickFilter.type = 'highpass';
    clickFilter.frequency.setValueAtTime(1400, now);

    clickGain.gain.setValueAtTime(volume * 0.8, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);

    clickOsc.connect(clickFilter);
    clickFilter.connect(clickGain);
    clickGain.connect(this.masterGain);

    clickOsc.start(now);
    clickOsc.stop(now + 0.02);

    // 2. Woody resonant body tone (木製・アクリル製ドミノ特有の乾いた胴鳴り)
    const bodyOsc = this.ctx.createOscillator();
    const bodyGain = this.ctx.createGain();
    const bodyFilter = this.ctx.createBiquadFilter();

    // Natural slight pitch variation (1150Hz - 1500Hz) so consecutive pieces create a rhythmic clatter
    const baseFreq = 1200 + Math.random() * 320;
    bodyOsc.type = 'sine';
    bodyOsc.frequency.setValueAtTime(baseFreq, now);
    bodyOsc.frequency.exponentialRampToValueAtTime(baseFreq * 0.65, now + 0.035);

    bodyFilter.type = 'bandpass';
    bodyFilter.frequency.setValueAtTime(baseFreq, now);
    bodyFilter.Q.setValueAtTime(3.5, now);

    bodyGain.gain.setValueAtTime(volume * 0.9, now);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    bodyOsc.connect(bodyFilter);
    bodyFilter.connect(bodyGain);
    bodyGain.connect(this.masterGain);

    bodyOsc.start(now);
    bodyOsc.stop(now + 0.045);

    // 3. Subtle low-end tactile thud (コトッという重量感)
    const thudOsc = this.ctx.createOscillator();
    const thudGain = this.ctx.createGain();
    thudOsc.type = 'triangle';
    thudOsc.frequency.setValueAtTime(320 + Math.random() * 60, now);
    thudOsc.frequency.exponentialRampToValueAtTime(110, now + 0.025);

    thudGain.gain.setValueAtTime(volume * 0.5, now);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

    thudOsc.connect(thudGain);
    thudGain.connect(this.masterGain);

    thudOsc.start(now);
    thudOsc.stop(now + 0.03);
  }

  // Spring Bounce "ボヨヨ〜ン"
  public playSpringBoing(velocity: number = 8) {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const volume = Math.min(Math.max(velocity / 10, 0.2), 1.0) * 0.5;

    // Carrier Oscillator
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Pitch sweep: fast bend up then wobbling decay
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(480, now + 0.08);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.35);

    // Modulation oscillator for "boing" vibrato
    const mod = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    mod.type = 'sine';
    mod.frequency.setValueAtTime(22, now); // 22Hz flutter
    modGain.gain.setValueAtTime(45, now);
    modGain.gain.exponentialRampToValueAtTime(5, now + 0.35);

    mod.connect(osc.frequency);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    osc.connect(gain);
    gain.connect(this.masterGain);

    mod.start(now);
    osc.start(now);
    mod.stop(now + 0.4);
    osc.stop(now + 0.4);
  }

  // Water Splash "ポチャッ！ピチャッ"
  public playWaterSplash(velocity: number = 6) {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const volume = Math.min(Math.max(velocity / 10, 0.1), 1.0) * 0.45;

    // Noise splash element
    const noiseBuffer = this.createNoiseBuffer(0.3);
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(1200, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(400, now + 0.2);
    noiseFilter.Q.value = 2.0;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(volume * 0.7, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    noiseSource.start(now);
    noiseSource.stop(now + 0.25);

    // Water bubble pops (2-3 chirps)
    for (let i = 0; i < 3; i++) {
      const bubbleOsc = this.ctx.createOscillator();
      const bubbleGain = this.ctx.createGain();
      const delay = now + 0.03 * i + Math.random() * 0.02;

      bubbleOsc.type = 'sine';
      const startF = 350 + Math.random() * 200;
      bubbleOsc.frequency.setValueAtTime(startF, delay);
      bubbleOsc.frequency.exponentialRampToValueAtTime(startF * 2.2, delay + 0.07);

      bubbleGain.gain.setValueAtTime(0, delay);
      bubbleGain.gain.linearRampToValueAtTime(volume * 0.6, delay + 0.01);
      bubbleGain.gain.exponentialRampToValueAtTime(0.001, delay + 0.08);

      bubbleOsc.connect(bubbleGain);
      bubbleGain.connect(this.masterGain);

      bubbleOsc.start(delay);
      bubbleOsc.stop(delay + 0.09);
    }
  }

  // Metal / Magnet snap (カチン)
  public playMetalSnap(velocity: number = 5) {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const volume = Math.min(Math.max(velocity / 8, 0.1), 1.0) * 0.4;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(2400, now);
    osc1.frequency.exponentialRampToValueAtTime(1800, now + 0.1);
    osc2.frequency.setValueAtTime(4200, now);
    osc2.frequency.exponentialRampToValueAtTime(2800, now + 0.08);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.13);
    osc2.stop(now + 0.13);
  }

  // Rubber band snap (ビシッ)
  public playRubberSnap(velocity: number = 6) {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const volume = Math.min(Math.max(velocity / 8, 0.1), 1.0) * 0.45;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.12);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  // Pitagora-style cheerful victory jingle! (ピタゴラスイッチ風ジングル)
  public playGoalJingle() {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    // Cheerful chime: C5, E5, G5, C6 (Do, Mi, Sol, High Do) with light glockenspiel harmonic
    const notes = [
      { f: 523.25, time: 0.0, dur: 0.22 },   // C5
      { f: 659.25, time: 0.14, dur: 0.22 },  // E5
      { f: 783.99, time: 0.28, dur: 0.25 },  // G5
      { f: 1046.50, time: 0.44, dur: 0.65 }  // C6 (held)
    ];

    notes.forEach((note) => {
      const osc = this.ctx!.createOscillator();
      const oscHarmonic = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      oscHarmonic.type = 'triangle';
      osc.frequency.setValueAtTime(note.f, now + note.time);
      oscHarmonic.frequency.setValueAtTime(note.f * 2, now + note.time);

      gain.gain.setValueAtTime(0, now + note.time);
      gain.gain.linearRampToValueAtTime(0.35, now + note.time + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + note.time + note.dur);

      osc.connect(gain);
      oscHarmonic.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(now + note.time);
      oscHarmonic.start(now + note.time);
      osc.stop(now + note.time + note.dur + 0.05);
      oscHarmonic.stop(now + note.time + note.dur + 0.05);
    });
  }

  // Desk Bell / Glockenspiel Chime (澄んだチーン♪音)
  public playDeskBell(noteStr: string = 'C5', velocity: number = 6) {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const volume = Math.min(Math.max(velocity / 8, 0.15), 1.0) * 0.55;

    const noteFreqs: Record<string, number> = {
      'C5': 523.25,
      'D5': 587.33,
      'E5': 659.25,
      'F5': 698.46,
      'G5': 783.99,
      'A5': 880.00,
      'B5': 987.77,
      'C6': 1046.50
    };

    const fundamental = noteFreqs[noteStr] || 523.25;

    // Metallic bell: fundamental + distinct inharmonic bell overtones (2.76x and 5.4x)
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const osc3 = this.ctx.createOscillator();

    const gain1 = this.ctx.createGain();
    const gain2 = this.ctx.createGain();
    const gain3 = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(fundamental, now);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(fundamental * 2.76, now);

    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(fundamental * 5.4, now);

    // Fundamental ring (longer decay: ~1.2s)
    gain1.gain.setValueAtTime(volume * 0.7, now);
    gain1.gain.exponentialRampToValueAtTime(0.0005, now + 1.2);

    // Minor third overtone (decay: ~0.6s)
    gain2.gain.setValueAtTime(volume * 0.35, now);
    gain2.gain.exponentialRampToValueAtTime(0.0005, now + 0.6);

    // High shimmer (decay: ~0.3s)
    gain3.gain.setValueAtTime(volume * 0.2, now);
    gain3.gain.exponentialRampToValueAtTime(0.0005, now + 0.3);

    osc1.connect(gain1);
    osc2.connect(gain2);
    osc3.connect(gain3);

    gain1.connect(this.masterGain);
    gain2.connect(this.masterGain);
    gain3.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    osc3.start(now);

    osc1.stop(now + 1.25);
    osc2.stop(now + 0.65);
    osc3.stop(now + 0.35);
  }

  // Funnel / Spiral Bowl swirl sound (シャラシャラ…陶器・ボウル回転音)
  public playFunnelSwirl(velocity: number = 4) {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const volume = Math.min(Math.max(velocity / 8, 0.1), 0.7) * 0.25;

    const noiseBuffer = this.createNoiseBuffer(0.4);
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(950, now);
    filter.frequency.exponentialRampToValueAtTime(1400, now + 0.35);
    filter.Q.value = 4.5;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
    noise.stop(now + 0.4);
  }

  // Pulley / Rope creak sound (ギギッ / キュッ)
  public playPulleyCreak(speed: number = 2) {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const volume = Math.min(Math.max(speed / 6, 0.08), 0.5) * 0.22;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320 + Math.random() * 80, now);
    osc.frequency.linearRampToValueAtTime(220, now + 0.12);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(600, now);
    filter.Q.value = 5;

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  // Catapult spoon fling sound (カツン！ピュン)
  public playCatapultLaunch(velocity: number = 8) {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const volume = Math.min(Math.max(velocity / 8, 0.2), 1.0) * 0.45;

    // Heavy wooden smack
    this.playWoodImpact(velocity * 1.5);

    // Whistle/whoosh swing
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(580, now + 0.09);
    osc.frequency.exponentialRampToValueAtTime(240, now + 0.22);

    gain.gain.setValueAtTime(volume * 0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  // Paddle Wheel light wooden ratchet click (カラッ)
  public playPaddleWheelClick(velocity: number = 3) {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const volume = Math.min(Math.max(velocity / 6, 0.05), 0.4) * 0.25;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(850 + Math.random() * 200, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.04);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  // Delicate water droplet drip sound ("ポタッ", "ピチョン")
  public playWaterDrip(volume: number = 0.25) {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const startF = 1750 + Math.random() * 400;
    osc.frequency.setValueAtTime(startF, now);
    osc.frequency.exponentialRampToValueAtTime(startF * 1.7, now + 0.04);
    osc.frequency.exponentialRampToValueAtTime(startF * 0.9, now + 0.08);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume * 0.35, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.1);
  }
}

export const soundEngine = new SoundEngine();

