import { useState } from 'react';
import { PlayingCard } from '../components/PlayingCard';
import { Segmented } from '../components/RuleControls';
import { shuffledDeck, type Card } from '../engine/cards';
import { equityVsRange, rangeShare } from '../engine/ranges';
import { Grid } from '../guides/Preflop';
import { record } from '../state/progressStore';
import { findRange, useStudy } from '../state/studyStore';
import { BUTTON, PANEL, RangeSelect, rangeCell, Stats } from './ui';

const STREETS = [
  { value: 3, label: 'Flop' },
  { value: 4, label: 'Turn' },
  { value: 5, label: 'River' },
];

interface Question {
  hole: Card[];
  board: Card[];
  equity: number; // NaN when the range has no combos left
}

function ask(street: number, weights: Record<string, number>): Question {
  const deck = shuffledDeck();
  const hole = deck.slice(0, 2), board = deck.slice(2, 2 + street);
  return { hole, board, equity: equityVsRange(hole, board, weights) };
}

/** Guess your equity against a range, then see the real number. */
export function EquityDrill() {
  const ranges = useStudy((s) => s.ranges);
  const [rangeName, setRangeName] = useState(ranges.find((r) => r.name === 'BTN open')?.name ?? ranges[0]?.name ?? '');
  const weights = findRange(ranges, rangeName);
  const [street, setStreet] = useState(3);
  const [q, setQ] = useState(() => ask(3, weights));
  const [guess, setGuess] = useState(50);
  const [shown, setShown] = useState(false);
  const [misses, setMisses] = useState<number[]>([]); // points off, per question

  const next = (s = street, w = weights) => {
    setQ(ask(s, w));
    setShown(false);
  };
  const off = Math.abs(guess - q.equity * 100);
  const average = misses.length ? misses.reduce((a, x) => a + x, 0) / misses.length : 0;

  return (
    <>
      <section className={PANEL}>
        <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <RangeSelect
            label="Opponent's range"
            value={rangeName}
            onChange={(n) => {
              setRangeName(n);
              next(street, findRange(ranges, n));
            }}
          />
          <Segmented
            label="Street"
            value={street}
            options={STREETS}
            onChange={(s) => {
              setStreet(s);
              next(s);
            }}
          />
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="flex flex-col items-center gap-1">
            <div className="flex gap-1">
              {q.board.map((c) => (
                <PlayingCard key={c} card={c} size="md" />
              ))}
            </div>
            <span className="text-[13px] text-[var(--text-muted)]">Board</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="flex gap-1">
              {q.hole.map((c) => (
                <PlayingCard key={c} card={c} size="md" />
              ))}
            </div>
            <span className="text-[13px] text-[var(--text-muted)]">You</span>
          </div>
        </div>
        <p className="mt-3 text-center text-[15px] text-[var(--text-muted)]">
          vs {rangeName} ({(rangeShare(weights) * 100).toFixed(1)}% of hands)
        </p>

        {Number.isNaN(q.equity) ? (
          <p className="mt-4 text-center text-[15px] text-rose-400">This range is empty. Paint some hands into it in the range builder.</p>
        ) : (
          <div className="mx-auto mt-4 flex max-w-md flex-col items-center gap-3">
            <label className="flex w-full items-center gap-3 text-[15px]">
              <span className="whitespace-nowrap">
                Your equity <strong className="inline-block w-10 text-right tabular-nums">{guess}%</strong>
              </span>
              <input type="range" min={0} max={100} value={guess} disabled={shown} onChange={(e) => setGuess(Number(e.target.value))} className="w-full accent-[var(--accent)]" />
            </label>
            {shown ? (
              <>
                <p className="text-center text-[17px]">
                  <strong className="tabular-nums">{(q.equity * 100).toFixed(1)}%</strong>
                  <span className={`ml-2 font-semibold ${off <= 3 ? 'text-emerald-400' : off <= 8 ? 'text-amber-300' : 'text-rose-400'}`}>
                    {off <= 3 ? 'Spot on' : off <= 8 ? 'Close' : 'Off'} by {off.toFixed(1)} points
                  </span>
                </p>
                <button type="button" onClick={() => next()} className={`${BUTTON} bg-[var(--accent)] text-white`}>
                  Next spot
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setShown(true);
                  setMisses((m) => [...m, off]);
                  record('equity', { street, off });
                }}
                className={`${BUTTON} bg-[var(--accent)] text-white`}
              >
                Check
              </button>
            )}
            {misses.length > 0 && (
              <Stats
                items={[
                  { value: misses.length, label: 'guessed' },
                  { value: `±${average.toFixed(1)}`, label: 'points off on average' },
                ]}
              />
            )}
          </div>
        )}
      </section>

      <section className={`${PANEL} mt-4`}>
        <h2 className="card-title mb-2">{rangeName}</h2>
        <Grid cell={rangeCell(weights)} onHover={() => {}} />
      </section>
    </>
  );
}
