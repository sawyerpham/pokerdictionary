import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { equity } from '../engine/cards';
import { legal, totalPot, type Table } from '../engine/holdem';
import { money } from '../components/Chips';
import { ActionBar, at, dealOrderOf, Felt, HandLog, positionNames } from '../components/Felt';
import { ProfitTracker } from '../components/ProfitTracker';
import { Segmented, Toggle } from '../components/RuleControls';
import { ms, setMotion } from '../components/motion';
import { MAX_PLAYERS, STAKES, useSettings } from '../state/settingsStore';
import { BotPicker, cardOf } from '../components/BotPicker';
import { TableSettings } from '../components/TableSettings';
import { LiveEvaluator } from '../components/LiveEvaluator';
import { useTable, YOU, type Mode } from '../state/useTable';

function Stat({ label, children, onClick, title }: { label: string; children: ReactNode; onClick?: () => void; title?: string }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      title={title}
      onClick={onClick}
      className={`flex min-w-0 flex-col justify-start rounded-lg px-3 py-2 text-left ${onClick ? 'transition-colors hover:bg-white/[0.05]' : ''}`}
    >
      <p className="text-caption text-[var(--text-muted)]">{label}</p>
      <div className="flex min-h-7 items-center text-[15px] font-semibold tabular-nums">{children}</div>
    </Tag>
  );
}

const STEP_BTN =
  'hit relative flex h-7 w-8 shrink-0 items-center justify-center rounded-[7px] bg-[var(--fill)] text-[17px] leading-none transition-colors active:bg-white/25 disabled:opacity-40';

/** Tap a player's name: their chips on a slider, and a way to swap them for someone else. */
function SeatMenu({
  t,
  i,
  name,
  pending,
  color,
  card,
  at: pos,
  onStack,
  onReplace,
  onClose,
}: {
  t: Table;
  i: number;
  name: string;
  pending?: number;
  color: string;
  card?: { rank: string; suit: string; ink: string };
  at: { left: string; top: string };
  onStack: (amount: number) => void;
  onReplace?: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const seat = t.seats[i];
  const midHand = t.street !== 'idle' && t.street !== 'done';
  const value = pending ?? seat.stack;
  // Close on a tap anywhere else, or Escape.
  useEffect(() => {
    const away = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node) && !(e.target as HTMLElement).closest('[aria-label$="seat options"]')) onClose();
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('pointerdown', away);
    window.addEventListener('keydown', esc);
    return () => {
      window.removeEventListener('pointerdown', away);
      window.removeEventListener('keydown', esc);
    };
  }, [onClose]);
  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={`${name}: seat options`}
      className="absolute z-30 w-60 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[16px] bg-[#f7f4ea] text-zinc-900 shadow-[0_12px_30px_rgb(0_0_0/0.6),inset_0_-4px_0_rgb(0_0_0/0.1)]"
      style={pos}
    >
      <div className="flex items-center gap-2 px-3 py-2 text-white" style={{ background: `color-mix(in srgb, ${color} 75%, #111)` }}>
        {card && (
          <span className="rounded bg-[#f7f4ea] px-1 text-[13px] font-black" style={{ color: card.ink }}>
            {card.rank}
            {card.suit}
          </span>
        )}
        <span className="flex-1 truncate text-[15px] font-black tracking-wide uppercase">{name}</span>
        <button type="button" onClick={onClose} aria-label="Close" className="hit relative flex h-7 w-7 items-center justify-center rounded-full bg-black/35 text-[13px] font-black">
          ✕
        </button>
      </div>
      <div className="p-3">
        <div className="flex items-baseline justify-between">
          <label htmlFor={`stack-${i}`} className="text-[11px] font-black tracking-widest text-zinc-500 uppercase">
            Chips
          </label>
          <span className="text-[20px] font-black tabular-nums">{money(value)}</span>
        </div>
        <input
          id={`stack-${i}`}
          type="range"
          min={t.bb}
          max={Math.max(500 * t.bb, value)}
          step={t.bb}
          value={value}
          onChange={(e) => onStack(Number(e.target.value))}
          className="w-full accent-zinc-900"
        />
        {midHand && <p className="text-[12px] text-zinc-500">Takes effect next hand.</p>}
        {onReplace && (
          <button type="button" onClick={onReplace} className="mt-2 min-h-11 w-full rounded-full bg-[var(--accent)] text-[13px] font-black text-white uppercase">
            Replace Player
          </button>
        )}
      </div>
    </div>
  );
}

/** Equity vs. the live opponents' random hands, hidden until tapped (like the blackjack Optimal hint). */
function EquityHint({ t, youIdx }: { t: Table; youIdx: number }) {
  const [shown, setShown] = useState(false);
  const seat = t.seats[youIdx];
  const opponents = t.seats.filter((s, i) => s.inHand && i !== youIdx).length;
  const eq = useMemo(
    () => (seat?.inHand && seat.hole.length === 2 && opponents > 0 ? equity(seat.hole, t.board, opponents, 1500) : undefined),
    // Recompute per street and per opponent count, not on every bet.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t.handNo, t.board.length, opponents, seat?.inHand],
  );
  const L = legal(t);
  const odds = L && L.toCall > 0 && t.seats[t.toAct!]?.id === YOU ? L.toCall / (totalPot(t) + L.toCall) : undefined;
  return (
    <button
      type="button"
      onClick={() => setShown((v) => !v)}
      className="min-h-11 rounded-md px-2 py-1 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
      title="Click to show or hide"
    >
      Equity:{' '}
      <span className={`font-medium text-[var(--accent-soft)] tabular-nums transition-all ${shown ? '' : 'blur-sm'}`}>
        {eq === undefined ? '—' : `${(eq * 100).toFixed(0)}%`}
      </span>
      {odds !== undefined && (
        <span className="ml-3 border-l border-[var(--line)] pl-3 tabular-nums">
          Pot odds <span className="font-medium text-[var(--text-primary)]">{(odds * 100).toFixed(0)}%</span>
        </span>
      )}
    </button>
  );
}

function Leaderboard({ t, net, name }: { t: Table; net: Record<string, number>; name: (i: number) => string }) {
  const rows = t.seats.map((s, i) => ({ i, name: name(i), stack: s.stack, net: net[`${i}:${s.id}`] ?? 0 })).sort((a, b) => b.net - a.net);
  return (
    <section className="rounded-[12px] bg-[var(--bg-second)] p-4">
      <h2 className="card-title">Session results</h2>
      <table className="w-full text-[13px] tabular-nums">
        <tbody>
          {rows.map((r) => (
            <tr key={r.i} className="border-t border-[var(--line)] first:border-0">
              <td className="py-1.5">{r.name}</td>
              <td className="py-1.5 text-right text-[var(--text-muted)]">{money(r.stack)}</td>
              <td className={`w-20 py-1.5 text-right font-semibold ${r.net > 0 ? 'text-emerald-400' : r.net < 0 ? 'text-rose-400' : ''}`}>
                {r.net > 0 ? '+' : r.net < 0 ? '−' : ''}
                {money(Math.abs(r.net))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export function TablePage() {
  const settings = useSettings((s) => s.settings);
  const custom = useSettings((s) => s.custom);
  const update = useSettings((s) => s.update);
  setMotion(settings.animations, settings.speed);
  const { session, profile, youAct, setPaused, setMode, start, reset, rebuy, resetProfit, setStack } = useTable();
  const [menu, setMenu] = useState<number>(); // seat whose quick menu is open
  const opponents = useSettings((s) => s.opponents);
  const unseat = useSettings((s) => s.unseat);
  const [picking, setPicking] = useState<number>(); // opponent slot the picker is choosing for
  const t = session.table;
  const mode = session.mode;
  const setup = !session.started;
  const offset = mode === 'play' ? 1 : 0; // seat index of opponent 0
  const minOpponents = mode === 'play' ? 1 : 2;
  const canAdd = t.seats.length < MAX_PLAYERS;
  const slots = setup && canAdd ? t.seats.length + 1 : t.seats.length; // setup lays out an extra "Add player" seat
  const youIdx = t.seats.findIndex((s) => s.id === YOU);
  const you = youIdx >= 0 ? t.seats[youIdx] : undefined;
  // Settled once the last step's animations (deal, chips, board) have played.
  const [settledOn, setSettledOn] = useState<Table>();
  useEffect(() => {
    const h = setTimeout(() => setSettledOn(t), ms(session.busy));
    return () => clearTimeout(h);
  }, [t, session.busy]);
  const settled = settledOn === t;
  const yourTurn = t.toAct !== null && t.toAct === youIdx && settled;
  const name = (i: number) => (t.seats[i].id === YOU ? 'You' : profile(t.seats[i].id).name);
  const stakeIdx = Math.max(0, STAKES.findIndex((x) => x.bb === settings.bb));

  const positions = useMemo(() => positionNames(dealOrderOf(t), t.button), [t]);

  const showAll = mode === 'spectate' && settings.spectateShowCards;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-3 py-6 sm:px-4 sm:py-8">
      {/* Table controls */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-[12px] bg-[var(--bg-second)] p-1.5">
        <div className="flex w-full justify-between sm:w-auto sm:justify-start">
          {mode === 'play' && you && !setup && (
            <Stat label="Stack">
              {(you.stack === 0 && t.street === 'done') || you.sittingOut ? (
                <button type="button" onClick={rebuy} className="text-[var(--accent-soft)]">
                  Rebuy {money(settings.buyInBb * settings.bb)}
                </button>
              ) : (
                money(you.stack)
              )}
            </Stat>
          )}
          {mode === 'play' && setup && (
            <Stat label="Buy-in">
              <div className="flex items-center gap-1.5">
                <button type="button" aria-label="Lower buy-in" disabled={settings.buyInBb <= 20} onClick={() => update({ buyInBb: settings.buyInBb - 20 })} className={STEP_BTN}>
                  −
                </button>
                <span className="min-w-12 text-center">{money(settings.buyInBb * settings.bb)}</span>
                <button type="button" aria-label="Raise buy-in" disabled={settings.buyInBb >= 500} onClick={() => update({ buyInBb: settings.buyInBb + 20 })} className={STEP_BTN}>
                  +
                </button>
              </div>
            </Stat>
          )}
          <Stat label="Blinds" title={setup ? 'Click to change stakes' : undefined} onClick={setup ? () => update(STAKES[(stakeIdx + 1) % STAKES.length]) : undefined}>
            {money(settings.sb)}/{money(settings.bb)}
          </Stat>
          <Stat label="Players">{t.seats.length}</Stat>
        </div>
        <div className="flex w-full flex-wrap items-center justify-end gap-1.5 border-t border-[var(--line)] pt-1.5 pr-1 sm:w-auto sm:border-0 sm:pt-0">
          {setup && (
          <Segmented<Mode>
            label="Mode"
            value={mode}
            options={[
              { value: 'play', label: 'Play' },
              { value: 'spectate', label: 'Spectate' },
            ]}
            onChange={setMode}
          />
          )}
          {mode === 'spectate' && (
            <label className="flex min-h-11 items-center gap-2 px-2 text-[15px]">
              Cards
              <Toggle label="Show all hole cards" checked={settings.spectateShowCards} onChange={(v) => update({ spectateShowCards: v })} />
            </label>
          )}
          {!setup && mode === 'spectate' && (
            <Segmented
              label="Speed"
              value={settings.speed}
              options={[0.5, 1, 2, 4].map((v) => ({ value: v, label: `${v === 0.5 ? '½' : v}×` }))}
              onChange={(v) => update({ speed: v })}
            />
          )}
          {!setup && (
            <>
              <button
                type="button"
                onClick={() => setPaused(!session.paused)}
                className="min-h-11 min-w-20 rounded-[9px] bg-[var(--accent)] px-3 text-[15px] font-semibold text-white transition hover:brightness-110 active:scale-[0.97]"
              >
                {session.paused ? 'Resume' : 'Pause'}
              </button>
              <button
                type="button"
                onClick={reset}
                className="min-h-11 rounded-[9px] bg-[var(--fill)] px-3 text-[15px] font-semibold text-rose-400 transition hover:brightness-125 active:scale-[0.97]"
              >
                Reset Game
              </button>
            </>
          )}
          <TableSettings />
        </div>
      </div>

      {/* The table */}
      <Felt
        t={t}
        youIdx={youIdx}
        slots={slots}
        who={(i) => (t.seats[i].id === YOU ? undefined : profile(t.seats[i].id))}
        faceUp={(i) => t.seats[i].id === YOU || showAll || t.street === 'done'}
        thinking={(i) => settled && t.toAct === i && t.seats[i].id !== YOU && !session.paused}
        yourTurn={yourTurn}
        showPositions={settings.showPositions}
        onMenu={(i) => setMenu(menu === i ? undefined : i)}
        onRemove={(i) => (setup && t.seats[i].id !== YOU && opponents.length > minOpponents ? () => unseat(i - offset) : undefined)}
      >
        {setup && canAdd && (
          <button
            type="button"
            onClick={() => setPicking(opponents.length)}
            aria-label="Add a player"
            className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center text-[var(--accent-soft)] active:opacity-50"
            style={at(t.seats.length, slots)}
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-dashed border-[var(--accent)]/70 bg-black/30">
              {/* Drawn, not a "+" glyph, so it sits dead centre. */}
              <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden>
                <path d="M8 1v14M1 8h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </span>
          </button>
        )}
        {menu !== undefined && t.seats[menu] && (
          <SeatMenu
            key={menu}
            t={t}
            i={menu}
            name={name(menu)}
            color={t.seats[menu].id === YOU ? '#0a84ff' : profile(t.seats[menu].id).color}
            card={t.seats[menu].id === YOU ? undefined : cardOf(profile(t.seats[menu].id), custom)}
            pending={session.pending[menu]}
            at={at(menu, slots, 0.55)}
            onStack={(v) => setStack(menu, v)}
            onReplace={
              t.seats[menu].id === YOU
                ? undefined
                : () => {
                    setPicking(menu - offset);
                    setMenu(undefined);
                  }
            }
            onClose={() => setMenu(undefined)}
          />
        )}
      </Felt>

      {/* Hint + status */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1 text-sm">
        {mode === 'play' && !setup ? <EquityHint t={t} youIdx={youIdx} /> : <span />}
        {t.street === 'done' && t.winners.length ? (
          <span className="flex flex-wrap justify-end gap-1.5">
            {t.winners.map((w) => (
              <span key={w.seat} className="inline-flex min-h-7 items-center gap-1.5 rounded-[8px] bg-emerald-400/10 px-2 text-[13px] text-emerald-200 ring-1 ring-emerald-400/30 ring-inset">
                <span className="text-[11px] font-semibold tracking-[0.06em] text-[var(--text-muted)] uppercase">{name(w.seat)}</span>
                {w.seat === youIdx ? 'Win' : 'Wins'} <strong className="font-semibold tabular-nums">{money(w.amount)}</strong>
                {w.hand && <span className="text-[var(--text-muted)]">{w.hand}</span>}
              </span>
            ))}
          </span>
        ) : (
          <span className="text-xs text-[var(--text-muted)] tabular-nums">{t.handNo ? `Hand ${t.handNo}` : ''}</span>
        )}
      </div>

      {/* Actions */}
      {setup ? (
        <div className="mt-3 flex flex-col items-center gap-2">
          <button
            type="button"
            disabled={t.seats.length < 2}
            onClick={start}
            className="flex min-h-[50px] min-w-[14rem] items-center justify-center rounded-[14px] bg-[var(--accent)] px-6 text-[17px] font-semibold text-white transition-all hover:brightness-110 active:scale-[0.97] disabled:opacity-40"
          >
            Start Game
          </button>
          {t.seats.length < 2 && <p className="text-footnote text-[var(--text-muted)]">Spectating needs at least two players.</p>}
        </div>
      ) : (
        yourTurn && <ActionBar key={`${t.handNo}-${t.street}-${t.currentBet}`} t={t} onAct={youAct} />
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <HandLog t={t} name={name} />
        <Leaderboard t={t} net={session.net} name={name} />
      </div>
      {mode === 'play' && <ProfitTracker rounds={session.youNet} onReset={resetProfit} />}
      {mode === 'play' && <LiveEvaluator t={t} youIdx={youIdx} position={t.handNo > 0 ? positions.get(youIdx) : undefined} settled={settled} />}
      {picking !== undefined && <BotPicker key={picking} slot={picking} onClose={() => setPicking(undefined)} />}
    </main>
  );
}
