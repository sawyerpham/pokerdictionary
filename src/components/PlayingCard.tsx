import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { rankLabel, suitOf, SUITS, type Card } from '../engine/cards';
import { firstTime, flip, flyIn, pending } from './motion';

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
 * A dealt card: it flies in from the deck face down the first time `animKey` mounts (after `delay` ms) and
 * turns face up when it lands, as a real deal does. It also turns over whenever `faceUp` changes.
 */
export function DealtCard({
  animKey,
  delay = 0,
  card,
  faceUp = true,
  size = 'md',
  dim,
}: {
  animKey: string;
  delay?: number;
  card: Card;
  faceUp?: boolean;
  size?: keyof typeof BOX;
  dim?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [flying, setFlying] = useState(() => pending(animKey));
  const shown = faceUp && !flying;
  const wasShown = useRef(shown);
  const flight = useRef<Animation>(undefined); // survives StrictMode's second effect run
  useLayoutEffect(() => {
    if (ref.current && firstTime(animKey)) flight.current = flyIn(ref.current, '[data-deck]', { delay, rotate: -25, scale: 0.4 });
    const a = flight.current;
    if (a && a.playState !== 'finished') a.onfinish = () => setFlying(false);
    else setFlying(false);
    // Mount only: a card is dealt once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (wasShown.current === shown) return;
    wasShown.current = shown;
    if (ref.current) flip(ref.current);
  }, [shown]);
  return (
    <div ref={ref} className="shrink-0">
      <PlayingCard card={shown ? card : undefined} size={size} dim={dim} />
    </div>
  );
}
