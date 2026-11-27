import { useEffect, useState } from 'react';
import { PlayingCard } from '../components/PlayingCard';
import { Segmented } from '../components/RuleControls';
import { type Card } from '../engine/cards';
import { SPOTS } from '../engine/facing';
import { combosIn, combosOf, pickWeighted } from '../engine/ranges';
import { HANDS } from '../engine/pushfold';
import { SeatTable } from '../guides/diagrams';
import { around, Grid } from '../guides/Preflop';
import { expandRange, RFI } from '../guides/rfi';
import { record } from '../state/progressStore';
import { actionColors, mixBackground } from './spots';
import { BUTTON, Field, PANEL } from './ui';

const SEATS = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
const at = new Map(HANDS.map((h, i) => [h, i]));
const OPENS = Object.fromEntries(RFI.map((r) => [r.seat, expandRange(r.range)]));
const CLOSE = 0.05; // bb: closer than this, either choice is fine
const KINDS = ['open', '3bet', '4bet', 'allin'] as const;
const FACING_LABEL = { open: 'Facing an open', '3bet': 'Facing a 3-bet', '4bet': 'Facing a 4-bet', allin: 'Facing an all-in' };
const SHORT = { open: 'vs open', '3bet': 'vs 3-bet', '4bet': 'vs 4-bet', allin: 'vs all-in' };
const SELECT = 'min-h-11 rounded-[10px] bg-[var(--bg-third)] px-3 text-[15px] text-[var(--text-primary)]';
const KEYS = ['f', 'c', 'r'];
const DEPTHS = [20, 30, 40, 50, 75, 100, 150, 200];

/** The charts at one stack depth: 100 bb is built in, the others load from public/charts. */
interface Table {
  stack: number;
  spots: typeof SPOTS;
}
const BUILT_IN: Table = { stack: 100, spots: SPOTS };
const tables = new Map<number, Promise<Table>>([[100, Promise.resolve(BUILT_IN)]]);
const loadTable = (stack: number) => {
  if (!tables.has(stack)) tables.set(stack, fetch(`/charts/facing-${stack}.json`).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`No charts for ${stack} bb yet`)))));
  return tables.get(stack)!;
};

/** Spot key "OPENER-RESPONDER" split, and whose decision a node is. */
const seatsOf = (key: string) => key.split('-') as [string, string];
const hero = (t: Table, key: string, node: number) => seatsOf(key)[t.spots[key].nodes[node].hero === 'opener' ? 0 : 1];

/** How often hand i gets to this node: the opener's chart, then each of this player's earlier raises. */
function reach(t: Table, key: string, node: number, i: number) {
  const nodes = t.spots[key].nodes, who = nodes[node].hero;
  let r = who === 'opener' ? (OPENS[seatsOf(key)[0]].has(HANDS[i]) ? 1 : 0) : 1;
  for (let k = 0; k < node; k++) if (nodes[k].hero === who) r *= nodes[k].freq[2][i] / 100;
  return r;
}

function labels(t: Table, key: string, node: number) {
  const s = t.spots[key];
  const raise = (a: string) => (a === '3-bet' ? `3-bet to ${s.threeBet}` : a === '4-bet' ? `4-bet to ${s.fourBet}` : `All-in (${t.stack} bb)`);
  return s.nodes[node].actions.map((a, k) => (k < 2 ? a : raise(a)));
}

/** What happened before your decision, in words. */
function story(t: Table, key: string, node: number) {
  const [O, R] = seatsOf(key), s = t.spots[key], n = s.nodes[node];
  const jam = (x: number) => x >= t.stack;
  if (n.facing === 'open') return `${O} opens to ${s.open} bb. It's folded to you in the ${R}.`;
  if (n.facing === '3bet') return `You open the ${O} to ${s.open} bb. The ${R} 3-bets to ${s.threeBet} bb.`;
  if (n.facing === '4bet') return `${O} opens to ${s.open} bb, you 3-bet the ${R} to ${s.threeBet} bb, and ${O} 4-bets to ${s.fourBet} bb.`;
  if (n.hero === 'responder') return `${O} opens to ${s.open} bb, you 3-bet the ${R} to ${s.threeBet} bb, and ${O} goes all-in for ${t.stack} bb.`;
  return jam(s.threeBet)
    ? `You open the ${O} to ${s.open} bb. The ${R} goes all-in for ${t.stack} bb.`
    : `You open the ${O}, the ${R} 3-bets, you 4-bet to ${s.fourBet} bb, and the ${R} goes all-in for ${t.stack} bb.`;
}

/** One decision as a chart: each hand's mix of actions; hands that never get here are dark. */
function Chart({ t, spot, node, mark }: { t: Table; spot: string; node: number; mark?: string }) {
  const [hover, setHover] = useState<string>();
  const n = t.spots[spot].nodes[node], names = labels(t, spot, node), colors = actionColors(n.actions);
  const total = HANDS.reduce((x, h, i) => x + reach(t, spot, node, i) * combosOf(h), 0);
  const mix = n.actions.map((_, a) => HANDS.reduce((x, h, i) => x + (reach(t, spot, node, i) * combosOf(h) * n.freq[a][i]) / 100, 0) / total);
  const shown = hover ?? mark;
  const i = shown ? at.get(shown)! : -1;
  return (
    <>
      <p className="mb-2 min-h-12 text-center text-[15px] tabular-nums">
        {shown ? (
          reach(t, spot, node, i) > 0 ? (
            <>
              <strong>{shown}</strong>:{' '}
              {names
                .map((a, k) => [a, n.freq[k][i]] as const)
                .filter(([, f]) => f > 0)
                .map(([a, f]) => `${a.split(' ')[0]} ${f}%`)
                .join(', ')}
              <br />
              <span className="text-[var(--text-muted)]">
                Worth against folding: {names.slice(1).map((a, k) => `${a.split(' ')[0]} ${n.ev[k + 1][i] >= 0 ? '+' : '−'}${Math.abs(n.ev[k + 1][i] / 100).toFixed(2)} bb`).join(', ')}
              </span>
            </>
          ) : (
            `${shown}: not in the range that gets here`
          )
        ) : (
          <>
            {hero(t, spot, node)} {FACING_LABEL[n.facing].toLowerCase()}: {names.map((a, k) => `${a.split(' ')[0].toLowerCase()} ${(mix[k] * 100).toFixed(0)}%`).join(' · ')}
          </>
        )}
      </p>
      <Grid
        mark={mark}
        onHover={setHover}
        cell={(h) => {
          const k = at.get(h)!, on = reach(t, spot, node, k) > 0;
          return {
            bg: on ? mixBackground(n.actions.map((_, a) => n.freq[a][k] / 100), colors) : 'var(--bg-main)',
            ink: on ? '#ffffff' : 'rgb(235 235 245 / 0.3)',
            title: on ? `${h}: ${names.map((a, a2) => `${a.split(' ')[0]} ${n.freq[a2][k]}%`).join(', ')}` : `${h}: doesn't get here`,
          };
        }}
      />
      <div className="text-footnote mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
        {names.map((a, k) => (
          <span key={a} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: colors[k] }} />
            {a}
          </span>
        ))}
      </div>
    </>
  );
}

interface Question {
  spot: string;
  node: number;
  hand: string;
  hole: Card[];
}
function ask(t: Table, only: string): Question {
  const keys = Object.keys(t.spots);
  for (;;) {
    const spot = keys[Math.floor(Math.random() * keys.length)], nodes = t.spots[spot].nodes;
    // Facing an open comes up most, as in real games; then 3-bets, then 4-bets and all-ins.
    const node = only === 'all' ? pickWeighted(nodes.map((n) => ({ open: 0.5, '3bet': 0.3, '4bet': 0.14, allin: 0.06 })[n.facing])) : nodes.findIndex((n) => n.facing === only);
    if (node < 0) continue;
    const k = pickWeighted(HANDS.map((h, i) => reach(t, spot, node, i) * combosOf(h)));
    if (k < 0) continue;
    const combos = combosIn({ [HANDS[k]]: 1 });
    return { spot, node, hand: HANDS[k], hole: combos[Math.floor(Math.random() * combos.length)].hole };
  }
}

const MODES = [
  { value: 'drill', label: 'Drill' },
  { value: 'chart', label: 'Chart' },
] as const;
const FILTER = [{ value: 'all', label: 'All' }, ...KINDS.slice(0, 3).map((k) => ({ value: k as string, label: SHORT[k] }))];

/** Someone raised before you: fold, call or raise? Charts for six-max at 100 bb, and a drill graded by EV. */
export function Facing() {
  const [t, setT] = useState<Table>(BUILT_IN);
  const [error, setError] = useState<string>();
  const [mode, setMode] = useState<'drill' | 'chart'>('drill');
  const [only, setOnly] = useState('all');
  const [q, setQ] = useState(() => ask(BUILT_IN, 'all'));
  const [answer, setAnswer] = useState<number>();
  const [score, setScore] = useState({ right: 0, total: 0, lost: 0 });
  const [opener, setOpener] = useState('BTN');
  const [responder, setResponder] = useState('BB');
  const [node, setNode] = useState(0);

  const n = t.spots[q.spot].nodes[q.node], i = at.get(q.hand)!, names = labels(t, q.spot, q.node);
  const evs = n.actions.map((_, a) => n.ev[a][i] / 100);
  const best = evs.indexOf(Math.max(...evs));
  const respond = (a: number) => {
    if (answer !== undefined || a >= n.actions.length) return;
    const loss = evs[best] - evs[a] < CLOSE ? 0 : evs[best] - evs[a];
    setAnswer(a);
    setScore((s) => ({ right: s.right + (loss === 0 ? 1 : 0), total: s.total + 1, lost: s.lost + loss }));
    record('facing', { spot: q.spot, node: KINDS.indexOf(n.facing), seat: hero(t, q.spot, q.node), stack: t.stack, hand: q.hand, chose: n.actions[a], best: n.actions[best], right: loss === 0, loss });
  };
  const next = (o = only, table = t) => {
    setQ(ask(table, o));
    setAnswer(undefined);
  };
  const pickStack = (stack: number) =>
    loadTable(stack).then(
      (table) => {
        setT(table);
        setError(undefined);
        setNode(0);
        next(only, table);
      },
      (e: Error) => setError(e.message),
    );

  // F fold, C call, R raise, Enter or Space = next.
  useEffect(() => {
    if (mode !== 'drill') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      const k = KEYS.indexOf(e.key.toLowerCase());
      if (k >= 0) respond(k);
      else if ((e.key === 'Enter' || e.key === ' ') && answer !== undefined) {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const lost = answer === undefined ? 0 : evs[best] - evs[answer] < CLOSE ? 0 : evs[best] - evs[answer];
  const chartKey = `${opener}-${responder}`;
  const chartNode = Math.min(node, t.spots[chartKey].nodes.length - 1);
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3 px-2">
        <Segmented label="Mode" value={mode} options={[...MODES]} onChange={setMode} />
        <label className="flex items-center gap-2 text-[15px]">
          Stacks
          <select className={SELECT} value={t.stack} onChange={(e) => pickStack(Number(e.target.value))}>
            {DEPTHS.map((d) => (
              <option key={d} value={d}>
                {d} bb
              </option>
            ))}
          </select>
        </label>
        {mode === 'drill' && <Segmented label="Spots" value={only} options={FILTER} onChange={(o) => (setOnly(o), next(o))} />}
        {mode === 'drill' && score.total > 0 && (
          <span className="text-[15px] text-[var(--text-muted)] tabular-nums">
            {score.right}/{score.total} right{score.lost > 0 && ` · ${score.lost.toFixed(2)} bb given up`}
          </span>
        )}
      </div>
      {error && <p className="mb-3 px-2 text-[15px] text-rose-400">{error}</p>}

      {mode === 'chart' ? (
        <section className={PANEL}>
          <div className="mb-3 flex flex-wrap items-end gap-3">
            <Field label="Opener">
              <select
                className={SELECT}
                value={opener}
                onChange={(e) => {
                  setOpener(e.target.value);
                  if (SEATS.indexOf(responder) <= SEATS.indexOf(e.target.value)) setResponder('BB');
                }}
              >
                {SEATS.slice(0, -1).map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Player behind">
              <select className={SELECT} value={responder} onChange={(e) => setResponder(e.target.value)}>
                {SEATS.slice(SEATS.indexOf(opener) + 1).map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Segmented label="Decision" value={chartNode} options={t.spots[chartKey].nodes.map((x, k) => ({ value: k, label: SHORT[x.facing] }))} onChange={setNode} />
          </div>
          <p className="mb-3 text-[15px] text-[var(--text-muted)]">{story(t, chartKey, chartNode).replace(/^You /, `${hero(t, chartKey, chartNode)}: you `)}</p>
          <Chart t={t} spot={chartKey} node={chartNode} />
        </section>
      ) : (
        <>
          <section className={PANEL}>
            <div className="rounded-[12px] bg-[var(--bg-main)]/50 p-3 ring-1 ring-white/5 sm:p-4">
              <SeatTable seats={around(6)} you={hero(t, q.spot, q.node)} />
            </div>
            <p className="mt-2 text-center text-[17px]">{story(t, q.spot, q.node)}</p>
            <div className="my-4 flex justify-center gap-2">
              {q.hole.map((c) => (
                <PlayingCard key={c} card={c} size="lg" />
              ))}
            </div>
            {answer === undefined ? (
              <div className="flex flex-wrap justify-center gap-3">
                {names.map((a, k) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => respond(k)}
                    className={`${BUTTON} min-w-28 ${k === 0 ? 'bg-[var(--bg-third)]' : k === 1 ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}
                  >
                    {a} <kbd className="ml-2 text-[11px] opacity-60">{KEYS[k].toUpperCase()}</kbd>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-center">
                <p className={`text-[17px] font-semibold ${lost === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {lost === 0 ? 'Correct' : 'Not quite'}: best is {names[best].toLowerCase()}
                  {lost > 0 && `. That cost ${lost.toFixed(2)} bb.`}
                </p>
                <p className="text-[15px] text-[var(--text-muted)] tabular-nums">
                  {q.hand} here:{' '}
                  {names
                    .map((a, k) => `${a.split(' ')[0].toLowerCase()} ${n.freq[k][i]}% (${k === 0 ? '0' : `${evs[k] >= 0 ? '+' : '−'}${Math.abs(evs[k]).toFixed(2)}`} bb)`)
                    .join(' · ')}
                </p>
                <button type="button" onClick={() => next()} className={`${BUTTON} mt-1 bg-[var(--accent)] text-white`}>
                  Next hand
                </button>
              </div>
            )}
          </section>
          {answer !== undefined && (
            <section className={`${PANEL} mt-4`}>
              <Chart t={t} spot={q.spot} node={q.node} mark={q.hand} />
            </section>
          )}
        </>
      )}
      <p className="text-footnote mt-3 px-2 text-[var(--text-muted)]">
        Six-max, {t.stack} bb, 5% rake, everyone else folds.{t.stack !== 100 && ' Away from 100 bb the opening ranges are still the 100 bb charts and the model is less tested.'} Opening ranges are the site’s opening charts. The rest is this site’s preflop model: each
        decision solved, with play after the flop estimated from equity and position, then tuned so its overall frequencies match published solver
        output (
        <a href="https://beyondgto.com/defense" target="_blank" rel="noreferrer" className="text-[var(--accent)] hover:underline">
          BeyondGTO
        </a>
        ) within about 3 points. Hand by hand it’s close, not exact: solvers sometimes just call with the strongest hands to trap and pick other
        bluffs, where this model raises its best hands every time.
      </p>
    </>
  );
}
