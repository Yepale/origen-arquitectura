/**
 * ORIGEN — Audio Engine
 * Combina la banda sonora ambiental («The Architect's Breath»)
 * con la síntesis procedimental (Web Audio API) de impactos de cantería y clímax armónico.
 */

class StoneAudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.isMuted = false;
    this.initialized = false;

    // Banda sonora
    this.bgMusic = null;
    this.musicPlaying = false;
    this.musicGain = null;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
      this.initialized = true;

      this.setupSoundtrack();
    } catch (e) {
      console.warn('AudioContext not supported or blocked:', e);
    }
  }

  setupSoundtrack() {
    try {
      this.bgMusic = new Audio('/soundtrack.mp3');
      this.bgMusic.loop = true;
      this.bgMusic.volume = 0.28;
    } catch (e) {
      console.warn('Soundtrack loading error:', e);
    }
  }

  resume() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    // Iniciar banda sonora con fade-in suave al interactuar
    this.startMusic();
  }

  startMusic() {
    if (!this.bgMusic || this.musicPlaying || this.isMuted) return;
    this.bgMusic.play()
      .then(() => {
        this.musicPlaying = true;
      })
      .catch(() => {
        // Autoplay policy: espera a siguiente interacción
      });
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.bgMusic) {
      this.bgMusic.muted = this.isMuted;
    }
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.7, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  /**
   * Sonido sutil al coger/levantar una pieza de piedra
   */
  playPick() {
    if (!this.ctx || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    const bufferSize = this.ctx.sampleRate * 0.08;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(320, t);
    filter.frequency.exponentialRampToValueAtTime(180, t + 0.08);
    filter.Q.value = 3.0;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(t);
  }

  /**
   * Sonido de imán estructural (atracción gravitatoria pétrea)
   */
  playMagnetSnap() {
    if (!this.ctx || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(420, t + 0.06);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, t);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.07);
  }

  /**
   * Sonido de encaje según la pieza:
   * 'tierra' : Impacto profundo, arenisca, resonancia grave
   * 'tiempo' : Clave angular, tono cristalino de caliza
   * 'mano'   : Fricción de cantería y golpe seco de pizarra
   */
  playLock(pieceName) {
    if (!this.ctx || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    let baseFreq = 120;
    let clickFreq = 1200;
    let decay = 0.28;
    let resonance = 260;

    if (pieceName === 'tierra') {
      baseFreq = 85;
      clickFreq = 750;
      decay = 0.35;
      resonance = 170;
    } else if (pieceName === 'tiempo') {
      baseFreq = 150;
      clickFreq = 1800;
      decay = 0.25;
      resonance = 380;
    } else if (pieceName === 'mano') {
      baseFreq = 105;
      clickFreq = 1100;
      decay = 0.3;
      resonance = 220;
    }

    // 1. Golpe de impacto grave
    const bodyOsc = this.ctx.createOscillator();
    const bodyGain = this.ctx.createGain();
    bodyOsc.type = 'triangle';
    bodyOsc.frequency.setValueAtTime(baseFreq * 1.5, t);
    bodyOsc.frequency.exponentialRampToValueAtTime(baseFreq, t + 0.08);

    bodyGain.gain.setValueAtTime(0.65, t);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, t + decay);

    bodyOsc.connect(bodyGain);
    bodyGain.connect(this.masterGain);
    bodyOsc.start(t);
    bodyOsc.stop(t + decay);

    // 2. Resonancia modal pétrea
    const resOsc = this.ctx.createOscillator();
    const resGain = this.ctx.createGain();
    resOsc.type = 'sine';
    resOsc.frequency.setValueAtTime(resonance, t);

    resGain.gain.setValueAtTime(0.35, t);
    resGain.gain.exponentialRampToValueAtTime(0.001, t + decay * 1.2);

    resOsc.connect(resGain);
    resGain.connect(this.masterGain);
    resOsc.start(t);
    resOsc.stop(t + decay * 1.2);

    // 3. Ruido de cantería / polvo mineral en el choque
    const noiseDuration = 0.05;
    const bufferSize = Math.floor(this.ctx.sampleRate * noiseDuration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(clickFreq, t);
    noiseFilter.Q.value = 2.5;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.45, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + noiseDuration);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    noise.start(t);
  }

  /**
   * Resonancia armónica dorada al completar el símbolo ORIGEN
   */
  playCompletion() {
    if (!this.ctx || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;

    const freqs = [174.61, 261.63, 392.00, 523.25, 783.99];

    freqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * 0.06);

      const dur = 2.8 + idx * 0.3;
      gain.gain.setValueAtTime(0.001, t + idx * 0.06);
      gain.gain.linearRampToValueAtTime(0.18 / (idx + 1), t + idx * 0.06 + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t + idx * 0.06);
      osc.stop(t + dur);
    });

    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(55, t);
    subOsc.frequency.exponentialRampToValueAtTime(40, t + 1.5);

    subGain.gain.setValueAtTime(0.4, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 2.0);

    subOsc.connect(subGain);
    subGain.connect(this.masterGain);
    subOsc.start(t);
    subOsc.stop(t + 2.0);
  }

  /**
   * Efecto de viento/whoosh durante el fly-through de cámara
   */
  playWhoosh() {
    if (!this.ctx || this.isMuted) return;
    this.resume();
    const t = this.ctx.currentTime;
    const dur = 1.4;

    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(150, t);
    filter.frequency.exponentialRampToValueAtTime(1800, t + 0.6);
    filter.frequency.exponentialRampToValueAtTime(80, t + dur);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.35, t + 0.6);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(t);
  }
}

export const stoneAudio = new StoneAudioEngine();
