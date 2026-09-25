// Procedural Web Audio Engine & Voice Synthesizer
// Zero external asset loading issues - works 100% offline and in all browsers

class DesiAudioEngine {
  constructor() {
    this.ctx = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.isEngineRunning = false;
    this.musicPlaying = false;
    this.bgmTimer = null;
    this.melodyTimer = null;
    this.isMuted = false;
    this.planeAudio = null;
    this.whooshGain = null;
    this.whooshOsc = null;
    this.rumbleOsc = null;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended' && !this.isMuted) {
      this.ctx.resume().catch(() => {});
    }
  }

  toggleMute() {
    this.init();
    this.isMuted = !this.isMuted;
    if (this.ctx) {
      if (this.isMuted) {
        this.ctx.suspend();
      } else {
        this.ctx.resume();
      }
    }
    if (this.isMuted && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    return this.isMuted;
  }

  // Supersonic Rocket Paper Plane Whoosh (Plays BOTH HTML5 Audio and WebAudio)
  playPlaneWhoosh() {
    if (this.isMuted) return;

    // 1. Play real stereophonic WAV file
    try {
      if (!this.planeAudio) {
        this.planeAudio = new Audio('/assets/plane_whoosh.wav');
        this.planeAudio.preload = 'auto';
      }
      this.planeAudio.volume = 0.85;
      this.planeAudio.currentTime = 0;
      const p = this.planeAudio.play();
      if (p !== undefined) {
        p.catch(() => {});
      }
    } catch (e) {}

    // 2. Also start WebAudio synthesis as companion/fallback
    this.playWhoosh();
  }

  // Stop whoosh immediately when plane flight ends (ensures zero sound on landing page!)
  stopPlaneWhoosh() {
    if (this.planeAudio) {
      try {
        this.planeAudio.pause();
        this.planeAudio.currentTime = 0;
      } catch (e) {}
    }
    this.stopWhoosh();
  }

  playWhoosh() {
    this.init();
    if (this.isMuted) return;
    this.stopWhoosh();

    if (this.ctx && this.ctx.state === 'suspended') {
      try {
        this.ctx.resume().catch(() => {});
      } catch (e) {}
    }

    try {
      const t = this.ctx.currentTime;
      this.whooshGain = this.ctx.createGain();
      this.whooshGain.gain.setValueAtTime(0.01, t);
      this.whooshGain.gain.linearRampToValueAtTime(0.35, t + 0.4);
      this.whooshGain.gain.linearRampToValueAtTime(0.4, t + 1.2);
      this.whooshGain.gain.exponentialRampToValueAtTime(0.001, t + 2.2);
      this.whooshGain.connect(this.ctx.destination);

      // 1. Aerodynamic wind & supersonic whistle
      this.whooshOsc = this.ctx.createOscillator();
      this.whooshOsc.type = 'sawtooth';
      this.whooshOsc.frequency.setValueAtTime(140, t);
      this.whooshOsc.frequency.exponentialRampToValueAtTime(320, t + 0.6);
      this.whooshOsc.frequency.exponentialRampToValueAtTime(1100, t + 1.3);
      this.whooshOsc.frequency.exponentialRampToValueAtTime(220, t + 2.2);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(450, t);
      filter.frequency.exponentialRampToValueAtTime(1800, t + 1.3);
      filter.Q.setValueAtTime(2.8, t);

      this.whooshOsc.connect(filter);
      filter.connect(this.whooshGain);
      this.whooshOsc.start(t);

      // 2. Rocket thruster low-frequency rumble
      this.rumbleOsc = this.ctx.createOscillator();
      this.rumbleOsc.type = 'triangle';
      this.rumbleOsc.frequency.setValueAtTime(75, t);
      this.rumbleOsc.frequency.linearRampToValueAtTime(115, t + 1.1);
      this.rumbleOsc.frequency.exponentialRampToValueAtTime(45, t + 2.2);

      this.rumbleOsc.connect(this.whooshGain);
      this.rumbleOsc.start(t);
    } catch (e) {}
  }

  stopWhoosh() {
    if (this.whooshGain && this.ctx) {
      try {
        const t = this.ctx.currentTime;
        this.whooshGain.gain.cancelScheduledValues(t);
        this.whooshGain.gain.setValueAtTime(0.0001, t);
      } catch (e) {}
    }
    if (this.whooshOsc) {
      try { this.whooshOsc.stop(); } catch (e) {}
      this.whooshOsc = null;
    }
    if (this.rumbleOsc) {
      try { this.rumbleOsc.stop(); } catch (e) {}
      this.rumbleOsc = null;
    }
    this.whooshGain = null;
  }

  // Realistic Dual-Tone Bajaj Chetak Scooter Horn (Peeeee-Poooon!)
  playHorn() {
    this.init();
    const t = this.ctx.currentTime;
    
    [390, 470].forEach(freq => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.linearRampToValueAtTime(freq + 15, t + 0.08);
      osc.frequency.linearRampToValueAtTime(freq - 10, t + 0.35);

      gain.gain.setValueAtTime(0.01, t);
      gain.gain.linearRampToValueAtTime(0.3, t + 0.03);
      gain.gain.setValueAtTime(0.28, t + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.42);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(750, t);
      filter.Q.setValueAtTime(2.5, t);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.42);
    });
  }

  // Tire Skid / Screech Sound before crash
  playTireScreech() {
    this.init();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(950, t);
    osc.frequency.linearRampToValueAtTime(1400, t + 0.15);
    osc.frequency.linearRampToValueAtTime(600, t + 0.45);

    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.4, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1100, t);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.5);
  }

  // Heavy Metallic Crash & Smash Sound
  playMetalCrash() {
    this.init();
    const t = this.ctx.currentTime;

    // 1. Heavy low impact boom
    const boom = this.ctx.createOscillator();
    const boomGain = this.ctx.createGain();
    boom.type = 'triangle';
    boom.frequency.setValueAtTime(220, t);
    boom.frequency.exponentialRampToValueAtTime(30, t + 0.4);
    boomGain.gain.setValueAtTime(0.9, t);
    boomGain.gain.exponentialRampToValueAtTime(0.01, t + 0.45);
    boom.connect(boomGain);
    boomGain.connect(this.ctx.destination);
    boom.start(t);
    boom.stop(t + 0.45);

    // 2. High metallic scrape / crunch
    const noise = this.ctx.createOscillator();
    const noiseGain = this.ctx.createGain();
    noise.type = 'square';
    noise.frequency.setValueAtTime(750, t);
    noise.frequency.linearRampToValueAtTime(180, t + 0.35);
    noiseGain.gain.setValueAtTime(0.6, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
    noise.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    noise.start(t);
    noise.stop(t + 0.4);
  }

  // Startled / Alarmed Cow Moo on Impact
  playCowAlarmed() {
    this.init();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.linearRampToValueAtTime(190, t + 0.2);
    osc.frequency.linearRampToValueAtTime(90, t + 0.8);

    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.6, t + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(650, t);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.9);
  }

  // Muddy Splash Sound
  playSplash() {
    this.init();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.35);
    gain.gain.setValueAtTime(0.7, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.35);
  }

  playBrickThud() {
    this.init();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.2);
    gain.gain.setValueAtTime(0.8, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.22);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.22);
  }

  playPlankSnap() {
    this.init();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.25);
    gain.gain.setValueAtTime(0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.25);
  }

  playCowMoo() {
    this.init();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(105, t);
    osc.frequency.linearRampToValueAtTime(125, t + 0.5);
    osc.frequency.linearRampToValueAtTime(80, t + 1.4);
    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.45, t + 0.2);
    gain.gain.linearRampToValueAtTime(0.35, t + 0.9);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, t);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 1.5);
  }

  startScooterEngine() {
    this.init();
    if (this.isEngineRunning) return;
    this.isEngineRunning = true;
    this.engineOsc = this.ctx.createOscillator();
    this.engineGain = this.ctx.createGain();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.setValueAtTime(50, this.ctx.currentTime);
    this.engineGain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(340, this.ctx.currentTime);
    this.engineOsc.connect(filter);
    filter.connect(this.engineGain);
    this.engineGain.connect(this.ctx.destination);
    this.engineOsc.start();
  }

  setEngineSpeed(speedRatio) {
    if (!this.engineOsc || !this.isEngineRunning) return;
    const baseFreq = 50;
    const targetFreq = baseFreq + speedRatio * 90;
    this.engineOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.08);
  }

  stopScooterEngine() {
    if (!this.isEngineRunning) return;
    if (this.engineGain) {
      this.engineGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
    }
    setTimeout(() => {
      if (this.engineOsc) {
        try { this.engineOsc.stop(); } catch(e) {}
      }
      this.isEngineRunning = false;
    }, 180);
  }

  playJugaadSuccess() {
    this.init();
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25];
    const t = this.ctx.currentTime;
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * 0.08);
      gain.gain.setValueAtTime(0.3, t + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.01, t + idx * 0.08 + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t + idx * 0.08);
      osc.stop(t + idx * 0.08 + 0.35);
    });
  }

  startDesiBGM() {
    this.init();
    if (this.musicPlaying) return;
    this.musicPlaying = true;

    const scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33];
    const melodyPattern = [0, 2, 4, 3, 2, 4, 5, 4, 3, 2, 1, 0];
    let melIndex = 0;

    this.melodyTimer = setInterval(() => {
      if (!this.musicPlaying) return;
      const t = this.ctx.currentTime;
      const noteFreq = scale[melodyPattern[melIndex % melodyPattern.length]];
      melIndex++;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(noteFreq, t);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.09, t + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1100, t);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.75);
    }, 700);

    const tempo = 100;
    const beatInterval = (60 / tempo) * 1000;
    let step = 0;

    this.bgmTimer = setInterval(() => {
      if (!this.musicPlaying) return;
      const t = this.ctx.currentTime;

      if (step % 2 === 0) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(step % 4 === 0 ? 85 : 105, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.16);
        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.005, t + 0.18);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.18);
      }

      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(step % 2 === 0 ? 350 : 420, t);
      gain2.gain.setValueAtTime(0.04, t);
      gain2.gain.exponentialRampToValueAtTime(0.002, t + 0.08);
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(t);
      osc2.stop(t + 0.08);

      step++;
    }, beatInterval / 2);
  }

  speak(text, speaker = 'Chacha') {
    // Human voice completely disabled - dialogues appear cleanly in comic text box
    if ('speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
    }
  }
}

export const audio = new DesiAudioEngine();
