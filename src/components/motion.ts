// Web Animations helpers shared by cards and chips. Durations scale with the table speed setting.

let speed = 1;
let enabled = true;
export const setMotion = (on: boolean, s: number) => {
  enabled = on;
  speed = s;
};
export const motionOn = () => enabled;
/** Milliseconds at the current speed. */
export const ms = (n: number) => n / speed;

/** OS-level Reduce Motion: no travel, things fade in where they land. */
export const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

// Keys already animated, so a hand isn't re-dealt when you come back to the tab.
const seen = new Set<string>();
/** Whether `key` is still due its first animation (doesn't mark it). */
export const pending = (key: string) => enabled && !seen.has(key);
export function firstTime(key: string) {
  if (seen.has(key)) return false;
  seen.add(key);
  if (seen.size > 4000) seen.clear();
  return true;
}

const center = (el: Element) => {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};

/** Animate `el` arriving from `from` (an element or selector). */
export function flyIn(
  el: HTMLElement,
  from: Element | string | null,
  opts: { delay?: number; duration?: number; rotate?: number; scale?: number; easing?: string } = {},
) {
  if (!enabled || !el.animate) return;
  const src = typeof from === 'string' ? document.querySelector(from) : from;
  const delay = ms(opts.delay ?? 0);
  if (reducedMotion() || !src) return el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, delay, easing: 'ease-out', fill: 'backwards' });
  const a = center(el);
  const b = center(src);
  return el.animate(
    [
      { transform: `translate(${b.x - a.x}px, ${b.y - a.y}px) rotate(${opts.rotate ?? 0}deg) scale(${opts.scale ?? 0.6})`, opacity: 0.3 },
      { transform: 'none', opacity: 1 },
    ],
    { duration: ms(opts.duration ?? 380), delay, easing: opts.easing ?? 'cubic-bezier(0.2, 0.75, 0.25, 1)', fill: 'backwards' },
  );
}

/** Animate `el` leaving toward `to` and fading out; it stays hidden afterwards. */
export function flyOut(el: HTMLElement, to: Element | string | null, opts: { delay?: number; duration?: number; rotate?: number } = {}) {
  if (!el.animate) return;
  const dst = typeof to === 'string' ? document.querySelector(to) : to;
  const delay = enabled ? ms(opts.delay ?? 0) : 0;
  const duration = enabled ? ms(opts.duration ?? 420) : 1;
  if (reducedMotion() || !dst) return el.animate([{ opacity: 1 }, { opacity: 0 }], { duration, delay, fill: 'forwards' });
  const a = center(el);
  const b = center(dst);
  return el.animate(
    [
      { transform: 'none', opacity: 1 },
      { transform: `translate(${b.x - a.x}px, ${b.y - a.y}px) rotate(${opts.rotate ?? 0}deg) scale(0.5)`, opacity: 0 },
    ],
    { duration, delay, easing: 'cubic-bezier(0.4, 0, 0.6, 1)', fill: 'forwards' },
  );
}

/** Quick turn-over for a card that becomes face up. */
export function flip(el: HTMLElement) {
  if (!enabled || !el.animate) return;
  el.animate(reducedMotion() ? [{ opacity: 0.2 }, { opacity: 1 }] : [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], {
    duration: ms(260),
    easing: 'ease-out',
  });
}

/** A short pop, for all-in badges and winners. */
export function pop(el: HTMLElement) {
  if (!enabled || !el.animate || reducedMotion()) return;
  el.animate([{ transform: 'scale(0.4)', opacity: 0 }, { transform: 'scale(1.15)', opacity: 1, offset: 0.6 }, { transform: 'scale(1)' }], {
    duration: ms(420),
    easing: 'ease-out',
  });
}

/** A pile settling after chips land on it (or leave it). */
export function bump(el: HTMLElement, grow: boolean) {
  if (!enabled || !el.animate || reducedMotion()) return;
  el.animate(
    grow
      ? [{ transform: 'scale(1)' }, { transform: 'scale(1.25) translateY(-2px)' }, { transform: 'scale(1)' }]
      : [{ transform: 'none' }, { transform: 'translateY(2px) scaleY(0.9)' }, { transform: 'none' }],
    { duration: ms(grow ? 380 : 220), easing: 'ease-out' },
  );
}
