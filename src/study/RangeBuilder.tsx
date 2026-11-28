import { useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { INPUT, Segmented } from '../components/RuleControls';
import { combosOf, rangeShare, type Weights } from '../engine/ranges';
import { Grid } from '../guides/Preflop';
import { useStudy } from '../state/studyStore';
import { BUTTON, PANEL, rangeCell } from './ui';

const BRUSHES = [
  { value: 1, label: '100%' },
  { value: 0.75, label: '75%' },
  { value: 0.5, label: '50%' },
  { value: 0.25, label: '25%' },
  { value: 0, label: 'Erase' },
];

/** Paint a range onto the grid (tap or drag), then save it by name for the other tools. */
export function RangeBuilder() {
  const { ranges, saveRange, deleteRange } = useStudy();
  const [name, setName] = useState(ranges[0]?.name ?? 'My range');
  const [weights, setWeights] = useState<Weights>(ranges[0]?.weights ?? {});
  const [brush, setBrush] = useState(1);
  const [hover, setHover] = useState<string>();
  const painting = useRef<number | null>(null); // the weight a drag is painting

  const paint = (e: PointerEvent, start: boolean) => {
    const cell = (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)?.closest<HTMLElement>('[data-hand]');
    const h = cell?.dataset.hand;
    if (!h) return;
    // Starting on a hand that already has this weight clears it instead, so a second tap undoes the first.
    if (start) painting.current = (weights[h] ?? 0) === brush ? 0 : brush;
    const w = painting.current!;
    setWeights((old) => (old[h] === w ? old : { ...old, [h]: w }));
  };

  const load = (n: string) => {
    setName(n);
    setWeights(ranges.find((r) => r.name === n)?.weights ?? {});
  };
  const saved = ranges.some((r) => r.name === name.trim());
  const save = () => saveRange({ name: name.trim(), weights: Object.fromEntries(Object.entries(weights).filter(([, x]) => x > 0)) });
  const combos = Object.entries(weights).reduce((n, [h, x]) => n + x * combosOf(h), 0);

  return (
    <section className={PANEL}>
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <select
          aria-label="Saved ranges"
          value={saved ? name.trim() : ''}
          onChange={(e) => load(e.target.value)}
          className="min-h-11 min-w-0 flex-1 rounded-[10px] bg-[var(--bg-third)] px-3 text-[15px]"
        >
          {!saved && <option value="">Unsaved</option>}
          {ranges.map((r) => (
            <option key={r.name} value={r.name}>
              {r.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => {
            setName(`Range ${ranges.length + 1}`);
            setWeights({});
          }}
          className="min-h-11 px-2 text-[15px] text-[var(--accent-soft)]"
        >
          New
        </button>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input aria-label="Range name" value={name} onChange={(e) => setName(e.target.value)} className={`${INPUT} min-h-11 flex-1 basis-40`} />
        <button type="button" onClick={save} disabled={!name.trim()} className={`${BUTTON} bg-[var(--accent)] text-white`}>
          Save
        </button>
        {saved && (
          <button type="button" onClick={() => deleteRange(name.trim())} className="min-h-11 px-2 text-[15px] text-rose-400">
            Delete
          </button>
        )}
      </div>

      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <Segmented label="Brush" value={brush} options={BRUSHES} onChange={setBrush} />
        <button type="button" onClick={() => setWeights({})} className="min-h-11 px-2 text-[15px] text-[var(--text-muted)]">
          Clear
        </button>
      </div>

      <p className="mb-2 min-h-6 text-center text-[15px] tabular-nums">
        {hover
          ? `${hover}: ${Math.round((weights[hover] ?? 0) * 100)}%`
          : `${(rangeShare(weights) * 100).toFixed(1)}% of hands · ${Math.round(combos * 10) / 10} combos`}
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
        <Grid cell={rangeCell(weights)} onHover={setHover} />
      </div>
    </section>
  );
}
