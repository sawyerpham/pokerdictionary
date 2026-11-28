import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { money } from '../components/Chips';
import { ActionBar, Felt, HandLog } from '../components/Felt';
import { ms, setMotion } from '../components/motion';
import { Segmented } from '../components/RuleControls';
import type { Card } from '../engine/cards';
import type { Action, ActionType, Seat as SeatState, Table, TableEvent } from '../engine/holdem';
import { useAccount } from '../state/account';
import { STAKES, useSettings } from '../state/settingsStore';
import { busyFor, YOU } from '../state/useTable';
import { BUTTON, PANEL } from '../study/ui';

// Heads-up against a friend. The server deals and keeps the cards; this page draws what it's allowed to see on the same
// table as the bot game.

type Side = 'you' | 'them';
interface Player {
  name: string;
  stack: number;
  bet: number;
  committed: number;
  inHand: boolean;
  folded: boolean;
  allIn: boolean;
  acted: boolean;
  raiseClosed: boolean;
  lastAction: { type: ActionType | 'post' | 'win'; amount: number } | null;
  cards: Card[] | null;
  dealt: boolean;
  button: boolean;
  online: boolean;
}
type Entry =
  | { k: 'post'; s: Side; a: number }
  | { k: 'act'; s: Side; t: ActionType; a?: number; timeout?: boolean }
  | { k: 'street'; street: string; cards: Card[] }
  | { k: 'show'; hands: Record<Side, string> }
  | { k: 'win'; s: Side; a: number; hand?: string };
interface Settings {
  sb: number;
  bb: number;
  start: number;
  timer: number;
}
interface View extends Settings {
  seated: true;
  id: string;
  status: 'waiting' | 'playing' | 'over';
  street: string;
  handNo: number;
  board: Card[];
  pot: number;
  currentBet: number;
  minRaise: number;
  toAct: Side | null;
  turnLeft: number | null;
  you: Player;
  them: Player | null;
  log: Entry[];
  showdown: boolean;
  winners: { s: Side; a: number; hand?: string }[];
  version: number;
}
interface Invite extends Settings {
  seated: false;
  open: boolean;
  host: string;
}

const tokenKey = (id: string) => `hu:${id}`;
const NAME_KEY = 'hu-name';
const read = (k: string) => {
  try {
    return localStorage.getItem(k) ?? '';
  } catch {
    return '';
  }
};
const write = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* private mode: the seat lasts as long as this page */
  }
};
const post = async (url: string, body: unknown, token?: string) => {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { 'x-seat': token } : {}) }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'Something went wrong. Try again.');
  return data;
};
const summary = (s: Settings) => `${money(s.sb)}/${money(s.bb)} blinds · ${money(s.start)} each · ${s.timer ? `${s.timer}s to act` : 'no clock'}`;

const BUY_INS = [40, 100, 200, 300];
const TIMERS = [0, 15, 30, 60, 120];
const HIDDEN: Card[] = [0, 1]; // stand-ins for the other player's cards: always drawn face down

/** The server's view, as the engine's table, so the felt can draw it. You're seat 0 (the bottom), they're seat 1. */
function toTable(v: View): Table {
  const index = (s: Side) => (s === 'you' ? 0 : 1);
  const seat = (p: Player, id: string): SeatState => ({
    id,
    stack: p.stack,
    hole: p.cards ?? (p.dealt ? HIDDEN : []),
    inHand: p.inHand,
    folded: p.folded,
    allIn: p.allIn,
    bet: p.bet,
    committed: p.committed,
    acted: p.acted,
    raiseClosed: p.raiseClosed,
    sittingOut: false,
    lastAction: p.lastAction ?? undefined,
  });
  const verb = (e: Extract<Entry, { k: 'act' }>) =>
    ({ fold: 'folds', check: 'checks', call: `calls ${e.a}`, bet: `bets ${e.a}`, raise: `raises to ${e.a}`, allin: `goes all in for ${e.a}` })[e.t] +
    (e.timeout ? ' (out of time)' : '');
  const sbSide: Side = v.you.button ? 'you' : 'them';
  const log = v.log.map((e): TableEvent => {
    if (e.k === 'post') return { kind: 'post', seat: index(e.s), amount: e.a, text: `posts ${e.s === sbSide ? 'small' : 'big'} blind ${e.a}` };
    if (e.k === 'act') return { kind: 'action', seat: index(e.s), action: e.t, amount: e.a, text: verb(e) };
    if (e.k === 'street') return { kind: 'street', text: `${e.street[0].toUpperCase()}${e.street.slice(1)}` };
    if (e.k === 'show') return { kind: 'show', text: 'Showdown' };
    return { kind: 'win', seat: index(e.s), amount: e.a, text: `wins ${e.a}${e.hand ? ` with ${e.hand}` : ''}` };
  });
  return {
    seats: [seat(v.you, YOU), seat(v.them!, 'friend')],
    sb: v.sb,
    bb: v.bb,
    button: v.you.button ? 0 : 1,
    handNo: v.handNo,
    deck: [],
    board: v.board,
    street: v.street === 'waiting' ? 'idle' : v.street === 'over' ? 'done' : (v.street as Table['street']),
    toAct: v.toAct === null ? null : index(v.toAct),
    currentBet: v.currentBet,
    minRaise: v.minRaise,
    pot: v.pot,
    winners: v.winners.map((w) => ({ seat: index(w.s), amount: w.a, hand: w.hand })),
    showdown: v.showdown,
    log,
  };
}

export function FriendPage() {
  const { id } = useParams();
  const settings = useSettings((s) => s.settings);
  setMotion(settings.animations, settings.speed);
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-3 py-6 sm:px-4 sm:py-8">
      <h1 className="text-title-2 mb-1 px-1">Challenge a friend</h1>
      <p className="mb-5 px-1 text-[15px] text-[var(--text-muted)]">Heads-up no-limit hold’em against someone you send a link to.</p>
      {id ? (
        <Game key={id} id={id} />
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,36rem)_20rem]">
          <Create />
          <Record />
        </div>
      )}
    </main>
  );
}

function NameField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1 text-[13px] text-[var(--text-muted)]">
      Your name at the table
      <input
        value={value}
        maxLength={20}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Name"
        className="min-h-11 rounded-[10px] bg-[var(--bg-third)] px-3 text-[15px] text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-[var(--accent)]"
      />
    </label>
  );
}

function Option({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
      <span className="text-[15px]">{label}</span>
      {children}
    </div>
  );
}

/** Your record against friends: matches played to the end, and won. Only signed-in players have one. */
function Record({ refresh }: { refresh?: unknown }) {
  const me = useAccount((s) => s.me);
  const [stats, setStats] = useState<{ played: number; won: number }>();
  useEffect(() => {
    if (!me) return;
    fetch('/api/hu/stats')
      .then((r) => (r.ok ? r.json() : undefined))
      .then(setStats, () => {});
  }, [me, refresh]);
  if (me === undefined) return null;
  const rows: [string, string][] = stats
    ? [
        ['Win rate', stats.played ? `${((stats.won / stats.played) * 100).toFixed(2)}%` : '–'],
        ['Games played', String(stats.played)],
        ['Games won', String(stats.won)],
      ]
    : [];
  return (
    <section className="rounded-[12px] bg-[var(--bg-second)] p-1.5">
      <h2 className="px-3 pt-2 pb-1 text-[13px] text-[var(--text-muted)]">Your record</h2>
      {!me ? (
        <p className="px-3 pb-3 text-[15px] text-[var(--text-muted)]">Sign in (top right) to keep a record of your matches.</p>
      ) : (
        rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between border-t border-[var(--line)] px-3 py-2.5 text-[15px] first-of-type:border-0">
            <span className="text-[var(--text-muted)]">{label}</span>
            <span className="font-semibold tabular-nums">{value}</span>
          </div>
        ))
      )}
    </section>
  );
}

const useDefaultName = () => {
  const me = useAccount((s) => s.me);
  return read(NAME_KEY) || me?.name?.split(' ')[0] || '';
};

function Create() {
  const navigate = useNavigate();
  const [name, setName] = useState(useDefaultName());
  const [bb, setBb] = useState(10);
  const [buyIn, setBuyIn] = useState(100);
  const [timer, setTimer] = useState(30);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const create = async () => {
    setBusy(true);
    setError(undefined);
    try {
      write(NAME_KEY, name.trim());
      const { id, token } = await post('/api/hu', { name, bb, buyIn, timer });
      write(tokenKey(id), token);
      navigate(`/play/friend/${id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };
  return (
    <section className={`${PANEL} flex max-w-xl flex-col gap-4`}>
      <NameField value={name} onChange={setName} />
      <Option label="Blinds">
        <Segmented label="Blinds" value={bb} options={STAKES.map((x) => ({ value: x.bb, label: `${x.sb}/${x.bb}` }))} onChange={setBb} />
      </Option>
      <Option label="Buy-in, each">
        <Segmented label="Buy-in" value={buyIn} options={BUY_INS.map((v) => ({ value: v, label: money(v * bb) }))} onChange={setBuyIn} />
      </Option>
      <Option label="Turn timer">
        <Segmented label="Turn timer" value={timer} options={TIMERS.map((v) => ({ value: v, label: v === 0 ? 'Off' : v < 60 ? `${v}s` : `${v / 60}m` }))} onChange={setTimer} />
      </Option>
      <p className="text-[13px] text-[var(--text-muted)]">
        {buyIn} big blinds each. Out of time, a player checks if they can and folds if they can’t. The first person to open the link takes the other seat.
      </p>
      <button type="button" disabled={busy} onClick={() => void create()} className={`${BUTTON} bg-[var(--accent)] text-white`}>
        Create link
      </button>
      {error && <p className="text-[15px] text-rose-400">{error}</p>}
    </section>
  );
}

function Game({ id }: { id: string }) {
  const [token, setToken] = useState(() => read(tokenKey(id)));
  const [view, setView] = useState<View>();
  const [invite, setInvite] = useState<Invite>();
  const [gone, setGone] = useState(false);
  const [error, setError] = useState<string>();

  // Long polling: each request waits on the server until something changes, then the next one goes out.
  useEffect(() => {
    let stop = false;
    const ctl = new AbortController();
    void (async () => {
      let since = -1;
      while (!stop) {
        try {
          const res = await fetch(`/api/hu/${id}?since=${since}`, { headers: token ? { 'x-seat': token } : {}, signal: ctl.signal });
          if (res.status === 404) return setGone(true);
          if (!res.ok) throw new Error(String(res.status));
          const v: View | Invite = await res.json();
          if (!v.seated) return setInvite(v);
          since = v.version;
          setView((cur) => (cur && cur.version > v.version ? cur : v));
        } catch {
          if (stop) return;
          await new Promise((r) => setTimeout(r, 2000)); // offline or a restart: try again shortly
        }
      }
    })();
    return () => {
      stop = true;
      ctl.abort();
    };
  }, [id, token]);

  const send = async (path: string, body: unknown = {}) => {
    setError(undefined);
    try {
      setView(await post(`/api/hu/${id}/${path}`, body, token));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (gone)
    return (
      <section className={PANEL}>
        <p className="mb-3 text-[15px]">This table has closed. Tables close after 10 minutes without a move, or when the site updates.</p>
        <Link to="/play/friend" className={`${BUTTON} inline-flex bg-[var(--accent)] text-white`}>
          Start a new table
        </Link>
      </section>
    );
  if (invite) return <Join id={id} invite={invite} onSeat={(t) => (write(tokenKey(id), t), setInvite(undefined), setToken(t))} />;
  if (!view) return <p className="px-1 text-[15px] text-[var(--text-muted)]">Finding your table…</p>;
  if (view.status === 'waiting' || !view.them) return <Waiting id={id} settings={view} />;
  return <Play v={view} onAct={(a) => void send('act', a)} onRematch={() => void send('rematch')} error={error} />;
}

function Join({ id, invite, onSeat }: { id: string; invite: Invite; onSeat: (token: string) => void }) {
  const [name, setName] = useState(useDefaultName());
  const [error, setError] = useState<string>();
  if (!invite.open)
    return (
      <section className={PANEL}>
        <p className="mb-3 text-[15px]">This table already has two players.</p>
        <Link to="/play/friend" className={`${BUTTON} inline-flex bg-[var(--accent)] text-white`}>
          Start your own table
        </Link>
      </section>
    );
  const join = async () => {
    setError(undefined);
    try {
      write(NAME_KEY, name.trim());
      onSeat((await post(`/api/hu/${id}/join`, { name })).token);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <section className={`${PANEL} flex max-w-md flex-col gap-3`}>
      <p className="text-[17px]">
        <strong>{invite.host}</strong> challenged you to heads-up.
      </p>
      <p className="-mt-2 text-[15px] text-[var(--text-muted)]">{summary(invite)}</p>
      <NameField value={name} onChange={setName} />
      <button type="button" onClick={() => void join()} className={`${BUTTON} bg-[var(--accent)] text-white`}>
        Take the seat
      </button>
      {error && <p className="text-[15px] text-rose-400">{error}</p>}
    </section>
  );
}

function Waiting({ id, settings }: { id: string; settings: Settings }) {
  const link = `${location.origin}/play/friend/${id}`;
  const [copied, setCopied] = useState(false);
  const copy = () => navigator.clipboard?.writeText(link).then(() => setCopied(true), () => {});
  return (
    <section className={`${PANEL} flex flex-col gap-3`}>
      <p className="text-[17px] font-semibold">Send this link to your friend</p>
      <div className="flex flex-wrap gap-2">
        <input
          readOnly
          value={link}
          aria-label="Link to this table"
          onFocus={(e) => e.target.select()}
          className="min-h-11 min-w-0 flex-1 rounded-[10px] bg-[var(--bg-third)] px-3 text-[15px] tabular-nums outline-none"
        />
        <button type="button" onClick={copy} className={`${BUTTON} bg-[var(--accent)] text-white`}>
          {copied ? 'Copied' : 'Copy link'}
        </button>
        {'share' in navigator && (
          <button type="button" onClick={() => navigator.share({ title: 'Heads-up poker', url: link }).catch(() => {})} className={`${BUTTON} bg-[var(--fill)]`}>
            Share
          </button>
        )}
      </div>
      <p className="text-[15px] text-[var(--text-muted)]">{summary(settings)}</p>
      <p className="flex items-center gap-2 text-[15px] text-[var(--text-muted)]">
        <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--accent-soft)]" />
        Waiting for them to join. The first hand deals as soon as they do.
      </p>
    </section>
  );
}

/** Seconds left for whoever is to act, counting down from what the server said. */
function TurnClock({ left, timer, who }: { left: number; timer: number; who: string }) {
  const [ends] = useState(() => performance.now() + left * 1000);
  const [now, setNow] = useState(() => performance.now());
  useEffect(() => {
    const h = setInterval(() => setNow(performance.now()), 200);
    return () => clearInterval(h);
  }, []);
  const remaining = Math.max(0, (ends - now) / 1000);
  const shown = Math.ceil(Math.min(remaining, timer));
  const low = shown <= 5;
  return (
    <div className="flex min-w-48 flex-1 items-center gap-3 sm:max-w-sm">
      <span className={`text-[13px] whitespace-nowrap tabular-nums ${low ? 'text-rose-300' : 'text-[var(--text-muted)]'}`}>
        {who} · {shown}s
      </span>
      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.08]">
        <span className={`block h-full rounded-full ${low ? 'bg-rose-400' : 'bg-[var(--accent)]'}`} style={{ width: `${Math.min(100, (remaining / timer) * 100)}%` }} />
      </span>
    </div>
  );
}

function Play({ v, onAct, onRematch, error }: { v: View; onAct: (a: Action) => void; onRematch: () => void; error?: string }) {
  const showPositions = useSettings((s) => s.settings.showPositions);
  const them = v.them!;
  // The felt redraws on a new version only; a long poll that timed out brings the same state back.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const t = useMemo(() => toTable(v), [v.version]);
  // Settled once the last change's animations have played: then the clock and the buttons show.
  const prev = useRef<Table>(undefined);
  const [settledOn, setSettledOn] = useState<Table>();
  useEffect(() => {
    const before = prev.current;
    prev.current = t;
    const h = setTimeout(() => setSettledOn(t), before ? ms(busyFor(before, t)) : 0);
    return () => clearTimeout(h);
  }, [t]);
  const settled = settledOn === t;
  const yourTurn = t.toAct === 0 && settled;
  const name = (i: number) => (i === 0 ? 'You' : them.name);
  const initials = them.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const matchWinner = v.status === 'over' ? (v.you.stack > 0 ? 'You' : them.name) : undefined;

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-[12px] bg-[var(--bg-second)] px-4 py-2.5 text-[13px] text-[var(--text-muted)]">
        <span>{summary(v)}</span>
        <span className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${them.online ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
          {them.name} {them.online ? 'is here' : 'is away'}
        </span>
      </div>

      <Felt
        t={t}
        youIdx={0}
        who={(i) => (i === 0 ? undefined : { name: them.name, avatar: initials || '?', color: '#c2410c' })}
        faceUp={(i) => i === 0 || !!them.cards}
        thinking={(i) => i === 1 && settled && t.toAct === 1}
        yourTurn={yourTurn}
        showPositions={showPositions}
      />

      <div className="mt-3 flex min-h-8 flex-wrap items-center justify-between gap-2 px-1">
        {v.timer > 0 && v.turnLeft !== null && settled && t.toAct !== null ? (
          <TurnClock key={v.version} left={v.turnLeft} timer={v.timer} who={t.toAct === 0 ? 'Your turn' : them.name} />
        ) : (
          <span />
        )}
        {t.street === 'done' && t.winners.length ? (
          <span className="flex flex-wrap justify-end gap-1.5">
            {t.winners.map((w) => (
              <span key={w.seat} className="inline-flex min-h-7 items-center gap-1.5 rounded-[8px] bg-emerald-400/10 px-2 text-[13px] text-emerald-200 ring-1 ring-emerald-400/30 ring-inset">
                <span className="text-[11px] font-semibold tracking-[0.06em] text-[var(--text-muted)] uppercase">{name(w.seat)}</span>
                {w.seat === 0 ? 'Win' : 'Wins'} <strong className="font-semibold tabular-nums">{money(w.amount)}</strong>
                {w.hand && <span className="text-[var(--text-muted)]">{w.hand}</span>}
              </span>
            ))}
          </span>
        ) : (
          <span className="text-xs text-[var(--text-muted)] tabular-nums">{t.handNo ? `Hand ${t.handNo}` : ''}</span>
        )}
      </div>

      {yourTurn && <ActionBar key={`${t.handNo}-${t.street}-${t.currentBet}`} t={t} onAct={onAct} />}
      {error && <p className="mt-2 text-center text-[15px] text-rose-400">{error}</p>}
      {matchWinner && (
        <section className={`${PANEL} mt-4 flex flex-col items-center gap-3 text-center`}>
          <p className="text-[22px] font-semibold">{matchWinner === 'You' ? 'You won the match.' : `${matchWinner} won the match.`}</p>
          <button type="button" onClick={onRematch} className={`${BUTTON} bg-[var(--accent)] text-white`}>
            Rematch, {money(v.start)} each
          </button>
          <div className="w-full max-w-xs text-left">
            <Record refresh={v.version} />
          </div>
        </section>
      )}
      <div className="mt-6">
        <HandLog t={t} name={name} />
      </div>
    </>
  );
}
