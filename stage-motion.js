(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(pointer: fine)');
  const hero = document.querySelector('.hero');
  const stage = document.querySelector('.hero-stage');
  const manifesto = document.querySelector('.manifesto');
  stage.addEventListener('animationend', () => stage.classList.add('ready'), {once: true});
  if (reduced.matches) stage.classList.add('ready');
  let queued = false;
  function updateProgress() {
    queued = false;
    if (reduced.matches) return;
    const max = document.documentElement.scrollHeight - innerHeight;
    document.documentElement.style.setProperty('--reading-progress', max > 0 ? String(scrollY / max) : '0');
    const rect = manifesto.getBoundingClientRect();
    const travel = Math.max(1, rect.height - innerHeight);
    const progress = Math.max(0, Math.min(1, -rect.top / travel));
    manifesto.style.setProperty('--scene-progress', String(progress));
  }
  function schedule() { if (!queued) { queued = true; requestAnimationFrame(updateProgress); } }
  addEventListener('scroll', schedule, {passive: true});
  addEventListener('resize', schedule, {passive: true});
  reduced.addEventListener('change', () => {
    stage.style.setProperty('--tilt-x', '0deg');
    stage.style.setProperty('--tilt-y', '0deg');
    if (reduced.matches) {
      document.documentElement.style.setProperty('--reading-progress', '0');
      manifesto.style.setProperty('--scene-progress', '0');
      stage.classList.add('ready');
    } else schedule();
  });
  let pointerFrame = 0, pointerX = 0, pointerY = 0;
  hero.addEventListener('pointermove', e => {
    if (reduced.matches || !finePointer.matches || innerWidth < 1000) return;
    const rect = hero.getBoundingClientRect();
    pointerX = (e.clientX - rect.left) / rect.width - .5;
    pointerY = (e.clientY - rect.top) / rect.height - .5;
    if (pointerFrame) return;
    pointerFrame = requestAnimationFrame(() => {
      stage.style.setProperty('--tilt-x', `${(-pointerY * 5).toFixed(2)}deg`);
      stage.style.setProperty('--tilt-y', `${(pointerX * 7).toFixed(2)}deg`);
      pointerFrame = 0;
    });
  }, {passive: true});
  hero.addEventListener('pointerleave', () => {
    if (pointerFrame) cancelAnimationFrame(pointerFrame);
    pointerFrame = 0;
    stage.style.setProperty('--tilt-x', '0deg');
    stage.style.setProperty('--tilt-y', '0deg');
  });
  schedule();
})();
