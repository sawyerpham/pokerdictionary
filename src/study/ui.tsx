// Pieces shared by the study tools.
import type { ReactNode } from 'react';
import { rankLabel, suitOf, SUITS, type Card } from '../engine/cards';
import type { Weights } from '../engine/ranges';
import { useStudy } from '../state/studyStore';

export const PANEL = 'rounded-[12px] bg-[var(--bg-second)] p-3 sm:p-5';
export const BUTTON = 'flex min-h-11 items-center justify-center rounded-full px-5 text-[15px] font-semibold transition hover:brightness-110 disabled:opacity-40';

/** "A♠", red for hearts and diamonds. */
export function CardText({ card }: { card: Card }) {
  const s = suitOf(card);
  return (
    <span className={s === 1 || s === 2 ? 'text-rose-400' : ''}>
      {rankLabel(card)}
      {SUITS[s]}
    </span>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-[13px] text-[var(--text-muted)]">
      {label}
      {children}
    </label>
  );
}

/** Picks one of your saved ranges by name. */
export function RangeSelect({ label, value, onChange }: { label: string; value: string; onChange: (name: string) => void }) {
  const ranges = useStudy((s) => s.ranges);
  return (
    <Field label={label}>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="min-h-11 rounded-[10px] bg-[var(--bg-third)] px-3 text-[15px] text-[var(--text-primary)]">
        {ranges.map((r) => (
          <option key={r.name} value={r.name}>
            {r.name}
          </option>
        ))}
      </select>
    </Field>
  );
}

/** A range shown on the 13×13 grid: each cell fills from the bottom by its weight. */
export const rangeCell = (w: Weights) => (h: string) => {
  const x = w[h] ?? 0;
  return {
    bg: x > 0 ? `linear-gradient(to top, #3a9450 ${x * 100}%, var(--bg-third) ${x * 100}%)` : 'var(--bg-third)',
    ink: x >= 0.5 ? '#ffffff' : 'rgb(235 235 245 / 0.45)',
    small: x > 0 && x < 1 ? `${Math.round(x * 100)}` : undefined,
    title: `${h}: ${Math.round(x * 100)}%`,
  };
};
