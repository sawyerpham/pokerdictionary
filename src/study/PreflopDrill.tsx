import { useEffect, useState } from 'react';
import { PlayingCard } from '../components/PlayingCard';
import { SourceLink } from '../components/SourceLink';
import { handName, shuffledDeck } from '../engine/cards';
import { SeatTable } from '../guides/diagrams';
import { around, HandRangeGrid, openingRange } from '../guides/Preflop';
import { SEATS } from '../guides/rfi';
import { SRC } from '../guides/sources';
import { record } from '../state/progressStore';
import { useStudy, type Miss } from '../state/studyStore';
import { BUTTON, PANEL, Stats } from './ui';

const REVIEW = 0.35; // chance the next question is one you missed before

const sameSpot = (a: Miss, b: Miss) => a.players === b.players && a.seat === b.seat && handName(a.hole) === handName(b.hole);
const opens = (q: Miss) => openingRange(q.players, SEATS[q.players].length - SEATS[q.players].indexOf(q.seat)).has(handName(q.hole));

function ask(players: number, misses: Miss[], last?: Miss): Miss {
  const review = misses.filter((m) => m.players === players && !(last && sameSpot(m, last)));
  if (review.length && Math.random() < REVIEW) return review[Math.floor(Math.random() * review.length)];
  const seats = SEATS[players];
  const deck = shuffledDeck();
  return { players, seat: seats[Math.floor(Math.random() * seats.length)], hole: [deck[0], deck[1]] };
}

/** Folded to you: raise or fold? The opening charts are the answer key; misses come back until you get them right. */
export function PreflopDrill() {
  const { misses, setMisses } = useStudy();
  const [players, setPlayers] = useState(6);
  const [q, setQ] = useState(() => ask(6, misses));
  const [answer, setAnswer] = useState<boolean>(); // true = you raised
  const [score, setScore] = useState({ right: 0, total: 0 });

  const respond = (raise: boolean) => {
    if (answer !== undefined) return;
    const right = raise === opens(q);
    setAnswer(raise);
    record('preflop', { players: q.players, seat: q.seat, hand: handName(q.hole), right });
    setScore((s) => ({ right: s.right + (right ? 1 : 0), total: s.total + 1 }));
    const rest = misses.filter((m) => !sameSpot(m, q));
    setMisses(right ? rest : [...rest, q]);
  };
  const next = (n = players) => {
    setQ(ask(n, misses, q));
    setAnswer(undefined);
  };

  // R = raise, F = fold, Enter or Space = next hand.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      const k = e.key.toLowerCase();
      if (k === 'r') respond(true);
      else if (k === 'f') respond(false);
      else if ((k === 'enter' || k === ' ') && answer !== undefined) {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const right = answer !== undefined && answer === opens(q);
  const review = misses.filter((m) => m.players === players).length;
  return (
    <>
      <section className={PANEL}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <label className="flex min-w-56 flex-1 items-center gap-3 text-[15px] sm:max-w-sm">
            <span className="whitespace-nowrap">
              Players <strong className="tabular-nums">{players}</strong>
            </span>
            <input
              type="range"
              min={2}
              max={9}
              value={players}
              onChange={(e) => {
                setPlayers(Number(e.target.value));
                next(Number(e.target.value));
              }}
              className="w-full accent-[var(--accent)]"
            />
          </label>
          <Stats
            items={[
              { value: `${score.right}/${score.total}`, label: 'right' },
              review > 0 && { value: review, label: 'to review', tone: 'text-amber-300' },
            ]}
          />
        </div>

        <div className="rounded-[12px] bg-[var(--bg-main)]/50 p-3 ring-1 ring-white/5 sm:p-4">
          <SeatTable
            seats={around(q.players)}
            you={q.seat}
            tags={Object.fromEntries(SEATS[q.players].slice(0, SEATS[q.players].indexOf(q.seat)).map((s) => [s, 'Fold']))}
          />
        </div>
        <p className="mt-2 text-center text-[17px]">
          <strong>{q.seat}</strong>, {players} players, folded to you
        </p>
        <div className="my-4 flex justify-center gap-2">
          {q.hole.map((c) => (
            <PlayingCard key={c} card={c} size="lg" />
          ))}
        </div>

        {answer === undefined ? (
          <div className="flex justify-center gap-3">
            <button type="button" onClick={() => respond(true)} className={`${BUTTON} min-w-28 bg-emerald-600 text-white`}>
              Raise <kbd className="ml-2 text-[11px] opacity-60">R</kbd>
            </button>
            <button type="button" onClick={() => respond(false)} className={`${BUTTON} min-w-28 bg-[var(--bg-third)]`}>
              Fold <kbd className="ml-2 text-[11px] opacity-60">F</kbd>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <p className={`text-[17px] font-semibold ${right ? 'text-emerald-400' : 'text-rose-400'}`}>
              {right ? 'Correct' : 'Not quite'}: {q.seat} {opens(q) ? 'raises' : 'folds'} {handName(q.hole)}
            </p>
            <button type="button" onClick={() => next()} className={`${BUTTON} bg-[var(--accent)] text-white`}>
              Next hand
            </button>
          </div>
        )}
      </section>

      {answer !== undefined && (
        <section className={`${PANEL} mt-4`}>
          <HandRangeGrid players={players} seat={q.seat} mark={handName(q.hole)} engine={<SourceLink {...SRC.engine} />} open={<SourceLink {...SRC.upswingRfi} />} />
        </section>
      )}
    </>
  );
}
