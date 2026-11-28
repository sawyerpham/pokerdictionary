// The poker table drawn from above: seats on an ellipse, dealt cards, bets thrown in and swept to the pot, the
// dealer button, and the action bar. The bot table and the table against a friend both draw with it.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import { describe, evaluate } from '../engine/cards';
import { legal, totalPot, type Action, type Seat as SeatState, type Table } from '../engine/holdem';
import { BLIND_LEAD, BLIND_STEP, boardDelay, DEAL_STEP, SWEEP_ANIM, YOU } from '../state/useTable';
import { ChipPile, ChipStack, money } from './Chips';
import { bump, firstTime, flyIn, flyOut, motionOn, ms, pop } from './motion';
import { DealtCard, PlayingCard } from './PlayingCard';

/** Who sits in a seat: a bot's profile has these, and so does a person. */
export interface Who {
  name: string;
  avatar: string; // initials or an emoji
  color: string;
  group?: string;
}

// Seats sit on an ellipse, you at the bottom; action moves clockwise (to your left on screen).
// Radii come from --rx/--ry on the table, so phones can pull the side seats in.
export const at = (i: number, n: number, r = 1) => {
  const a = ((90 + (i * 360) / n) * Math.PI) / 180;
  return { left: `calc(50% + var(--rx) * ${r * Math.cos(a)})`, top: `calc(50% + var(--ry) * ${r * Math.sin(a)})` };
};

/** Where a seat's bet sits. Seats at the bottom need their chips further in, clear of the tall cards there. */
const betAt = (i: number, n: number) => at(i, n, Math.sin(((90 + (i * 360) / n) * Math.PI) / 180) > 0.7 ? 0.5 : 0.6);

function Avatar({ p, you, size = 'md' }: { p?: Who; you?: boolean; size?: 'md' | 'lg' }) {
  const emoji = p && !/^[A-Z0-9]{1,3}$/.test(p.avatar);
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-2 ring-black/30 ${
        size === 'lg' ? 'h-9 w-9 text-sm' : 'h-6 w-6 text-[11px] sm:h-8 sm:w-8 sm:text-[11px]'
      } ${emoji ? 'text-base' : ''}`}
      style={{ background: you ? 'var(--accent)' : emoji ? 'rgb(255 255 255 / 0.12)' : p?.color }}
    >
      {you ? 'You' : p?.avatar}
    </span>
  );
}

/**
 * Position names for the seats dealt in: SB, BB, then UTG, UTG+1… with the last three before the button
 * LJ, HJ, CO (fewer at short tables), then BTN. Heads-up the button is also the small blind.
 */
export function positionNames(order: number[], button: number): Map<number, string> {
  if (order.length < 2) return new Map();
  if (order.length === 2) return new Map(order.map((i) => [i, i === button ? 'BTN' : 'BB']));
  const [sb, bb, ...rest] = order;
  const middle = rest.slice(0, -1);
  const tailLen = middle.length >= 4 ? 3 : Math.max(0, middle.length - 1);
  const tail = ['LJ', 'HJ', 'CO'].slice(3 - tailLen);
  const head = middle.length - tailLen;
  const out = new Map(middle.map((seat, k) => [seat, k < head ? (k === 0 ? 'UTG' : `UTG+${k}`) : tail[k - head]]));
  return out.set(sb, 'SB').set(bb, 'BB').set(button, 'BTN');
}

/** Phones: famous players go by surname (Ivey, Negreanu), everyone else by their full name. */
const shortName = (p?: Who) => (p && (p.group === 'Pros' || p.group === 'Entertainers') ? p.name.split(' ').slice(-1)[0] : p?.name);

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
  reveal,
}: {
  seat: SeatState;
  /** Hand over: show the cards again even if they were folded away. */
  reveal: boolean;
  faceUp: boolean;
  handKey: string;
  dealDelay: (pass: number) => number;
  size: 'lg' | 'hero' | 'sm';
  dim: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [gone, setGone] = useState(seat.folded);
  useEffect(() => {
    if (!seat.folded || reveal || gone || !ref.current) return; // the fold that ends the hand stays up
    const a = flyOut(ref.current, '[data-pot]', { rotate: 120, duration: 450 });
    if (a) a.onfinish = () => setGone(true);
    else setGone(true);
  }, [seat.folded, reveal, gone]);
  if ((gone && !reveal) || seat.hole.length === 0) return <div key="empty" className={size === 'sm' ? 'h-11 sm:h-14' : 'h-[4.6rem] sm:h-24'} />;
  return (
    <div key={reveal && seat.folded ? 'shown' : 'cards'} ref={ref} className={`flex ${size === 'sm' ? '[&>*+*]:-ml-4 sm:[&>*+*]:-ml-5' : '[&>*+*]:-ml-3'}`}>
      {seat.hole.map((c, k) => (
        <div key={k} className={k ? 'rotate-[5deg]' : '-rotate-[4deg]'}>
          <DealtCard animKey={`${handKey}-${k}`} delay={dealDelay(k)} card={c} faceUp={faceUp} size={size} dim={dim} />
        </div>
      ))}
    </div>
  );
}

export function Seat({
  t,
  i,
  p,
  faceUp,
  thinking,
  yourTurn,
  handResult,
  dealOrder,
  position,
  slots,
  onMenu,
  onRemove,
}: {
  t: Table;
  i: number;
  p?: Who;
  faceUp: boolean;
  thinking: boolean;
  yourTurn?: boolean; // your seat, waiting on you: its white border blinks
  handResult?: { won: number; hand?: string };
  dealOrder: number[];
  position?: string;
  slots?: number; // seats laid out on the ellipse, when it differs from the table (setup's add slot)
  onMenu?: () => void; // opens the seat's quick menu
  onRemove?: () => void; // setup: take this seat away
}) {
  const seat = t.seats[i];
  const you = seat.id === YOU;
  const n = slots ?? t.seats.length;
  const k = dealOrder.indexOf(i);
  const m = dealOrder.length;
  const badge = useRef<HTMLSpanElement>(null);
  const allIn = seat.allIn && seat.inHand && t.street !== 'done';
  useLayoutEffect(() => {
    if (badge.current) pop(badge.current);
  }, [allIn, handResult?.won]);
  const angle = ((90 + (i * 360) / n) * Math.PI) / 180;
  const top = Math.sin(angle) < -0.2; // far side: cards face the felt
  const pileLeft = Math.cos(angle) > 0.1; // the stack pile sits on the side facing the middle
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
        dealDelay={(pass) => BLIND_LEAD + (pass * m + k) * DEAL_STEP}
        size={you ? (n > 6 ? 'hero' : 'lg') : 'sm'}
        dim={(t.street === 'done' && t.showdown && !handResult && seat.inHand) || (t.street === 'done' && seat.folded)}
        reveal={t.street === 'done' && !you && faceUp}
      />
      <div
        data-seat={i}
        className={`relative ${top ? 'mb-1' : 'mt-1'} flex max-w-full items-center gap-1.5 rounded-full bg-[rgb(28_28_30/0.95)] py-0.5 pr-2.5 pl-0.5 shadow-lg shadow-black/40 ring-1 transition-shadow ${
          handResult
            ? 'ring-2 ring-amber-300 shadow-amber-300/30'
            : thinking
              ? 'ring-2 ring-[var(--accent)] shadow-[var(--accent)]/40'
              : 'ring-white/10'
        }`}
      >
        {yourTurn && <span aria-hidden className="turn-blink pointer-events-none absolute -inset-0.5 rounded-full ring-2 ring-white" />}
        <StackPile t={t} i={i} left={pileLeft} />
        {onMenu && <button type="button" onClick={onMenu} aria-label={`${you ? 'Your' : `${p?.name}'s`} seat options`} className="hit absolute inset-0 rounded-full" />}
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${p?.name}`}
            className="hit absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#48484a] text-[13px] leading-none text-white shadow ring-1 ring-black/40 hover:bg-rose-500"
          >
            ×
          </button>
        )}
        <Avatar p={p} you={you} />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-[11px] text-white/70 sm:text-[11px]">
            {you ? 'You' : <><span className="sm:hidden">{shortName(p)}</span><span className="hidden sm:inline">{p?.name}</span></>}
          </p>
          <p className="text-[12px] font-semibold text-white tabular-nums sm:text-[13px]">{seat.sittingOut ? 'Out' : money(seat.stack)}</p>
        </div>
      </div>
      <div className="relative mt-1 flex h-5 items-center justify-center gap-1">
        {position && (
          <span className="rounded-[5px] bg-white/[0.14] px-1 text-[11px] leading-[15px] font-semibold tracking-wide text-white/80">{position}</span>
        )}
        {allIn ? (
          <span ref={badge} className="rounded-full bg-rose-500 px-2 py-0.5 text-[11px] font-bold tracking-wider text-white uppercase shadow-lg shadow-rose-500/40">
            All in
          </span>
        ) : handResult ? (
          <span ref={badge} className="rounded-full bg-amber-300 px-2 py-0.5 text-[11px] font-bold whitespace-nowrap text-black tabular-nums">
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
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${la?.type === 'fold' ? 'text-white/40' : 'bg-white/10 text-white/85'}`}>
              {bubble}
            </span>
          )
        )}
      </div>
      {t.street === 'done' && t.showdown && seat.inHand && (
        <span className="text-[11px] whitespace-nowrap text-white/60">{describe(evaluate([...seat.hole, ...t.board]))}</span>
      )}
    </div>
  );
}

/**
 * Shows `amount`; when it grows it waits `growDelay` ms for the chips in flight to land, then bumps.
 * Shrinking shows at once, with a small dip.
 */
function useLandingAmount(amount: number, growDelay: number, ref: RefObject<HTMLElement | null>) {
  const [shown, setShown] = useState(amount);
  useEffect(() => {
    if (amount === shown) return;
    const grow = amount > shown;
    const h = setTimeout(
      () => {
        setShown(amount);
        if (ref.current) bump(ref.current, grow);
      },
      grow ? ms(growDelay) : 0,
    );
    return () => clearTimeout(h);
  }, [amount, shown, growDelay, ref]);
  return shown;
}

/** The chips a player has behind, beside their badge. Bets leave from it and pots land on it. */
// Phones with 7+ seats hide the piles (they collide with neighbours) but keep them in place as bet anchors.
function StackPile({ t, i, left }: { t: Table; i: number; left: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const shown = useLandingAmount(t.seats[i].stack, 2 * SWEEP_ANIM + 100, ref);
  return (
    <div ref={ref} data-stack={i} className={`absolute bottom-1 origin-bottom ${left ? 'right-full mr-1' : 'left-full ml-1'} ${t.seats.length > 6 ? 'max-sm:invisible' : ''}`}>
      <ChipPile amount={shown} bb={t.bb} cols={2} perCol={5} />
    </div>
  );
}

/** The pot in the middle: grows when the street's bets land on it. */
function PotPile({ amount, bb }: { amount: number; bb: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const shown = useLandingAmount(amount, SWEEP_ANIM, ref);
  return (
    <div ref={ref} className="origin-bottom">
      <ChipPile amount={shown} bb={bb} cols={4} perCol={6} />
    </div>
  );
}

/** Chips in front of a seat for this street; they're thrown in from the seat on every bet. */
function BetSpot({ t, i, delay }: { t: Table; i: number; delay: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const seat = t.seats[i];
  const shove = seat.lastAction?.type === 'allin';
  const animKey = `${t.handNo}-${t.street}-${i}-${seat.bet}`;
  useLayoutEffect(() => {
    if (ref.current && seat.bet > 0 && firstTime(animKey))
      flyIn(ref.current, `[data-stack="${i}"]`, shove ? { duration: 560, scale: 1.5, easing: 'cubic-bezier(0.34, 1.4, 0.64, 1)' } : { duration: 340, scale: 0.8, delay });
    // The delay only matters for the blinds' first throw.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animKey, i, seat.bet, shove]);
  if (seat.bet <= 0) return null;
  return (
    <div key={animKey} ref={ref} className="absolute z-[5] -translate-x-1/2 -translate-y-1/2" style={betAt(i, t.seats.length)}>
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
          <DealtCard key={`${t.handNo}-b${i}`} animKey={`${t.handNo}-b${i}`} delay={i >= from ? boardDelay(i, from) : 0} card={t.board[i]} size="md" />
        ) : (
          <div key={i} className="h-[3.6rem] w-[2.6rem] rounded-md border border-dashed border-white/10 sm:h-[4.6rem] sm:w-[3.3rem] sm:rounded-lg" />
        ),
      )}
    </div>
  );
}

/** Your actions: fold, check/call, and a bet slider with pot-fraction shortcuts. */
export function ActionBar({ t, onAct }: { t: Table; onAct: (a: Action) => void }) {
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
  const kbd = (k: string) => <kbd className="hidden rounded border border-white/20 px-1 text-[11px] opacity-60 sm:inline">{k}</kbd>;
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
              className={`min-h-8 rounded-[8px] px-2.5 text-[13px] font-medium transition-colors pointer-coarse:min-h-11 pointer-coarse:min-w-11 ${amount === v ? 'bg-[#636366] text-white' : 'bg-[var(--fill)] text-[var(--text-primary)]'}`}
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
          <button type="button" onClick={raise} className={`${btn} bg-[var(--fill)] text-[var(--accent-soft)]`}>
            {amount === L.maxTo ? 'All in' : isBet ? `Bet ${money(amount)}` : <span>Raise <span className="hidden sm:inline">to </span>{money(amount)}</span>} {kbd('R')}
          </button>
        )}
      </div>
    </div>
  );
}

export function HandLog({ t, name }: { t: Table; name: (i: number) => string }) {
  const lines = t.log.filter((e) => e.kind !== 'deal').slice(-14);
  return (
    <section className="rounded-[12px] bg-[var(--bg-second)] p-4">
      <h2 className="card-title">Hand {t.handNo || '—'}</h2>
      {lines.length === 0 ? (
        <p className="text-[15px] text-[var(--text-muted)]">No hand yet.</p>
      ) : (
        <ol className="space-y-0.5 text-[13px]">
          {lines.map((e, k) => (
            <li key={k} className={e.kind === 'street' || e.kind === 'show' ? 'pt-1 font-semibold text-[var(--text-muted)]' : e.kind === 'win' ? 'text-amber-300' : ''}>
              {e.seat === undefined ? e.text : name(e.seat) === 'You' ? `You ${e.text.replace(/^goes/, 'go').replace(/^(\w+)s/, '$1')}` : `${name(e.seat)} ${e.text}`}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}


/** Seats dealt in this hand, clockwise from the small blind. */
export function dealOrderOf(t: Table) {
  const out: number[] = [];
  for (let k = 1; k <= t.seats.length; k++) {
    const i = (t.button + k) % t.seats.length;
    if (t.seats[i].hole.length) out.push(i);
  }
  return out;
}

export function Felt({
  t,
  youIdx,
  who,
  faceUp,
  thinking,
  yourTurn,
  showPositions,
  slots,
  onMenu,
  onRemove,
  children,
}: {
  t: Table;
  youIdx: number;
  who: (i: number) => Who | undefined;
  faceUp: (i: number) => boolean;
  thinking: (i: number) => boolean;
  yourTurn: boolean;
  showPositions: boolean;
  slots?: number; // seats laid out on the ellipse, when it differs from the table (the bot table's add slot)
  onMenu?: (i: number) => void;
  onRemove?: (i: number) => (() => void) | undefined;
  children?: ReactNode; // extras drawn on the felt: the add-a-player slot, a seat's menu
}) {
  const n = t.seats.length;
  const dealOrder = useMemo(() => dealOrderOf(t), [t]);
  const positions = useMemo(() => positionNames(dealOrder, t.button), [dealOrder, t.button]);

  // Bets sweep into the pot when a street closes; the pot goes to the winners when the hand ends.
  const [ghosts, setGhosts] = useState<Ghost[]>([]);
  const prev = useRef(t);
  const ghostId = useRef(0);
  useLayoutEffect(() => {
    const before = prev.current;
    prev.current = t;
    if (before === t || before.handNo !== t.handNo || !motionOn()) return;
    const g: Ghost[] = [];
    const swept = before.seats.some((s, i) => s.bet > 0 && t.seats[i].bet === 0);
    if (swept)
      before.seats.forEach((s, i) => {
        if (s.bet > 0) g.push({ id: ghostId.current++, from: `[data-bet="${i}"]`, to: '[data-pot]', amount: s.bet, delay: 0 });
      });
    if (t.street === 'done' && before.street !== 'done')
      for (const w of t.winners) g.push({ id: ghostId.current++, from: '[data-pot]', to: `[data-stack="${w.seat}"]`, amount: w.amount, delay: swept ? SWEEP_ANIM : 0 });
    if (g.length) setGhosts((cur) => [...cur, ...g]);
  }, [t]);

  const result = (i: number) => {
    const w = t.street === 'done' ? t.winners.find((x) => x.seat === i) : undefined;
    return w && { won: w.amount, hand: w.hand };
  };
  const potShown = t.street === 'done' ? 0 : t.pot;

  return (
    <section aria-label="Poker table" className="relative mx-auto my-12 aspect-[3/5] w-full max-w-[560px] [--rx:40%] [--ry:43%] sm:aspect-[7/4] sm:min-h-[34rem] sm:max-w-none sm:[--rx:44%]">
      <h2 className="card-title absolute -top-8 left-1">Table</h2>
      <div className="absolute inset-[9%_7%] rounded-[50%] border-[10px] border-[#1d1d1f] bg-[radial-gradient(ellipse_at_50%_40%,#16263f_0%,#0e1828_60%,#0a111d_100%)] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.07),inset_0_10px_40px_rgb(0_0_0/0.5),0_0_0_1px_rgb(255_255_255/0.06),0_30px_60px_-30px_rgb(0_0_0/0.9)] sm:inset-[10%_7%] sm:border-[14px]">
        <div className="absolute inset-[7%] rounded-[50%] border border-white/[0.06]" />
      </div>

      {/* Center: deck, pot, board */}
      <div className="absolute top-1/2 left-1/2 z-[1] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2">
        <div className="flex h-11 items-center gap-2 sm:h-14">
          <div data-deck className="relative shrink-0 -rotate-6" aria-label="Deck">
            <div className="absolute inset-0 translate-x-[3px] translate-y-[3px] rounded-md bg-[#0a4ea8]" />
            <div className="absolute inset-0 translate-x-[1.5px] translate-y-[1.5px] rounded-md bg-[#0b5cc4]" />
            <PlayingCard size="sm" />
          </div>
          <span data-pot className="flex items-center">
            <PotPile amount={potShown} bb={t.bb} />
          </span>
          <span className="text-[13px] font-semibold text-white/85 tabular-nums">
            {totalPot(t) > 0 && t.street !== 'done' ? `Pot ${money(totalPot(t))}` : t.street === 'done' ? (t.showdown ? 'Showdown' : '') : ''}
          </span>
        </div>
        <Board t={t} />
        <span className="text-[11px] tracking-[0.25em] text-white/25 uppercase">No-limit hold'em</span>
      </div>

      {t.seats.map((_, i) => (
        <span key={`a${i}`} data-bet={i} className="absolute" style={betAt(i, n)} />
      ))}
      {t.seats.map((_, i) => (
        <BetSpot key={`b${i}`} t={t} i={i} delay={t.seats[i].lastAction?.type === 'post' && positions.get(i) === 'BB' ? BLIND_STEP : 0} />
      ))}
      {t.street !== 'idle' && t.handNo > 0 && (
        <span
          className="absolute z-[6] flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[11px] font-bold text-black shadow-md shadow-black/50 transition-all duration-500"
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
          slots={slots}
          onMenu={onMenu && (() => onMenu(i))}
          onRemove={onRemove?.(i)}
          p={who(i)}
          faceUp={faceUp(i)}
          thinking={thinking(i)}
          yourTurn={yourTurn && i === youIdx}
          handResult={result(i)}
          dealOrder={dealOrder}
          position={showPositions && t.handNo > 0 && !s.sittingOut ? positions.get(i) : undefined}
        />
      ))}
      {children}
      {ghosts.map((g) => (
        <GhostChips key={g.id} g={g} onDone={() => setGhosts((cur) => cur.filter((x) => x.id !== g.id))} />
      ))}
    </section>
  );
}
