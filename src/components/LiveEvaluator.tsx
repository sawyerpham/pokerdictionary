// The evaluator under the table: nothing to set, it follows the hand being played.
import { useEffect, useState } from 'react';
import type { Table } from '../engine/holdem';
import { HandRangeGrid } from '../guides/Preflop';
import { SRC } from '../guides/sources';
import { useSettings } from '../state/settingsStore';
import { handName, OddsPanel } from './OddsPanel';
import { Toggle } from './RuleControls';
import { SourceLink } from './SourceLink';

export function LiveEvaluator({ t, youIdx, position, settled }: { t: Table; youIdx: number; position?: string; settled: boolean }) {
  const seeAll = useSettings((s) => s.settings.evaluatorSeesAll);
  const update = useSettings((s) => s.update);
  // Follow the table once its animations have played, so the maths never stutters a deal.
  const [shown, setShown] = useState(t);
  useEffect(() => {
    if (settled) setShown(t);
  }, [t, settled]);

  const you = shown.seats[youIdx];
  const live = you && you.hole.length === 2 && you.inHand;
  const others = shown.seats.flatMap((s, i) => (i !== youIdx && s.inHand ? [seeAll ? s.hole : []] : []));
  const players = shown.seats.filter((s) => s.hole.length === 2).length;
  const street = ['Preflop', 'Preflop', 'Preflop', 'Flop', 'Turn', 'River'][shown.board.length];

  return (
    <section aria-label="Live evaluator" className="mt-6">
      <div className="mb-2 flex items-center justify-between gap-3 px-1">
        <h2 className="card-title mb-0">Evaluator</h2>
        <label className="flex min-h-11 items-center gap-2 text-[15px]">
          See others’ cards
          <Toggle label="See others’ cards" checked={seeAll} onChange={(v) => update({ evaluatorSeesAll: v })} />
        </label>
      </div>
      {!live ? (
        <p className="rounded-[12px] bg-[var(--bg-second)] p-8 text-center text-[15px] text-[var(--text-muted)]">
          {you?.hole.length === 2 ? 'You folded this hand.' : 'Start a hand to see your odds.'}
        </p>
      ) : (
        <>
          <OddsPanel
            spot={{ hands: [you.hole, ...others], hero: 0, board: shown.board }}
            title={`${position ?? 'You'} · ${street} · ${others.length} opponent${others.length === 1 ? '' : 's'}`}
            iterations={4000}
          />
          {position && players >= 2 && (
            <div className="mx-auto mt-4 max-w-2xl rounded-[12px] bg-[var(--bg-second)] p-3 sm:p-5">
              <h3 className="card-title">Preflop hands</h3>
              <HandRangeGrid
                players={players}
                seat={position}
                mark={handName(you.hole)}
                engine={<SourceLink {...SRC.engine} />}
                open={<SourceLink {...SRC.upswingRfi} />}
              />
            </div>
          )}
        </>
      )}
    </section>
  );
}
