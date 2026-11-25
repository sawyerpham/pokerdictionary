// Casino chips. Colors and design come from Settings (Vegas colors by default).
import type { CSSProperties } from 'react';
import { DENOMS, useSettings, type ChipDesign } from '../state/settingsStore';

export const money = (n: number) => `$${Math.round(n).toLocaleString()}`;

const isLight = (hex: string) => {
  const v = parseInt(hex.slice(1), 16);
  return 0.299 * (v >> 16) + 0.587 * ((v >> 8) & 255) + 0.114 * (v & 255) > 150;
};

/** One chip seen from slightly above: body color plus the edge design. */
export function chipCss(color: string, design: ChipDesign): CSSProperties {
  const contrast = isLight(color) ? '#1c1c1e' : '#ffffff';
  const edge = `color-mix(in srgb, ${color} 55%, black)`;
  const spot = `color-mix(in srgb, ${color} 35%, ${contrast})`;
  if (design === 'striped') return { background: `repeating-conic-gradient(${color} 0 30deg, ${spot} 30deg 45deg)`, border: `1px solid ${edge}` };
  if (design === 'solid') return { background: color, border: `1px solid ${edge}` };
  if (design === 'ring') return { background: `radial-gradient(ellipse, ${color} 38%, ${spot} 40% 52%, ${color} 54%)`, border: `1px solid ${edge}` };
  return { background: color, border: `1.5px dashed ${spot}` }; // classic inlaid edge spots
}

function useChipLook() {
  const colors = useSettings((s) => s.settings.chipColors);
  const design = useSettings((s) => s.settings.chipDesign);
  return (denom: number) => chipCss(colors[denom] ?? '#888888', design);
}

/** Greedy breakdown of `amount` into `denoms` (largest first), at most `cap` chips. */
function breakdown(amount: number, denoms: readonly number[], cap: number) {
  const out: number[] = [];
  let left = Math.round(amount);
  for (const d of denoms) {
    while (left >= d && out.length < cap) {
      out.push(d);
      left -= d;
    }
  }
  return out;
}

/** A bet: one short stack in standard denominations, with the amount beside it. */
export function ChipStack({ amount, label = true, className = '' }: { amount: number; label?: boolean; className?: string }) {
  const look = useChipLook();
  const chips = breakdown(amount, DENOMS, 7);
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <div className="relative w-4" style={{ height: 14 + chips.length * 3 }}>
        {chips.map((d, i) => (
          <span key={i} className="absolute left-0 h-[10px] w-4 rounded-[50%] shadow-[0_1px_1px_rgb(0_0_0/0.5)]" style={{ bottom: i * 3, ...look(d) }} />
        ))}
      </div>
      {label && <span className="rounded-full bg-black/45 px-1.5 text-[11px] font-semibold text-white tabular-nums">{money(amount)}</span>}
    </div>
  );
}

/**
 * A pile in the denominations a table at these stakes plays with (up to about 12 big blinds a chip),
 * one column per denomination, capped at `cols` columns of `perCol`.
 */
export function ChipPile({ amount, bb, cols = 3, perCol = 6 }: { amount: number; bb: number; cols?: number; perCol?: number }) {
  const look = useChipLook();
  const denoms = DENOMS.filter((d) => d <= bb * 12.5);
  const chips = breakdown(amount, denoms.length ? denoms : [1], 60);
  const columns: number[][] = [];
  for (const d of chips) {
    const last = columns[columns.length - 1];
    if (last && last[0] === d && last.length < perCol) last.push(d);
    else if (columns.length < cols) columns.push([d]);
  }
  return (
    <div className="flex items-end gap-px" aria-hidden>
      {columns.map((col, c) => (
        <div key={c} className="relative w-3.5" style={{ height: 8 + (col.length - 1) * 2.5 }}>
          {col.map((d, k) => (
            <span key={k} className="absolute left-0 h-2 w-3.5 rounded-[50%] shadow-[0_1px_1px_rgb(0_0_0/0.5)]" style={{ bottom: k * 2.5, ...look(d) }} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** A single large chip, for the Settings preview. */
export function ChipSwatch({ denom }: { denom: number }) {
  const look = useChipLook();
  return <span className="block h-7 w-7 rounded-full shadow-md shadow-black/50" style={look(denom)} />;
}

/** One chip seen from the side, for drawing tall stacks. */
export function ChipSide({ denom }: { denom: number }) {
  const look = useChipLook();
  return <span className="block h-3 w-8 rounded-[50%] shadow-[0_1px_1px_rgb(0_0_0/0.6)]" style={look(denom)} />;
}
