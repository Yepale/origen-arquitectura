/**
 * ORIGEN — Runtime performance profile.
 * Keeps the cinematic look while scaling expensive rendering work on mobile.
 */
export function getPerformanceProfile() {
  const memory = navigator.deviceMemory || 4;
  const cores = navigator.hardwareConcurrency || 4;
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || window.innerWidth < 768;
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

  const lowPower = memory <= 4 || cores <= 4;

  return {
    mobile,
    lowPower,
    reducedMotion,
    pixelRatio: Math.min(window.devicePixelRatio || 1, mobile ? (lowPower ? 1.25 : 1.5) : 2),
    shadowMap: mobile ? 1024 : 2048,
    particles: mobile ? (lowPower ? 35 : 60) : 100,
    animationScale: reducedMotion ? 0.45 : (mobile ? 0.8 : 1),
  };
}
