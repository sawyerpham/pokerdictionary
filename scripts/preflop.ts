// Six-max, 100 bb: what to do when someone raises before you. For every opener and every seat behind it, the game
// "open, then fold / call / 3-bet, then fold / call / 4-bet, then fold / call / all-in, then fold / call" is solved by
// CFR+ over the 169 starting hands. The opener's range is the site's opening chart (Upswing's RFI ranges).
//
// A model, not a full solver: when the hand goes to a flop, each player gets a share of the pot from their all-in
// equity, shaped by position, pot size and how playable the hand is. Those few settings are fitted so the model's
// overall frequencies match published solver output for all 15 spots (TARGETS below). Writes src/engine/facing.ts.
//
//   node scripts/preflop.ts                              solve with the fitted settings, write src/engine/facing.ts
//   node scripts/preflop.ts --stack 40 --json out.json   the same at another stack depth, as JSON
//   node scripts/preflop.ts fit                          search for the settings again; saves scripts/preflop-params.json
//
// THREADS caps the threads the fit uses. With scripts/realization.json (measured by scripts/compute.ts from real flop
// solves) a hand's realization comes from those solves instead of the playability guess, where they cover it.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { isMainThread, parentPort, Worker } from 'node:worker_threads';
import { expandRange, RFI } from '../src/guides/rfi.ts';
import { equityTable, HANDS } from './equity.ts';

const N = 169;
const SEATS = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
const RANKS = 'AKQJT98765432';
const RAKE = 0.05, CAP = 0.6; // of pots that see a flop, in bb: typical of mid-stakes online games
const half = (x: number) => Math.round(x * 2) / 2;
const combos = (h: string) => (h.length === 2 ? 6 : h[2] === 's' ? 4 : 12);

// Published solver output, 6-max cash (NL500 rake), 100 bb, 2.5 bb opens (SB 3 bb), 3-bets 2.5x the open in position
// and 3x from the blinds: BeyondGTO's solver database, https://beyondgto.com/defense (facing an open) and
// https://beyondgto.com/blog/3-bet-poker-strategy (the opener facing a 3-bet), decoded Jul and Sep 2026. Their first
// seat is called LJ; it's this site's UTG. [responder fold, call, 3-bet], then [opener fold, call, 4-bet], in %.
const TARGETS: Record<string, [number[], number[]]> = {
  'UTG-HJ': [[89.4, 4.1, 6.4], [23, 62, 16]],
  'UTG-CO': [[88.2, 5.3, 6.6], [21, 63, 16]],
  'UTG-BTN': [[86.1, 7.1, 6.8], [19, 64, 16]],
  'UTG-SB': [[88.7, 5.2, 6.1], [24, 66, 11]],
  'UTG-BB': [[72.5, 21.5, 6.0], [24, 66, 10]],
  'HJ-CO': [[86.7, 5.3, 8.0], [26, 59, 15]],
  'HJ-BTN': [[84.0, 7.8, 8.2], [23, 61, 16]],
  'HJ-SB': [[87.4, 5.3, 7.4], [26, 64, 10]],
  'HJ-BB': [[69.4, 23.1, 7.5], [26, 64, 10]],
  'CO-BTN': [[80.8, 8.8, 10.4], [27, 57, 16]],
  'CO-SB': [[86.4, 4.5, 9.1], [27, 64, 9]],
  'CO-BB': [[63.3, 26.3, 10.4], [31, 57, 12]],
  'BTN-SB': [[81.7, 5.2, 13.2], [32, 58, 10]],
  'BTN-BB': [[54.9, 31.7, 13.4], [33, 56, 10]],
  'SB-BB': [[44.5, 38.7, 16.9], [47, 38, 16]],
};

/** The model's settings. Pots: 0 single-raised, 1 3-bet, 2 4-bet. */
interface Params {
  oop: number[]; // share of its equity the out-of-position player realizes, relative to in position
  curve: number[]; // after the flop the better hand wins more than its equity: shares go as equity^curve
  hand: number[]; // how much playability counts, by pot
  squeeze: number; // the caller's realization drops this much per player still to act behind
  suited: number; offsuit: number; connected: number; gapped: number; broadway: number; // playability parts
}
const DEFAULT: Params = {
  // From `node scripts/preflop.ts fit` (Nov 2026), before measured realization.
  oop: [0.789, 0.851, 1.005],
  curve: [1.647, 1.433, 1.17],
  hand: [1.089, 2.257, 0.044],
  squeeze: 0.088,
  suited: 0.175, offsuit: -0.096, connected: -0.016, gapped: -0.096, broadway: 0.186,
};
const PARAMS = new URL('./preflop-params.json', import.meta.url);
const FITTED: Params = existsSync(PARAMS) ? JSON.parse(readFileSync(PARAMS, 'utf8')) : DEFAULT;
// Measured realization by pot (0 single-raised, 1 3-bet, 2 4-bet), side and hand: chips won / (equity x pot).
const REALIZATION = new URL('./realization.json', import.meta.url);
const MEASURED: Record<string, Record<'ip' | 'oop', Record<string, number>>> = existsSync(REALIZATION) ? JSON.parse(readFileSync(REALIZATION, 'utf8')) : {};

const flag = (name: string) => {
  const k = process.argv.indexOf(`--${name}`);
  return k > 0 ? process.argv[k + 1] : undefined;
};
const STACK = Number(flag('stack') ?? 100); // big blinds, everyone

/** How much better or worse than average a hand turns its equity into pot share after the flop. */
function playability(h: string, p: Params) {
  if (h.length === 2) return 0;
  const hi = RANKS.length - RANKS.indexOf(h[0]), lo = RANKS.length - RANKS.indexOf(h[1]);
  const gap = h[0] === 'A' && lo <= 4 ? lo - 1 : hi - lo - 1; // low aces count as connected through the wheel
  let m = h[2] === 's' ? p.suited : p.offsuit;
  m += gap <= 1 ? p.connected * (1 - gap / 2) : gap >= 3 && h[0] !== 'A' ? p.gapped : 0;
  if (lo >= 9) m += p.broadway; // both cards ten or higher
  return m;
}

type Term = { wu: Float64Array[] }; // per player: W × payoff, [i * N + j], i = opener's hand, j = responder's
type Facing = 'open' | '3bet' | '4bet' | 'allin';
type Decision = { player: 0 | 1; facing: Facing; actions: string[]; kids: Tree[]; regret: Float64Array[]; avg: Float64Array[]; values?: Float64Array[] };
type Tree = Term | Decision;

const { EQ, W } = await equityTable();

function solve(O: string, R: string, p: Params, iterations: number) {
  const PLAY = HANDS.map((h) => playability(h, p));
  const blindR = R === 'BB' ? 1 : R === 'SB' ? 0.5 : 0;
  const dead = (O !== 'SB' && R !== 'SB' ? 0.5 : 0) + (R !== 'BB' ? 1 : 0);
  const rIp = !(R === 'SB' || R === 'BB') || O === 'SB';
  const behind = SEATS.length - 1 - SEATS.indexOf(R);
  const o = O === 'SB' ? 3 : 2.5;
  const t3 = R === 'SB' || R === 'BB' ? 3 * o : 2.5 * o;
  const t4 = half(rIp ? 2.6 * t3 : 2.2 * t3);
  // Short stacks: a raise that would put in 40% or more of the stack is made as an all-in instead.
  const jam3 = t3 >= 0.4 * STACK, jam4 = !jam3 && t4 >= 0.4 * STACK;

  // Payoffs are each player's net from the start of the hand, in bb.
  const term = (u0: (i: number, j: number) => number, u1: (i: number, j: number) => number): Term => {
    const wu = [new Float64Array(N * N), new Float64Array(N * N)];
    for (let i = 0; i < N; i++)
      for (let j = 0; j < N; j++) {
        wu[0][i * N + j] = W[i][j] * u0(i, j);
        wu[1][i * N + j] = W[i][j] * u1(i, j);
      }
    return { wu };
  };
  const raked = (pot: number) => pot - Math.min(CAP, RAKE * pot);
  /** How well a side turns equity into chips after the flop: measured where real solves cover the hand. */
  const realize = (k: 0 | 1 | 2, ip: boolean, i: number) =>
    MEASURED[k]?.[ip ? 'ip' : 'oop']?.[HANDS[i]] ?? (ip ? 1 : p.oop[k]) * (1 + p.hand[k] * PLAY[i]);
  /** A flop is seen with `each` in from both players. */
  const flop = (k: 0 | 1 | 2, each: number) => {
    const rO = (i: number) => realize(k, !rIp, i);
    const rR = (j: number) => realize(k, rIp, j) * (k === 0 ? 1 - p.squeeze * behind : 1);
    const share = (i: number, j: number) => {
      const a = EQ[i][j] ** p.curve[k] * rO(i), b = (1 - EQ[i][j]) ** p.curve[k] * rR(j);
      return a / (a + b);
    };
    const pot = raked(2 * each + dead);
    return term((i, j) => share(i, j) * pot - each, (i, j) => (1 - share(i, j)) * pot - each);
  };
  const decide = (player: 0 | 1, facing: Facing, actions: string[], kids: Tree[]): Decision => ({
    player,
    facing,
    actions,
    kids,
    regret: actions.map(() => new Float64Array(N)),
    avg: actions.map(() => new Float64Array(N)),
  });
  const allIn = raked(2 * STACK + dead);
  const showdown = term((i, j) => EQ[i][j] * allIn - STACK, (i, j) => (1 - EQ[i][j]) * allIn - STACK);
  let vs3: Decision;
  if (jam3) vs3 = decide(0, 'allin', ['Fold', 'Call'], [term(() => -o, () => o + dead), showdown]);
  else {
    const vs4 = jam4
      ? decide(1, 'allin', ['Fold', 'Call'], [term(() => t3 + dead, () => -t3), showdown])
      : decide(1, '4bet', ['Fold', 'Call', 'All-in'], [
          term(() => t3 + dead, () => -t3),
          flop(2, t4),
          decide(0, 'allin', ['Fold', 'Call'], [term(() => -t4, () => t4 + dead), showdown]),
        ]);
    vs3 = decide(0, '3bet', ['Fold', 'Call', jam4 ? 'All-in' : '4-bet'], [term(() => -o, () => o + dead), flop(1, t3), vs4]);
  }
  const vsOpen = decide(1, 'open', ['Fold', 'Call', jam3 ? 'All-in' : '3-bet'], [term(() => blindR + dead, () => -blindR), flop(0, o), vs3]);

  const strategy = (d: Decision, avg: boolean) => {
    const src = avg ? d.avg : d.regret;
    return d.actions.map((_, a) => {
      const s = new Float64Array(N);
      for (let h = 0; h < N; h++) {
        let sum = 0;
        for (const x of src) sum += Math.max(0, x[h]);
        s[h] = sum > 0 ? Math.max(0, src[a][h]) / sum : 1 / d.actions.length;
      }
      return s;
    });
  };
  /** Counterfactual values for both players (opener, responder); updates regrets, or records them if `final`. */
  const walk = (t: Tree, r0: Float64Array, r1: Float64Array, w: number, final: boolean): [Float64Array, Float64Array] => {
    if ('wu' in t) {
      const v0 = new Float64Array(N), v1 = new Float64Array(N);
      for (let i = 0; i < N; i++) {
        let s = 0;
        for (let j = 0; j < N; j++) {
          s += t.wu[0][i * N + j] * r1[j];
          v1[j] += t.wu[1][i * N + j] * r0[i];
        }
        v0[i] = s;
      }
      return [v0, v1];
    }
    const sigma = strategy(t, final);
    const me = t.player, mine = me === 0 ? r0 : r1;
    const kids = t.kids.map((k, a) => {
      const reach = mine.map((r, h) => r * sigma[a][h]);
      return me === 0 ? walk(k, reach, r1, w, final) : walk(k, r0, reach, w, final);
    });
    const v: [Float64Array, Float64Array] = [new Float64Array(N), new Float64Array(N)];
    for (let h = 0; h < N; h++)
      for (let a = 0; a < kids.length; a++) {
        v[me][h] += sigma[a][h] * kids[a][me][h];
        v[1 - me][h] += kids[a][1 - me][h];
      }
    if (final) t.values = kids.map((k) => k[me]);
    else
      for (let a = 0; a < kids.length; a++)
        for (let h = 0; h < N; h++) {
          t.regret[a][h] = Math.max(0, t.regret[a][h] + kids[a][me][h] - v[me][h]);
          t.avg[a][h] += w * mine[h] * sigma[a][h];
        }
    return v;
  };

  const open = expandRange(RFI.find((x) => x.seat === O)!.range);
  const r0 = Float64Array.from(HANDS, (h) => (open.has(h) ? 1 : 0)), r1 = new Float64Array(N).fill(1);
  for (let it = 1; it <= iterations; it++) walk(vsOpen, r0, r1, it, false);
  walk(vsOpen, r0, r1, 0, true);

  // Each decision: how often each hand takes each action, and each action's EV against folding. EV = counterfactual
  // value / how often the other player's hands are there alongside this one.
  const decisions: Decision[] = [];
  for (let d: Tree | undefined = vsOpen; d && 'actions' in d; d = d.kids[2]) decisions.push(d);
  const sigmas = decisions.map((d) => strategy(d, true));
  const opponent = (k: number) => {
    const d = decisions[k], r = (d.player === 0 ? r1 : r0).slice();
    for (let x = 0; x < k; x++) if (decisions[x].player !== d.player) for (let h = 0; h < N; h++) r[h] *= sigmas[x][2][h];
    return r;
  };
  const nodes = decisions.map((d, k) => {
    const opp = opponent(k);
    const ev = d.values!.map((v) =>
      HANDS.map((_, h) => {
        let m = 0;
        for (let x = 0; x < N; x++) m += (d.player === 0 ? W[h][x] : W[x][h]) * opp[x];
        return m > 0 ? v[h] / m : 0;
      }),
    );
    return { facing: d.facing, hero: d.player === 0 ? 'opener' : 'responder', actions: d.actions, freq: sigmas[k].map((s) => [...s]), ev: ev.map((e) => e.map((x, h) => x - ev[0][h])) };
  });
  // Overall frequencies, weighted by combos and by how often each hand gets there: responder vs the open, opener vs the 3-bet.
  const mix = (freq: Float64Array[], reach: (h: number) => number) => {
    const total = HANDS.reduce((n, h, i) => n + reach(i) * combos(h), 0);
    return freq.map((f) => (HANDS.reduce((n, h, i) => n + f[i] * reach(i) * combos(h), 0) / total) * 100);
  };
  const summary = [mix(sigmas[0], () => 1), mix(sigmas[1], (i) => r0[i])];
  return { open: o, threeBet: jam3 ? STACK : t3, fourBet: jam3 || jam4 ? STACK : t4, nodes, summary };
}

const SPOTS = SEATS.slice(0, -1).flatMap((O, k) => SEATS.slice(k + 1).map((R) => [O, R]));
const gap = (summary: number[][], key: string) => summary.flatMap((row, a) => row.map((x, b) => (x - TARGETS[key][a][b]) ** 2)).reduce((x, y) => x + y, 0);
/** Squared distance from the published frequencies, in percentage points, across every spot. */
const loss = (p: Params, iterations: number) => SPOTS.reduce((sum, [O, R]) => sum + gap(solve(O, R, p, iterations).summary, `${O}-${R}`), 0);

if (!isMainThread) {
  // A fitting worker: score each set of settings it's sent.
  parentPort!.on('message', (ps: Params[]) => parentPort!.postMessage(ps.map((p) => loss(p, 300))));
} else if (process.argv[2] === 'fit') {
  // Hill climbing: try small random changes to the best settings so far, in parallel; shrink the steps when none help.
  const threads = Math.max(1, Number(process.env.THREADS) || availableParallelism() - 1);
  const workers = Array.from({ length: threads }, () => new Worker(new URL(import.meta.url)));
  const score = (ps: Params[]) =>
    Promise.all(workers.map((w, k) => new Promise<number[]>((ok) => (w.once('message', ok), w.postMessage(ps.slice(k * 2, k * 2 + 2)))))).then((r) => r.flat());
  const flat = (p: Params) => [...p.oop, ...p.curve, ...p.hand, p.squeeze, p.suited, p.offsuit, p.connected, p.gapped, p.broadway];
  const unflat = (x: number[]): Params => ({
    oop: x.slice(0, 3), curve: x.slice(3, 6), hand: x.slice(6, 9), squeeze: x[9],
    suited: x[10], offsuit: x[11], connected: x[12], gapped: x[13], broadway: x[14],
  });
  const LO = [0.5, 0.5, 0.6, 1, 1, 1, 0, 0, 0, 0, -0.1, -0.2, -0.1, -0.2, -0.1];
  const HI = [1.1, 1.1, 1.1, 2, 2, 1.6, 3, 3, 2, 0.15, 0.3, 0.1, 0.3, 0.1, 0.3];
  let best = flat(FITTED), bestLoss = (await score([unflat(best)]))[0], step = 0.15;
  console.log(`start: ${bestLoss.toFixed(0)}`);
  for (let round = 1; round <= 60 && step > 0.005; round++) {
    const tries = Array.from({ length: threads * 2 }, () =>
      best.map((x, k) => (Math.random() < 0.4 ? Math.min(HI[k], Math.max(LO[k], x + (Math.random() * 2 - 1) * step * (HI[k] - LO[k]))) : x)),
    );
    const losses = await score(tries.map(unflat));
    const k = losses.indexOf(Math.min(...losses));
    if (losses[k] < bestLoss) [best, bestLoss] = [tries[k], losses[k]];
    else step *= 0.7;
    console.log(`round ${round}/60: ${bestLoss.toFixed(0)} (step ${step.toFixed(3)})`);
  }
  const fitted = unflat(best.map((x) => Math.round(x * 1000) / 1000));
  writeFileSync(PARAMS, JSON.stringify(fitted, null, 2) + '\n');
  console.log(`saved ${JSON.stringify(fitted)}`);
  await Promise.all(workers.map((w) => w.terminate()));
} else {
  const started = performance.now();
  const out: Record<string, ReturnType<typeof solve>> = {};
  let total = 0;
  for (const [k, [O, R]] of SPOTS.entries()) {
    const key = `${O}-${R}`, s = solve(O, R, FITTED, 3000);
    out[key] = s;
    const f = (xs: number[]) => xs.map((x) => x.toFixed(0).padStart(3)).join(' ');
    if (STACK === 100) {
      total += gap(s.summary, key);
      console.log(`spot ${k + 1}/${SPOTS.length} ${`${R} vs ${O}`.padEnd(10)} fold/call/3-bet ${f(s.summary[0])}  (published ${f(TARGETS[key][0])})   opener vs 3-bet ${f(s.summary[1])}  (published ${f(TARGETS[key][1])})`);
    } else console.log(`spot ${k + 1}/${SPOTS.length} ${R} vs ${O} at ${STACK} bb: fold/call/raise ${f(s.summary[0])}`);
  }
  if (STACK === 100) console.log(`root-mean-square gap: ${Math.sqrt(total / (SPOTS.length * 6)).toFixed(1)} points`);

  const round = (xs: number[][], scale: number) => xs.map((r) => r.map((x) => Math.round(x * scale)));
  const spots = Object.fromEntries(
    Object.entries(out).map(([key, s]) => [
      key,
      { open: s.open, threeBet: s.threeBet, fourBet: s.fourBet, nodes: s.nodes.map((n) => ({ ...n, freq: round(n.freq, 100), ev: round(n.ev, 100) })) },
    ]),
  );
  const json = flag('json');
  if (json) writeFileSync(json, JSON.stringify({ stack: STACK, spots }));
  else {
    const body = Object.entries(spots)
      .map(([key, s]) => {
        const nodes = s.nodes
          .map((n) => `    { facing: '${n.facing}', hero: '${n.hero}', actions: ${JSON.stringify(n.actions)}, freq: ${JSON.stringify(n.freq)}, ev: ${JSON.stringify(n.ev)} },`)
          .join('\n');
        return `  '${key}': { open: ${s.open}, threeBet: ${s.threeBet}, fourBet: ${s.fourBet}, nodes: [\n${nodes}\n  ] },`;
      })
      .join('\n');
    writeFileSync(
      new URL('../src/engine/facing.ts', import.meta.url),
      `// Generated by scripts/preflop.ts (six-max, 100 bb, 5% rake capped at ${CAP} bb, postflop play modeled); don't edit by hand.
// SPOTS['OPENER-RESPONDER'].nodes, in order: the responder facing the open, the opener facing the 3-bet, the responder
// facing the 4-bet, the opener facing the all-in. freq[a][i]: % of the time HANDS[i] (pushfold.ts order) takes
// actions[a]. ev[a][i]: what that action is worth against folding, in hundredths of a big blind.
export interface FacingNode {
  facing: 'open' | '3bet' | '4bet' | 'allin';
  hero: 'opener' | 'responder';
  actions: string[];
  freq: number[][];
  ev: number[][];
}
export const SPOTS: Record<string, { open: number; threeBet: number; fourBet: number; nodes: FacingNode[] }> = {
${body}
};
`,
    );
  }
  console.log(`done in ${((performance.now() - started) / 1000).toFixed(0)} s`);
}
