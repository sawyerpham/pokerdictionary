import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { describe, equity, evaluate } from '../engine/cards';
import { legal, totalPot, type Seat as SeatState, type Table } from '../engine/holdem';
import type { Profile } from '../engine/profiles';
import { ChipStack, money } from '../components/Chips';
import { DealtCard, PlayingCard } from '../components/PlayingCard';
import { ProfitTracker } from '../components/ProfitTracker';
import { Segmented, Toggle } from '../components/RuleControls';
import { firstTime, flyIn, flyOut, ms, pop, setMotion } from '../components/motion';
import { MAX_PLAYERS, STAKES, useSettings } from '../state/settingsStore';
import { boardDelay, DEAL_STEP, SWEEP_ANIM, useTable, YOU, type Mode } from '../state/useTable';

// Seats sit on an ellipse, you at the bottom; action moves clockwise (to your left on screen).
// Radii come from --rx/--ry on the table, so phones can pull the side seats in.
const at = (i: number, n: number, r = 1) => {
  const a = ((90 + (i * 360) / n) * Math.PI) / 180;
  return { left: `calc(50% + var(--rx) * ${r * Math.cos(a)})`, top: `calc(50% + var(--ry) * ${r * Math.sin(a)})` };
};

function Stat({ label, children, onClick, title }: { label: string; children: ReactNode; onClick?: () => void; title?: string }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      title={title}
      onClick={onClick}
      className={`min-w-0 rounded-lg px-3 py-2 text-left ${onClick ? 'transition-colors hover:bg-white/[0.05]' : ''}`}
    >
      <p className="text-caption text-[var(--text-muted)]">{label}</p>
      <div className="text-[15px] font-semibold tabular-nums">{children}</div>
    </Tag>
  );
}

const STEP_BTN =
  'flex h-7 w-8 items-center justify-center rounded-[7px] bg-[var(--fill)] text-[17px] leading-none transition-colors active:bg-white/25 disabled:opacity-40';

function Avatar({ p, you, size = 'md' }: { p?: Profile; you?: boolean; size?: 'md' | 'lg' }) {
  const emoji = p && !/^[A-Z]{1,3}$/.test(p.avatar);
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-2 ring-black/30 ${
        size === 'lg' ? 'h-9 w-9 text-sm' : 'h-6 w-6 text-[10px] sm:h-8 sm:w-8 sm:text-[11px]'
      } ${emoji ? 'text-base' : ''}`}
      style={{ background: you ? 'var(--accent)' : emoji ? 'rgb(255 255 255 / 0.12)' : p?.color }}
    >
      {you ? 'You' : p?.avatar}
    </span>
  );
}

/** Phones: famous players go by surname (Ivey, Negreanu), everyone else by their full name. */
const shortName = (p?: Profile) => (p && (p.group === 'Pros' || p.group === 'Entertainers') ? p.name.split(' ').slice(-1)[0] : p?.name);

const BUBBLE: Record<string, (a: number) => string> = {
  fold: () => 'Fold',
  check: () => 'Check',
  call: (a) => `Call ${money(a)}`,
  bet: (a) => `Bet ${money(a)}`,
  raise: (a) => `Raise ${money(a)}`,
  allin: () => 'All in',
  post: (a) => `Blind ${money(a)}`,
};

/** Two hole cards; they fly to the muck when the seat folds. */
function HoleCards({
  seat,
  faceUp,
  handKey,
  dealDelay,
  size,
  dim,
}: {
  seat: SeatState;
  faceUp: boolean;
  handKey: string;
  dealDelay: (pass: number) => number;
  size: 'lg' | 'sm';
  dim: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [gone, setGone] = useState(seat.folded);
  useEffect(() => {
    if (!seat.folded || gone || !ref.current) return;
    const a = flyOut(ref.current, '[data-pot]', { rotate: 120, duration: 450 });
    if (a) a.onfinish = () => setGone(true);
    else setGone(true);
  }, [seat.folded, gone]);
  if (gone || seat.hole.length === 0) return <div className={size === 'lg' ? 'h-[4.6rem] sm:h-24' : 'h-11 sm:h-14'} />;
  return (
    <div ref={ref} className={`flex ${size === 'lg' ? '[&>*+*]:-ml-3' : '[&>*+*]:-ml-4 sm:[&>*+*]:-ml-5'}`}>
      {seat.hole.map((c, k) => (
        <div key={k} className={k ? 'rotate-[5deg]' : '-rotate-[4deg]'}>
          <DealtCard animKey={`${handKey}-${k}`} delay={dealDelay(k)} faceUp={faceUp}>
            <PlayingCard card={faceUp ? c : undefined} size={size} dim={dim} />
          </DealtCard>
        </div>
      ))}
    </div>
  );
}

function Seat({
  t,
  i,
  p,
  faceUp,
  thinking,
  handResult,
  dealOrder,
}: {
  t: Table;
  i: number;
  p?: Profile;
  faceUp: boolean;
  thinking: boolean;
  handResult?: { won: number; hand?: string };
  dealOrder: number[];
}) {
  const seat = t.seats[i];
  const you = seat.id === YOU;
  const n = t.seats.length;
  const k = dealOrder.indexOf(i);
  const m = dealOrder.length;
  const badge = useRef<HTMLSpanElement>(null);
  const allIn = seat.allIn && seat.inHand && t.street !== 'done';
  useLayoutEffect(() => {
    if (badge.current) pop(badge.current);
  }, [allIn, handResult?.won]);
  const top = Math.sin(((90 + (i * 360) / n) * Math.PI) / 180) < -0.2; // far side: cards face the felt
  const la = seat.lastAction;
  const bubble = la && la.type !== 'win' && t.street !== 'done' ? BUBBLE[la.type](la.amount) : undefined;

  return (
    <div
      className={`absolute z-10 flex w-[5.4rem] -translate-x-1/2 -translate-y-1/2 items-center sm:w-28 ${top ? 'flex-col-reverse' : 'flex-col'} ${
        seat.sittingOut ? 'opacity-40' : ''
      }`}
      style={at(i, n)}
    >
      <HoleCards
        key={`${t.handNo}-${i}`}
        seat={seat}
        faceUp={faceUp}
        handKey={`${t.handNo}-${i}`}
        dealDelay={(pass) => (pass * m + k) * DEAL_STEP}
        size={you ? 'lg' : 'sm'}
        dim={t.street === 'done' && t.showdown && !handResult && seat.inHand}
      />
      <div
        data-seat={i}
        className={`relative ${top ? '-mb-3' : '-mt-3'} flex max-w-full items-center gap-1.5 rounded-full bg-[rgb(28_28_30/0.95)] py-0.5 pr-2.5 pl-0.5 shadow-lg shadow-black/40 ring-1 transition-shadow ${
          handResult
            ? 'ring-2 ring-amber-300 shadow-amber-300/30'
            : thinking
              ? 'ring-2 ring-[var(--accent)] shadow-[var(--accent)]/40'
              : 'ring-white/10'
        }`}
      >
        <Avatar p={p} you={you} />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-[10px] text-white/70 sm:text-[11px]">
            {you ? 'You' : <><span className="sm:hidden">{shortName(p)}</span><span className="hidden sm:inline">{p?.name}</span></>}
          </p>
          <p className="text-[12px] font-semibold text-white tabular-nums sm:text-[13px]">{seat.sittingOut ? 'Out' : money(seat.stack)}</p>
        </div>
      </div>
      <div className="relative mt-1 flex h-5 items-center justify-center">
        {allIn ? (
          <span ref={badge} className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold tracking-wider text-white uppercase shadow-lg shadow-rose-500/40">
            All in
          </span>
        ) : handResult ? (
          <span ref={badge} className="rounded-full bg-amber-300 px-2 py-0.5 text-[10px] font-bold whitespace-nowrap text-black tabular-nums">
            +{money(handResult.won)}
          </span>
        ) : thinking ? (
          <span className="flex gap-0.5" aria-label="Thinking">
            {[0, 1, 2].map((d) => (
              <span key={d} className="h-1 w-1 rounded-full bg-white/70 motion-safe:animate-bounce" style={{ animationDelay: `${d * 120}ms` }} />
            ))}
          </span>
        ) : (
          bubble && (
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap ${la?.type === 'fold' ? 'text-white/40' : 'bg-white/10 text-white/85'}`}>
              {bubble}
            </span>
          )
        )}
      </div>
      {t.street === 'done' && t.showdown && seat.inHand && (
        <span className="text-[10px] whitespace-nowrap text-white/60">{describe(evaluate([...seat.hole, ...t.board]))}</span>
      )}
    </div>
  );
}

/** Chips in front of a seat for this street; they're thrown in from the seat on every bet. */
function BetSpot({ t, i }: { t: Table; i: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const seat = t.seats[i];
  const shove = seat.lastAction?.type === 'allin';
  const animKey = `${t.handNo}-${t.street}-${i}-${seat.bet}`;
  useLayoutEffect(() => {
    if (ref.current && seat.bet > 0 && firstTime(animKey))
      flyIn(ref.current, `[data-seat="${i}"]`, shove ? { duration: 560, scale: 1.5, easing: 'cubic-bezier(0.34, 1.4, 0.64, 1)' } : { duration: 340, scale: 0.8 });
  }, [animKey, i, seat.bet, shove]);
  if (seat.bet <= 0) return null;
  return (
    <div key={animKey} ref={ref} className="absolute z-[5] -translate-x-1/2 -translate-y-1/2" style={at(i, t.seats.length, 0.6)}>
      <ChipStack amount={seat.bet} />
    </div>
  );
}

interface Ghost {
  id: number;
  from: string;
  to: string;
  amount: number;
  delay: number;
}

/** Chips in flight between two anchors (bets to the pot, the pot to a winner). */
function GhostChips({ g, onDone }: { g: Ghost; onDone: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number }>();
  useLayoutEffect(() => {
    const box = ref.current?.parentElement?.getBoundingClientRect();
    const from = document.querySelector(g.from)?.getBoundingClientRect();
    if (!box || !from) return onDone();
    setPos({ left: from.left + from.width / 2 - box.left, top: from.top + from.height / 2 - box.top });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useLayoutEffect(() => {
    if (!pos || !ref.current) return;
    const a = flyOut(ref.current, g.to, { delay: g.delay, duration: SWEEP_ANIM });
    if (a) a.onfinish = onDone;
    else onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos]);
  return (
    <div ref={ref} className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2" style={pos ?? { visibility: 'hidden' }}>
      <ChipStack amount={g.amount} label={false} />
    </div>
  );
}

function Board({ t }: { t: Table }) {
  const prevLen = useRef(t.board.length);
  const shownFor = useRef(t.handNo);
  if (shownFor.current !== t.handNo) {
    shownFor.current = t.handNo;
    prevLen.current = 0;
  }
  const from = prevLen.current;
  useEffect(() => {
    prevLen.current = t.board.length;
  }, [t.board.length]);
  return (
    <div className="flex gap-1 sm:gap-1.5">
      {Array.from({ length: 5 }, (_, i) =>
        t.board[i] !== undefined ? (
          <DealtCard key={`${t.handNo}-b${i}`} animKey={`${t.handNo}-b${i}`} delay={i >= from ? boardDelay(i, from) : 0}>
            <PlayingCard card={t.board[i]} size="md" />
          </DealtCard>
        ) : (
          <div key={i} className="h-[3.6rem] w-[2.6rem] rounded-md border border-dashed border-white/10 sm:h-[4.6rem] sm:w-[3.3rem] sm:rounded-lg" />
        ),
      )}
    </div>
  );
}

/** Your actions: fold, check/call, and a bet slider with pot-fraction shortcuts. */
function ActionBar({ t, onAct }: { t: Table; onAct: ReturnType<typeof useTable>['youAct'] }) {
  const L = legal(t)!;
  const pot = totalPot(t);
  const sized = (frac: number) => Math.max(L.minTo, Math.min(L.maxTo, Math.round(t.currentBet + (pot + L.toCall) * frac)));
  const [to, setTo] = useState(L.minTo);
  useEffect(() => setTo(L.minTo), [L.minTo, t.street]);
  const amount = Math.max(L.minTo, Math.min(L.maxTo, to));
  const isBet = t.currentBet === 0;
  const raise = () => onAct({ type: 'raise', to: amount });
  const keys = useRef<(e: KeyboardEvent) => void>(() => {});
  keys.current = (e) => {
    if ((e.target as HTMLElement).closest('input, textarea')) return;
    const k = e.key.toLowerCase();
    if (k === 'f' && !L.canCheck) onAct({ type: 'fold' });
    else if (k === 'c') onAct({ type: L.canCheck ? 'check' : 'call' });
    else if (k === 'r' && L.canRaise) raise();
  };
  useEffect(() => {
    const h = (e: KeyboardEvent) => keys.current(e);
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const btn =
    'flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-[17px] font-semibold transition-all active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-30';
  const kbd = (k: string) => <kbd className="hidden rounded border border-white/20 px-1 text-[10px] opacity-60 sm:inline">{k}</kbd>;
  return (
    <div className="mx-auto mt-3 max-w-2xl space-y-2">
      {L.canRaise && (
        <div className="flex flex-wrap items-center gap-2 rounded-[12px] bg-[var(--bg-second)] p-2">
          {[
            ['Min', L.minTo],
            ['½ pot', sized(0.5)],
            ['¾ pot', sized(0.75)],
            ['Pot', sized(1)],
            ['All in', L.maxTo],
          ].map(([label, v]) => (
            <button
              key={label}
              type="button"
              onClick={() => setTo(v as number)}
              className={`min-h-8 rounded-[8px] px-2.5 text-[13px] font-medium transition-colors ${amount === v ? 'bg-[#636366] text-white' : 'bg-[var(--fill)] text-[var(--text-primary)]'}`}
            >
              {label}
            </button>
          ))}
          <input
            type="range"
            aria-label="Bet size"
            min={L.minTo}
            max={L.maxTo}
            step={t.bb >= 10 ? Math.round(t.bb / 2) : 1}
            value={amount}
            onChange={(e) => setTo(Number(e.target.value))}
            className="min-w-32 flex-1 accent-[var(--accent)]"
          />
          <input
            inputMode="numeric"
            aria-label="Bet amount"
            value={amount}
            onChange={(e) => setTo(Number(e.target.value.replace(/\D/g, '')) || 0)}
            className="w-20 rounded-[8px] bg-[var(--bg-main)] px-2 py-1 text-center text-[15px] tabular-nums outline-none focus:ring-1 focus:ring-[var(--accent)]"
          />
        </div>
      )}
      <div className="flex gap-2">
        <button type="button" disabled={L.canCheck} onClick={() => onAct({ type: 'fold' })} className={`${btn} bg-[var(--fill)] text-rose-400`}>
          Fold {kbd('F')}
        </button>
        <button type="button" onClick={() => onAct({ type: L.canCheck ? 'check' : 'call' })} className={`${btn} bg-[var(--accent)] text-white`}>
          {L.canCheck ? 'Check' : L.toCall >= t.seats[t.toAct!].stack ? `Call all in ${money(L.toCall)}` : `Call ${money(L.toCall)}`} {kbd('C')}
        </button>
        {L.canRaise && (
          <button type="button" onClick={raise} className={`${btn} bg-[var(--fill)] text-[var(--accent)]`}>
            {amount === L.maxTo ? 'All in' : isBet ? `Bet ${money(amount)}` : <span>Raise <span className="hidden sm:inline">to </span>{money(amount)}</span>} {kbd('R')}
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
      className="rounded-md px-2 py-1 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
      title="Click to show or hide"
    >
      Equity:{' '}
      <span className={`font-medium text-[var(--accent-soft)] tabular-nums transition-all ${shown ? '' : 'blur-sm'}`}>
        {eq === undefined ? '—' : `${(eq * 100).toFixed(0)}%`}
      </span>
      {odds !== undefined && <span className="ml-2 tabular-nums">· pot odds {(odds * 100).toFixed(0)}%</span>}
    </button>
  );
}

function HandLog({ t, name }: { t: Table; name: (i: number) => string }) {
  const lines = t.log.filter((e) => e.kind !== 'deal').slice(-14);
  return (
    <section className="rounded-[12px] bg-[var(--bg-second)] p-4">
      <h2 className="text-caption mb-2 text-[var(--text-muted)]">Hand {t.handNo || '—'}</h2>
      {lines.length === 0 ? (
        <p className="text-[15px] text-[var(--text-muted)]">No hand yet.</p>
      ) : (
        <ol className="space-y-0.5 text-[13px]">
          {lines.map((e, k) => (
            <li key={k} className={e.kind === 'street' || e.kind === 'show' ? 'pt-1 font-semibold text-[var(--text-muted)]' : e.kind === 'win' ? 'text-amber-300' : ''}>
              {e.seat !== undefined ? `${name(e.seat)} ${e.text}` : e.text}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function Leaderboard({ t, net, name }: { t: Table; net: Record<string, number>; name: (i: number) => string }) {
  const rows = t.seats.map((s, i) => ({ i, name: name(i), stack: s.stack, net: net[`${i}:${s.id}`] ?? 0 })).sort((a, b) => b.net - a.net);
  return (
    <section className="rounded-[12px] bg-[var(--bg-second)] p-4">
      <h2 className="text-caption mb-2 text-[var(--text-muted)]">Session results</h2>
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
  const update = useSettings((s) => s.update);
  setMotion(settings.animations, settings.speed);
  const { session, profile, youAct, setPaused, setMode, rebuy, resetProfit } = useTable();
  const t = session.table;
  const n = t.seats.length;
  const mode = session.mode;
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

  // Deal order: clockwise from the small blind, among seats dealt in.
  const dealOrder = useMemo(() => {
    const out: number[] = [];
    for (let k = 1; k <= n; k++) {
      const i = (t.button + k) % n;
      if (t.seats[i].hole.length) out.push(i);
    }
    return out;
  }, [t, n]);

  // Bets sweep into the pot when a street closes; the pot goes to the winners when the hand ends.
  const [ghosts, setGhosts] = useState<Ghost[]>([]);
  const prev = useRef(t);
  const ghostId = useRef(0);
  useLayoutEffect(() => {
    const before = prev.current;
    prev.current = t;
    if (before === t || before.handNo !== t.handNo || !settings.animations) return;
    const g: Ghost[] = [];
    const swept = before.seats.some((s, i) => s.bet > 0 && t.seats[i].bet === 0);
    if (swept)
      before.seats.forEach((s, i) => {
        if (s.bet > 0) g.push({ id: ghostId.current++, from: `[data-bet="${i}"]`, to: '[data-pot]', amount: s.bet, delay: 0 });
      });
    if (t.street === 'done' && before.street !== 'done')
      for (const w of t.winners) g.push({ id: ghostId.current++, from: '[data-pot]', to: `[data-seat="${w.seat}"]`, amount: w.amount, delay: swept ? SWEEP_ANIM : 0 });
    if (g.length) setGhosts((cur) => [...cur, ...g]);
  }, [t, settings.animations]);

  const result = (i: number) => {
    const w = t.street === 'done' ? t.winners.find((x) => x.seat === i) : undefined;
    return w && { won: w.amount, hand: w.hand };
  };
  const showAll = mode === 'spectate' && settings.spectateShowCards;
  const potShown = t.street === 'done' ? 0 : t.pot;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-3 py-6 sm:px-4 sm:py-8">
      {/* Table controls */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-[12px] bg-[var(--bg-second)] p-1.5">
        <div className="grid w-full grid-cols-3 sm:flex sm:w-auto">
          {mode === 'play' && you && (
            <Stat label="Stack">
              {(you.stack === 0 && t.street === 'done') || you.sittingOut ? (
                <button type="button" onClick={rebuy} className="text-[var(--accent)]">
                  Rebuy {money(settings.buyInBb * settings.bb)}
                </button>
              ) : (
                money(you.stack)
              )}
            </Stat>
          )}
          <Stat label="Blinds" title="Click to change stakes (next hand)" onClick={() => update(STAKES[(stakeIdx + 1) % STAKES.length])}>
            {money(settings.sb)}/{money(settings.bb)}
          </Stat>
          <Stat label="Players">
            <div className="flex items-center gap-1.5">
              <button type="button" aria-label="Remove a player" disabled={settings.players <= 2} onClick={() => update({ players: settings.players - 1 })} className={STEP_BTN}>
                −
              </button>
              <span className="w-5 text-center">{settings.players}</span>
              <button type="button" aria-label="Add a player" disabled={settings.players >= MAX_PLAYERS} onClick={() => update({ players: settings.players + 1 })} className={STEP_BTN}>
                +
              </button>
            </div>
          </Stat>
        </div>
        <div className="flex w-full flex-wrap items-center justify-end gap-1.5 border-t border-[var(--line)] pt-1.5 pr-1 sm:w-auto sm:border-0 sm:pt-0">
          <Segmented<Mode>
            label="Mode"
            value={mode}
            options={[
              { value: 'play', label: 'Play' },
              { value: 'spectate', label: 'Spectate' },
            ]}
            onChange={setMode}
          />
          {mode === 'spectate' && (
            <label className="flex min-h-11 items-center gap-2 px-2 text-[15px]">
              Cards
              <Toggle label="Show all hole cards" checked={settings.spectateShowCards} onChange={(v) => update({ spectateShowCards: v })} />
            </label>
          )}
          <Link to="/players" className="min-h-11 content-center px-2 text-[15px] text-[var(--accent)] active:opacity-50">
            Players
          </Link>
        </div>
      </div>

      {/* The table */}
      <section aria-label="Poker table" className="relative mx-auto aspect-[4/5] w-full max-w-[560px] [--rx:40%] [--ry:43%] sm:aspect-[2/1] sm:max-w-none sm:[--rx:44%]">
        <div className="absolute inset-[9%_7%] rounded-[50%] border-[10px] border-[#1d1d1f] bg-[radial-gradient(ellipse_at_50%_40%,#16263f_0%,#0e1828_60%,#0a111d_100%)] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.07),inset_0_10px_40px_rgb(0_0_0/0.5),0_0_0_1px_rgb(255_255_255/0.06),0_30px_60px_-30px_rgb(0_0_0/0.9)] sm:inset-[10%_7%] sm:border-[14px]">
          <div className="absolute inset-[7%] rounded-[50%] border border-white/[0.06]" />
        </div>

        {/* Center: deck, pot, board */}
        <div className="absolute top-1/2 left-1/2 z-[1] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2">
          <div className="flex h-7 items-center gap-2">
            <span data-pot className="flex items-center">
              {potShown > 0 && <ChipStack amount={potShown} label={false} />}
            </span>
            <span className="text-[13px] font-semibold text-white/85 tabular-nums">
              {totalPot(t) > 0 && t.street !== 'done' ? `Pot ${money(totalPot(t))}` : t.street === 'done' ? (t.showdown ? 'Showdown' : '') : ''}
            </span>
          </div>
          <Board t={t} />
          <span className="text-[10px] tracking-[0.25em] text-white/25 uppercase">No-limit hold'em</span>
        </div>
        <div data-deck className="absolute top-[17%] left-1/2 z-[1] -translate-x-1/2 sm:top-[16%]">
          <div className="relative h-8 w-6 rotate-90 opacity-80">
            <div className="absolute inset-0 translate-x-[2px] translate-y-[2px] rounded-[3px] bg-[#0a4ea8]" />
            <div className="absolute inset-0 rounded-[3px] border border-white/30 bg-[var(--accent-strong)]" />
          </div>
        </div>

        {t.seats.map((_, i) => (
          <span key={`a${i}`} data-bet={i} className="absolute" style={at(i, n, 0.6)} />
        ))}
        {t.seats.map((_, i) => (
          <BetSpot key={`b${i}`} t={t} i={i} />
        ))}
        {t.street !== 'idle' && t.handNo > 0 && (
          <span
            className="absolute z-[6] flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[10px] font-bold text-black shadow-md shadow-black/50 transition-all duration-500"
            style={at(t.button + 0.5, n, 0.78)}
            aria-label="Dealer button"
          >
            D
          </span>
        )}
        {t.seats.map((s, i) => (
          <Seat
            key={i}
            t={t}
            i={i}
            p={s.id === YOU ? undefined : profile(s.id)}
            faceUp={s.id === YOU || showAll || (t.street === 'done' && t.showdown && s.inHand)}
            thinking={settled && t.toAct === i && s.id !== YOU && !session.paused}
            handResult={result(i)}
            dealOrder={dealOrder}
          />
        ))}
        {ghosts.map((g) => (
          <GhostChips key={g.id} g={g} onDone={() => setGhosts((cur) => cur.filter((x) => x.id !== g.id))} />
        ))}
      </section>

      {/* Hint + status */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1 text-sm">
        {mode === 'play' ? <EquityHint t={t} youIdx={youIdx} /> : <span />}
        <span className="text-xs text-[var(--text-muted)] tabular-nums">
          {t.street === 'done' && t.winners.length
            ? t.winners.map((w) => `${name(w.seat)} ${w.seat === youIdx ? 'win' : 'wins'} ${money(w.amount)}${w.hand ? ` · ${w.hand}` : ''}`).join(' · ')
            : t.handNo
              ? `Hand ${t.handNo}`
              : ''}
        </span>
      </div>

      {/* Actions */}
      {yourTurn ? (
        <ActionBar key={`${t.handNo}-${t.street}-${t.currentBet}`} t={t} onAct={youAct} />
      ) : (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setPaused(!session.paused)}
            className="flex min-h-[50px] min-w-[14rem] items-center justify-center rounded-[14px] bg-[var(--accent)] px-6 text-[17px] font-semibold text-white transition-all hover:brightness-110 active:scale-[0.97]"
          >
            {!session.paused ? 'Pause' : t.handNo === 0 ? (mode === 'play' ? 'Deal' : 'Start') : 'Resume'}
          </button>
          {mode === 'spectate' && (
            <Segmented
              label="Speed"
              value={settings.speed}
              options={[0.5, 1, 2, 4].map((v) => ({ value: v, label: `${v === 0.5 ? '½' : v}×` }))}
              onChange={(v) => update({ speed: v })}
            />
          )}
        </div>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <HandLog t={t} name={name} />
        <Leaderboard t={t} net={session.net} name={name} />
      </div>
      {mode === 'play' && <ProfitTracker rounds={session.youNet} onReset={resetProfit} />}
    </main>
  );
}
