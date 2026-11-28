import { useEffect, useState } from 'react';
import { record } from '../state/progressStore';
import { PuzzleCard } from './DailyFlop';
import { grade, puzzle, type Puzzle } from './puzzle';
import { BUTTON, InfoBar } from './ui';

const PACK = 'deep-BTN-BB'; // solved with two bet sizes a street

/** Check, bet small or bet big? Flop spots from the two-size library, graded by the EV each choice gives up. */
export function SizingDrill() {
  const [p, setP] = useState<Puzzle>();
  const [error, setError] = useState<string>();
  const [chosen, setChosen] = useState<number>();
  const [score, setScore] = useState({ n: 0, loss: 0 });

  const deal = () => {
    setChosen(undefined);
    // Spots with at least two bet sizes to pick from.
    puzzle(PACK, Math.random, { wanted: (node) => node.actions.filter((a) => a.startsWith('Bet')).length >= 2 }).then(setP, () =>
      setError('The two-size library isn’t ready yet: it’s still being computed. Try again later.'),
    );
  };
  useEffect(deal, []);

  if (error) return <p className="px-2 text-[15px] text-rose-400">{error}</p>;
  if (!p) return <p className="px-2 text-[15px] text-[var(--text-muted)]">Dealing…</p>;
  const choose = (k: number) => {
    const { evs, best } = grade(p);
    const loss = ((evs[best] - evs[k]) / p.lib.pack.pot) * 100;
    setChosen(k);
    setScore((s) => ({ n: s.n + 1, loss: s.loss + loss }));
    const kind = (a: string) => (a.startsWith('Bet') ? (a === p.node.actions.find((x) => x.startsWith('Bet')) ? 'Bet small' : 'Bet big') : a.split(':')[0]);
    record('trainer', { street: 3, seat: p.hero, facing: false, chose: kind(p.node.actions[k]), best: kind(p.node.actions[best]), loss });
  };
  return (
    <>
      <PuzzleCard
        p={p}
        header={
          <InfoBar
            left="Bets ⅓ or ¾ pot"
            center={p.lib.pack.title.replace(' (2 sizes)', '')}
            right={
              score.n ? (
                <>
                  <strong className="text-[var(--text-primary)]">{score.n}</strong> spots, <strong className="text-[var(--text-primary)]">{(score.loss / score.n).toFixed(1)}%</strong> lost each
                </>
              ) : undefined
            }
          />
        }
        chosen={chosen}
        onChoose={choose}
        footer={
          <button type="button" onClick={deal} className={`${BUTTON} mx-auto mt-3 bg-[var(--accent)] text-white`}>
            Next spot
          </button>
        }
      />
      <p className="text-footnote mt-3 px-2 text-[var(--text-muted)]">
        From flops solved with two bet sizes on every street and raises throughout (postflop-solver, within 1% of the pot). Small bets suit
        boards where your whole range is ahead; big bets suit boards where your strong hands and draws pull apart from the rest.
      </p>
    </>
  );
}
