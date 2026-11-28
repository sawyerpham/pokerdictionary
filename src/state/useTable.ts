// Drives the table in real time: NPCs think, hands auto-deal, and each step waits for its animations.
import { useCallback, useEffect, useState } from 'react';
import { decide, nextTilt } from '../engine/bots';
import { act, blankSeat, newTable, startHand, type Action, type Table } from '../engine/holdem';
import { ms, motionOn } from '../components/motion';
import { findProfile, MAX_PLAYERS, useSettings } from './settingsStore';

export type Mode = 'play' | 'spectate';
export const YOU = 'you';

// Animation timings (ms at 1x); the table components use the same numbers.
export const DEAL_STEP = 110;
export const BOARD_STEP = 140;
// Blinds go in before the cards: small blind, then big blind, then the deal starts.
export const BLIND_STEP = 320;
export const BLIND_LEAD = 2 * BLIND_STEP + 200;
const ACTION_ANIM = 380;
export const SWEEP_ANIM = 450;

interface Session {
  mode: Mode;
  started: boolean; // false while you're choosing players and buy-in
  table: Table;
  paused: boolean;
  busy: number; // ms of animation the last step started
  startStacks: number[];
  tilt: Record<string, number>; // keyed by `${seat}:${id}`
  net: Record<string, number>; // session result per seat, same keys
  youNet: number[]; // your result per hand
  pending: Record<number, number>; // stack edits waiting for the next hand, by seat
}

// Survives tab switches, like the blackjack table.
let saved: Session | undefined;

const key = (t: Table, i: number) => `${i}:${t.seats[i].id}`;

/** When board card i lands, after `prevLen` cards were already out. All-in runouts pause between streets. */
export const boardDelay = (i: number, prevLen: number) => {
  const street = (k: number) => Math.max(0, k - 2);
  return SWEEP_ANIM + (i - prevLen) * BOARD_STEP + (street(i) - street(prevLen)) * 900;
};

export function busyFor(before: Table, after: Table): number {
  if (!motionOn()) return 0;
  if (after.handNo !== before.handNo) return BLIND_LEAD + after.seats.filter((s) => s.inHand).length * 2 * DEAL_STEP + 450;
  let b = ACTION_ANIM;
  if (after.board.length > before.board.length) b = Math.max(b, boardDelay(after.board.length - 1, before.board.length) + 450);
  if (after.street === 'done') b += SWEEP_ANIM + 700;
  return b;
}

export function useTable() {
  const settings = useSettings((s) => s.settings);
  const custom = useSettings((s) => s.custom);
  const opponents = useSettings((s) => s.opponents);
  const profile = useCallback((id: string) => findProfile(id, custom), [custom]);

  const seatIds = useCallback(
    (mode: Mode) => (mode === 'play' ? [YOU, ...opponents.slice(0, MAX_PLAYERS - 1)] : opponents),
    [opponents],
  );
  const buyIn = useCallback(() => settings.buyInBb * settings.bb, [settings.buyInBb, settings.bb]);

  const fresh = useCallback(
    (mode: Mode, youNet: number[] = []): Session => {
      const ids = seatIds(mode);
      const table = newTable(ids, 0, settings.sb, settings.bb);
      table.seats = ids.map((id) => blankSeat(id, buyIn()));
      return { mode, started: false, table, paused: true, busy: 0, startStacks: [], tilt: {}, net: {}, youNet, pending: {} };
    },
    [seatIds, buyIn, settings.sb, settings.bb],
  );

  const [s, setS] = useState<Session>(() => saved ?? fresh('play'));
  useEffect(() => {
    saved = s;
  }, [s]);

  /** Seats and stakes follow the settings between hands. */
  const sync = useCallback(
    (t: Table, mode: Mode): Table => {
      const ids = seatIds(mode);
      const seats = ids.map((id, i) => (t.seats[i]?.id === id ? t.seats[i] : blankSeat(id, buyIn())));
      return { ...t, seats, sb: settings.sb, bb: settings.bb, button: Math.min(t.button, seats.length - 1) };
    },
    [seatIds, buyIn, settings.sb, settings.bb],
  );

  const between = s.table.street === 'done' || s.table.street === 'idle';
  const configKey = `${seatIds(s.mode).join()}|${settings.sb}/${settings.bb}|${settings.buyInBb}`;
  useEffect(() => {
    // Before the game starts the table is rebuilt from scratch (new buy-ins); during it, seats change between hands.
    if (!s.started) setS((cur) => fresh(cur.mode, cur.youNet));
    else if (between) setS((cur) => ({ ...cur, table: sync(cur.table, cur.mode) }));
    // Only when the configuration changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configKey]);

  /** Apply one engine step and do the end-of-hand bookkeeping. */
  const step = useCallback((cur: Session, next: Table): Session => {
    const out: Session = { ...cur, table: next, busy: busyFor(cur.table, next) };
    if (next.street === 'done' && cur.table.street !== 'done') {
      const tilt = { ...cur.tilt };
      const net = { ...cur.net };
      const youNet = [...cur.youNet];
      next.seats.forEach((seat, i) => {
        if (cur.startStacks[i] === undefined) return;
        const delta = seat.stack - cur.startStacks[i];
        const k = key(next, i);
        net[k] = (net[k] ?? 0) + delta;
        if (seat.id === YOU) youNet.push(delta);
        else tilt[k] = nextTilt(tilt[k] ?? 0, delta / next.bb, profile(seat.id));
      });
      Object.assign(out, { tilt, net, youNet });
    }
    return out;
  }, [profile]);

  const nextHand = useCallback(() => {
    setS((cur) => {
      let t = sync(cur.table, cur.mode);
      // Stack edits made during the last hand take effect now.
      t = { ...t, seats: t.seats.map((seat, i) => (cur.pending[i] !== undefined ? { ...seat, stack: cur.pending[i], sittingOut: false } : seat)) };
      t = {
        ...t,
        seats: t.seats.map((seat) => {
          if (seat.id === YOU) return { ...seat, sittingOut: seat.stack === 0 };
          // NPCs rebuy when they can't cover a big blind.
          return settings.autoRebuy && seat.stack < t.bb ? { ...seat, stack: buyIn() } : seat;
        }),
      };
      const startStacks = t.seats.map((x) => x.stack);
      const next = startHand(t);
      if (next.street === 'idle') return { ...cur, table: next, paused: true, pending: {} };
      return { ...step({ ...cur, startStacks, pending: {} }, next), startStacks };
    });
  }, [sync, step, settings.autoRebuy, buyIn]);

  // The clock: NPC turns and the next deal.
  useEffect(() => {
    if (s.paused) return;
    const t = s.table;
    let wait: number;
    let run: () => void;
    if (t.street === 'done') {
      wait = s.busy + (t.showdown ? 3000 : 1500);
      run = nextHand;
    } else if (t.street === 'idle') {
      wait = 0;
      run = nextHand;
    } else if (t.toAct !== null && t.seats[t.toAct].id !== YOU) {
      const seat = t.toAct;
      const p = profile(t.seats[seat].id);
      wait = s.busy + settings.npcThinkMs * (0.5 + Math.random());
      run = () =>
        setS((cur) => {
          if (cur.table !== t) return cur;
          return step(cur, act(t, decide(t, p, cur.tilt[key(t, seat)] ?? 0)));
        });
    } else return;
    const h = setTimeout(run, t.street === 'done' ? Math.max(ms(s.busy) + 1000, ms(wait)) : ms(wait));
    return () => clearTimeout(h);
  }, [s, nextHand, profile, step, settings.npcThinkMs]);

  const youAct = useCallback(
    (a: Action) =>
      setS((cur) => {
        const t = cur.table;
        if (t.toAct === null || t.seats[t.toAct].id !== YOU) return cur;
        return step(cur, act(t, a));
      }),
    [step],
  );

  return {
    session: s,
    profile,
    youAct,
    setPaused: (paused: boolean) => setS((cur) => ({ ...cur, paused })),
    start: () => setS((cur) => ({ ...cur, started: true, paused: false })),
    /** Back to choosing players, with fresh stacks. */
    reset: () => setS((cur) => fresh(cur.mode, cur.youNet)),
    setMode: (mode: Mode) => setS((cur) => (cur.mode === mode || cur.started ? cur : fresh(mode, cur.youNet))),
    rebuy: () =>
      setS((cur) => ({
        ...cur,
        table: { ...cur.table, seats: cur.table.seats.map((x) => (x.id === YOU ? { ...x, stack: x.stack + buyIn(), sittingOut: false } : x)) },
      })),
    /** Sets a seat's chips: right away between hands, otherwise when the next hand starts. */
    setStack: (seat: number, amount: number) =>
      setS((cur) => {
        const t = cur.table;
        if (t.street === 'idle' || t.street === 'done')
          return { ...cur, table: { ...t, seats: t.seats.map((x, i) => (i === seat ? { ...x, stack: amount, sittingOut: false } : x)) } };
        return { ...cur, pending: { ...cur.pending, [seat]: amount } };
      }),
    resetProfit: () => setS((cur) => ({ ...cur, youNet: [] })),
  };
}
