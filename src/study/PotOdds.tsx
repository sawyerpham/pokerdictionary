import { useEffect, useMemo, useState } from 'react';
import { PlayingCard } from '../components/PlayingCard';
import { Segmented } from '../components/RuleControls';
import { evaluate, headsUpEquity, outsAgainst, shuffledDeck, type Card } from '../engine/cards';
import { record } from '../state/progressStore';
import { BUTTON, PANEL } from './ui';

const SIZES = [0.25, 0.33, 0.5, 0.66, 0.75, 1, 1.5, 2]; // bets, as a share of the pot
const CLOSE = 0.01; // of the final pot: closer than this, either choice is fine
const MODES = [
  { value: 'call', label: 'Call or fold' },
  { value: 'price', label: 'Price only' },
] as const;
const STREETS = [
  { value: 3, label: 'Flop' },
  { value: 4, label: 'Turn' },
] as const;
const bb = (x: number) => `${Number.isInteger(x) ? x : x.toFixed(1)} bb`;
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

interface Spot {
  pot: number; // before the bet
  bet: number;
  hero: Card[];
  villain: Card[];
  board: Card[];
}
const price = (s: { pot: number; bet: number }) => s.bet / (s.pot + 2 * s.bet); // equity a call needs

/** A drawing hand facing an all-in, against a hand you can see: you're behind now but have outs. */
function deal(street: number): Spot {
  for (;;) {
    const d = shuffledDeck();
    const hero = d.slice(0, 2), villain = d.slice(2, 4), board = d.slice(4, 4 + street);
    if (evaluate([...hero, ...board]) >= evaluate([...villain, ...board])) continue;
    const outs = outsAgainst(hero, villain, board).length;
    if (outs < 3 || outs > 16) continue;
    const pot = 4 + Math.floor(Math.random() * 37);
    return { pot, bet: Math.max(1, Math.round(pot * SIZES[Math.floor(Math.random() * SIZES.length)] * 2) / 2), hero, villain, board };
  }
}

function Cards({ cards, label }: { cards: Card[]; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex gap-1">
        {cards.map((c) => (
          <PlayingCard key={c} card={c} size="md" />
        ))}
      </div>
      <span className="text-[13px] text-[var(--text-muted)]">{label}</span>
    </div>
  );
}

/** Count your outs, work out the price, and call or fold an all-in. */
export function PotOdds() {
  const [mode, setMode] = useState<'call' | 'price'>('call');
  const [street, setStreet] = useState<3 | 4>(4);
  const [spot, setSpot] = useState(() => deal(4));
  const [answer, setAnswer] = useState<boolean>(); // true = called
  const [guess, setGuess] = useState(25);
  const [shown, setShown] = useState(false);
  const [score, setScore] = useState({ right: 0, total: 0 });

  const need = price(spot);
  const [eq, outs] = useMemo(() => [headsUpEquity(spot.hero, spot.villain, spot.board), outsAgainst(spot.hero, spot.villain, spot.board).length], [spot]);
  const final = spot.pot + 2 * spot.bet;
  const callEv = eq * final - spot.bet; // against folding (0)
  const close = Math.abs(callEv) < CLOSE * final;

  const next = (s = street) => {
    setSpot(deal(s));
    setAnswer(undefined);
    setShown(false);
  };
  const respond = (call: boolean) => {
    if (answer !== undefined || mode !== 'call') return;
    const loss = close || call === callEv > 0 ? 0 : Math.abs(callEv);
    setAnswer(call);
    setScore((x) => ({ right: x.right + (loss === 0 ? 1 : 0), total: x.total + 1 }));
    record('potodds', { street: spot.board.length, right: loss === 0, loss });
  };

  // C = call, F = fold, Enter or Space = next.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      const k = e.key.toLowerCase();
      if (k === 'c') respond(true);
      else if (k === 'f') respond(false);
      else if ((k === 'enter' || k === ' ') && (answer !== undefined || shown)) {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const done = mode === 'call' ? answer !== undefined : shown;
  const off = Math.abs(guess - need * 100);
  // Rule of 2 and 4: each out is worth about 2% per card to come, 4% with two to come when you're all-in.
  const rule = Math.min(100, outs * (spot.board.length === 3 ? 4 : 2));
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3 px-2">
        <Segmented label="Mode" value={mode} options={[...MODES]} onChange={(m) => (setMode(m), next())} />
        {mode === 'call' && <Segmented label="Street" value={street} options={[...STREETS]} onChange={(s) => (setStreet(s), next(s))} />}
        {mode === 'call' && score.total > 0 && (
          <span className="text-[15px] text-[var(--text-muted)] tabular-nums">
            {score.right}/{score.total} right
          </span>
        )}
      </div>

      <section className={PANEL}>
        {mode === 'call' ? (
          <>
            <div className="flex flex-col items-center gap-3">
              <Cards cards={spot.villain} label="Their hand" />
              <Cards cards={spot.board} label={spot.board.length === 3 ? 'Flop' : 'Turn'} />
              <Cards cards={spot.hero} label="You" />
            </div>
            <p className="mt-4 text-center text-[17px]">
              The pot is <strong>{bb(spot.pot)}</strong>. They go all-in for <strong>{bb(spot.bet)}</strong>. Call or fold?
            </p>
          </>
        ) : (
          <p className="text-center text-[17px]">
            The pot is <strong>{bb(spot.pot)}</strong>. Your opponent bets <strong>{bb(spot.bet)}</strong>. What share of the time do you need to win to call?
          </p>
        )}

        {!done ? (
          mode === 'call' ? (
            <div className="mt-4 flex justify-center gap-3">
              <button type="button" onClick={() => respond(true)} className={`${BUTTON} min-w-28 bg-emerald-600 text-white`}>
                Call <kbd className="ml-2 text-[11px] opacity-60">C</kbd>
              </button>
              <button type="button" onClick={() => respond(false)} className={`${BUTTON} min-w-28 bg-[var(--bg-third)]`}>
                Fold <kbd className="ml-2 text-[11px] opacity-60">F</kbd>
              </button>
            </div>
          ) : (
            <div className="mx-auto mt-4 flex max-w-md flex-col items-center gap-3">
              <label className="flex w-full items-center gap-3 text-[15px]">
                <span className="whitespace-nowrap">
                  Need <strong className="inline-block w-10 text-right tabular-nums">{guess}%</strong>
                </span>
                <input type="range" min={0} max={50} value={guess} onChange={(e) => setGuess(Number(e.target.value))} className="w-full accent-[var(--accent)]" />
              </label>
              <button type="button" onClick={() => setShown(true)} className={`${BUTTON} bg-[var(--accent)] text-white`}>
                Check
              </button>
            </div>
          )
        ) : (
          <div className="mt-4 flex flex-col items-center gap-2 text-center">
            {mode === 'call' ? (
              <p className={`text-[17px] font-semibold ${close || answer === callEv > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {close ? 'Close: about even either way.' : `${answer === callEv > 0 ? 'Correct' : 'Not quite'}: ${callEv > 0 ? 'call' : 'fold'}.`}
                {!close && answer !== callEv > 0 && ` That cost ${bb(Math.round(Math.abs(callEv) * 10) / 10)}.`}
              </p>
            ) : (
              <p className={`text-[17px] font-semibold ${off <= 2 ? 'text-emerald-400' : off <= 5 ? 'text-amber-300' : 'text-rose-400'}`}>
                {pct(need)}: {off <= 2 ? 'spot on' : `off by ${off.toFixed(1)} points`}
              </p>
            )}
            <div className="text-[15px] text-[var(--text-muted)] tabular-nums">
              <p>
                You call {bb(spot.bet)} to win {bb(spot.pot + spot.bet)}, so you need {bb(spot.bet)} ÷ {bb(final)} = <strong className="text-[var(--text-primary)]">{pct(need)}</strong>.
              </p>
              {mode === 'call' && (
                <>
                  <p>
                    You have <strong className="text-[var(--text-primary)]">{outs} outs</strong>: about {rule}% by the rule of {spot.board.length === 3 ? '4' : '2'}. Exactly, you win{' '}
                    <strong className="text-[var(--text-primary)]">{pct(eq)}</strong>.
                  </p>
                  <p>
                    Calling is worth {callEv >= 0 ? '+' : '−'}
                    {bb(Math.round(Math.abs(callEv) * 10) / 10)} against folding.
                  </p>
                </>
              )}
            </div>
            <button type="button" onClick={() => next()} className={`${BUTTON} mt-2 bg-[var(--accent)] text-white`}>
              Next
            </button>
          </div>
        )}
      </section>
      <p className="text-footnote mt-3 px-2 text-[var(--text-muted)]">
        An all-in has no later bets, so the price and your chance to win settle it. Outs are the next cards that put you ahead. The rule of 2 and 4: each
        out is worth about 2% per card still to come.
      </p>
    </>
  );
}
