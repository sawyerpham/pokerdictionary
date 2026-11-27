// Reads hand histories in the PokerStars text format (also used, near enough, by GGPoker and others) and works out,
// for the player the hands were dealt to: results, the usual HUD stats, and preflop choices against the charts.
import { handName, type Card } from './cards.ts';
import { SPOTS } from './facing.ts';
import { HANDS } from './pushfold.ts';
import { expandRange, RFI, SEATS } from '../guides/rfi.ts';

export interface Hand {
  id: string;
  players: number;
  position: string; // BTN, SB, BB, UTG, ...
  hole: Card[];
  net: number; // big blinds won or lost
  vpip: boolean; // put money in preflop by choice
  pfr: boolean; // raised preflop
  rfi?: { raised: boolean; inChart: boolean }; // folded to you (not in the big blind)
  threeBet?: boolean; // faced one raise: did you re-raise?
  foldTo3Bet?: boolean; // you raised first and were re-raised: did you fold?
  cbet?: boolean; // you made the last raise preflop and could bet first on the flop: did you?
  facingOpen?: { spot: string; chose: string; best: string; loss: number }; // six-handed, one raise before you
  // Six-handed, heads-up to the flop after a single raise, 3-bet or 4-bet: the flop library pack it matches, and the
  // flop's actions in order (true = yours). Flop Review grades these against the library.
  flop?: { pack: string; board: Card[]; acts: { mine: boolean; kind: Act['kind'] }[] };
  sawFlop: boolean;
  showdown: boolean;
  wonShowdown: boolean;
}

const card = (s: string): Card => '23456789TJQKA'.indexOf(s[0].toUpperCase()) * 4 + 'shdc'.indexOf(s[1].toLowerCase());
const amount = (s: string) => Number(s.replace(/[^0-9.]/g, ''));
const OPENS = Object.fromEntries(RFI.map((r) => [r.seat, expandRange(r.range)]));
const BY_BEHIND = ['', 'SB', 'BTN', 'CO', 'HJ', 'UTG']; // the opening chart to use, by players left to act behind you
const at = new Map(HANDS.map((h, i) => [h, i]));
const clockwise = (n: number) => (n === 2 ? ['BTN', 'BB'] : ['BTN', 'SB', 'BB', ...SEATS[n].slice(0, -2)]);
const preflopOrder = (n: number) => [...SEATS[n], 'BB'];

interface Act {
  who: string;
  kind: 'fold' | 'check' | 'call' | 'bet' | 'raise';
}

/** One hand, or undefined if it isn't one we can read (no hole cards for anyone, say). */
export function parseHand(text: string): Hand | undefined {
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  const flopCards = /^\*\*\* FLOP \*\*\* \[(\w\w) (\w\w) (\w\w)\]/m.exec(text);
  const hero = lines.map((l) => /^Dealt to (.+?) \[(\w\w) (\w\w)\]/.exec(l)).find(Boolean);
  const holeAt = lines.findIndex((l) => l.startsWith('*** HOLE CARDS'));
  if (!hero || holeAt < 0) return undefined;
  const me = hero[1];
  const button = Number(/Seat #(\d+) is the button/.exec(text)?.[1] ?? 0);
  const seats = lines
    .slice(0, holeAt)
    .map((l) => /^Seat (\d+): (.+?) \(.*?in chips/.exec(l) ?? /^Seat (\d+): (.+?) \([$€£]?[\d.,]+\)/.exec(l))
    .filter((m): m is RegExpExecArray => !!m && !/sitting out/.test(m.input))
    .map((m) => ({ seat: Number(m[1]), name: m[2] }))
    .sort((a, b) => a.seat - b.seat);
  const n = seats.length;
  if (n < 2 || n > 9 || !seats.some((s) => s.name === me)) return undefined;
  const first = Math.max(0, seats.findIndex((s) => s.seat >= button));
  const ring = [...seats.slice(first), ...seats.slice(0, first)];
  const pos = new Map(ring.map((s, k) => [s.name, clockwise(n)[k]]));

  // Big blind size: from the header's stakes, else what the big blind posted.
  const stakes = /\(\s*[$€£]?([\d.,]+)\s*\/\s*[$€£]?([\d.,]+)/.exec(lines[0] ?? '');
  const posted = lines.map((l) => /: posts big blind [$€£]?([\d.,]+)/.exec(l)).find(Boolean);
  const bb = stakes ? amount(stakes[2]) : posted ? amount(posted[1]) : 0;
  if (!bb) return undefined;

  // Walk the action, street by street, keeping what the hero puts in.
  const streets: Act[][] = [[]];
  let street = 0, put = 0, streetPut = 0, won = 0, showdown = false;
  for (const l of lines) {
    if (/^\*\*\* (FLOP|TURN|RIVER)/.test(l)) {
      streets.push([]);
      street++;
      streetPut = 0;
      continue;
    }
    if (/^\*\*\* SHOW ?DOWN/.test(l)) showdown = true;
    if (/^\*\*\* SUMMARY/.test(l)) break;
    const back = /^Uncalled bet \([$€£]?([\d.,]+)\) returned to (.+)$/.exec(l);
    if (back) {
      if (back[2] === me) put -= amount(back[1]);
      continue;
    }
    const got = /^(.+?) collected [$€£]?([\d.,]+) from/.exec(l);
    if (got) {
      if (got[1] === me) won += amount(got[2]);
      continue;
    }
    const m = /^(.+?): (posts|folds|checks|calls|bets|raises)\b(.*)$/.exec(l);
    if (!m) continue;
    const [, who, verb, rest] = m;
    const nums = [...rest.matchAll(/[$€£]?([\d][\d.,]*)/g)].map((x) => amount(x[1]));
    if (verb === 'posts') {
      if (who === me) {
        put += nums[0] ?? 0;
        if (!/ante/.test(rest)) streetPut += nums[0] ?? 0;
      }
      continue;
    }
    if (who === me) {
      if (verb === 'calls' || verb === 'bets') {
        put += nums[0] ?? 0;
        streetPut += nums[0] ?? 0;
      }
      if (verb === 'raises') {
        const to = nums[1] ?? nums[0] ?? 0;
        put += to - streetPut;
        streetPut = to;
      }
    }
    streets[street].push({ who, kind: ({ folds: 'fold', checks: 'check', calls: 'call', bets: 'bet', raises: 'raise' } as const)[verb as 'folds'] });
  }

  const pre = streets[0];
  const mine = pre.filter((a) => a.who === me);
  const firstMine = pre.findIndex((a) => a.who === me);
  const before = firstMine < 0 ? pre : pre.slice(0, firstMine);
  const raisesBefore = before.filter((a) => a.kind === 'raise').length;
  const position = pos.get(me)!;
  const h = handName([card(hero[2]), card(hero[3])]);
  const out: Hand = {
    id: /#\s*([\w-]+)/.exec(lines[0] ?? '')?.[1] ?? '',
    players: n,
    position,
    hole: [card(hero[2]), card(hero[3])],
    net: (won - put) / bb,
    vpip: mine.some((a) => a.kind === 'call' || a.kind === 'raise'),
    pfr: mine.some((a) => a.kind === 'raise'),
    sawFlop: streets.length > 1 && !mine.some((a) => a.kind === 'fold'),
    showdown: false,
    wonShowdown: false,
  };
  out.showdown = showdown && out.sawFlop && !streets.flat().some((a) => a.who === me && a.kind === 'fold');
  out.wonShowdown = out.showdown && won > 0;

  if (firstMine >= 0 && before.every((a) => a.kind === 'fold') && position !== 'BB') {
    const order = preflopOrder(n);
    const chart = BY_BEHIND[order.length - 1 - order.indexOf(position)];
    if (chart) out.rfi = { raised: mine[0].kind === 'raise', inChart: OPENS[chart].has(h) };
  }
  if (firstMine >= 0 && raisesBefore === 1) {
    out.threeBet = mine[0].kind === 'raise';
    const callers = before.slice(before.findIndex((a) => a.kind === 'raise')).some((a) => a.kind === 'call');
    const opener = pos.get(before.find((a) => a.kind === 'raise')!.who)!;
    const spot = SPOTS[`${opener}-${position}`];
    if (n === 6 && spot && !callers && !before.some((a) => a.kind === 'call')) {
      const node = spot.nodes[0], i = at.get(h)!;
      const k = { fold: 0, call: 1, raise: 2 }[mine[0].kind as 'fold'] ?? -1;
      if (k >= 0) {
        const evs = node.actions.map((_, a) => node.ev[a][i] / 100), best = evs.indexOf(Math.max(...evs));
        out.facingOpen = { spot: `${opener}-${position}`, chose: node.actions[k], best: node.actions[best], loss: evs[best] - evs[k] };
      }
    }
  }
  if (raisesBefore === 0 && mine[0]?.kind === 'raise') {
    const after = pre.slice(firstMine + 1);
    const reraise = after.findIndex((a) => a.kind === 'raise' && a.who !== me);
    const reply = reraise >= 0 ? after.slice(reraise + 1).find((a) => a.who === me) : undefined;
    if (reply) out.foldTo3Bet = reply.kind === 'fold';
  }
  const lastRaiser = [...pre].reverse().find((a) => a.kind === 'raise')?.who;
  if (lastRaiser === me && out.sawFlop) {
    const flop = streets[1];
    const myFirst = flop.findIndex((a) => a.who === me);
    if (myFirst >= 0 && !flop.slice(0, myFirst).some((a) => a.kind === 'bet' || a.kind === 'raise')) out.cbet = flop[myFirst].kind === 'bet';
  }
  // Heads-up flops after a single raised, 3-bet or 4-bet pot, six-handed, with everyone else folded.
  const voluntary = pre.filter((a) => a.kind !== 'fold');
  const players = [...new Set(voluntary.map((a) => a.who))];
  if (n === 6 && flopCards && players.length === 2 && players.includes(me) && voluntary.at(-1)?.kind === 'call') {
    const raises = voluntary.filter((a) => a.kind === 'raise');
    const opener = raises[0]?.who, other = players.find((x) => x !== opener)!;
    const pattern = voluntary.map((a) => `${a.who === opener ? 'O' : 'R'}${a.kind[0]}`).join(' ');
    const type = { 'Or Rc': 'srp', 'Or Rr Oc': '3bet', 'Or Rr Or Rc': '4bet' }[pattern];
    if (type) {
      out.flop = {
        pack: `${type}-${pos.get(opener)}-${pos.get(other)}`,
        board: flopCards.slice(1, 4).map(card),
        acts: (streets[1] ?? []).map((a) => ({ mine: a.who === me, kind: a.kind })),
      };
    }
  }
  return out;
}

/** Every hand in a pasted or uploaded file. Hands are separated by blank lines. */
export function parseHands(text: string): Hand[] {
  return text
    .split(/\r?\n\s*\r?\n(?=\s*\S)/)
    .filter((chunk) => chunk.includes('*** HOLE CARDS'))
    .map(parseHand)
    .filter((h): h is Hand => !!h);
}
