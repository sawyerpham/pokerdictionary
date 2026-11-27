// Cards are 0..51: rank = c >> 2 (0 = deuce .. 12 = ace), suit = c & 3.
export type Card = number;

export const RANKS = '23456789TJQKA';
export const SUITS = ['♠', '♥', '♦', '♣'] as const;
const RANK_NAMES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jack', 'Queen', 'King', 'Ace'];
const PLURAL = ['Deuces', 'Threes', 'Fours', 'Fives', 'Sixes', 'Sevens', 'Eights', 'Nines', 'Tens', 'Jacks', 'Queens', 'Kings', 'Aces'];

export const rankOf = (c: Card) => c >> 2;
export const suitOf = (c: Card) => c & 3;
export const rankLabel = (c: Card) => (rankOf(c) === 8 ? '10' : RANKS[rankOf(c)]);

/** "AKs" style name of two hole cards, high card first. */
export function handName([a, b]: Card[]) {
  const [hi, lo] = rankOf(a) >= rankOf(b) ? [a, b] : [b, a];
  const name = RANKS[rankOf(hi)] + RANKS[rankOf(lo)];
  return rankOf(a) === rankOf(b) ? name : name + (suitOf(a) === suitOf(b) ? 's' : 'o');
}

export type Rng = () => number;

/** Seeded random numbers (mulberry32): the same seed always gives the same sequence. */
export function seeded(seed: number): Rng {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffledDeck(rng: Rng = Math.random): Card[] {
  const d = Array.from({ length: 52 }, (_, i) => i);
  for (let i = 51; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

export const CATEGORIES = [
  'High Card', 'Pair', 'Two Pair', 'Three of a Kind', 'Straight', 'Flush', 'Full House', 'Four of a Kind', 'Straight Flush',
] as const;

/** Highest straight in a 13-bit rank mask (bit r = rank r present), as its top rank; -1 if none. Wheel = 3. */
function straightTop(mask: number): number {
  for (let top = 12; top >= 4; top--) {
    const run = 0b11111 << (top - 4);
    if ((mask & run) === run) return top;
  }
  return (mask & 0b1000000001111) === 0b1000000001111 ? 3 : -1;
}

/** Score of the best five-card hand in 5–7 cards. Higher wins; equal scores split. */
export function evaluate(cards: Card[]): number {
  const counts = new Array(13).fill(0);
  const suitMasks = [0, 0, 0, 0];
  for (const c of cards) {
    counts[rankOf(c)]++;
    suitMasks[suitOf(c)] |= 1 << rankOf(c);
  }
  const score = (cat: number, ranks: number[]) =>
    ranks.slice(0, 5).reduce((s, r) => s * 13 + r, cat) * 13 ** Math.max(0, 5 - ranks.length);

  for (const m of suitMasks) {
    if (m.toString(2).replace(/0/g, '').length >= 5) {
      const sf = straightTop(m);
      if (sf >= 0) return score(8, [sf]);
    }
  }
  // Ranks grouped by count, then by rank, high first: e.g. full house -> [trip rank, pair rank, ...].
  const byCount = [...Array(13).keys()]
    .filter((r) => counts[r])
    .sort((a, b) => counts[b] - counts[a] || b - a);
  const [a, b] = byCount;
  if (counts[a] === 4) return score(7, [a, Math.max(...byCount.filter((r) => r !== a))]);
  if (counts[a] === 3 && counts[b] >= 2) return score(6, [a, b]);
  const flush = suitMasks.find((m) => m.toString(2).replace(/0/g, '').length >= 5);
  if (flush) return score(5, [...Array(13).keys()].filter((r) => flush & (1 << r)).reverse());
  const st = straightTop(suitMasks.reduce((x, y) => x | y));
  if (st >= 0) return score(4, [st]);
  const kick = (...skip: number[]) => byCount.filter((r) => !skip.includes(r)).sort((x, y) => y - x);
  if (counts[a] === 3) return score(3, [a, ...kick(a).slice(0, 2)]);
  if (counts[a] === 2 && counts[b] === 2) return score(2, [a, b, ...kick(a, b).slice(0, 1)]);
  if (counts[a] === 2) return score(1, [a, ...kick(a).slice(0, 3)]);
  return score(0, kick());
}

const CAT_BASE = 13 ** 5;
export const categoryOf = (score: number) => Math.floor(score / CAT_BASE);

/** "Full House, Kings full of Sevens", "Pair of Aces", "Ace-high Flush"... */
export function describe(score: number): string {
  const cat = categoryOf(score);
  const r1 = Math.floor(score / 13 ** 4) % 13;
  const r2 = Math.floor(score / 13 ** 3) % 13;
  switch (cat) {
    case 8: return r1 === 12 ? 'Royal Flush' : `${RANK_NAMES[r1]}-high Straight Flush`;
    case 7: return `Four ${PLURAL[r1]}`;
    case 6: return `${PLURAL[r1]} full of ${PLURAL[r2]}`;
    case 5: return `${RANK_NAMES[r1]}-high Flush`;
    case 4: return `${RANK_NAMES[r1]}-high Straight`;
    case 3: return `Three ${PLURAL[r1]}`;
    case 2: return `Two Pair, ${PLURAL[r1]} and ${PLURAL[r2]}`;
    case 1: return `Pair of ${PLURAL[r1]}`;
    default: return `${RANK_NAMES[r1]} High`;
  }
}

/**
 * Monte Carlo equity of `hole` against `opponents` random hands, given the board so far.
 * Ties count as a share of the pot. ponytail: random opponents (no ranges); add range weighting
 * if bots need to read each other.
 */
export function equity(hole: Card[], board: Card[], opponents: number, iterations = 300, rng: Rng = Math.random): number {
  const dead = new Set([...hole, ...board]);
  const live = [...Array(52).keys()].filter((c) => !dead.has(c));
  const need = 5 - board.length + opponents * 2;
  let won = 0;
  for (let it = 0; it < iterations; it++) {
    // Partial Fisher-Yates: only the cards this run needs.
    for (let i = 0; i < need; i++) {
      const j = i + Math.floor(rng() * (live.length - i));
      [live[i], live[j]] = [live[j], live[i]];
    }
    const runout = board.concat(live.slice(0, 5 - board.length));
    const mine = evaluate(hole.concat(runout));
    let best = 0;
    let ties = 1;
    for (let o = 0; o < opponents; o++) {
      const k = 5 - board.length + o * 2;
      const s = evaluate([live[k], live[k + 1], ...runout]);
      if (s > best) [best, ties] = [s, 1];
      else if (s === best) ties++;
    }
    if (mine > best) won += 1;
    else if (mine === best) won += 1 / (ties + 1);
  }
  return won / iterations;
}

/** Chen formula preflop score, the classic quick hole-card ranking. */
export function chen(hole: Card[]): number {
  const [hi, lo] = hole.map(rankOf).sort((x, y) => y - x);
  const base = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 6, 7, 8, 10][hi];
  if (hi === lo) return Math.max(5, base * 2);
  let s = base;
  if (suitOf(hole[0]) === suitOf(hole[1])) s += 2;
  const gap = hi - lo - 1;
  s -= [0, 1, 2, 4, 5, 5, 5, 5, 5, 5, 5, 5][gap];
  if (gap <= 1 && hi < 10) s += 1; // connectors below Queen
  return Math.ceil(s);
}

/** Share of all 1326 starting hands that rank at least as well as this one, 0 (aces) .. 1. */
export const preflopPercentile = (() => {
  const scores: number[] = [];
  for (let a = 0; a < 52; a++) for (let b = a + 1; b < 52; b++) scores.push(chen([a, b]));
  scores.sort((x, y) => y - x);
  const cache = new Map<number, number>();
  return (hole: Card[]) => {
    const s = chen(hole);
    if (!cache.has(s)) cache.set(s, scores.filter((x) => x >= s).length / scores.length);
    return cache.get(s)!;
  };
})();

export interface Outlook {
  equity: number[]; // each seat's share of the pot, ties split, 0..1
  win: number; // the hero's shares of all deals
  tie: number;
  lose: number;
  finish: number[]; // chance the hero's final hand is each of CATEGORIES
}

/**
 * Deals many times with every seat's known hole cards fixed (0, 1 or 2 of them) and the rest, plus the rest
 * of the board, random.
 */
export function outlook(hands: Card[][], board: Card[], hero: number, iterations = 10000, rng: Rng = Math.random): Outlook {
  const dead = new Set([...hands.flat(), ...board]);
  const live = [...Array(52).keys()].filter((c) => !dead.has(c));
  const toCome = 5 - board.length;
  const need = toCome + hands.reduce((n, h) => n + 2 - h.length, 0);
  const finish = new Array(CATEGORIES.length).fill(0);
  const equity = new Array(hands.length).fill(0);
  const scores = new Array(hands.length).fill(0);
  let win = 0, tie = 0;
  for (let it = 0; it < iterations; it++) {
    for (let i = 0; i < need; i++) {
      const j = i + Math.floor(rng() * (live.length - i));
      [live[i], live[j]] = [live[j], live[i]];
    }
    const runout = board.concat(live.slice(0, toCome));
    let next = toCome;
    let best = 0, winners = 0;
    for (let p = 0; p < hands.length; p++) {
      const hole = hands[p].slice();
      while (hole.length < 2) hole.push(live[next++]);
      const score = evaluate(hole.concat(runout));
      scores[p] = score;
      if (score > best) [best, winners] = [score, 1];
      else if (score === best) winners++;
    }
    for (let p = 0; p < hands.length; p++) if (scores[p] === best) equity[p] += 1 / winners;
    finish[categoryOf(scores[hero])]++;
    if (scores[hero] === best) {
      if (winners === 1) win++;
      else tie++;
    }
  }
  const share = (n: number) => n / iterations;
  return { equity: equity.map(share), win: share(win), tie: share(tie), lose: share(iterations - win - tie), finish: finish.map(share) };
}

/** Next cards that lift your hand to a better type, ignoring cards that only improve the shared board. */
export function outsFor(hole: Card[], board: Card[], alsoDead: Card[] = []): Card[] {
  const now = categoryOf(evaluate([...hole, ...board]));
  const dead = new Set([...hole, ...board, ...alsoDead]);
  return [...Array(52).keys()].filter((c) => {
    if (dead.has(c)) return false;
    const mine = categoryOf(evaluate([...hole, ...board, c]));
    return mine > now && mine > categoryOf(evaluate([...board, c]));
  });
}

/** Exact all-in equity of `hero` against one known hand, every runout dealt (a flop or a turn board). Ties split. */
export function headsUpEquity(hero: Card[], villain: Card[], board: Card[]): number {
  const dead = new Set([...hero, ...villain, ...board]);
  const live = [...Array(52).keys()].filter((c) => !dead.has(c));
  let won = 0, deals = 0;
  const score = (runout: Card[]) => {
    const a = evaluate([...hero, ...runout]), b = evaluate([...villain, ...runout]);
    won += a > b ? 1 : a === b ? 0.5 : 0;
    deals++;
  };
  if (board.length === 5) score(board);
  else if (board.length === 4) for (const c of live) score([...board, c]);
  else for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) score([...board, live[i], live[j]]);
  return won / deals;
}

/** Next cards that put `hero` ahead of `villain` (ties don't count). */
export function outsAgainst(hero: Card[], villain: Card[], board: Card[]): Card[] {
  const dead = new Set([...hero, ...villain, ...board]);
  return [...Array(52).keys()].filter((c) => !dead.has(c) && evaluate([...hero, ...board, c]) > evaluate([...villain, ...board, c]));
}
