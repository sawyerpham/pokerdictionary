import { useEffect, useLayoutEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { rankLabel, suitOf, SUITS, type Card } from '../engine/cards';
import { firstTime, flip, flyIn } from './motion';

const BOX = {
  lg: 'h-[4.6rem] w-[3.3rem] rounded-lg sm:h-24 sm:w-[4.25rem]',
  md: 'h-[3.6rem] w-[2.6rem] rounded-md sm:h-[4.6rem] sm:w-[3.3rem] sm:rounded-lg',
  sm: 'h-11 w-8 rounded-md sm:h-14 sm:w-10',
};

/** A card face, or the back when `card` is undefined. */
export function PlayingCard({ card, size = 'md', dim }: { card?: Card; size?: keyof typeof BOX; dim?: boolean }) {
  const box = BOX[size];
  if (card === undefined) {
    return (
      <div aria-label="Face-down card" className={`${box} shrink-0 border border-white/20 bg-[var(--accent-strong)] p-[3px] shadow-md shadow-black/40`}>
        <div className="h-full w-full rounded-[inherit] border border-white/25 bg-[repeating-linear-gradient(45deg,rgb(255_255_255/0.12)_0_2px,transparent_2px_7px)]" />
      </div>
    );
  }
  const suit = SUITS[suitOf(card)];
  const label = rankLabel(card);
  const red = suit === '♥' || suit === '♦';
  return (
    <div
      aria-label={`${label}${suit}`}
      className={`${box} ${red ? 'text-rose-600' : 'text-zinc-900'} ${dim ? 'brightness-50' : ''} relative shrink-0 bg-white font-semibold shadow-md shadow-black/40 transition-[filter] select-none`}
    >
      <div className="absolute top-0.5 left-1 flex flex-col items-center leading-none">
        <span className={size === 'sm' ? 'text-[11px] sm:text-[13px]' : 'text-[13px] sm:text-base'}>{label}</span>
        <span className={size === 'sm' ? 'text-[10px] sm:text-xs' : 'text-xs sm:text-sm'}>{suit}</span>
      </div>
      {size !== 'sm' && (
        <span className="absolute inset-0 flex items-center justify-center pt-2 text-2xl sm:text-3xl">{suit}</span>
      )}
    </div>
  );
}

/**
 * Wraps a card so it flies in from the deck the first time `animKey` mounts (after `delay` ms), and
 * turns over when `faceUp` changes.
 */
export function DealtCard({ animKey, delay = 0, faceUp = true, children }: { animKey: string; delay?: number; faceUp?: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const wasFaceUp = useRef(faceUp);
  useLayoutEffect(() => {
    if (ref.current && firstTime(animKey)) flyIn(ref.current, '[data-deck]', { delay, rotate: -25, scale: 0.4 });
    // Mount only: a card is dealt once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (wasFaceUp.current === faceUp) return;
    wasFaceUp.current = faceUp;
    if (ref.current) flip(ref.current);
  }, [faceUp]);
  return (
    <div ref={ref} className="shrink-0">
      {children}
    </div>
  );
}
