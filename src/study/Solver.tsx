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

/** Solve a heads-up turn or river spot and walk its tree: strategy and EV for every hand at every node. */
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

  const shown = board.slice(0, street);
  const ready = shown.every((c) => c !== null);
  const solve = () => {
    setError(undefined);
    setProgress({ iterations: 0, exploitability: NaN });
    const cards = shown as Card[];
    solveSpot({ oop: solverRange(findRange(ranges, oop)), ip: solverRange(findRange(ranges, ip)), board: cards.map(solverCard), pot, stack, ...sizes }, setProgress)
      .then((s) => {
        setSolved({ ...s, pot });
        setNode(s.root);
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
          <button type="button" onClick={() => setBoard(randomBoard())} className="ml-2 min-h-11 px-2 text-[15px] text-[var(--accent)]">
            Random
          </button>
        </div>
        <div className="mb-3 flex justify-center">
          <Segmented label="Street" value={street} options={STREETS} onChange={setStreet} />
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
            <button type="button" onClick={solve} disabled={!ready} className={`${BUTTON} bg-[var(--accent)] text-white`}>
              Solve
            </button>
          )}
          <span className="text-[13px] text-[var(--text-muted)] tabular-nums">
            {progress
              ? `Solving… ${progress.iterations} iterations${Number.isNaN(progress.exploitability) ? '' : ` · ${pct(progress.exploitability, pot)} exploitable`}`
              : solved
                ? `Solved in ${(solved.ms / 1000).toFixed(1)} s · ${solved.iterations} iterations · ${Math.round(solved.memoryMb)} MB · ${pct(solved.exploitability, solved.pot)} exploitable`
                : 'Sizes are % of the pot for bets, ×the bet for raises, a for all-in; comma-separated. They apply on every street.'}
          </span>
        </div>
        {error && <p className="mt-2 text-[15px] text-rose-400">{error}</p>}
      </section>

      {solved && node && <Tree solved={solved} node={node} go={go} hover={hover} setHover={setHover} />}

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

function Tree({ solved, node, go, hover, setHover }: { solved: Solved & { pot: number }; node: NodeInfo; go: (h: number[]) => void; hover?: string; setHover: (h?: string) => void }) {
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
  const dealRiver = (c: Card) => take(solverCard(c), `River ${cardName(c)}`);

  return (
    <section className={`${PANEL} mt-4`}>
      <nav aria-label="Line" className="mb-3 flex flex-wrap items-center gap-1 text-[15px]">
        <button type="button" onClick={() => go([])} className="min-h-11 px-1 text-[var(--accent)]">
          Start
        </button>
        {labels.map((l, k) => (
          <span key={k} className="flex items-center gap-1">
            <span className="text-[var(--text-muted)]">›</span>
            <button type="button" onClick={() => go(node.history.slice(0, k + 1))} className="min-h-11 px-1 text-[var(--accent)]">
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
          <p className="text-[17px]">The river is dealt.</p>
          <button type="button" onClick={() => setPicking(true)} className={`${BUTTON} bg-[var(--accent)] text-white`}>
            Pick river
          </button>
          <button type="button" onClick={() => dealRiver(solverCard(node.cards[Math.floor(Math.random() * node.cards.length)]))} className="min-h-11 px-2 text-[15px] text-[var(--accent)]">
            Random
          </button>
          {picking && (
            <DeckDialog
              title="River card"
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
