import { lazy, Suspense } from 'react';
import { useParams } from 'react-router-dom';
import { Help } from '../components/Help';
import { ToolCards } from '../components/ToolCards';
import { useAccount } from '../state/account';
import { TOOLS } from '../study/tools';

// Each tool loads when it's opened: some carry big tables (the charts, the solver).
const PAGES = {
  ranges: lazy(() => import('../study/RangeBuilder').then((m) => ({ default: m.RangeBuilder }))),
  preflop: lazy(() => import('../study/PreflopDrill').then((m) => ({ default: m.PreflopDrill }))),
  daily: lazy(() => import('../study/DailyFlop').then((m) => ({ default: m.DailyFlop }))),
  quiz: lazy(() => import('../study/RangeQuiz').then((m) => ({ default: m.RangeQuiz }))),
  facing: lazy(() => import('../study/Facing').then((m) => ({ default: m.Facing }))),
  pushfold: lazy(() => import('../study/PushFold').then((m) => ({ default: m.PushFold }))),
  equity: lazy(() => import('../study/EquityDrill').then((m) => ({ default: m.EquityDrill }))),
  potodds: lazy(() => import('../study/PotOdds').then((m) => ({ default: m.PotOdds }))),
  trainer: lazy(() => import('../study/Trainer').then((m) => ({ default: m.Trainer }))),
  reports: lazy(() => import('../study/Reports').then((m) => ({ default: m.Reports }))),
  sizing: lazy(() => import('../study/SizingDrill').then((m) => ({ default: m.SizingDrill }))),
  solver: lazy(() => import('../study/Solver').then((m) => ({ default: m.Solver }))),
  history: lazy(() => import('../study/History').then((m) => ({ default: m.History }))),
  progress: lazy(() => import('../study/Progress').then((m) => ({ default: m.Progress }))),
  coach: lazy(() => import('../study/Coach').then((m) => ({ default: m.Coach }))),
} as const;

// Where each tool sits in the top bar's menus (Daily flop is a link of its own).
const CRUMB = { Preflop: 'Practice / Preflop', Postflop: 'Practice / Postflop', Solver: 'Tools / Solver', Review: 'Review' };

export function StudyPage() {
  const { tool } = useParams();
  const pulled = useAccount((s) => s.pulled); // newer data from your account: start the tool over with it
  const t = TOOLS.find((x) => x.slug === tool);
  if (!t) {
    return (
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <h1 className="text-title-2 mb-6">Study</h1>
        <ToolCards />
      </main>
    );
  }
  const Tool = PAGES[t.slug as keyof typeof PAGES];
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-2 py-3 sm:px-4">
      <div className="mb-4 px-2">
        {t.slug !== 'daily' && <p className="text-[14px] text-[var(--text-muted)]">{CRUMB[t.group]}</p>}
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-title-2">{t.title}</h1>
          <Help title={t.title} about={t.about} />
        </div>
      </div>
      <Suspense fallback={<p className="px-2 text-[15px] text-[var(--text-muted)]">Loading…</p>}>
        <Tool key={`${t.slug}-${pulled}`} />
      </Suspense>
    </main>
  );
}
