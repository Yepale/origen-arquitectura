/** ORIGEN — Estación controller: INVIERNO / VERANO */

const STORAGE_KEY = 'origen-season';

export const SEASONS = {
  winter: {
    key: 'winter',
    label: 'INVIERNO',
    icon: '❄',
    desktopHero: '/images/origen_panoramic_winter_16x9.png',
    mobileHero: '/images/origen_panoramic_winter_9x16.png',
    bodyClass: 'season-winter'
  },
  summer: {
    key: 'summer',
    label: 'VERANO',
    icon: '☼',
    desktopHero: '/images/origen_panoramic_summer_16X9.png',
    mobileHero: '/images/origen_panoramic_summer_9X16.png',
    bodyClass: 'season-summer'
  }
};

export class SeasonController {
  constructor(sceneManager = null) {
    this.sceneManager = sceneManager;
    this.current = this.getInitialSeason();
    this.listeners = new Set();
  }

  getInitialSeason() {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'summer' ? 'summer' : 'winter';
  }

  get season() { return SEASONS[this.current]; }

  setSeason(key, { persist = true, animate = true } = {}) {
    if (!SEASONS[key] || key === this.current) return false;
    const previous = this.current;
    this.current = key;
    if (persist) localStorage.setItem(STORAGE_KEY, key);

    document.body.classList.remove('season-winter', 'season-summer');
    document.body.classList.add(SEASONS[key].bodyClass);
    document.documentElement.dataset.season = key;

    this.applyLandingBackground(key, animate);
    this.sceneManager?.setSeason?.(key, { animate });
    this.listeners.forEach(listener => listener(SEASONS[key], SEASONS[previous]));
    return true;
  }

  toggle({ animate = true } = {}) {
    return this.setSeason(this.current === 'winter' ? 'summer' : 'winter', { animate });
  }

  applyLandingBackground(key, animate = true) {
    const bg = document.getElementById('hero-bg');
    if (!bg) return;
    const season = SEASONS[key];
    const source = window.matchMedia('(max-width: 768px)').matches ? season.mobileHero : season.desktopHero;
    const apply = () => { bg.style.backgroundImage = `url("${source}")`; };
    if (!animate) return apply();
    bg.classList.add('season-crossfade');
    window.setTimeout(() => { apply(); bg.classList.remove('season-crossfade'); }, 220);
  }

  subscribe(listener) { this.listeners.add(listener); return () => this.listeners.delete(listener); }

  init() {
    document.body.classList.remove('season-winter', 'season-summer');
    document.body.classList.add(this.season.bodyClass);
    document.documentElement.dataset.season = this.current;
    this.applyLandingBackground(this.current, false);
    this.sceneManager?.setSeason?.(this.current, { animate: false });
  }
}
