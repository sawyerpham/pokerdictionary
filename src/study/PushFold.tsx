import { useEffect, useState } from 'react';
import { PlayingCard } from '../components/PlayingCard';
import { Segmented } from '../components/RuleControls';
import { handName, shuffledDeck, type Card } from '../engine/cards';
import { combosOf } from '../engine/ranges';
import { CALL, HANDS, MAX_STACK, PUSH } from '../engine/pushfold';
import { Grid } from '../guides/Preflop';
import { record } from '../state/progressStore';
import { BUTTON, PANEL } from './ui';

const at = new Map(HANDS.map((h, i) => [h, i]));
const CLOSE = 0.05; // bb: closer than this, either choice is fine
type Seat = 'SB' | 'BB';
const TABLE: Record<Seat, number[][]> = { SB: PUSH, BB: CALL };
const ACTION: Record<Seat, string> = { SB: 'Shove', BB: 'Call' };

/** bb gained by shoving (SB) or calling a shove (BB) instead of folding. */
const gain = (seat: Seat, stack: number, hand: string) => TABLE[seat][stack - 1][at.get(hand)!];
/** The deepest stack at which the hand still shoves (or calls); 0 if never. */
const deepest = (seat: Seat, hand: string) => {
  for (let s = MAX_STACK; s >= 1; s--) if (gain(seat, s, hand) > 0) return s;
  return 0;
};
const share = (seat: Seat, stack: number) => HANDS.reduce((n, h) => n + (gain(seat, stack, h) > 0 ? combosOf(h) : 0), 0) / 1326;

const MODES = [
  { value: 'drill', label: 'Drill' },
  { value: 'chart', label: 'Chart' },
] as const;
const SEATS = [
  { value: 'SB' as Seat, label: 'Shove (SB)' },
  { value: 'BB' as Seat, label: 'Call (BB)' },
];

/** The range at one stack: green cells play, gray fold; each cell's number is the deepest stack it still plays at. */
function Chart({ seat, stack, mark }: { seat: Seat; stack: number; mark?: string }) {
  const [hover, setHover] = useState<string>();
  const shown = hover ?? mark;
  return (
    <>
      <p className="mb-2 min-h-6 text-center text-[15px] tabular-nums">
        {shown
          ? `${shown}: ${gain(seat, stack, shown) > 0 ? ACTION[seat].toLowerCase() : 'fold'} at ${stack} bb (${gain(seat, stack, shown) >= 0 ? '+' : ''}${gain(seat, stack, shown).toFixed(2)} bb vs folding)`
          : `${seat === 'SB' ? 'Small blind shoves' : 'Big blind calls'} ${(share(seat, stack) * 100).toFixed(1)}% of hands at ${stack} bb`}
      </p>
      <Grid
        mark={mark}
        onHover={setHover}
        cell={(h) => {
          const plays = gain(seat, stack, h) > 0, d = deepest(seat, h);
          return {
            bg: plays ? '#3a9450' : 'var(--bg-third)',
            ink: plays ? '#ffffff' : 'rgb(235 235 245 / 0.45)',
            small: d === MAX_STACK ? `${MAX_STACK}+` : d ? String(d) : '–',
            title: `${h}: ${ACTION[seat].toLowerCase()} up to ${d === MAX_STACK ? `${MAX_STACK}+` : d} bb`,
          };
        }}
      />
      <p className="text-footnote mt-2 text-[var(--text-muted)]">
        Heads-up (or folded to the small blind), no antes, at the equilibrium: neither player can do better by changing. Green plays at this stack; the
        number is the deepest stack (bb) the hand still {seat === 'SB' ? 'shoves' : 'calls'} at. Computed with this site’s engine.
      </p>
    </>
  );
}

interface Spot {
  seat: Seat;
  stack: number;
  hole: Card[];
}
function deal(): Spot {
  const deck = shuffledDeck();
  return { seat: Math.random() < 0.5 ? 'SB' : 'BB', stack: 2 + Math.floor(Math.random() * 19), hole: [deck[0], deck[1]] };
}

/** Push/fold for short stacks: the equilibrium chart, and a drill graded against it. */
export function PushFold() {
  const [mode, setMode] = useState<'drill' | 'chart'>('drill');
  const [seat, setSeat] = useState<Seat>('SB');
  const [stack, setStack] = useState(10);
  const [spot, setSpot] = useState(deal);
  const [answer, setAnswer] = useState<boolean>(); // true = shoved / called
  const [score, setScore] = useState({ right: 0, total: 0, lost: 0 });

  const hand = handName(spot.hole);
  const g = gain(spot.seat, spot.stack, hand);
  const respond = (play: boolean) => {
    if (answer !== undefined) return;
    const loss = Math.abs(g) < CLOSE || play === g > 0 ? 0 : Math.abs(g);
    setAnswer(play);
    setScore((s) => ({ right: s.right + (loss === 0 ? 1 : 0), total: s.total + 1, lost: s.lost + loss }));
    record('pushfold', { stack: spot.stack, seat: spot.seat, hand, right: loss === 0, loss });
  };
  const next = () => {
    setSpot(deal());
    setAnswer(undefined);
  };

  // S or C = shove / call, F = fold, Enter or Space = next.
  useEffect(() => {
    if (mode !== 'drill') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      const k = e.key.toLowerCase();
      if (k === 's' || k === 'c') respond(true);
      else if (k === 'f') respond(false);
      else if ((k === 'enter' || k === ' ') && answer !== undefined) {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const lost = answer === undefined ? 0 : Math.abs(g) < CLOSE || answer === g > 0 ? 0 : Math.abs(g);
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3 px-2">
        <Segmented label="Mode" value={mode} options={[...MODES]} onChange={setMode} />
        {mode === 'drill' && (
          <span className="text-[15px] text-[var(--text-muted)] tabular-nums">
            {score.right}/{score.total} right{score.lost > 0 && ` · ${score.lost.toFixed(2)} bb given up`}
          </span>
        )}
      </div>

      {mode === 'chart' ? (
        <section className={PANEL}>
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <Segmented label="Seat" value={seat} options={SEATS} onChange={setSeat} />
            <label className="flex min-w-56 flex-1 items-center gap-3 text-[15px]">
              <span className="whitespace-nowrap">
                Stack <strong className="tabular-nums">{stack} bb</strong>
              </span>
              <input type="range" min={1} max={MAX_STACK} value={stack} onChange={(e) => setStack(Number(e.target.value))} className="w-full accent-[var(--accent)]" />
            </label>
          </div>
          <Chart seat={seat} stack={stack} />
        </section>
      ) : (
        <>
          <section className={PANEL}>
            <p className="text-center text-[17px]">
              {spot.seat === 'SB' ? (
                <>
                  <strong>Small blind</strong>, {spot.stack} bb effective, folded to you
                </>
              ) : (
                <>
                  <strong>Big blind</strong>, {spot.stack} bb effective, the small blind shoves
                </>
              )}
            </p>
            <div className="my-4 flex justify-center gap-2">
              {spot.hole.map((c) => (
                <PlayingCard key={c} card={c} size="lg" />
              ))}
            </div>
            {answer === undefined ? (
              <div className="flex justify-center gap-3">
                <button type="button" onClick={() => respond(true)} className={`${BUTTON} min-w-28 bg-emerald-600 text-white`}>
                  {ACTION[spot.seat]} <kbd className="ml-2 text-[11px] opacity-60">{spot.seat === 'SB' ? 'S' : 'C'}</kbd>
                </button>
                <button type="button" onClick={() => respond(false)} className={`${BUTTON} min-w-28 bg-[var(--bg-third)]`}>
                  Fold <kbd className="ml-2 text-[11px] opacity-60">F</kbd>
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 text-center">
                <p className={`text-[17px] font-semibold ${lost === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {Math.abs(g) < CLOSE
                    ? `Close: ${hand} is about even either way here.`
                    : `${lost === 0 ? 'Correct' : 'Not quite'}: ${g > 0 ? ACTION[spot.seat].toLowerCase() : 'fold'} ${hand}${lost ? `. That cost ${lost.toFixed(2)} bb.` : '.'}`}
                </p>
                <p className="text-[15px] text-[var(--text-muted)] tabular-nums">
                  {ACTION[spot.seat]}ing is {g >= 0 ? '+' : ''}
                  {g.toFixed(2)} bb against folding.
                </p>
                <button type="button" onClick={next} className={`${BUTTON} bg-[var(--accent)] text-white`}>
                  Next hand
                </button>
              </div>
            )}
          </section>
          {answer !== undefined && (
            <section className={`${PANEL} mt-4`}>
              <Chart seat={spot.seat} stack={spot.stack} mark={hand} />
            </section>
          )}
        </>
      )}
    </>
  );
}
