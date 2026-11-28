// Picking exact cards: a card position you tap, and the whole deck in a dialog.
import { useEffect, useRef } from 'react';
import { rankOf, RANKS, SUITS, type Card } from '../engine/cards';
import { PlayingCard } from './PlayingCard';

export type Slot = Card | null;

/** A tappable card position; empty means "random". */
export function CardSlot({ card, label, onClick }: { card: Slot; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={card === null ? `${label}, random` : label} className="rounded-lg transition hover:-translate-y-0.5">
      {card === null ? (
        <span className="flex h-11 w-8 items-center justify-center rounded-md border border-dashed border-white/35 bg-black/30 text-[15px] text-white/40 sm:h-[4.6rem] sm:w-[3.3rem] sm:rounded-lg sm:text-xl">
          ?
        </span>
      ) : (
        <>
          <span className="block sm:hidden">
            <PlayingCard card={card} size="sm" />
          </span>
          <span className="hidden sm:block">
            <PlayingCard card={card} size="md" />
          </span>
        </>
      )}
    </button>
  );
}

/** The whole deck in a dialog; cards already on the table are greyed out. */
export function DeckDialog({ title, used, current, onPick, onRemove, onClose }: { title: string; used: Set<Card>; current: Slot; onPick: (c: Card) => void; onRemove: () => void; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto w-[min(40rem,calc(100%-1rem))] rounded-[14px] bg-[var(--bg-second)] p-3 text-[var(--text-primary)] backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-headline">{title}</span>
        <span className="flex gap-4 text-[15px]">
          {current !== null && (
            <button type="button" onClick={onRemove} className="min-h-11 text-rose-400">
              Make Random
            </button>
          )}
          <button type="button" onClick={onClose} className="min-h-11 font-semibold text-[var(--accent-soft)]">
            Done
          </button>
        </span>
      </div>
      <div className="space-y-1">
        {[0, 1, 2, 3].map((suit) => (
          <div key={suit} className="grid gap-0.5 sm:gap-1" style={{ gridTemplateColumns: 'repeat(13, minmax(0, 1fr))' }}>
            {Array.from({ length: 13 }, (_, k) => (12 - k) * 4 + suit).map((card) => (
              <button
                key={card}
                type="button"
                disabled={used.has(card)}
                onClick={() => onPick(card)}
                aria-label={`${RANKS[rankOf(card)]}${SUITS[suit]}`}
                className={`flex h-11 flex-col items-center justify-center rounded-[5px] bg-white text-[12px] leading-none font-semibold disabled:opacity-20 sm:h-14 sm:text-[16px] ${
                  suit === 1 || suit === 2 ? 'text-rose-600' : 'text-zinc-900'
                }`}
              >
                <span>{RANKS[rankOf(card)].replace('T', '10')}</span>
                <span>{SUITS[suit]}</span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </dialog>
  );
}
