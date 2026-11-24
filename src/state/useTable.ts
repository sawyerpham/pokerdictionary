// Drives the table in real time: NPCs think, hands auto-deal, and each step waits for its animations.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { decide, nextTilt } from '../engine/bots';
import { act, blankSeat, newTable, startHand, type Action, type Table } from '../engine/holdem';
import { DEFAULT_LINEUP } from '../engine/profiles';
import { ms, motionOn } from '../components/motion';
import { findProfile, useSettings } from './settingsStore';

export type Mode = 'play' | 'spectate';
export const YOU = 'you';

// Animation timings (ms at 1x); the table components use the same numbers.
export const DEAL_STEP = 110;
export const BOARD_STEP = 140;
const ACTION_ANIM = 380;
export const SWEEP_ANIM = 450;

interface Session {
  mode: Mode;
  table: Table;
  paused: boolean;
  busy: number; // ms of animation the last step started
  startStacks: number[];
  tilt: Record<string, number>; // keyed by `${seat}:${id}`
  net: Record<string, number>; // session result per seat, same keys
  youNet: number[]; // your result per hand
}

// Survives tab switches, like the blackjack table.
let saved: Session | undefined;

const key = (t: Table, i: number) => `${i}:${t.seats[i].id}`;

/** When board card i lands, after `prevLen` cards were already out. All-in runouts pause between streets. */
export const boardDelay = (i: number, prevLen: number) => {
  const street = (k: number) => Math.max(0, k - 2);
  return SWEEP_ANIM + (i - prevLen) * BOARD_STEP + (street(i) - street(prevLen)) * 900;
};

function busyFor(before: Table, after: Table): number {
  if (!motionOn()) return 0;
  if (after.handNo !== before.handNo) return after.seats.filter((s) => s.inHand).length * 2 * DEAL_STEP + 450;
  let b = ACTION_ANIM;
  if (after.board.length > before.board.length) b = Math.max(b, boardDelay(after.board.length - 1, before.board.length) + 450);
  if (after.street === 'done') b += SWEEP_ANIM + 700;
  return b;
}

export function useTable() {
  const settings = useSettings((s) => s.settings);
  const custom = useSettings((s) => s.custom);
  const lineup = useMemo(() => DEFAULT_LINEUP.map((d, i) => settings.lineup[i] ?? d), [settings.lineup]);
  const profile = useCallback((id: string) => findProfile(id, custom), [custom]);

  const seatIds = useCallback(
    (mode: Mode) => (mode === 'play' ? [YOU, ...lineup.slice(0, settings.players - 1)] : lineup.slice(0, settings.players)),
    [lineup, settings.players],
  );
  const buyIn = useCallback(
    (id: string) => (id === YOU ? settings.buyInBb : profile(id).buyInBb) * settings.bb,
    [settings.buyInBb, settings.bb, profile],
  );

  const fresh = useCallback(
    (mode: Mode, youNet: number[] = []): Session => {
      const ids = seatIds(mode);
      const table = newTable(ids, 0, settings.sb, settings.bb);
      table.seats = ids.map((id) => blankSeat(id, buyIn(id)));
      return { mode, table, paused: true, busy: 0, startStacks: [], tilt: {}, net: {}, youNet };
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
      const seats = ids.map((id, i) => (t.seats[i]?.id === id ? t.seats[i] : blankSeat(id, buyIn(id))));
      return { ...t, seats, sb: settings.sb, bb: settings.bb, button: Math.min(t.button, seats.length - 1) };
    },
    [seatIds, buyIn, settings.sb, settings.bb],
  );

  const between = s.table.street === 'done' || s.table.street === 'idle';
  const configKey = `${seatIds(s.mode).join()}|${settings.sb}/${settings.bb}`;
  useEffect(() => {
    if (between) setS((cur) => ({ ...cur, table: sync(cur.table, cur.mode) }));
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
      t = {
        ...t,
        seats: t.seats.map((seat) => {
          if (seat.id === YOU) return { ...seat, sittingOut: seat.stack === 0 };
          // NPCs rebuy when they can't cover a big blind.
          return settings.autoRebuy && seat.stack < t.bb ? { ...seat, stack: buyIn(seat.id) } : seat;
        }),
      };
      const startStacks = t.seats.map((x) => x.stack);
      const next = startHand(t);
      if (next.street === 'idle') return { ...cur, table: next, paused: true };
      return { ...step({ ...cur, startStacks }, next), startStacks };
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
      wait = s.busy + p.thinkMs * (0.5 + Math.random());
      run = () =>
        setS((cur) => {
          if (cur.table !== t) return cur;
          return step(cur, act(t, decide(t, p, cur.tilt[key(t, seat)] ?? 0)));
        });
    } else return;
    const h = setTimeout(run, ms(wait));
    return () => clearTimeout(h);
  }, [s, nextHand, profile, step]);

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
    setMode: (mode: Mode) => setS((cur) => (cur.mode === mode ? cur : fresh(mode, cur.youNet))),
    rebuy: () =>
      setS((cur) => ({
        ...cur,
        table: { ...cur.table, seats: cur.table.seats.map((x) => (x.id === YOU ? { ...x, stack: x.stack + buyIn(YOU), sittingOut: false } : x)) },
      })),
    resetProfit: () => setS((cur) => ({ ...cur, youNet: [] })),
  };
}
