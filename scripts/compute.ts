// Computes the study data on this machine, one job after another, quickest first, with a progress bar.
// Safe to stop (Ctrl+C) and start again: finished pieces are kept and skipped.
//
//   node scripts/compute.ts                     everything (about a day; see PROPOSALS.md)
//   node scripts/compute.ts --list              the jobs, what they make, and roughly how long they take
//   node scripts/compute.ts --only packs,reports
//   node scripts/compute.ts --threads 6 --memory 12
//
// By default it uses half the CPU threads and half the memory, at below-normal priority, so the PC stays usable.
// Flop solves need the native solver: sh solver/native/build.sh (Docker) makes solver/native/bin/flopsolve.exe.
import { spawn, type ChildProcess } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { availableParallelism, constants, setPriority, totalmem } from 'node:os';
import { solverRange } from '../src/engine/ranges.ts';
import { allFlops, DEEP, PACKS, someFlops, type Pack } from './spots.ts';

const ROOT = new URL('../', import.meta.url);
const path = (p: string) => new URL(p, ROOT).pathname.replace(/^\/(\w:)/, '$1');
const SOLVER = path('solver/native/bin/flopsolve.exe');
const arg = (name: string) => {
  const k = process.argv.indexOf(`--${name}`);
  return k > 0 ? process.argv[k + 1] : undefined;
};
const THREADS = Math.max(1, Number(arg('threads')) || Math.floor(availableParallelism() / 2));
const MEMORY_MB = (Number(arg('memory')) || Math.floor(totalmem() / 2 ** 30 / 2)) * 1024;
const FLOPS = Number(arg('flops')) || 80; // per pack
const DEEP_FLOPS = Number(arg('deep-flops')) || 60;
const DEPTHS = [20, 30, 40, 50, 75, 150, 200];
const LOW = constants.priority.PRIORITY_BELOW_NORMAL;
const children = new Set<ChildProcess>();

/* ---------------------------------------------------------------- progress */

const clock = (s: number) => (s < 90 ? `${Math.round(s)}s` : s < 5400 ? `${Math.round(s / 60)}m` : `${Math.floor(s / 3600)}h${String(Math.round((s % 3600) / 60)).padStart(2, '0')}m`);
let step = '';
function bar(done: number, total: number, started: number, note = '') {
  const width = 24, filled = total ? Math.round((done / total) * width) : width;
  const elapsed = (performance.now() - started) / 1000;
  const left = done > 0 && done < total ? ` · ${clock((elapsed / done) * (total - done))} left` : '';
  const line = `${step} ${'█'.repeat(filled)}${'░'.repeat(width - filled)} ${done}/${total} ${total ? Math.floor((done / total) * 100) : 100}%${left}${note ? ` · ${note}` : ''}`;
  if (process.stdout.isTTY) process.stdout.write(`\r${line.slice(0, (process.stdout.columns || 120) - 1).padEnd((process.stdout.columns || 120) - 1)}`);
  else if (done === total || done % Math.max(1, Math.floor(total / 20)) === 0) console.log(line);
}
const finish = (msg: string) => {
  if (process.stdout.isTTY) process.stdout.write('\n');
  console.log(`   ${msg}`);
};

/** Runs a program at low priority; `onLine` sees each line it prints (stdout and stderr). */
function run(cmd: string, args: string[], opts: { input?: string; env?: Record<string, string>; onLine?: (l: string) => void } = {}): Promise<string> {
  return new Promise((ok, fail) => {
    const child = spawn(cmd, args, { cwd: path('.'), env: { ...process.env, ...opts.env } });
    children.add(child);
    try {
      setPriority(child.pid!, LOW);
    } catch {
      /* not allowed on this system: runs at normal priority */
    }
    let out = '', err = '';
    const lines = (buf: string, chunk: Buffer) => {
      const text = buf + chunk.toString();
      const parts = text.split(/\r?\n/);
      parts.slice(0, -1).forEach((l) => opts.onLine?.(l));
      return parts.at(-1)!;
    };
    let tailOut = '', tailErr = '';
    child.stdout.on('data', (c: Buffer) => {
      out += c;
      if (opts.onLine) tailOut = lines(tailOut, c);
    });
    child.stderr.on('data', (c: Buffer) => {
      err += c;
      tailErr = lines(tailErr, c);
    });
    child.on('error', fail);
    child.on('close', (code) => {
      children.delete(child);
      if (code === 0) ok(out);
      else fail(new Error(`${cmd} exited with ${code}: ${err.trim().split('\n').at(-1)}`));
    });
    if (opts.input !== undefined) child.stdin.end(opts.input);
  });
}

/** Runs `jobs` with at most `width` at a time. */
async function pool<T>(jobs: T[], width: number, work: (job: T) => Promise<void>) {
  const queue = jobs.slice();
  await Promise.all(Array.from({ length: Math.min(width, queue.length) }, async () => {
    for (let job = queue.shift(); job !== undefined; job = queue.shift()) await work(job);
  }));
}

/* ------------------------------------------------------------- flop solves */

const dirOf = (key: string) => path(`public/flops/${key}`);
const fileOf = (board: number[]) => `${board.join('-')}.json`;
/** Changes whenever a pack's ranges, sizes or stacks do: its old solves no longer match and are redone. */
const stampOf = (p: Pack) => createHash('sha1').update(JSON.stringify([p.oop, p.ip, p.pot, p.stack, p.oopBets, p.oopRaises, p.ipBets, p.ipRaises])).digest('hex').slice(0, 12);
const jobOf = (p: Pack, board: number[], estimate = false) =>
  JSON.stringify({
    oop: [...solverRange(p.oop)],
    ip: [...solverRange(p.ip)],
    board,
    pot: p.pot,
    stack: p.stack,
    oopBets: p.oopBets,
    oopRaises: p.oopRaises,
    ipBets: p.ipBets,
    ipRaises: p.ipRaises,
    target: 0.01,
    maxIterations: 400,
    estimate,
  });

/** Writes a pack's index.json (the flops done so far) and the list of all packs. */
function writeIndex(p: Pack, weightOf: Map<string, number>) {
  const dir = dirOf(p.key);
  const files = readdirSync(dir).filter((f) => /^\d+-\d+-\d+\.json$/.test(f));
  const flops = files.map((f) => ({ file: f, n: weightOf.get(f) ?? 1 }));
  writeFileSync(`${dir}/index.json`, JSON.stringify({ key: p.key, title: p.title, type: p.type, seats: p.seats, pot: p.pot, stack: p.stack, live: p.live, stamp: stampOf(p), flops }));
  const packs = readdirSync(path('public/flops'), { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(`${path('public/flops')}/${d.name}/index.json`))
    .map((d) => JSON.parse(readFileSync(`${path('public/flops')}/${d.name}/index.json`, 'utf8')))
    .filter((x) => x.stamp)
    .map(({ key, title, type, seats, flops }) => ({ key, title, type, seats, flops: flops.length }));
  writeFileSync(path('public/flops/index.json'), JSON.stringify(packs));
}

/** Solves every (pack, flop) not already done, as many at once as the thread and memory limits allow. */
async function solveFlops(packs: Pack[], flops: { board: number[]; n: number }[]) {
  if (!existsSync(SOLVER)) throw new Error(`Missing ${SOLVER}. Build it with: sh solver/native/build.sh (needs Docker)`);
  const weightOf = new Map(flops.map((f) => [fileOf(f.board), f.n]));
  const jobs: { p: Pack; board: number[]; n: number }[] = [];
  let mb = 0;
  for (const p of packs) {
    const dir = dirOf(p.key), stamp = stampOf(p);
    mkdirSync(dir, { recursive: true });
    const old = existsSync(`${dir}/index.json`) ? JSON.parse(readFileSync(`${dir}/index.json`, 'utf8')).stamp : stamp;
    if (old !== stamp) {
      console.log(`   ${p.key}: its ranges or sizes changed, so its old solves are redone`);
      for (const f of readdirSync(dir)) rmSync(`${dir}/${f}`);
    }
    for (const f of flops) if (!existsSync(`${dir}/${fileOf(f.board)}`)) jobs.push({ p, board: f.board, n: f.n });
    if (jobs.some((j) => j.p === p)) mb = Math.max(mb, JSON.parse(await run(SOLVER, [], { input: jobOf(p, flops[0].board, true) })).mb);
  }
  const total = jobs.length;
  if (!total) return finish('nothing to do: all done before');
  // As many solves at once as memory allows (with room to spare), and the threads split between them.
  const width = Math.max(1, Math.min(THREADS, Math.floor(MEMORY_MB / (mb * 1.25 + 100))));
  const threads = Math.max(1, Math.floor(THREADS / width));
  const note = `${width} at once × ${threads} thread${threads > 1 ? 's' : ''}, up to ${(mb / 1024).toFixed(1)} GB each`;
  const started = performance.now();
  let done = 0;
  bar(0, total, started, note);
  await pool(jobs, width, async ({ p, board, n }) => {
    const out = JSON.parse(await run(SOLVER, [], { input: jobOf(p, board), env: { RAYON_NUM_THREADS: String(threads) } }));
    const file = `${dirOf(p.key)}/${fileOf(board)}`;
    writeFileSync(`${file}.tmp`, JSON.stringify({ ...out, n }));
    renameSync(`${file}.tmp`, file);
    done++;
    if (done % 5 === 0 || done === total) for (const q of new Set(jobs.map((j) => j.p))) writeIndex(q, weightOf);
    bar(done, total, started, note);
  });
  for (const p of packs) writeIndex(p, weightOf);
  finish(`${total} flops solved in ${clock((performance.now() - started) / 1000)}`);
}

/* ------------------------------------------------------- reports and tuning */

const RANKS = '23456789TJQKA';
const bytes = (b64: string) => Buffer.from(b64, 'base64');
const i16 = (b64: string) => {
  const b = bytes(b64);
  return new Int16Array(b.buffer, b.byteOffset, b.length / 2);
};
interface Flop {
  board: number[];
  n: number;
  hands: string[];
  weights: string[];
  nodes: { h: number[]; p: number; a?: string; s?: string }[];
  rootEv?: string[];
  rootEquity?: string[];
}
const libraries = () =>
  existsSync(path('public/flops'))
    ? readdirSync(path('public/flops'), { withFileTypes: true })
        .filter((d) => d.isDirectory() && existsSync(`${dirOf(d.name)}/index.json`))
        .map((d) => JSON.parse(readFileSync(`${dirOf(d.name)}/index.json`, 'utf8')))
        .filter((x) => x.stamp)
    : [];
const flopsOf = (lib: { key: string; flops: { file: string }[] }) => lib.flops.map(({ file }) => JSON.parse(readFileSync(`${dirOf(lib.key)}/${file}`, 'utf8')) as Flop);

/** Texture of a flop: high card, paired, suits, and whether it's connected (three ranks within five). */
function tags(board: number[]) {
  const ranks = board.map((c) => c >> 2).sort((a, b) => b - a), suits = new Set(board.map((c) => c & 3)).size;
  const distinct = [...new Set(ranks)];
  const low = distinct.map((r) => (r === 12 ? -1 : r)); // an ace also plays low
  const connected = distinct.length === 3 && (distinct[0] - distinct[2] <= 4 || Math.max(...low) - Math.min(...low) <= 4);
  return { high: RANKS[ranks[0]], paired: distinct.length < 3, suits: ['', 'monotone', 'two-tone', 'rainbow'][suits], connected };
}

/** Range-wide action frequencies at a node: each hand's strategy weighted by how often it's there. */
function mix(node: Flop['nodes'][number], weights: Uint8Array) {
  const actions = node.a!.split(','), s = bytes(node.s!), n = s.length / actions.length;
  const total = Array<number>(actions.length).fill(0);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let a = 0; a < actions.length; a++) sum += s[a * n + i];
    if (sum) for (let a = 0; a < actions.length; a++) total[a] += (weights[i] * s[a * n + i]) / sum;
  }
  const all = total.reduce((x, y) => x + y, 0);
  return { actions, freq: total.map((x) => Math.round((x / all) * 1000) / 10) };
}

async function reports() {
  const libs = libraries();
  mkdirSync(path('public/reports'), { recursive: true });
  const started = performance.now();
  let done = 0;
  for (const lib of libs) {
    const flops = flopsOf(lib).map((f) => {
      const w = f.weights.map(bytes);
      const node = (h: string) => f.nodes.find((x) => x.h.join(',') === h);
      const root = node('')!, afterCheck = node('0');
      // Each player's equity, and how much of it they turn into chips (EV ÷ equity × pot).
      const realize = f.rootEv?.map((ev, p) => {
        const e = i16(ev), q = bytes(f.rootEquity![p]);
        let won = 0, eq = 0, all = 0;
        w[p].forEach((x, i) => {
          won += x * (e[i] / 10 / lib.pot);
          eq += x * (q[i] / 255);
          all += x;
        });
        return { equity: Math.round((eq / all) * 1000) / 10, realization: Math.round((won / eq) * 1000) / 1000 };
      });
      return {
        board: f.board,
        n: f.n,
        tags: tags(f.board),
        oop: root.a && root.a.includes(',') ? mix(root, w[0]) : undefined,
        ip: afterCheck?.a ? mix(afterCheck, w[1]) : undefined,
        players: realize,
      };
    });
    writeFileSync(path(`public/reports/${lib.key}.json`), JSON.stringify({ key: lib.key, title: lib.title, seats: lib.seats, flops }));
    bar(++done, libs.length, started);
  }
  finish(libs.length ? `${libs.length} reports written to public/reports` : 'no flop libraries yet');
}

/** How well each starting hand turns equity into chips, by pot and position, from every solved flop. */
function measureRealization() {
  const sums: Record<string, Record<'ip' | 'oop', Record<string, [number, number]>>> = {};
  for (const lib of libraries().filter((l) => !l.key.startsWith('deep'))) {
    const k = { srp: 0, '3bet': 1, '4bet': 2 }[lib.type as 'srp'];
    for (const f of flopsOf(lib)) {
      if (!f.rootEv) continue;
      for (const p of [0, 1]) {
        const side = p === 0 ? 'oop' : 'ip';
        const hands = bytes(f.hands[p]), w = bytes(f.weights[p]), ev = i16(f.rootEv[p]), eq = bytes(f.rootEquity![p]);
        for (let i = 0; i < w.length; i++) {
          if (!w[i]) continue;
          const [a, b] = [hands[2 * i], hands[2 * i + 1]].sort((x, y) => (y >> 2) - (x >> 2));
          const name = RANKS[a >> 2] + RANKS[b >> 2] + ((a >> 2) === (b >> 2) ? '' : (a & 3) === (b & 3) ? 's' : 'o');
          const cell = (((sums[k] ??= { ip: {}, oop: {} })[side][name] ??= [0, 0]));
          cell[0] += w[i] * f.n * (ev[i] / 10 / lib.pot);
          cell[1] += w[i] * f.n * (eq[i] / 255);
        }
      }
    }
  }
  const out = Object.fromEntries(
    Object.entries(sums).map(([k, sides]) => [
      k,
      Object.fromEntries(
        Object.entries(sides).map(([side, hands]) => [side, Object.fromEntries(Object.entries(hands).filter(([, [, d]]) => d > 50).map(([h, [n, d]]) => [h, Math.round((n / d) * 1000) / 1000]))]),
      ),
    ]),
  );
  writeFileSync(path('scripts/realization.json'), JSON.stringify(out, null, 1) + '\n');
  return Object.values(out).reduce((n, s) => n + Object.keys(s.ip).length + Object.keys(s.oop).length, 0);
}

/* -------------------------------------------------------------------- jobs */

const JOBS: { name: string; what: string; time: string; run: () => Promise<void> }[] = [
  {
    name: 'depths',
    what: `#9 facing-a-raise charts at ${DEPTHS.join(', ')} bb → public/charts/`,
    time: 'about 5 minutes',
    run: async () => {
      mkdirSync(path('public/charts'), { recursive: true });
      const started = performance.now(), total = DEPTHS.length * 15;
      let done = 0;
      await pool(DEPTHS, THREADS, async (stack) => {
        await run(process.execPath, ['scripts/preflop.ts', '--stack', String(stack), '--json', path(`public/charts/facing-${stack}.json`)], {
          onLine: (l) => l.startsWith('spot') && bar(++done, total, started),
        });
      });
      finish(`charts for ${DEPTHS.length} stack depths written`);
    },
  },
  {
    name: 'packs',
    what: `#5 Spot Packs: ${PACKS.length} matchups × ${FLOPS} flops → public/flops/<pack>/`,
    time: 'about 3–4 hours',
    run: () => solveFlops(PACKS, someFlops(FLOPS)),
  },
  {
    name: 'reports',
    what: '#2 Board Reports: c-bet and check rates and equity by flop, per pack → public/reports/',
    time: 'under a minute',
    run: reports,
  },
  {
    name: 'deep',
    what: `#11 Deep Solves: ${DEEP.title}, two sizes a street, raises on every street, ${DEEP_FLOPS} flops`,
    time: 'about 4–6 hours',
    run: () => solveFlops([DEEP], someFlops(DEEP_FLOPS)),
  },
  {
    name: 'full',
    what: '#6 all 1,755 flops for the two most common pots (BTN vs BB single-raised and 3-bet)',
    time: 'about 10–14 hours',
    run: () => solveFlops(PACKS.slice(0, 2), allFlops()),
  },
  { name: 'reports', what: '#2 Board Reports again, with every flop', time: 'about a minute', run: reports },
  {
    name: 'tuned',
    what: '#7 Solver-Tuned Preflop: measure realization from the solves, refit, rewrite src/engine/facing.ts',
    time: 'about 30–60 minutes',
    run: async () => {
      const hands = measureRealization();
      console.log(`   measured ${hands} hand-by-position realization numbers → scripts/realization.json`);
      const started = performance.now();
      await run(process.execPath, ['scripts/preflop.ts', 'fit'], {
        env: { THREADS: String(THREADS) },
        onLine: (l) => {
          const m = /^round (\d+)\/(\d+)/.exec(l);
          if (m) bar(Number(m[1]), Number(m[2]), started, 'fitting');
        },
      });
      let done = 0;
      await run(process.execPath, ['scripts/preflop.ts'], { onLine: (l) => l.startsWith('spot') && bar(++done, 15, started, 'writing charts') });
      finish('refit saved to scripts/preflop-params.json; src/engine/facing.ts rewritten (review the diff before committing)');
    },
  },
  { name: 'depths', what: '#9 the stack-depth charts again, with the tuned model', time: 'about 5 minutes', run: async () => JOBS[0].run() },
];

const only = arg('only')?.split(',');
const chosen = JOBS.filter((j) => !only || only.includes(j.name)).filter((j, k, all) => !only || all.findIndex((x) => x.name === j.name) === k);
if (process.argv.includes('--list')) {
  console.log(`Jobs, in order (each waits for the one before):\n`);
  JOBS.forEach((j, k) => console.log(`${String(k + 1).padStart(2)}. ${j.name.padEnd(8)} ${j.time.padEnd(22)} ${j.what}`));
  console.log(`\nLimits: ${THREADS} threads, ${MEMORY_MB / 1024} GB of memory, below-normal priority.`);
  process.exit(0);
}
try {
  setPriority(LOW);
} catch {
  /* stays at normal priority */
}
process.on('SIGINT', () => {
  for (const c of children) c.kill();
  console.log('\nStopped. Run the same command again to pick up where it left off.');
  process.exit(130);
});
console.log(`Using up to ${THREADS} threads and ${MEMORY_MB / 1024} GB of memory, at below-normal priority.\n`);
const startedAll = performance.now();
for (const [k, j] of chosen.entries()) {
  step = `[${k + 1}/${chosen.length}] ${j.name.padEnd(7)}`;
  console.log(`${step} ${j.what} (${j.time})`);
  await j.run();
}
console.log(`\nAll done in ${clock((performance.now() - startedAll) / 1000)}.`);
