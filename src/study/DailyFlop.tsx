import { useEffect, useState, type ReactNode } from 'react';
import { PlayingCard } from '../components/PlayingCard';
import { seeded } from '../engine/cards';
import { solverCard } from '../engine/ranges';
import { BB, loadPacks } from '../solver/library';
import { useProgress } from '../state/progressStore';
import { amount, grade, label, puzzle, type Puzzle } from './puzzle';
import { BUTTON, PANEL } from './ui';

const today = () => new Date().toISOString().slice(0, 10);
const hash = (s: string) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7);

/** How many days in a row, ending today or yesterday, have an answer. */
function streak(dates: Set<string>) {
  let n = 0;
  const d = new Date();
  if (!dates.has(today())) d.setUTCDate(d.getUTCDate() - 1);
  while (dates.has(d.toISOString().slice(0, 10))) {
    n++;
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return n;
}

/** One flop decision: the board, your hand, the line so far, your options, then the solver's verdict. */
export function PuzzleCard({ p, header, chosen, onChoose, footer }: { p: Puzzle; header: ReactNode; chosen?: number; onChoose: (k: number) => void; footer?: ReactNode }) {
  const { lib, hero, holes, heroIdx, node } = p;
  const { evs, freq, best } = grade(p);
  const loss = chosen === undefined || chosen < 0 ? undefined : ((evs[best] - evs[chosen]) / lib.pack.pot) * 100;
  return (
    <section className={PANEL}>
      <p className="text-center text-[15px] text-[var(--text-muted)]">{header}</p>
      <div className="my-4 flex flex-wrap items-end justify-center gap-x-8 gap-y-3">
        <div className="flex flex-col items-center gap-1">
          <div className="flex gap-1">
            {lib.board.map((c) => (
              <PlayingCard key={c} card={solverCard(c)} size="md" />
            ))}
          </div>
          <span className="text-[13px] text-[var(--text-muted)] tabular-nums">Pot {amount(lib.pack.pot + node.bets[0] + node.bets[1])}</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="flex gap-1">
            {holes[hero][heroIdx].map((c) => (
              <PlayingCard key={c} card={c} size="md" />
            ))}
          </div>
          <span className="text-[13px] text-[var(--text-muted)]">You · {lib.pack.seats[hero]}</span>
        </div>
      </div>
      <p className="min-h-6 text-center text-[15px] text-[var(--text-muted)]">{p.log.join(' · ') || 'You act first.'}</p>

      {chosen === undefined ? (
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {node.actions.map((a, k) => (
            <button key={a} type="button" onClick={() => onChoose(k)} className={`${BUTTON} bg-[var(--bg-third)]`}>
              {label(a)}
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-3 text-center">
          {loss !== undefined && (
            <p className={`text-[17px] font-semibold ${loss < 0.5 ? 'text-emerald-400' : loss < 5 ? 'text-amber-300' : 'text-rose-400'}`}>
              {loss < 0.5 ? 'Best play.' : `Best was ${label(node.actions[best]).toLowerCase()}: you gave up ${loss.toFixed(1)}% of the pot.`}
            </p>
          )}
          <table className="mx-auto mt-2 text-[13px] tabular-nums">
            <tbody>
              {node.actions.map((a, k) => (
                <tr key={a} className={k === chosen ? 'font-semibold' : ''}>
                  <td className="py-0.5 pr-4 text-left">
                    {label(a)}
                    {k === chosen && ' (you)'}
                  </td>
                  <td className="py-0.5 pr-4 text-right">solver {(freq[k] * 100).toFixed(0)}%</td>
                  <td className="py-0.5 text-right">EV {(evs[k] / BB).toFixed(2)} bb</td>
                </tr>
              ))}
            </tbody>
          </table>
          {footer}
        </div>
      )}
    </section>
  );
}

/** One flop decision a day, the same for everyone, graded by the solver. */
export function DailyFlop() {
  const { daily, add } = useProgress();
  const date = today();
  const [p, setP] = useState<Puzzle>();
  const [error, setError] = useState<string>();
  const [chosen, setChosen] = useState<number>();
  const done = daily.find((d) => d.date === date);

  useEffect(() => {
    const random = seeded(hash(date));
    loadPacks()
      .then((packs) => puzzle(packs[Math.floor(random() * Math.min(4, packs.length))].key, random))
      .then(setP, (e: Error) => setError(e.message));
  }, [date]);

  if (error) return <section className={PANEL}><p className="text-[15px] text-rose-400">{error}</p></section>;
  if (!p) return <section className={PANEL}><p className="text-[15px] text-[var(--text-muted)]">Dealing today’s flop…</p></section>;
  const days = streak(new Set(daily.map((d) => d.date)));
  const choose = (k: number) => {
    if (done) return;
    const { evs, best } = grade(p);
    setChosen(k);
    add('daily', { date, loss: ((evs[best] - evs[k]) / p.lib.pack.pot) * 100 });
  };
  return (
    <PuzzleCard
      p={p}
      header={`${date} · ${p.lib.pack.title} · streak ${days} day${days === 1 ? '' : 's'}`}
      chosen={chosen ?? (done ? -1 : undefined)}
      onChoose={choose}
      footer={
        <p className="mt-3 text-[13px] text-[var(--text-muted)]">
          {chosen === undefined && done ? `You played today’s flop and gave up ${done.loss.toFixed(1)}% of the pot. ` : ''}A new flop comes at midnight UTC. More hands like this in the trainer.
        </p>
      }
    />
  );
}
