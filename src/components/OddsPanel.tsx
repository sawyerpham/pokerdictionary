// Your numbers for a given spot: win / tie / lose, outs, and what your hand can still become.
// Used by the Evaluator page and, following the live table, by the Table page.
import { useDeferredValue, useMemo } from 'react';
import type { ReactNode } from 'react';
import { CATEGORIES, describe, evaluate, handName, outlook, outsFor, type Card } from '../engine/cards';
import { asFraction } from '../guides/ui';

export const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
/** Simple fraction beside a percentage: "1/50" when rare, nothing when it would round to never or always. */
const frac = (v: number) => (v < 0.001 || v > 0.93 ? '' : v < 0.08 ? `1/${Math.round(1 / v)}` : asFraction(v * 100));

export interface Spot {
  /** Known hole cards of every player still in (0–2 each); unknown cards are dealt at random. */
  hands: Card[][];
  hero: number;
  board: Card[];
}

export function OddsPanel({ spot, title, extra, iterations = 10000, className = '' }: { spot: Spot; title: string; extra?: ReactNode; iterations?: number; className?: string }) {
  // Recompute only when the cards change.
  const key = useDeferredValue(JSON.stringify(spot));
  const stats = useMemo(() => {
    const { hands, hero, board }: Spot = JSON.parse(key);
    const mine = hands[hero];
    const complete = mine.length === 2;
    const others = hands.filter((_, i) => i !== hero).flat();
    return {
      mine,
      board,
      made: complete && board.length >= 3 ? describe(evaluate([...mine, ...board])) : null,
      outs: complete && (board.length === 3 || board.length === 4) ? outsFor(mine, board, others) : null,
      unseen: 52 - board.length - mine.length - others.length,
      ...outlook(hands, board, hero, iterations),
    };
  }, [key, iterations]);

  return (
    <section aria-live="polite" aria-label="Odds" className={`grid gap-4 rounded-[12px] bg-[var(--bg-second)] p-4 md:grid-cols-2 ${className}`}>
      <div>
        <h2 className="card-title">{title}</h2>
        <p className="text-title-2 mt-1">{stats.made ?? (stats.mine.length === 2 ? handName(stats.mine) : 'Random hand')}</p>
        <div className="mt-3 flex h-3 gap-[2px] overflow-hidden rounded-full" aria-hidden>
          <span style={{ width: pct(stats.win), background: '#3a9450' }} />
          <span style={{ width: pct(stats.tie), background: '#5a5a58' }} />
          <span style={{ width: pct(stats.lose), background: '#bd4238' }} />
        </div>
        <dl className="mt-2 grid grid-cols-3 gap-2 text-center">
          {[
            ['Win', stats.win],
            ['Tie', stats.tie],
            ['Lose', stats.lose],
          ].map(([label, v]) => (
            <div key={label as string}>
              <dt className="text-caption text-[var(--text-muted)]">{label}</dt>
              <dd className="text-[22px] font-semibold tabular-nums">{pct(v as number)}</dd>
              <dd className="text-caption text-[var(--text-muted)] tabular-nums">{frac(v as number)}</dd>
            </div>
          ))}
        </dl>
        {extra}
        {stats.outs && (
          <p className="mt-3 border-t border-[var(--line)] pt-3 text-[15px] tabular-nums">
            Outs: <strong>{stats.outs.length}</strong>
            {stats.outs.length > 0 &&
              ` · next card improves ${pct(stats.outs.length / stats.unseen)}${frac(stats.outs.length / stats.unseen) && ` (${frac(stats.outs.length / stats.unseen)})`}`}
          </p>
        )}
      </div>
      <div>
        <h2 className="card-title">{stats.board.length === 5 ? 'Your hand' : 'Your hand by the river'}</h2>
        <table className="w-full text-[13px] tabular-nums">
          <tbody>
            {CATEGORIES.map((name, i) => ({ name, v: stats.finish[i] }))
              .reverse()
              .map(({ name, v }) => (
                <tr key={name} className={v === 0 ? 'text-[var(--text-muted)] opacity-50' : ''}>
                  <td className="py-0.5 pr-2 whitespace-nowrap">{name}</td>
                  <td className="w-full py-0.5">
                    <span className="block h-1.5 rounded-full bg-[#3987e5]" style={{ width: pct(v) }} />
                  </td>
                  <td className="py-0.5 pl-2 text-right">{pct(v)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
