import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useProgress } from '../state/progressStore';
import { PANEL } from './ui';

const RECENT = 50; // "lately" = your last this-many answers in a tool

const pct = (x: number) => `${Math.round(x * 100)}%`;
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, x) => a + x, 0) / xs.length : 0);

/** Groups items by a key and keeps the groups with at least `min` items. */
function groups<T>(items: T[], key: (t: T) => string, min = 1): [string, T[]][] {
  const m = new Map<string, T[]>();
  for (const t of items) m.set(key(t), [...(m.get(key(t)) ?? []), t]);
  return [...m].filter(([, v]) => v.length >= min);
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div>
      <p className="text-[13px] text-[var(--text-muted)]">{label}</p>
      <p className="text-title-2 tabular-nums">{value}</p>
      {note && <p className="text-[13px] text-[var(--text-muted)]">{note}</p>}
    </div>
  );
}

/** One measure across groups: thin bars from the left, value at the end, worst first (the caller sorts). */
function Bars({ title, rows, max }: { title: string; rows: { label: string; value: number; text: string; detail: string }[]; max: number }) {
  if (!rows.length) return null;
  return (
    <div className="mt-4">
      <p className="mb-1.5 text-[13px] text-[var(--text-muted)]">{title}</p>
      <div className="space-y-1">
        {rows.map((r) => (
          <div key={r.label} title={r.detail} className="grid grid-cols-[minmax(6rem,11rem)_1fr_4.5rem] items-center gap-3 rounded-[6px] py-0.5 text-[15px] hover:bg-white/[0.04]">
            <span className="truncate">{r.label}</span>
            <span className="h-2 rounded-r-[4px] bg-[var(--bg-third)]">
              <span className="block h-2 rounded-r-[4px] bg-[var(--accent)]" style={{ width: `${Math.max(2, Math.min(100, (r.value / max) * 100))}%` }} />
            </span>
            <span className="text-right tabular-nums">{r.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Tool({ title, to, count, children }: { title: string; to: string; count: number; children: ReactNode }) {
  return (
    <section className={`${PANEL} mb-4`}>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-headline">{title}</h2>
        <Link to={to} className="text-[15px] text-[var(--accent)] hover:underline">
          Practice
        </Link>
      </div>
      {count ? children : <p className="text-[15px] text-[var(--text-muted)]">Nothing yet. Your answers show up here as you practice.</p>}
    </section>
  );
}

/** Where you're improving and where you lose the most, from every drill answer and trainer decision. */
export function Progress() {
  const { preflop, equity, trainer, pushfold, potodds, facing, quiz, daily, clear } = useProgress();
  const accuracy = (xs: { right: boolean }[]) => mean(xs.map((x) => (x.right ? 1 : 0)));
  const lately = <T,>(xs: T[], f: (xs: T[]) => number) => (xs.length > RECENT ? f(xs.slice(-RECENT)) - f(xs.slice(0, -RECENT)) : undefined);
  const trend = (d: number | undefined, unit: string, lowerIsBetter = false) =>
    d === undefined ? `last ${RECENT} vs before: needs more answers` : `last ${RECENT} vs before: ${d === 0 ? 'same' : `${(lowerIsBetter ? d < 0 : d > 0) ? 'better' : 'worse'} by ${Math.abs(d).toFixed(unit === 'pts' ? 1 : 0)}${unit}`}`;

  const STREET = ['', '', '', 'Flop', 'Turn', 'River'];
  const NODE = ['vs open', 'vs 3-bet', 'vs 4-bet', 'vs all-in'];
  const habit: Record<string, string> = { Fold: 'Folding', Check: 'Checking', Call: 'Calling', Bet: 'Betting', Raise: 'Raising', AllIn: 'Going all-in', '3-bet': '3-betting', '4-bet': '4-betting', 'All-in': 'Going all-in' };
  const mistakes = trainer.filter((d) => d.loss >= 0.5);

  return (
    <>
      <Tool title="Preflop drill" to="/study/preflop" count={preflop.length}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Stat label="Answers" value={String(preflop.length)} />
          <Stat label="Right" value={pct(accuracy(preflop))} note={trend(lately(preflop, accuracy) !== undefined ? lately(preflop, accuracy)! * 100 : undefined, ' pts')} />
        </div>
        <Bars
          title="Right, by seat (worst first)"
          max={1}
          rows={groups(preflop, (r) => r.seat, 3)
            .map(([seat, rs]) => ({ label: seat, value: accuracy(rs), text: pct(accuracy(rs)), detail: `${seat}: ${rs.filter((r) => r.right).length} of ${rs.length} right` }))
            .sort((a, b) => a.value - b.value)}
        />
        <Bars
          title="Most missed"
          max={Math.max(1, ...groups(preflop.filter((r) => !r.right), (r) => `${r.seat} ${r.hand}`).map(([, rs]) => rs.length))}
          rows={groups(preflop.filter((r) => !r.right), (r) => `${r.seat} ${r.hand}`)
            .sort((a, b) => b[1].length - a[1].length)
            .slice(0, 5)
            .map(([spot, rs]) => ({ label: spot, value: rs.length, text: `${rs.length}×`, detail: `${spot}: missed ${rs.length} times` }))}
        />
      </Tool>

      <Tool title="Equity drill" to="/study/equity" count={equity.length}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Stat label="Guesses" value={String(equity.length)} />
          <Stat
            label="Off by, on average"
            value={`${mean(equity.map((e) => e.off)).toFixed(1)} pts`}
            note={trend(lately(equity, (xs) => mean(xs.map((e) => e.off))), ' pts', true)}
          />
        </div>
        <Bars
          title="Off by, by street (worst first)"
          max={Math.max(1, ...equity.map((e) => e.off))}
          rows={groups(equity, (e) => STREET[e.street])
            .map(([street, es]) => ({ label: street, value: mean(es.map((e) => e.off)), text: `${mean(es.map((e) => e.off)).toFixed(1)} pts`, detail: `${street}: ${es.length} guesses` }))
            .sort((a, b) => b.value - a.value)}
        />
      </Tool>

      <Tool title="Trainer" to="/study/trainer" count={trainer.length}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Stat label="Decisions" value={String(trainer.length)} />
          <Stat
            label="Lost per decision"
            value={`${mean(trainer.map((d) => d.loss)).toFixed(1)}%`}
            note={trend(lately(trainer, (xs) => mean(xs.map((d) => d.loss))), '% of the pot', true)}
          />
          <Stat label="Best or close" value={pct(mean(trainer.map((d) => (d.loss < 0.5 ? 1 : 0))))} />
        </div>
        <Bars
          title="Lost per decision, % of the pot, by spot (worst first)"
          max={Math.max(0.1, ...groups(trainer, (d) => `${d.street}${d.facing}`).map(([, ds]) => mean(ds.map((d) => d.loss))))}
          rows={groups(trainer, (d) => `${STREET[d.street]}, ${d.facing ? 'facing a bet' : 'no bet to you'}`)
            .map(([spot, ds]) => ({ label: spot, value: mean(ds.map((d) => d.loss)), text: `${mean(ds.map((d) => d.loss)).toFixed(1)}%`, detail: `${spot}: ${ds.length} decisions` }))
            .sort((a, b) => b.value - a.value)}
        />
        <Bars
          title="Costliest habits (total % of the pot given up)"
          max={Math.max(0.1, ...groups(mistakes, (d) => `${d.chose}>${d.best}`).map(([, ds]) => ds.reduce((a, d) => a + d.loss, 0)))}
          rows={groups(mistakes, (d) => `${d.chose}>${d.best}`)
            .map(([, ds]) => ({ ds, total: ds.reduce((a, d) => a + d.loss, 0) }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 4)
            .map(({ ds, total }) => ({
              label: `${habit[ds[0].chose]}, ${ds[0].best === 'AllIn' ? 'all-in' : ds[0].best.toLowerCase()} was best`,
              value: total,
              text: `${total.toFixed(0)}%`,
              detail: `${ds.length} times, ${(total / ds.length).toFixed(1)}% of the pot each`,
            }))}
        />
      </Tool>

      <Tool title="Push/fold" to="/study/pushfold" count={pushfold.length}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Stat label="Answers" value={String(pushfold.length)} />
          <Stat label="Right" value={pct(accuracy(pushfold))} note={trend(lately(pushfold, accuracy) !== undefined ? lately(pushfold, accuracy)! * 100 : undefined, ' pts')} />
          <Stat label="Given up" value={`${pushfold.reduce((a, r) => a + r.loss, 0).toFixed(1)} bb`} />
        </div>
        <Bars
          title="Right, by spot (worst first)"
          max={1}
          rows={groups(pushfold, (r) => `${r.seat === 'SB' ? 'Shoving' : 'Calling'}, ${r.stack <= 7 ? '2–7' : r.stack <= 13 ? '8–13' : '14–20'} bb`, 3)
            .map(([spot, rs]) => ({ label: spot, value: accuracy(rs), text: pct(accuracy(rs)), detail: `${spot}: ${rs.filter((r) => r.right).length} of ${rs.length} right` }))
            .sort((a, b) => a.value - b.value)}
        />
      </Tool>

      <Tool title="Facing a raise" to="/study/facing" count={facing.length}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Stat label="Answers" value={String(facing.length)} />
          <Stat label="Right" value={pct(accuracy(facing))} note={trend(lately(facing, accuracy) !== undefined ? lately(facing, accuracy)! * 100 : undefined, ' pts')} />
          <Stat label="Given up" value={`${facing.reduce((a, r) => a + r.loss, 0).toFixed(1)} bb`} />
        </div>
        <Bars
          title="Right, by spot (worst first)"
          max={1}
          rows={groups(facing, (r) => `${r.seat ?? (r.node % 2 === 0 ? r.spot.split('-')[1] : r.spot.split('-')[0])} ${NODE[r.node]}`, 3)
            .map(([spot, rs]) => ({ label: spot, value: accuracy(rs), text: pct(accuracy(rs)), detail: `${spot}: ${rs.filter((r) => r.right).length} of ${rs.length} right` }))
            .sort((a, b) => a.value - b.value)}
        />
        <Bars
          title="Costliest habits (total bb given up)"
          max={Math.max(0.1, ...groups(facing.filter((r) => !r.right), (r) => `${r.chose}>${r.best}`).map(([, rs]) => rs.reduce((a, r) => a + r.loss, 0)))}
          rows={groups(facing.filter((r) => !r.right), (r) => `${r.chose}>${r.best}`)
            .map(([, rs]) => ({ rs, total: rs.reduce((a, r) => a + r.loss, 0) }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 4)
            .map(({ rs, total }) => ({
              label: `${habit[rs[0].chose] ?? rs[0].chose}, ${rs[0].best.toLowerCase()} was best`,
              value: total,
              text: `${total.toFixed(1)} bb`,
              detail: `${rs.length} times`,
            }))}
        />
      </Tool>

      <Tool title="Pot odds" to="/study/potodds" count={potodds.length}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Stat label="Answers" value={String(potodds.length)} />
          <Stat label="Right" value={pct(accuracy(potodds))} note={trend(lately(potodds, accuracy) !== undefined ? lately(potodds, accuracy)! * 100 : undefined, ' pts')} />
          <Stat label="Given up" value={`${potodds.reduce((a, r) => a + r.loss, 0).toFixed(1)} bb`} />
        </div>
        <Bars
          title="Right, by street (worst first)"
          max={1}
          rows={groups(potodds, (r) => STREET[r.street])
            .map(([street, rs]) => ({ label: street, value: accuracy(rs), text: pct(accuracy(rs)), detail: `${street}: ${rs.filter((r) => r.right).length} of ${rs.length} right` }))
            .sort((a, b) => a.value - b.value)}
        />
      </Tool>

      <Tool title="Daily flop" to="/study/daily" count={daily.length}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Stat label="Days played" value={String(daily.length)} />
          <Stat label="Lost per puzzle" value={`${mean(daily.map((d) => d.loss)).toFixed(1)}%`} note="of the pot" />
          <Stat label="Best play" value={pct(mean(daily.map((d) => (d.loss < 0.5 ? 1 : 0))))} />
        </div>
      </Tool>

      <Tool title="Range quiz" to="/study/quiz" count={quiz.length}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Stat label="Charts painted" value={String(quiz.length)} />
          <Stat label="Average score" value={pct(mean(quiz.map((q) => q.score)))} note={trend(lately(quiz, (xs) => mean(xs.map((q) => q.score))) !== undefined ? lately(quiz, (xs) => mean(xs.map((q) => q.score)))! * 100 : undefined, ' pts')} />
        </div>
        <Bars
          title="Your best score on each chart (worst first)"
          max={1}
          rows={groups(quiz, (q) => q.chart)
            .map(([chart, qs]) => {
              const best = Math.max(...qs.map((q) => q.score));
              const label = chart.startsWith('open-') ? `${chart.slice(5)} open` : `${chart.split('-')[2]} vs ${chart.split('-')[1]}: ${chart.startsWith('3bet') ? '3-bet' : 'play'}`;
              return { label, value: best, text: pct(best), detail: `${label}: ${qs.length} tries` };
            })
            .sort((a, b) => a.value - b.value)
            .slice(0, 8)}
        />
      </Tool>

      {preflop.length + equity.length + trainer.length + pushfold.length + potodds.length + facing.length + quiz.length + daily.length > 0 && (
        <button
          type="button"
          onClick={() => confirm('Clear all your progress? This can’t be undone.') && clear()}
          className="min-h-11 px-2 text-[15px] text-rose-400"
        >
          Clear progress
        </button>
      )}
    </>
  );
}
