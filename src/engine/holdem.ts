// No-limit Texas Hold'em cash game. Pure functions: every step returns a new Table.
import { describe, evaluate, shuffledDeck, type Card, type Rng } from './cards.ts';

export type Street = 'preflop' | 'flop' | 'turn' | 'river';
export type ActionType = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'allin';

export interface Seat {
  id: string; // profile id, or 'you'
  stack: number;
  hole: Card[];
  inHand: boolean; // dealt in and not folded
  folded: boolean;
  allIn: boolean;
  bet: number; // put in on this street
  committed: number; // put in this hand
  acted: boolean; // has acted since the last full raise
  raiseClosed: boolean; // acted after the last full raise; an incomplete all-in can't reopen it
  sittingOut: boolean;
  lastAction?: { type: ActionType | 'post' | 'win'; amount: number };
}

export interface TableEvent {
  kind: 'deal' | 'post' | 'action' | 'street' | 'win' | 'show';
  seat?: number;
  action?: ActionType;
  amount?: number;
  text: string;
}

export interface Winner {
  seat: number;
  amount: number;
  hand?: string; // made hand at showdown; undefined when everyone else folded
}

export interface Table {
  seats: Seat[];
  sb: number;
  bb: number;
  button: number;
  handNo: number;
  deck: Card[];
  board: Card[];
  street: Street | 'idle' | 'done';
  toAct: number | null;
  currentBet: number;
  minRaise: number; // size of the last full raise; the next raise must be at least this much more
  pot: number; // collected from earlier streets
  winners: Winner[];
  showdown: boolean;
  log: TableEvent[];
}

export function newTable(ids: string[], stack: number, sb: number, bb: number): Table {
  return {
    seats: ids.map((id) => blankSeat(id, stack)),
    sb,
    bb,
    button: ids.length - 1, // advances to seat 0 on the first hand
    handNo: 0,
    deck: [],
    board: [],
    street: 'idle',
    toAct: null,
    currentBet: 0,
    minRaise: bb,
    pot: 0,
    winners: [],
    showdown: false,
    log: [],
  };
}

export const blankSeat = (id: string, stack: number): Seat => ({
  id,
  stack,
  hole: [],
  inHand: false,
  folded: false,
  allIn: false,
  bet: 0,
  committed: 0,
  acted: false,
  raiseClosed: false,
  sittingOut: false,
});

const clone = (t: Table): Table => ({ ...t, seats: t.seats.map((s) => ({ ...s })), board: [...t.board], deck: [...t.deck], log: [...t.log] });

/** Next seat after `from` (clockwise) that matches. */
export function nextSeat(t: Table, from: number, ok: (s: Seat, i: number) => boolean): number {
  const n = t.seats.length;
  for (let k = 1; k <= n; k++) {
    const i = (from + k) % n;
    if (ok(t.seats[i], i)) return i;
  }
  return -1;
}

const canAct = (s: Seat) => s.inHand && !s.allIn;
export const totalPot = (t: Table) => t.pot + t.seats.reduce((p, s) => p + s.bet, 0);

function put(s: Seat, amount: number) {
  const a = Math.min(amount, s.stack);
  s.stack -= a;
  s.bet += a;
  s.committed += a;
  if (s.stack === 0) s.allIn = true;
  return a;
}

/** Seats dealt in this hand, clockwise from the small blind. */
const dealOrder = (t: Table) => {
  const order: number[] = [];
  for (let k = 1; k <= t.seats.length; k++) {
    const i = (t.button + k) % t.seats.length;
    if (t.seats[i].inHand) order.push(i);
  }
  return order;
};

export function startHand(prev: Table, rng: Rng = Math.random): Table {
  const t = clone(prev);
  const eligible = (s: Seat) => !s.sittingOut && s.stack > 0;
  if (t.seats.filter(eligible).length < 2) return { ...t, street: 'idle' };
  for (const [i, s] of t.seats.entries()) {
    t.seats[i] = { ...blankSeat(s.id, s.stack), sittingOut: s.sittingOut, inHand: eligible(s) };
  }
  t.handNo++;
  t.button = nextSeat(t, t.button, (s) => s.inHand);
  t.deck = shuffledDeck(rng);
  t.board = [];
  t.pot = 0;
  t.winners = [];
  t.showdown = false;
  t.log = [];
  t.street = 'preflop';

  // Heads-up the button posts the small blind and acts first preflop.
  const headsUp = t.seats.filter((s) => s.inHand).length === 2;
  const sbSeat = headsUp ? t.button : nextSeat(t, t.button, (s) => s.inHand);
  const bbSeat = nextSeat(t, sbSeat, (s) => s.inHand);
  for (const [seat, amount] of [[sbSeat, t.sb], [bbSeat, t.bb]] as const) {
    const paid = put(t.seats[seat], amount);
    t.seats[seat].lastAction = { type: 'post', amount: paid };
    t.log.push({ kind: 'post', seat, amount: paid, text: `posts ${seat === sbSeat ? 'small' : 'big'} blind ${paid}` });
  }
  t.currentBet = t.bb;
  t.minRaise = t.bb;

  // Two passes, one card at a time, starting left of the button.
  const order = dealOrder(t);
  for (let pass = 0; pass < 2; pass++) for (const i of order) t.seats[i].hole.push(t.deck.pop()!);
  t.log.push({ kind: 'deal', text: 'Hole cards dealt' });

  const first = nextSeat(t, bbSeat, canAct);
  t.toAct = first < 0 ? null : first;
  return settleIfDone(t);
}

export interface Legal {
  toCall: number; // chips needed to call
  canCheck: boolean;
  canRaise: boolean;
  minTo: number; // smallest legal bet/raise, as a street total
  maxTo: number; // all-in, as a street total
}

export function legal(t: Table): Legal | null {
  if (t.toAct === null) return null;
  const s = t.seats[t.toAct];
  const toCall = Math.min(t.currentBet - s.bet, s.stack);
  const maxTo = s.bet + s.stack;
  const othersCanAct = t.seats.some((o, i) => i !== t.toAct && canAct(o));
  // Raising needs chips beyond a call, someone left to respond, and an open raise for this seat.
  const canRaise = maxTo > t.currentBet && othersCanAct && !s.raiseClosed;
  return {
    toCall,
    canCheck: toCall === 0,
    canRaise,
    minTo: Math.min(maxTo, t.currentBet === 0 ? t.bb : t.currentBet + t.minRaise),
    maxTo,
  };
}

export interface Action {
  type: 'fold' | 'check' | 'call' | 'raise';
  to?: number; // street total for a raise (or bet)
}

export function act(prev: Table, a: Action): Table {
  const L = legal(prev);
  if (!L || prev.toAct === null) return prev;
  const t = clone(prev);
  const i = t.toAct!;
  const s = t.seats[i];
  let type: ActionType;
  let amount = 0;

  if (a.type === 'fold' && !L.canCheck) {
    s.folded = true;
    s.inHand = false;
    type = 'fold';
  } else if (a.type === 'raise' && L.canRaise) {
    const to = Math.max(L.minTo, Math.min(L.maxTo, Math.round(a.to ?? L.minTo)));
    const raiseBy = to - t.currentBet;
    put(s, to - s.bet);
    amount = to;
    type = s.allIn ? 'allin' : t.currentBet === 0 ? 'bet' : 'raise';
    if (raiseBy >= t.minRaise) {
      // A full raise reopens the action for everyone.
      t.minRaise = raiseBy;
      for (const o of t.seats) o.raiseClosed = false;
    }
    t.currentBet = Math.max(t.currentBet, to);
    for (const o of t.seats) o.acted = false;
  } else if (L.toCall > 0 && (a.type === 'call' || a.type === 'raise')) {
    amount = put(s, L.toCall);
    type = s.allIn ? 'allin' : 'call';
  } else {
    type = 'check';
  }
  s.acted = true;
  s.raiseClosed = true;
  s.lastAction = { type, amount };
  const verb = { fold: 'folds', check: 'checks', call: `calls ${amount}`, bet: `bets ${amount}`, raise: `raises to ${amount}`, allin: `goes all in for ${s.bet}` }[type];
  t.log.push({ kind: 'action', seat: i, action: type, amount, text: verb });

  const nx = nextSeat(t, i, (o) => canAct(o) && (!o.acted || o.bet < t.currentBet));
  t.toAct = nx < 0 ? null : nx;
  return settleIfDone(t);
}

/** After any change: award an uncontested pot, close the street, or run out the board. */
function settleIfDone(t: Table): Table {
  const live = t.seats.filter((s) => s.inHand);
  if (live.length === 1) return award(t, false);
  // Someone still to act? Facing a bet, or hasn't acted. A lone player with chips and nothing to call is done.
  const pending = t.seats.some((s) => canAct(s) && (!s.acted || s.bet < t.currentBet));
  const actors = t.seats.filter(canAct).length;
  if (pending && !(actors === 1 && t.seats.find(canAct)!.bet >= t.currentBet)) {
    if (t.toAct === null || !canAct(t.seats[t.toAct])) t.toAct = nextSeat(t, t.button, (s) => canAct(s) && (!s.acted || s.bet < t.currentBet));
    return t;
  }
  // Street over: bets go to the pot.
  returnUncalled(t);
  t.pot += t.seats.reduce((p, s) => p + s.bet, 0);
  for (const s of t.seats) {
    s.bet = 0;
    s.acted = false;
    s.raiseClosed = false;
    if (s.inHand && !s.allIn) s.lastAction = undefined; // fresh street, fresh bubbles
  }
  t.currentBet = 0;
  t.minRaise = t.bb;
  if (t.street === 'river') return award(t, true);
  const next: Record<string, Street> = { preflop: 'flop', flop: 'turn', turn: 'river' };
  t.street = next[t.street];
  t.deck.pop(); // burn
  t.board.push(...t.deck.splice(-(t.street === 'flop' ? 3 : 1)).reverse());
  t.log.push({ kind: 'street', text: `${t.street[0].toUpperCase()}${t.street.slice(1)}` });
  t.toAct = t.seats.filter(canAct).length >= 2 ? nextSeat(t, t.button, canAct) : null;
  return t.toAct === null ? settleIfDone(t) : t;
}

/** A bet nobody could match goes back to whoever made it. */
function returnUncalled(t: Table) {
  const bets = t.seats.map((s) => (s.inHand || s.folded ? s.bet : 0));
  const top = Math.max(...bets);
  const second = Math.max(0, ...bets.filter((_, i) => i !== bets.indexOf(top)));
  if (top > second) {
    const s = t.seats[bets.indexOf(top)];
    const back = top - second;
    s.bet -= back;
    s.committed -= back;
    s.stack += back;
    if (s.stack > 0) s.allIn = false;
  }
}

/** Main pot and side pots, from what each seat put in this hand. */
export function pots(t: Table): { amount: number; eligible: number[] }[] {
  const levels = [...new Set(t.seats.filter((s) => s.inHand && s.committed > 0).map((s) => s.committed))].sort((a, b) => a - b);
  const out: { amount: number; eligible: number[] }[] = [];
  let floor = 0;
  for (const level of levels) {
    const amount = t.seats.reduce((p, s) => p + Math.max(0, Math.min(s.committed, level) - floor), 0);
    const eligible = t.seats.flatMap((s, i) => (s.inHand && s.committed >= level ? [i] : []));
    if (amount > 0) out.push({ amount, eligible });
    floor = level;
  }
  // Folded money above the highest live level (can't happen after returnUncalled, but never lose chips).
  const total = t.seats.reduce((p, s) => p + s.committed, 0);
  const counted = out.reduce((p, x) => p + x.amount, 0);
  if (total > counted && out.length) out[out.length - 1].amount += total - counted;
  return out;
}

function award(t: Table, showdown: boolean): Table {
  returnUncalled(t);
  t.pot += t.seats.reduce((p, s) => p + s.bet, 0);
  for (const s of t.seats) s.bet = 0;
  t.toAct = null;
  t.showdown = showdown && t.seats.filter((s) => s.inHand).length > 1;
  const won = new Map<number, number>();
  const hands = new Map<number, string>();

  if (!t.showdown) {
    const w = t.seats.findIndex((s) => s.inHand);
    won.set(w, t.pot);
  } else {
    const score = new Map(t.seats.flatMap((s, i) => (s.inHand ? [[i, evaluate([...s.hole, ...t.board])] as const] : [])));
    for (const [i, sc] of score) hands.set(i, describe(sc));
    for (const pot of pots(t)) {
      const best = Math.max(...pot.eligible.map((i) => score.get(i)!));
      // Odd chips go to the first winner left of the button.
      const ws = pot.eligible.filter((i) => score.get(i) === best).sort((a, b) => ((a - t.button + t.seats.length - 1) % t.seats.length) - ((b - t.button + t.seats.length - 1) % t.seats.length));
      const share = Math.floor(pot.amount / ws.length);
      ws.forEach((w, k) => won.set(w, (won.get(w) ?? 0) + share + (k < pot.amount - share * ws.length ? 1 : 0)));
    }
    t.log.push({ kind: 'show', text: 'Showdown' });
  }
  t.winners = [...won].map(([seat, amount]) => ({ seat, amount, hand: hands.get(seat) }));
  for (const w of t.winners) {
    t.seats[w.seat].stack += w.amount;
    t.seats[w.seat].lastAction = { type: 'win', amount: w.amount };
    t.log.push({ kind: 'win', seat: w.seat, amount: w.amount, text: `wins ${w.amount}${w.hand ? ` with ${w.hand}` : ''}` });
  }
  t.pot = 0;
  t.street = 'done';
  return t;
}
