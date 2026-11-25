import { useEffect, useMemo, useState } from 'react';
import { chipCss, money } from '../components/Chips';
import { Group, Row, SectionHeader } from '../components/RuleControls';
import { splitChips, type ChipColor } from '../engine/chipCalc';
import { useSettings } from '../state/settingsStore';

interface CalcState {
  players: number;
  buyIn: string; // dollars, as typed
  colors: { name: string; color: string; count: string; value: string }[];
}

const DEFAULT: CalcState = {
  players: 6,
  buyIn: '200',
  colors: [
    { name: 'White', color: '#f2f2f7', count: '100', value: '1' },
    { name: 'Red', color: '#d42a2a', count: '100', value: '5' },
    { name: 'Green', color: '#1f9d55', count: '50', value: '25' },
    { name: 'Black', color: '#1c1c1e', count: '50', value: '100' },
  ],
};
const KEY = 'poker-chip-calculator';

function load(): CalcState {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? '');
    return s?.colors ? s : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

const dollars = (cents: number) => (cents % 100 ? `$${(cents / 100).toFixed(2)}` : money(cents / 100));
const toCents = (s: string) => Math.round(parseFloat(s.replace(/[$,\s]/g, '')) * 100) || 0;
const toInt = (s: string) => Math.max(0, Math.floor(Number(s.replace(/[,\s]/g, ''))) || 0);

const STEP = 'flex h-8 w-9 items-center justify-center rounded-[8px] bg-[var(--fill)] text-[19px] leading-none active:bg-white/25 disabled:opacity-40';
const INPUT = 'w-full min-w-0 rounded-[8px] bg-[var(--bg-main)] px-2.5 py-1.5 text-[17px] tabular-nums outline-none ring-1 ring-[var(--line)] focus:ring-[var(--accent)]';

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

  const colors: ChipColor[] = s.colors.map((c) => ({ name: c.name, color: c.color, count: toInt(c.count), cents: toCents(c.value) }));
  const buyIn = toCents(s.buyIn);
  const split = useMemo(() => splitChips(colors, s.players, buyIn), [JSON.stringify(colors), s.players, buyIn]); // eslint-disable-line react-hooks/exhaustive-deps
  const used = split ? colors.map((c, i) => ({ ...c, n: split.perPlayer[i], left: c.count - split.perPlayer[i] * s.players })) : [];
  const chipsEach = split ? split.perPlayer.reduce((a, b) => a + b, 0) : 0;
  // Full extra buy-ins the leftover chips can cover, for rebuys.
  const rebuys = split ? Math.min(...used.filter((c) => c.n > 0).map((c) => Math.floor(c.left / c.n))) : 0;
  const setValue = colors.reduce((a, c) => a + c.count * c.cents, 0);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:py-12">
      <h1 className="text-large-title mb-8 px-1">Chip Calculator</h1>

      <div className="space-y-8">
        <Group title="The game">
          <Row title="Players">
            <div className="flex items-center gap-2">
              <button type="button" aria-label="Fewer players" disabled={s.players <= 2} onClick={() => setS({ ...s, players: s.players - 1 })} className={STEP}>
                −
              </button>
              <span className="w-6 text-center text-[17px] font-semibold tabular-nums">{s.players}</span>
              <button type="button" aria-label="More players" disabled={s.players >= 20} onClick={() => setS({ ...s, players: s.players + 1 })} className={STEP}>
                +
              </button>
            </div>
          </Row>
          <Row title="Buy-in" hint="What each player pays">
            <label className="flex w-32 items-center gap-1">
              <span className="text-[17px] text-[var(--text-muted)]">$</span>
              <input aria-label="Buy-in in dollars" inputMode="decimal" value={s.buyIn} onChange={(e) => setS({ ...s, buyIn: e.target.value })} className={INPUT} />
            </label>
          </Row>
        </Group>

        <section>
          <SectionHeader>Your chip set</SectionHeader>
          <div className="overflow-hidden rounded-[10px] bg-[var(--bg-second)]">
            <div className="text-caption hidden grid-cols-[2.5rem_1fr_6rem_6rem_2rem] gap-2 px-4 pt-3 text-[var(--text-muted)] sm:grid">
              <span>Color</span>
              <span>Name</span>
              <span>Chips in set</span>
              <span>Value each</span>
              <span />
            </div>
            {s.colors.map((c, i) => (
              <div key={i} className="grid grid-cols-[2.5rem_1fr_2rem] items-center gap-2 px-4 py-2.5 [&+&]:border-t [&+&]:border-[var(--line)] sm:grid-cols-[2.5rem_1fr_6rem_6rem_2rem]">
                <input type="color" aria-label={`${c.name} color`} value={c.color} onChange={(e) => setColor(i, { color: e.target.value })} className="h-9 w-9 cursor-pointer rounded-full bg-transparent" />
                <input aria-label="Color name" value={c.name} onChange={(e) => setColor(i, { name: e.target.value })} className={INPUT} />
                <button
                  type="button"
                  aria-label={`Remove ${c.name}`}
                  onClick={() => setS({ ...s, colors: s.colors.filter((_, k) => k !== i) })}
                  className="flex h-8 w-8 items-center justify-center justify-self-end rounded-full text-[19px] text-[var(--text-muted)] hover:text-rose-400 sm:order-last"
                >
                  ×
                </button>
                <label className="col-span-3 flex items-center gap-2 sm:col-span-1">
                  <span className="text-caption w-20 text-[var(--text-muted)] sm:hidden">Chips in set</span>
                  <input aria-label={`${c.name} chips in set`} inputMode="numeric" value={c.count} onChange={(e) => setColor(i, { count: e.target.value })} className={INPUT} />
                </label>
                <label className="col-span-3 flex items-center gap-2 sm:col-span-1">
                  <span className="text-caption w-20 text-[var(--text-muted)] sm:hidden">Value each</span>
                  <span className="text-[17px] text-[var(--text-muted)]">$</span>
                  <input aria-label={`${c.name} value in dollars`} inputMode="decimal" value={c.value} onChange={(e) => setColor(i, { value: e.target.value })} className={INPUT} />
                </label>
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between px-4">
            <button
              type="button"
              onClick={() => setS({ ...s, colors: [...s.colors, { name: `Color ${s.colors.length + 1}`, color: '#7d3fc6', count: '25', value: '500' }] })}
              className="min-h-11 text-[17px] text-[var(--accent)]"
            >
              Add color
            </button>
            <button type="button" onClick={() => setS(DEFAULT)} className="min-h-11 text-[15px] text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              Reset
            </button>
          </div>
          <p className="text-footnote px-4 text-[var(--text-muted)] tabular-nums">
            Whole set: {colors.reduce((a, c) => a + c.count, 0)} chips worth {dollars(setValue)}.
          </p>
        </section>

        <section aria-live="polite">
          <SectionHeader>Each player gets</SectionHeader>
          <div className="rounded-[12px] bg-[var(--bg-second)] p-4 sm:p-5">
            {!split ? (
              <p className="py-6 text-center text-[15px] text-[var(--text-muted)]">
                {buyIn <= 0 ? 'Enter a buy-in.' : 'Not enough chips for this many players. Add chips or colors, or lower the player count.'}
              </p>
            ) : (
              <>
                <div className="flex flex-wrap items-end justify-center gap-6 sm:gap-8">
                  {used
                    .filter((c) => c.n > 0)
                    .map((c) => (
                      <div key={c.name + c.color} className="flex flex-col items-center gap-2">
                        <Stack n={c.n} color={c.color} />
                        <span className="text-[17px] font-semibold tabular-nums">{c.n}</span>
                        <span className="text-caption text-center text-[var(--text-muted)] tabular-nums">
                          {c.name} · {dollars(c.cents)}
                        </span>
                      </div>
                    ))}
                </div>
                <p className="mt-5 text-center text-[17px] tabular-nums">
                  <strong>{chipsEach} chips</strong> worth <strong>{dollars(split.value)}</strong> per player
                </p>
                {!split.exact && (
                  <p className="text-footnote mt-2 text-center text-amber-300">
                    These chips can't make exactly {dollars(buyIn)}. This is the closest stack below it. Try a buy-in that's a multiple of
                    your smallest chip, or add more small chips.
                  </p>
                )}
                <table className="mt-5 w-full text-[13px] tabular-nums">
                  <thead>
                    <tr className="text-caption text-left text-[var(--text-muted)]">
                      <th className="py-1 font-medium">Color</th>
                      <th className="py-1 text-right font-medium">Each player</th>
                      <th className="py-1 text-right font-medium">All players</th>
                      <th className="py-1 text-right font-medium">Left in set</th>
                    </tr>
                  </thead>
                  <tbody>
                    {used.map((c) => (
                      <tr key={c.name + c.color} className="border-t border-[var(--line)]">
                        <td className="py-1.5">
                          <span className="flex items-center gap-2">
                            <span className="h-3 w-3 rounded-full ring-1 ring-white/20" style={{ background: c.color }} />
                            {c.name} ({dollars(c.cents)})
                          </span>
                        </td>
                        <td className="py-1.5 text-right">{c.n}</td>
                        <td className="py-1.5 text-right">{c.n * s.players}</td>
                        <td className="py-1.5 text-right">{c.left}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-footnote mt-3 text-[var(--text-muted)]">
                  {rebuys > 0
                    ? `The leftover chips cover ${rebuys} more full buy-in${rebuys === 1 ? '' : 's'} for rebuys.`
                    : 'No full buy-ins left over for rebuys.'}
                </p>
              </>
            )}
          </div>
          <p className="text-footnote mt-2 px-4 text-[var(--text-muted)]">
            Stacks lean on the smaller chips, since players need them to make change, and use every color that fits.
          </p>
        </section>
      </div>
    </main>
  );
}
