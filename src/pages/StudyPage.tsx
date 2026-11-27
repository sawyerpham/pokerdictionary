import type { ComponentType } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ToolCards } from '../components/ToolCards';
import { EquityDrill } from '../study/EquityDrill';
import { PreflopDrill } from '../study/PreflopDrill';
import { RangeBuilder } from '../study/RangeBuilder';
import { Solver } from '../study/Solver';
import { useAccount } from '../state/account';
import { TOOLS } from '../study/tools';
import { Trainer } from '../study/Trainer';

const PAGES: Record<string, ComponentType> = { ranges: RangeBuilder, preflop: PreflopDrill, equity: EquityDrill, solver: Solver, trainer: Trainer };

export function StudyPage() {
  const { tool } = useParams();
  const pulled = useAccount((s) => s.pulled); // newer data from your account: start the tool over with it
  const t = TOOLS.find((x) => x.slug === tool);
  if (!t) {
    return (
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
        <h1 className="text-title-2 mb-4">Study</h1>
        <ToolCards />
      </main>
    );
  }
  const Tool = PAGES[t.slug];
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-2 py-3 sm:px-4">
      <div className="mb-4 px-2">
        <Link to="/study" className="text-[15px] text-[var(--accent)] hover:underline">
          Study
        </Link>
        <h1 className="text-title-2">{t.title}</h1>
        <p className="text-[15px] text-[var(--text-muted)]">{t.desc}</p>
      </div>
      <Tool key={`${t.slug}-${pulled}`} />
    </main>
  );
}
