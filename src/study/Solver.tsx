import { useState } from 'react';
import { CardSlot, DeckDialog, type Slot } from '../components/CardPicker';
import { INPUT, Segmented } from '../components/RuleControls';
import { shuffledDeck, type Card } from '../engine/cards';
import { solverCard, solverRange } from '../engine/ranges';
import { Grid } from '../guides/Preflop';
import { actionLabel, nodeAt, solveSpot, stopSolving, type NodeInfo, type Progress, type Solved } from '../solver/client';
import { findRange, useStudy } from '../state/studyStore';
import { actionColors, byClass, cardName, DEFAULTS, holesOf, mixBackground, PLAYER, rangeMix, SIZES, STREETS, type ClassRow } from './spots';
import { BUTTON, CardText, Field, PANEL, RangeSelect } from './ui';

const randomBoard = () => shuffledDeck().slice(0, 5);
const pct = (chips: number, pot: number) => `${((chips / pot) * 100).toFixed(2)}% of the pot`;
const SOLVER_STREETS = [{ value: 3, label: 'Flop' }, ...STREETS];
const CARD_NAME = ['', '', '', 'turn', 'river'];
interface Lock {
  history: number[];
  strategy: Float32Array;
  label: string;
}

/** Solve a heads-up flop, turn or river spot and walk its tree: strategy and EV for every hand at every node. */
export function Solver() {
  const ranges = useStudy((s) => s.ranges);
  const [street, setStreet] = useState(5);
  const [board, setBoard] = useState<Slot[]>(randomBoard);
  const [target, setTarget] = useState<number>();
  const [oop, setOop] = useState(ranges.find((r) => r.name === 'CO open')?.name ?? ranges[0]?.name ?? '');
  const [ip, setIp] = useState(ranges.find((r) => r.name === 'BTN open')?.name ?? ranges[0]?.name ?? '');
  const [pot, setPot] = useState(DEFAULTS.pot);
  const [stack, setStack] = useState(DEFAULTS.stack);
  const two = SIZES.two;
  const [sizes, setSizes] = useState({ oopBets: two.bets, oopRaises: two.raises, ipBets: two.bets, ipRaises: two.raises });
  const [solved, setSolved] = useState<Solved & { pot: number }>();
  const [node, setNode] = useState<NodeInfo>();
  const [progress, setProgress] = useState<Progress>();
  const [error, setError] = useState<string>();
  const [hover, setHover] = useState<string>();
  const [locks, setLocks] = useState<Lock[]>([]);

  const shown = board.slice(0, street);
  const ready = shown.every((c) => c !== null);
  /** Solves with `withLocks`, then opens the node at `at` (the root by default). */
  const solve = (withLocks: Lock[] = locks, at: number[] = []) => {
    setError(undefined);
    setLocks(withLocks);
    setProgress({ iterations: 0, exploitability: NaN });
    const cards = shown as Card[];
    const spot = { oop: solverRange(findRange(ranges, oop)), ip: solverRange(findRange(ranges, ip)), board: cards.map(solverCard), pot, stack, ...sizes, locks: withLocks };
    solveSpot(spot, setProgress)
      .then(async (s) => {
        setSolved({ ...s, pot });
        setNode(at.length ? await nodeAt(at) : s.root);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setProgress(undefined));
  };
  const go = (history: number[]) => nodeAt(history).then(setNode, (e: Error) => setError(e.message));

  const setCard = (i: number, c: Slot) => setBoard((b) => b.map((x, k) => (k === i ? c : x === c ? null : x)));
  const sizeField = (key: keyof typeof sizes, label: string) => (
    <Field label={label}>
      <input value={sizes[key]} onChange={(e) => setSizes({ ...sizes, [key]: e.target.value })} className={`${INPUT} min-h-11`} />
    </Field>
  );

  return (
    <>
      <section className={PANEL}>
        <div className="mb-4 flex flex-wrap items-end justify-center gap-1.5">
          {shown.map((c, i) => (
            <CardSlot key={i} card={c} label={`Board card ${i + 1}`} onClick={() => setTarget(i)} />
          ))}
          <button type="button" onClick={() => setBoard(randomBoard())} className="ml-2 min-h-11 px-2 text-[15px] text-[var(--accent-soft)]">
            Random
          </button>
        </div>
        <div className="mb-3 flex justify-center">
          <Segmented label="Street" value={street} options={SOLVER_STREETS} onChange={setStreet} />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <RangeSelect label="OOP range" value={oop} onChange={setOop} />
          <RangeSelect label="IP range" value={ip} onChange={setIp} />
          <Field label="Pot">
            <input type="number" min={1} value={pot} onChange={(e) => setPot(Math.max(1, Math.round(Number(e.target.value))))} className={`${INPUT} min-h-11`} />
          </Field>
          <Field label="Stack behind">
            <input type="number" min={1} value={stack} onChange={(e) => setStack(Math.max(1, Math.round(Number(e.target.value))))} className={`${INPUT} min-h-11`} />
          </Field>
          {sizeField('oopBets', 'OOP bets')}
          {sizeField('oopRaises', 'OOP raises')}
          {sizeField('ipBets', 'IP bets')}
          {sizeField('ipRaises', 'IP raises')}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {progress ? (
            <button type="button" onClick={stopSolving} className={`${BUTTON} bg-[var(--bg-third)]`}>
              Stop
            </button>
          ) : (
            <button type="button" onClick={() => solve()} disabled={!ready} className={`${BUTTON} bg-[var(--accent)] text-white`}>
              Solve
            </button>
          )}
          <span className="text-[13px] text-[var(--text-muted)] tabular-nums">
            {progress
              ? `Solving… ${progress.iterations} iterations${Number.isNaN(progress.exploitability) ? '' : ` · ${pct(progress.exploitability, pot)} exploitable`}`
              : solved
                ? `Solved in ${(solved.ms / 1000).toFixed(1)} s on ${solved.threads} core${solved.threads === 1 ? '' : 's'} · ${solved.iterations} iterations · ${Math.round(solved.memoryMb)} MB · ${pct(solved.exploitability, solved.pot)} exploitable`
                : `Sizes are % of the pot for bets, ×the bet for raises, a for all-in; comma-separated. They apply on every street.${street === 3 ? ' A flop takes a few minutes in the browser and needs a lean tree: one or two sizes.' : ''}`}
          </span>
        </div>
        {locks.length > 0 && (
          <p className="mt-2 text-[15px]">
            Locked: {locks.map((l) => l.label).join('; ')}{' '}
            <button type="button" onClick={() => setLocks([])} className="min-h-11 px-2 text-[var(--accent-soft)]">
              Clear (solve again to apply)
            </button>
          </p>
        )}
        {error && <p className="mt-2 text-[15px] text-rose-400">{error}</p>}
      </section>

      {solved && node && (
        <Tree
          solved={solved}
          node={node}
          go={go}
          hover={hover}
          setHover={setHover}
          busy={!!progress}
          lock={(l) => solve([...locks.filter((x) => x.history.join() !== l.history.join()), l], l.history)}
        />
      )}

      {target !== undefined && (
        <DeckDialog
          title={`Board card ${target + 1}`}
          used={new Set(shown.filter((c): c is Card => c !== null))}
          current={board[target]}
          onPick={(c) => {
            setCard(target, c);
            const empty = shown.findIndex((x, i) => i > target && x === null);
            setTarget(empty >= 0 ? empty : undefined);
          }}
          onRemove={() => {
            setCard(target, null);
            setTarget(undefined);
          }}
          onClose={() => setTarget(undefined)}
        />
      )}
    </>
  );
}

function Tree({
  solved,
  node,
  go,
  hover,
  setHover,
  busy,
  lock,
}: {
  solved: Solved & { pot: number };
  node: NodeInfo;
  go: (h: number[]) => void;
  hover?: string;
  setHover: (h?: string) => void;
  busy: boolean;
  lock: (l: Lock) => void;
}) {
  const [path, setPath] = useState<string[]>([]); // a label for each step taken, for the breadcrumb
  const [picking, setPicking] = useState(false);
  const labels = path.slice(0, node.history.length);
  const player = node.player;
  const acting = player === 0 || player === 1;
  const pot = solved.pot + node.bets[0] + node.bets[1];
  const colors = actionColors(node.actions);
  const rows: Map<string, ClassRow> = acting ? byClass(node, holesOf(solved.hands[player]), player) : new Map();
  const mix = rangeMix(node);
  const detail = hover ? rows.get(hover) : undefined;
  const take = (step: number, label: string) => {
    setPath([...labels, label]);
    go([...node.history, step]);
  };
  const next = CARD_NAME[node.board.length];
  const dealRiver = (c: Card) => take(solverCard(c), `${next[0].toUpperCase()}${next.slice(1)} ${cardName(c)}`);

  return (
    <section className={`${PANEL} mt-4`}>
      <nav aria-label="Line" className="mb-3 flex flex-wrap items-center gap-1 text-[15px]">
        <button type="button" onClick={() => go([])} className="min-h-11 px-1 text-[var(--accent-soft)]">
          Start
        </button>
        {labels.map((l, k) => (
          <span key={k} className="flex items-center gap-1">
            <span className="text-[var(--text-muted)]">›</span>
            <button type="button" onClick={() => go(node.history.slice(0, k + 1))} className="min-h-11 px-1 text-[var(--accent-soft)]">
              {l}
            </button>
          </span>
        ))}
      </nav>
      <p className="mb-3 text-[15px] text-[var(--text-muted)]">
        Board{' '}
        {node.board.map((c) => (
          <span key={c} className="mr-1 font-semibold">
            <CardText card={solverCard(c)} />
          </span>
        ))}{' '}
        · pot {pot}
      </p>

      {player === -1 && <p className="text-[17px]">Hand over. Pot {pot}.</p>}
      {player === 2 && (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-[17px]">The {next} is dealt.</p>
          <button type="button" onClick={() => setPicking(true)} className={`${BUTTON} bg-[var(--accent)] text-white`}>
            Pick {next}
          </button>
          <button type="button" onClick={() => dealRiver(solverCard(node.cards[Math.floor(Math.random() * node.cards.length)]))} className="min-h-11 px-2 text-[15px] text-[var(--accent-soft)]">
            Random
          </button>
          {picking && (
            <DeckDialog
              title={`${next[0].toUpperCase()}${next.slice(1)} card`}
              used={new Set(Array.from({ length: 52 }, (_, c) => c).filter((c) => !node.cards.includes(solverCard(c))))}
              current={null}
              onPick={(c) => {
                setPicking(false);
                dealRiver(c);
              }}
              onRemove={() => {}}
              onClose={() => setPicking(false)}
            />
          )}
        </div>
      )}
      {acting && (
        <>
          <p className="mb-2 text-[17px]">
            <strong>{PLAYER[player]}</strong> to act
          </p>
          <div className="mb-4 flex flex-wrap gap-2">
            {node.actions.map((a, i) => (
              <button
                key={a}
                type="button"
                onClick={() => take(i, `${PLAYER[player]} ${actionLabel(a)}`)}
                className="flex min-h-11 items-center gap-2 rounded-full bg-[var(--bg-third)] px-4 text-[15px] hover:brightness-125"
              >
                <span className="h-3 w-3 rounded-full" style={{ background: colors[i] }} />
                {actionLabel(a)}
                <span className="text-[var(--text-muted)] tabular-nums">{(mix[i] * 100).toFixed(0)}%</span>
              </button>
            ))}
          </div>
          <p className="mb-2 min-h-6 text-center text-[15px] tabular-nums">
            {detail
              ? `${hover}: ${node.actions.map((a, i) => `${actionLabel(a)} ${(detail.mix[i] * 100).toFixed(0)}%`).join(' · ')} · EV ${detail.ev.toFixed(1)}`
              : `${PLAYER[player]}'s range. Hover or tap a hand for its mix and EV.`}
          </p>
          <Grid
            onHover={(h) => h && setHover(h)} // keep the last hand so its combos stay readable
            mark={hover}
            cell={(h) => {
              const r = rows.get(h);
              return r
                ? { bg: mixBackground(r.mix, colors), ink: '#ffffff', small: r.ev.toFixed(0), title: h }
                : { bg: 'var(--bg-third)', ink: 'rgb(235 235 245 / 0.3)', title: `${h}: not in range here` };
            }}
          />
          <p className="text-footnote mt-2 text-[var(--text-muted)]">Stripes show how often each hand takes each action; the number is its EV in chips.</p>
          <LockPanel node={node} label={labels.at(-1)} busy={busy} lock={lock} />
          {detail && (
            <table className="mt-3 w-full text-[13px] tabular-nums">
              <thead className="text-[var(--text-muted)]">
                <tr>
                  <th className="py-1 text-left font-normal">Combo</th>
                  {node.actions.map((a) => (
                    <th key={a} className="py-1 text-right font-normal">
                      {actionLabel(a)}
                    </th>
                  ))}
                  <th className="py-1 text-right font-normal">EV</th>
                </tr>
              </thead>
              <tbody>
                {detail.combos.map((c) => (
                  <tr key={c.hole.join()} className="border-t border-[var(--line)]">
                    <td className="py-1">
                      <CardText card={c.hole[1]} /> <CardText card={c.hole[0]} />
                    </td>
                    {c.mix.map((x, i) => (
                      <td key={i} className="py-1 text-right">
                        {(x * 100).toFixed(0)}%
                      </td>
                    ))}
                    <td className="py-1 text-right">{c.ev.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </section>
  );
}

/** "What if they do this more?": shift every hand's strategy at this node toward one action, then solve again. */
function LockPanel({ node, label, busy, lock }: { node: NodeInfo; label?: string; busy: boolean; lock: (l: Lock) => void }) {
  const [action, setAction] = useState(0);
  const [more, setMore] = useState(25);
  const who = PLAYER[node.player];
  const apply = () => {
    const n = node.strategy!.length / node.actions.length, x = more / 100;
    const strategy = node.strategy!.map((v, k) => v * (1 - x) + (Math.floor(k / n) === action ? x : 0));
    lock({ history: node.history, strategy, label: `${who} ${actionLabel(node.actions[action]).toLowerCase()} ${more}% more${label ? ` after ${label}` : ' at the start'}` });
  };
  return (
    <details className="mt-4 rounded-[10px] bg-[var(--bg-third)]/50 p-3">
      <summary className="cursor-pointer text-[15px] font-semibold">Lock this spot: what if {who} plays differently?</summary>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-[15px]">
        <select value={action} onChange={(e) => setAction(Number(e.target.value))} className="min-h-11 rounded-[10px] bg-[var(--bg-third)] px-3">
          {node.actions.map((a, k) => (
            <option key={a} value={k}>
              {actionLabel(a)}
            </option>
          ))}
        </select>
        <label className="flex min-w-48 flex-1 items-center gap-2">
          <span className="whitespace-nowrap tabular-nums">{more}% more</span>
          <input type="range" min={5} max={100} step={5} value={more} onChange={(e) => setMore(Number(e.target.value))} className="w-full accent-[var(--accent)]" />
        </label>
        <button type="button" disabled={busy} onClick={apply} className={`${BUTTON} bg-[var(--accent)] text-white`}>
          Solve with this lock
        </button>
      </div>
      <p className="text-footnote mt-2 text-[var(--text-muted)]">
        Every hand here moves that share of its strategy to the action you pick, and stays there. Solving again shows how the other player should
        adapt, and what the change costs {who}.
      </p>
    </details>
  );
}
