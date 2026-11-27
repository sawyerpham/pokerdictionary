// All-in equity of every pair of the 169 starting hands, computed with this site's engine (Monte Carlo, card removal
// counted exactly), shared by the chart generators. Cached in scripts/.cache so later runs skip the ~90 s of work.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { isMainThread, parentPort, Worker, workerData } from 'node:worker_threads';
import { evaluate, handName, type Card } from '../src/engine/cards.ts';

const RANKS = 'AKQJT98765432';
// The 13×13 grid order: pairs on the diagonal, suited above, offsuit below.
export const HANDS = [...RANKS].flatMap((a, i) => [...RANKS].map((b, j) => (i === j ? a + b : i < j ? a + b + 's' : b + a + 'o')));
const at = new Map(HANDS.map((h, i) => [h, i]));
const COMBOS: Card[][][] = HANDS.map(() => []);
for (let a = 0; a < 52; a++) for (let b = a + 1; b < 52; b++) COMBOS[at.get(handName([a, b]))!].push([a, b]);
const DEALS = 6000; // per pair of hands: about ±0.6% equity
const CACHE = new URL(`./.cache/equity-${DEALS}.json`, import.meta.url);

/** Seeded random numbers (mulberry32), so every run writes the same file. */
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hand i's all-in equity against hand j (ties split), and how many card-disjoint combo pairs they have. */
function pair(i: number, j: number): [number, number] {
  const pairs: Card[][] = [];
  for (const x of COMBOS[i]) for (const y of COMBOS[j]) if (!x.includes(y[0]) && !x.includes(y[1])) pairs.push([...x, ...y]);
  const random = rng(i * 169 + j + 1);
  let won = 0;
  for (let k = 0; k < DEALS; k++) {
    const used = pairs[Math.floor(random() * pairs.length)].slice();
    while (used.length < 9) {
      const c = Math.floor(random() * 52);
      if (!used.includes(c)) used.push(c);
    }
    const board = used.slice(4);
    const a = evaluate([used[0], used[1], ...board]), b = evaluate([used[2], used[3], ...board]);
    won += a > b ? 1 : a === b ? 0.5 : 0;
  }
  return [won / DEALS, pairs.length];
}

// A worker: whole rows of the table, against every hand from the row's own onward.
if (!isMainThread && workerData?.equityRows) parentPort!.postMessage((workerData.equityRows as number[]).map((i) => ({ i, row: HANDS.slice(i).map((_, k) => pair(i, i + k)) })));

/** EQ[i][j]: hand i's all-in equity against hand j. W[i][j]: card-disjoint combo pairs (how often the matchup happens). */
export async function equityTable(): Promise<{ EQ: number[][]; W: number[][] }> {
  if (existsSync(CACHE)) return JSON.parse(readFileSync(CACHE, 'utf8'));
  const started = performance.now();
  const threads = Math.max(1, availableParallelism() - 1);
  const jobs: number[][] = Array.from({ length: threads }, () => []);
  HANDS.forEach((_, i) => jobs[i % threads].push(i));
  const results = await Promise.all(
    jobs.map((rows) => new Promise<{ i: number; row: [number, number][] }[]>((ok, fail) => new Worker(new URL(import.meta.url), { workerData: { equityRows: rows } }).on('message', ok).on('error', fail))),
  );
  const EQ = HANDS.map(() => Array<number>(169).fill(0)), W = HANDS.map(() => Array<number>(169).fill(0));
  for (const { i, row } of results.flat()) {
    row.forEach(([eq, n], k) => {
      const j = i + k;
      EQ[i][j] = eq;
      EQ[j][i] = i === j ? eq : 1 - eq;
      W[i][j] = W[j][i] = n;
    });
  }
  console.log(`equity table: ${((performance.now() - started) / 1000).toFixed(0)} s on ${threads} threads`);
  mkdirSync(new URL('./.cache/', import.meta.url), { recursive: true });
  writeFileSync(CACHE, JSON.stringify({ EQ, W }));
  return { EQ, W };
}
