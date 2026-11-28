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

/** A card's header: context on the left, the spot in the middle, a score or status on the right. */
export function InfoBar({ left, center, right }: { left?: ReactNode; center: ReactNode; right?: ReactNode }) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-[var(--line)] pb-3 text-[13px] text-[var(--text-muted)] tabular-nums">
      <span className="justify-self-start">{left}</span>
      <span className="text-center text-[14px] font-semibold text-[var(--text-primary)]">{center}</span>
      <span className="justify-self-end text-right">{right}</span>
    </div>
  );
}

const VERB = /^(raise to|all-in|bet|call|check|fold)\b\s*(.*)$/i;

/** The hand so far ("You: check", "CO: bet 1.8 bb", "Turn: K♦") as a row of chips; bets and raises stand out. */
export function ActionLog({ log, empty }: { log: string[]; empty: string }) {
  if (!log.length) return <p className="min-h-8 text-center text-[15px] leading-8 text-[var(--text-muted)]">{empty}</p>;
  return (
    <ol aria-label="Action so far" className="flex min-h-8 flex-wrap items-center justify-center gap-x-1 gap-y-2">
      {log.map((entry, i) => {
        const cut = entry.indexOf(': ');
        const who = entry.slice(0, cut), what = entry.slice(cut + 2);
        const m = what.match(VERB);
        const kind = m?.[1].toLowerCase();
        const big = kind === 'bet' || kind === 'raise to' || kind === 'all-in';
        const tone = !m
          ? 'ring-[var(--line)]'
          : big
            ? 'bg-amber-400/10 ring-amber-400/40 text-amber-200'
            : kind === 'fold'
              ? 'bg-rose-500/10 ring-rose-400/30 text-rose-300'
              : 'bg-white/[0.04] ring-[var(--line)]';
        return (
          <li key={i} className="flex items-center gap-1">
            {i > 0 && (
              <svg viewBox="0 0 6 10" aria-hidden className="h-2.5 w-1.5 text-[var(--text-muted)] opacity-60">
                <path d="M1 1l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            <span className={`inline-flex min-h-8 items-center gap-2 rounded-[8px] px-2.5 text-[14px] ring-1 ring-inset ${tone}`}>
              <span className="text-[11px] font-semibold tracking-[0.06em] text-[var(--text-muted)] uppercase">{who}</span>
              {m ? (
                <span>
                  {m[1][0].toUpperCase() + m[1].slice(1).toLowerCase()}
                  {m[2] && <strong className="ml-1 font-semibold tabular-nums">{m[2]}</strong>}
                </span>
              ) : (
                <strong className="font-semibold">{what}</strong>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** An action mix ("Fold 30%", "Call 70% +0.4 bb") as chips. */
export function Mix({ items }: { items: { label: string; value: string; note?: string; color?: string }[] }) {
  return (
    <span className="inline-flex flex-wrap items-center justify-center gap-1.5 align-middle">
      {items.map((it) => (
        <span key={it.label} className="inline-flex min-h-7 items-center gap-1.5 rounded-[8px] bg-white/[0.04] px-2 text-[13px] ring-1 ring-[var(--line)] ring-inset">
          {it.color && <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: it.color }} />}
          <span className="text-[var(--text-muted)]">{it.label}</span>
          <strong className="font-semibold text-[var(--text-primary)] tabular-nums">{it.value}</strong>
          {it.note && <span className="text-[var(--text-muted)] tabular-nums">{it.note}</span>}
        </span>
      ))}
    </span>
  );
}

/** A score readout: each number bold with its label beside it, split by thin rules. */
export function Stats({ items, className = '' }: { items: ({ value: ReactNode; label: string; tone?: string } | false | undefined)[]; className?: string }) {
  return (
    <span className={`inline-flex flex-wrap items-center gap-y-1 tabular-nums ${className}`}>
      {items.filter(Boolean).map((it, i) => {
        const { value, label, tone } = it as { value: ReactNode; label: string; tone?: string };
        return (
          <span key={label} className={`inline-flex items-baseline gap-1.5 ${i ? 'ml-3 border-l border-[var(--line)] pl-3' : ''}`}>
            <strong className={`text-[17px] font-semibold ${tone ?? 'text-[var(--text-primary)]'}`}>{value}</strong>
            <span className="text-[13px] text-[var(--text-muted)]">{label}</span>
          </span>
        );
      })}
    </span>
  );
}
