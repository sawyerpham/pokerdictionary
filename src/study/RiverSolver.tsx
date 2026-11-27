import { useState } from 'react';
import { CardSlot, DeckDialog, type Slot } from '../components/CardPicker';
import { INPUT } from '../components/RuleControls';
import { shuffledDeck, type Card } from '../engine/cards';
import { solverCard, solverRange } from '../engine/ranges';
import { Grid } from '../guides/Preflop';
import { actionLabel, nodeAt, solveRiver, type NodeInfo, type Solved } from '../solver/client';
import { findRange, useStudy } from '../state/studyStore';
import { actionColors, byClass, type ClassRow, DEFAULTS, holesOf, mixBackground, PLAYER, rangeMix } from './river';
import { BUTTON, CardText, Field, PANEL, RangeSelect } from './ui';

const randomBoard = () => shuffledDeck().slice(0, 5);

/** Solve a heads-up river spot and walk its tree: strategy and EV for every hand at every node. */
export function RiverSolver() {
  const ranges = useStudy((s) => s.ranges);
  const [board, setBoard] = useState<Slot[]>(randomBoard);
  const [target, setTarget] = useState<number>();
  const [oop, setOop] = useState(ranges.find((r) => r.name === 'CO open')?.name ?? ranges[0]?.name ?? '');
  const [ip, setIp] = useState(ranges.find((r) => r.name === 'BTN open')?.name ?? ranges[0]?.name ?? '');
  const [pot, setPot] = useState(DEFAULTS.pot);
  const [stack, setStack] = useState(DEFAULTS.stack);
  const [sizes, setSizes] = useState({ oopBets: DEFAULTS.bets, oopRaises: DEFAULTS.raises, ipBets: DEFAULTS.bets, ipRaises: DEFAULTS.raises });
  const [solved, setSolved] = useState<Solved & { pot: number }>();
  const [node, setNode] = useState<NodeInfo>();
  const [status, setStatus] = useState<string>();
  const [hover, setHover] = useState<string>();

  const cards = board.filter((c): c is Card => c !== null);
  const solve = () => {
    setStatus('Solving…');
    solveRiver({ oop: solverRange(findRange(ranges, oop)), ip: solverRange(findRange(ranges, ip)), board: cards.map(solverCard), pot, stack, ...sizes })
      .then((s) => {
        setSolved({ ...s, pot });
        setNode(s.root);
        setStatus(undefined);
      })
      .catch((e: Error) => setStatus(e.message));
  };
  const go = (history: number[]) => nodeAt(history).then(setNode, (e: Error) => setStatus(e.message));

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
          {board.map((c, i) => (
            <CardSlot key={i} card={c} label={`Board card ${i + 1}`} onClick={() => setTarget(i)} />
          ))}
          <button type="button" onClick={() => setBoard(randomBoard())} className="ml-2 min-h-11 px-2 text-[15px] text-[var(--accent)]">
            Random
          </button>
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
          <button type="button" onClick={solve} disabled={cards.length < 5 || status === 'Solving…'} className={`${BUTTON} bg-[var(--accent)] text-white`}>
            Solve
          </button>
          <span className="text-[13px] text-[var(--text-muted)]">
            {status ??
              (solved
                ? `Solved in ${Math.round(solved.ms)} ms · exploitability ${((solved.exploitability / solved.pot) * 100).toFixed(2)}% of the pot`
                : 'Sizes are % of the pot for bets, ×the bet for raises, a for all-in; comma-separated.')}
          </span>
        </div>
      </section>

      {solved && node && <Tree solved={solved} node={node} go={go} hover={hover} setHover={setHover} />}

      {target !== undefined && (
        <DeckDialog
          title={`Board card ${target + 1}`}
          used={new Set(cards)}
          current={board[target]}
          onPick={(c) => {
            setCard(target, c);
            const empty = board.findIndex((x, i) => i > target && x === null);
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
  const [path, setPath] = useState<string[]>([]); // labels of the actions taken, for the breadcrumb
  const labels = path.slice(0, node.history.length);
  const player = node.player;
  const pot = solved.pot + node.bets[0] + node.bets[1];
  const colors = actionColors(node.actions);
  const holes = holesOf(solved.hands[Math.max(0, player)]);
  const rows: Map<string, ClassRow> = player >= 0 ? byClass(node, holes, player) : new Map();
  const mix = rangeMix(node);
  const detail = hover ? rows.get(hover) : undefined;

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
              {PLAYER[k % 2]} {l}
            </button>
          </span>
        ))}
      </nav>

      {player < 0 ? (
        <p className="text-[17px]">Hand over. Pot {pot}.</p>
      ) : (
        <>
          <p className="mb-2 text-[17px]">
            <strong>{PLAYER[player]}</strong> to act · pot {pot}
          </p>
          <div className="mb-4 flex flex-wrap gap-2">
            {node.actions.map((a, i) => (
              <button
                key={a}
                type="button"
                onClick={() => {
                  setPath([...labels, actionLabel(a)]);
                  go([...node.history, i]);
                }}
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
