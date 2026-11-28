import { useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { combosOf } from '../engine/ranges';
import { SPOTS } from '../engine/facing';
import { HANDS } from '../engine/pushfold';
import { Grid } from '../guides/Preflop';
import { expandRange, RFI } from '../guides/rfi';
import { record } from '../state/progressStore';
import { BUTTON, Field, PANEL, Stats } from './ui';

// The charts to recall: each seat's opening range, and against an open, the hands that 3-bet and the hands that play
// on (call or 3-bet) more than half the time.
const CHARTS: { key: string; label: string; hands: Set<string> }[] = [
  ...RFI.map((r) => ({ key: `open-${r.seat}`, label: `${r.seat}: open`, hands: expandRange(r.range) })),
  ...Object.entries(SPOTS).flatMap(([key, s]) => {
    const [O, R] = key.split('-'), f = s.nodes[0].freq;
    const pick = (keep: (i: number) => boolean) => new Set(HANDS.filter((_, i) => keep(i)));
    return [
      { key: `3bet-${key}`, label: `${R} vs ${O} open: 3-bet`, hands: pick((i) => f[2][i] >= 50) },
      { key: `play-${key}`, label: `${R} vs ${O} open: call or 3-bet`, hands: pick((i) => f[0][i] < 50) },
    ];
  }),
];
const SELECT = 'min-h-11 rounded-[10px] bg-[var(--bg-third)] px-3 text-[15px] text-[var(--text-primary)]';
const sum = (hands: Iterable<string>) => [...hands].reduce((n, h) => n + combosOf(h), 0);

/** Paint a chart from memory, then see what you missed and what you added. Scored by combos. */
export function RangeQuiz() {
  const [chart, setChart] = useState(CHARTS[3]); // BTN open
  const [painted, setPainted] = useState<Set<string>>(new Set());
  const [checked, setChecked] = useState(false);
  const [hover, setHover] = useState<string>();
  const painting = useRef<boolean | null>(null); // a drag adds (true) or removes (false)

  const paint = (e: PointerEvent, start: boolean) => {
    if (checked) return;
    const h = (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)?.closest<HTMLElement>('[data-hand]')?.dataset.hand;
    if (!h) return;
    if (start) painting.current = !painted.has(h);
    const on = painting.current!;
    setPainted((old) => (old.has(h) === on ? old : new Set(on ? [...old, h] : [...old].filter((x) => x !== h))));
  };
  const pick = (c: (typeof CHARTS)[number]) => {
    setChart(c);
    setPainted(new Set());
    setChecked(false);
  };

  const target = chart.hands;
  const right = [...painted].filter((h) => target.has(h)), extra = [...painted].filter((h) => !target.has(h)), missed = [...target].filter((h) => !painted.has(h));
  // Share of the union you got right, by combos: missing a hand and adding one cost the same.
  const score = sum(target) + sum(extra) ? sum(right) / (sum(target) + sum(extra)) : 1;
  const check = () => {
    setChecked(true);
    record('quiz', { chart: chart.key, score });
  };

  const cell = (h: string) => {
    const on = painted.has(h), want = target.has(h);
    if (!checked) return { bg: on ? '#3a9450' : 'var(--bg-third)', ink: on ? '#ffffff' : 'rgb(235 235 245 / 0.45)', title: h };
    return on && want
      ? { bg: '#3a9450', ink: '#ffffff', title: `${h}: right` }
      : want
        ? { bg: '#c98500', ink: '#ffffff', title: `${h}: missed` }
        : on
          ? { bg: '#d25f56', ink: '#ffffff', title: `${h}: not in the chart` }
          : { bg: 'var(--bg-third)', ink: 'rgb(235 235 245 / 0.45)', title: h };
  };

  return (
    <section className={PANEL}>
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <Field label="Chart">
          <select className={SELECT} value={chart.key} onChange={(e) => pick(CHARTS.find((c) => c.key === e.target.value)!)}>
            {CHARTS.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
        <button type="button" onClick={() => pick(CHARTS[Math.floor(Math.random() * CHARTS.length)])} className="min-h-11 px-2 text-[15px] text-[var(--accent-soft)]">
          Random
        </button>
      </div>

      <p className="mb-2 min-h-6 text-center text-[15px] tabular-nums">
        {checked ? (
          <>
            <Stats
              items={[
                { value: `${Math.round(score * 100)}%`, label: 'score', tone: score >= 0.9 ? 'text-emerald-400' : score >= 0.75 ? 'text-amber-300' : 'text-rose-400' },
                { value: missed.length, label: 'missed' },
                { value: extra.length, label: 'extra' },
              ]}
            />
          </>
        ) : hover ? (
          hover
        ) : (
          `Paint every hand in “${chart.label}”. ${painted.size} painted so far.`
        )}
      </p>
      <div
        className="touch-none select-none"
        onPointerDown={(e) => paint(e, true)}
        onPointerMove={(e) => {
          if (e.buttons === 0) painting.current = null;
          else if (painting.current !== null) paint(e, false);
        }}
        onPointerUp={() => (painting.current = null)}
        onPointerCancel={() => (painting.current = null)}
      >
        <Grid cell={cell} onHover={setHover} />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
        {checked ? (
          <>
            <button type="button" onClick={() => pick(chart)} className={`${BUTTON} bg-[var(--bg-third)]`}>
              Try again
            </button>
            <button type="button" onClick={() => pick(CHARTS[Math.floor(Math.random() * CHARTS.length)])} className={`${BUTTON} bg-[var(--accent)] text-white`}>
              Next chart
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => setPainted(new Set())} className="min-h-11 px-2 text-[15px] text-[var(--text-muted)]">
              Clear
            </button>
            <button type="button" onClick={check} className={`${BUTTON} bg-[var(--accent)] text-white`}>
              Check
            </button>
          </>
        )}
      </div>
      {checked && (
        <div className="text-footnote mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1">
          {[
            ['#3a9450', 'Right'],
            ['#c98500', 'Missed'],
            ['#d25f56', 'Not in the chart'],
          ].map(([c, l]) => (
            <span key={l} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: c }} />
              {l}
            </span>
          ))}
        </div>
      )}
      <p className="text-footnote mt-3 text-[var(--text-muted)]">
        Tap or drag to paint; start on a painted hand to erase. The score counts combos: a missed hand and an extra hand cost the same, and pairs,
        suited and offsuit hands count 6, 4 and 12.{chart.key.startsWith('open') ? '' : ' Hands the chart mixes count as in when they take that action more than half the time.'}
      </p>
    </section>
  );
}
