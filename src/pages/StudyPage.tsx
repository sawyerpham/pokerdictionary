import { useNavigate, useParams } from 'react-router-dom';
import { Segmented } from '../components/RuleControls';
import { EquityDrill } from '../study/EquityDrill';
import { PreflopDrill } from '../study/PreflopDrill';
import { RangeBuilder } from '../study/RangeBuilder';
import { RiverSolver } from '../study/RiverSolver';
import { RiverTrainer } from '../study/RiverTrainer';

const TOOLS = [
  { slug: 'ranges', label: 'Ranges', blurb: 'Paint a range with per-hand weights and save it. The other tools use your saved ranges.', Tool: RangeBuilder },
  { slug: 'preflop', label: 'Preflop', blurb: 'Folded to you: raise or fold? Graded by the opening charts; hands you miss come back more often.', Tool: PreflopDrill },
  { slug: 'equity', label: 'Equity', blurb: 'Guess how often your hand beats a range on this board, then see the real number.', Tool: EquityDrill },
  { slug: 'solver', label: 'Solver', blurb: 'Solve a heads-up river spot with CFR in your browser: the strategy and EV for every hand.', Tool: RiverSolver },
  { slug: 'trainer', label: 'Trainer', blurb: 'Play river spots against the solver. Each decision is graded by the EV it gives up.', Tool: RiverTrainer },
];

export function StudyPage() {
  const navigate = useNavigate();
  const { tool } = useParams();
  const t = TOOLS.find((x) => x.slug === tool) ?? TOOLS[0];
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-2 py-3 sm:px-4">
      <div className="mb-2 flex flex-wrap items-center gap-x-6 gap-y-2 px-2">
        <h1 className="text-title-2">Study</h1>
        <Segmented label="Tool" value={t.slug} options={TOOLS.map((x) => ({ value: x.slug, label: x.label }))} onChange={(s) => navigate(`/study/${s}`)} />
      </div>
      <p className="mb-4 px-2 text-[15px] text-[var(--text-muted)]">{t.blurb}</p>
      <t.Tool key={t.slug} />
    </main>
  );
}
