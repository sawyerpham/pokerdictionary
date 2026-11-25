import { useEffect, useMemo, useState } from 'react';
import { chipCss, money } from '../components/Chips';
import { Toggle } from '../components/RuleControls';
import { splitChips, type ChipColor } from '../engine/chipCalc';
import { useSettings } from '../state/settingsStore';

/** The chip colors you can pick from; picking one sets its name. */
const PALETTE: { name: string; color: string }[] = [
  { name: 'White', color: '#f2f2f7' },
  { name: 'Red', color: '#d42a2a' },
  { name: 'Blue', color: '#1f5fd1' },
  { name: 'Green', color: '#1f9d55' },
  { name: 'Black', color: '#1c1c1e' },
  { name: 'Purple', color: '#7d3fc6' },
  { name: 'Yellow', color: '#f0b429' },
  { name: 'Orange', color: '#f07c1f' },
  { name: 'Pink', color: '#f06aa5' },
  { name: 'Gray', color: '#8e8e93' },
  { name: 'Brown', color: '#8b5a2b' },
];
const colorOf = (name: string) => PALETTE.find((p) => p.name === name)?.color ?? '#8e8e93';

interface CalcState {
  players: number;
  buyIn: string; // dollars, as typed
  cheapestFirst: boolean;
  colors: { name: string; count: string; value: string }[]; // name is a PALETTE name
}

const DEFAULT: CalcState = {
  players: 6,
  buyIn: '200',
  cheapestFirst: false,
  colors: [
    { name: 'White', count: '100', value: '1' },
    { name: 'Red', count: '100', value: '5' },
    { name: 'Green', count: '50', value: '25' },
    { name: 'Black', count: '50', value: '100' },
  ],
};
const KEY = 'poker-chip-calculator';

function load(): CalcState {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? '');
    if (!saved?.colors) return DEFAULT;
    // Rows saved with free-typed names get the first unused palette color.
    const used = new Set<string>();
    const colors = saved.colors.map((c: CalcState['colors'][number]) => {
      const name = PALETTE.some((p) => p.name === c.name) && !used.has(c.name) ? c.name : (PALETTE.find((p) => !used.has(p.name))?.name ?? 'Gray');
      used.add(name);
      return { name, count: String(c.count), value: String(c.value) };
    });
    return { ...DEFAULT, ...saved, colors };
  } catch {
    return DEFAULT;
  }
}

const dollars = (cents: number) => (cents % 100 ? `$${(cents / 100).toFixed(2)}` : money(cents / 100));
const toCents = (s: string) => Math.round(parseFloat(s.replace(/[$,\s]/g, '')) * 100) || 0;
const toInt = (s: string) => Math.max(0, Math.floor(Number(s.replace(/[,\s]/g, ''))) || 0);

const STEP = 'hit relative flex h-7 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[var(--fill)] text-[19px] leading-none active:bg-white/25 disabled:opacity-40';
const INPUT = 'w-full min-w-0 rounded-[8px] bg-[var(--bg-main)] px-2 py-1 text-[15px] tabular-nums outline-none ring-1 ring-[var(--line)] focus:ring-[var(--accent)]';

/** A side-view stack of `n` chips in `color`, drawn in the chip design from Settings. */
function Stack({ n, color }: { n: number; color: string }) {
  const design = useSettings((s) => s.settings.chipDesign);
  const shown = Math.min(n, 25);
  return (
    <div className="relative w-9" style={{ height: 12 + Math.max(0, shown - 1) * 4 }} aria-hidden>
      {Array.from({ length: shown }, (_, k) => (
        <span key={k} className="absolute left-0 block h-3 w-9 rounded-[50%] shadow-[0_1px_1px_rgb(0_0_0/0.6),0_0_0_1px_rgb(255_255_255/0.18)]" style={{ bottom: k * 4, ...chipCss(color, design) }} />
      ))}
    </div>
  );
}

export function ChipsPage() {
  const [s, setS] = useState<CalcState>(load);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      /* private mode: the calculator still works, it just won't remember */
    }
  }, [s]);
  const setColor = (i: number, patch: Partial<CalcState['colors'][number]>) =>
    setS((cur) => ({ ...cur, colors: cur.colors.map((c, k) => (k === i ? { ...c, ...patch } : c)) }));

  const colors: ChipColor[] = s.colors.map((c) => ({ name: c.name, color: colorOf(c.name), count: toInt(c.count), cents: toCents(c.value) }));
  const buyIn = toCents(s.buyIn);
  const split = useMemo(() => splitChips(colors, s.players, buyIn, s.cheapestFirst), [JSON.stringify(colors), s.players, buyIn, s.cheapestFirst]); // eslint-disable-line react-hooks/exhaustive-deps
  const unused = PALETTE.filter((p) => !s.colors.some((c) => c.name === p.name));
  // Results always read from the cheapest chip to the most valuable, whatever order the set was entered in.
  const used = split
    ? colors.map((c, i) => ({ ...c, n: split.perPlayer[i], left: c.count - split.perPlayer[i] * s.players })).sort((x, y) => x.cents - y.cents)
    : [];
  const chipsEach = split ? split.perPlayer.reduce((a, b) => a + b, 0) : 0;
  // Full extra buy-ins the leftover chips can cover, for rebuys.
  const rebuys = split ? Math.min(...used.filter((c) => c.n > 0).map((c) => Math.floor(c.left / c.n))) : 0;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-4 sm:py-8">
      <h1 className="text-large-title mb-3 px-1">Chip Calculator</h1>

      <div className="grid items-start gap-4 lg:grid-cols-[1fr_24rem]">
        {/* Inputs */}
        <section className="rounded-[12px] bg-[var(--bg-second)] p-3 sm:p-4">
          <h2 className="card-title">Your game</h2>
          <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 border-b border-[var(--line)] pb-3">
            <div className="flex items-center gap-2">
              <span className="text-[15px]">Players</span>
              <button type="button" aria-label="Fewer players" disabled={s.players <= 2} onClick={() => setS({ ...s, players: s.players - 1 })} className={STEP}>
                −
              </button>
              <span className="w-6 text-center text-[17px] font-semibold tabular-nums">{s.players}</span>
              <button type="button" aria-label="More players" disabled={s.players >= 20} onClick={() => setS({ ...s, players: s.players + 1 })} className={STEP}>
                +
              </button>
            </div>
            <label className="flex items-center gap-1.5 text-[15px] whitespace-nowrap">
              Buy-in <span className="text-[var(--text-muted)]">$</span>
              <span className="w-20">
                <input aria-label="Buy-in in dollars" inputMode="decimal" value={s.buyIn} onChange={(e) => setS({ ...s, buyIn: e.target.value })} className={INPUT} />
              </span>
            </label>
            <label className="flex items-center gap-2 text-[15px]">
              Cheapest first
              <Toggle label="Cheapest chips first" checked={s.cheapestFirst} onChange={(v) => setS({ ...s, cheapestFirst: v })} />
            </label>
          </div>

          <div className="text-caption mb-1 grid grid-cols-[1.75rem_1fr_4.5rem_5.5rem_1.75rem] gap-1.5 text-[var(--text-muted)] sm:gap-2">
            <span />
            <span>Color</span>
            <span>In set</span>
            <span>Value</span>
            <span />
          </div>
          <div className="space-y-1.5">
            {s.colors.map((c, i) => (
              <div key={i} className="grid grid-cols-[1.75rem_1fr_4.5rem_5.5rem_1.75rem] items-center gap-1.5 sm:gap-2">
                <span className="h-7 w-7 rounded-full ring-1 ring-white/25" style={{ background: colorOf(c.name) }} aria-hidden />
                <select aria-label="Chip color" value={c.name} onChange={(e) => setColor(i, { name: e.target.value })} className={`${INPUT} cursor-pointer`}>
                  {PALETTE.map((p) => (
                    <option key={p.name} value={p.name} disabled={p.name !== c.name && s.colors.some((o) => o.name === p.name)} className="bg-[var(--bg-second)]">
                      {p.name}
                    </option>
                  ))}
                </select>
                <input aria-label={`${c.name} chips in set`} inputMode="numeric" value={c.count} onChange={(e) => setColor(i, { count: e.target.value })} className={INPUT} />
                <label className="flex items-center gap-1">
                  <span className="text-[15px] text-[var(--text-muted)]">$</span>
                  <input aria-label={`${c.name} value in dollars`} inputMode="decimal" value={c.value} onChange={(e) => setColor(i, { value: e.target.value })} className={INPUT} />
                </label>
                <button
                  type="button"
                  aria-label={`Remove ${c.name}`}
                  onClick={() => setS({ ...s, colors: s.colors.filter((_, k) => k !== i) })}
                  className="hit relative flex h-7 w-7 items-center justify-center rounded-full text-[19px] text-[var(--text-muted)] hover:text-rose-400"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div className="mt-1 flex items-center justify-between">
            <button
              type="button"
              disabled={!unused.length}
              onClick={() => setS({ ...s, colors: [...s.colors, { name: unused[0].name, count: '25', value: '500' }] })}
              className="min-h-11 text-[15px] text-[var(--accent)] disabled:text-[var(--text-muted)]"
            >
              Add Color
            </button>
            <button type="button" onClick={() => setS(DEFAULT)} className="min-h-11 text-[15px] text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              Reset
            </button>
          </div>
        </section>

        {/* Result */}
        <section aria-live="polite" className="rounded-[12px] bg-[var(--bg-second)] p-4 lg:sticky lg:top-20">
          <h2 className="card-title">Each player gets</h2>
          {!split ? (
            <p className="py-6 text-center text-[15px] text-[var(--text-muted)]">
              {buyIn <= 0 ? 'Enter a buy-in.' : 'Not enough chips for this many players.'}
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-end justify-center gap-5">
                {used
                  .filter((c) => c.n > 0)
                  .map((c) => (
                    <div key={c.name} className="flex flex-col items-center gap-1.5" title={`${c.name}: ${c.n} each, ${c.left} left in the set`}>
                      <Stack n={c.n} color={c.color} />
                      <span className="text-[17px] font-semibold tabular-nums">{c.n}</span>
                      <span className="text-caption text-[var(--text-muted)] tabular-nums">{dollars(c.cents)}</span>
                    </div>
                  ))}
              </div>
              <p className="mt-4 text-center text-[17px] tabular-nums">
                <strong>{chipsEach} chips</strong> worth <strong>{dollars(split.value)}</strong>
              </p>
              {!split.exact && (
                <p className="text-footnote mt-1 text-center text-amber-300">Can't make {dollars(buyIn)} exactly with these chips.</p>
              )}
              <p className="text-footnote mt-3 border-t border-[var(--line)] pt-3 text-[var(--text-muted)] tabular-nums">
                Left over: {used.map((c) => `${c.left} ${c.name.toLowerCase()}`).join(', ')}
                {rebuys > 0 ? `, enough for ${rebuys} rebuy${rebuys === 1 ? '' : 's'}.` : '. Not enough for a rebuy.'}
              </p>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
