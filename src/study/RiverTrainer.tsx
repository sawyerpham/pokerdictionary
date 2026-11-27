import { useState } from 'react';
import { PlayingCard } from '../components/PlayingCard';
import { Segmented } from '../components/RuleControls';
import { describe, evaluate, shuffledDeck, type Card } from '../engine/cards';
import { pickWeighted, solverCard, solverRange } from '../engine/ranges';
import { actionLabel, nodeAt, solveRiver, type NodeInfo, type Solved } from '../solver/client';
import { findRange, useStudy } from '../state/studyStore';
import { DEFAULTS, holesOf, PLAYER } from './river';
import { BUTTON, PANEL, RangeSelect } from './ui';

interface Decision {
  actions: string[];
  chosen: number;
  evs: number[]; // your hand's EV for each action
  freq: number[]; // how often the solver takes each with your hand
  loss: number; // chips; NaN when the solver never gets here with your hand
}

interface Hand {
  solved: Solved;
  board: Card[];
  hero: number; // 0 OOP, 1 IP
  holes: Card[][][]; // by player, solver order
  heroIdx: number;
  villainIdx: number;
  node: NodeInfo;
  log: string[];
  decisions: Decision[];
}

const SEATS = [
  { value: -1, label: 'Random' },
  { value: 0, label: 'OOP' },
  { value: 1, label: 'IP' },
];

/** Let the villain act from the solved strategy, with its one hand, until it's your turn or the hand ends. */
async function villainActs(hand: Hand): Promise<Hand> {
  let { node, log } = hand;
  const villain = 1 - hand.hero, n = hand.holes[villain].length;
  while (node.player === villain) {
    const a = pickWeighted(node.actions.map((_, k) => node.strategy![k * n + hand.villainIdx]));
    log = [...log, `Villain: ${actionLabel(node.actions[a]).toLowerCase()}`];
    node = await nodeAt([...node.history, a]);
  }
  return { ...hand, node, log };
}

/** Play river spots against the solver; every decision is graded by the EV it gives up. */
export function RiverTrainer() {
  const ranges = useStudy((s) => s.ranges);
  const [oop, setOop] = useState(ranges.find((r) => r.name === 'CO open')?.name ?? ranges[0]?.name ?? '');
  const [ip, setIp] = useState(ranges.find((r) => r.name === 'BTN open')?.name ?? ranges[0]?.name ?? '');
  const [seat, setSeat] = useState(-1);
  const [hand, setHand] = useState<Hand>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [session, setSession] = useState({ decisions: 0, loss: 0 });

  const run = (work: () => Promise<void>) => {
    setBusy(true);
    setError(undefined);
    work()
      .catch((e: Error) => setError(e.message))
      .finally(() => setBusy(false));
  };

  const deal = () =>
    run(async () => {
      const board = shuffledDeck().slice(0, 5);
      const solved = await solveRiver({
        oop: solverRange(findRange(ranges, oop)),
        ip: solverRange(findRange(ranges, ip)),
        board: board.map(solverCard),
        pot: DEFAULTS.pot,
        stack: DEFAULTS.stack,
        oopBets: DEFAULTS.bets,
        oopRaises: DEFAULTS.raises,
        ipBets: DEFAULTS.bets,
        ipRaises: DEFAULTS.raises,
      });
      const hero = seat >= 0 ? seat : Math.random() < 0.5 ? 0 : 1;
      const holes = solved.hands.map(holesOf);
      const heroIdx = pickWeighted(solved.root.weights[hero]);
      const mine = new Set(holes[hero][heroIdx]);
      const villainIdx = pickWeighted(solved.root.weights[1 - hero].map((w, i) => (holes[1 - hero][i].some((c) => mine.has(c)) ? 0 : w)));
      if (heroIdx < 0 || villainIdx < 0) throw new Error('A range has no hands left on this board. Try again or widen it.');
      setHand(await villainActs({ solved, board, hero, holes, heroIdx, villainIdx, node: solved.root, log: [], decisions: [] }));
    });

  const choose = (a: number) =>
    run(async () => {
      if (!hand) return;
      const { node, heroIdx } = hand;
      const n = hand.holes[hand.hero].length;
      const evs = node.actions.map((_, k) => node.actionEvs![k * n + heroIdx]);
      const reached = node.weights[hand.hero][heroIdx] > 0;
      const loss = reached ? Math.max(...evs) - evs[a] : NaN;
      const decision = { actions: node.actions, chosen: a, evs, freq: node.actions.map((_, k) => node.strategy![k * n + heroIdx]), loss };
      if (reached) setSession((s) => ({ decisions: s.decisions + 1, loss: s.loss + loss }));
      const next = await nodeAt([...node.history, a]);
      setHand(await villainActs({ ...hand, node: next, log: [...hand.log, `You: ${actionLabel(node.actions[a]).toLowerCase()}`], decisions: [...hand.decisions, decision] }));
    });

  const heroTurn = hand && hand.node.player === hand.hero;
  const over = hand && hand.node.player < 0;
  const pot = hand ? DEFAULTS.pot + hand.node.bets[0] + hand.node.bets[1] : 0;
  const last = hand?.decisions.at(-1);

  return (
    <>
      <section className={PANEL}>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <RangeSelect label="OOP range" value={oop} onChange={setOop} />
          <RangeSelect label="IP range" value={ip} onChange={setIp} />
          <Segmented label="Your seat" value={seat} options={SEATS} onChange={setSeat} />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" onClick={deal} disabled={busy} className={`${BUTTON} bg-[var(--accent)] text-white`}>
            {hand ? 'Next hand' : 'Deal'}
          </button>
          <span className="text-[13px] text-[var(--text-muted)] tabular-nums">
            {busy
              ? 'Solving…'
              : session.decisions
                ? `${session.decisions} decisions · ${((session.loss / session.decisions / DEFAULTS.pot) * 100).toFixed(1)}% of the pot lost per decision`
                : `Pot ${DEFAULTS.pot}, ${DEFAULTS.stack} behind; bets ${DEFAULTS.bets} of the pot, raises ${DEFAULTS.raises}.`}
          </span>
        </div>
        {error && <p className="mt-2 text-[15px] text-rose-400">{error}</p>}
      </section>

      {hand && (
        <section className={`${PANEL} mt-4`}>
          <div className="flex flex-wrap items-end justify-center gap-x-8 gap-y-3">
            <Seat label={`Villain · ${PLAYER[1 - hand.hero]}`} cards={over ? hand.holes[1 - hand.hero][hand.villainIdx] : undefined} />
            <div className="flex flex-col items-center gap-1">
              <div className="flex gap-1">
                {hand.board.map((c) => (
                  <PlayingCard key={c} card={c} size="md" />
                ))}
              </div>
              <span className="text-[13px] text-[var(--text-muted)] tabular-nums">Pot {pot}</span>
            </div>
            <Seat label={`You · ${PLAYER[hand.hero]}`} cards={hand.holes[hand.hero][hand.heroIdx]} />
          </div>

          <p className="mt-4 min-h-6 text-center text-[15px] text-[var(--text-muted)]">{hand.log.join(' · ') || 'You act first.'}</p>

          {heroTurn && (
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {hand.node.actions.map((a, i) => (
                <button key={a} type="button" disabled={busy} onClick={() => choose(i)} className={`${BUTTON} bg-[var(--bg-third)]`}>
                  {actionLabel(a)}
                </button>
              ))}
            </div>
          )}
          {over && <p className="mt-3 text-center text-[17px] font-semibold">{result(hand)}</p>}
          {last && <Grade d={last} />}
        </section>
      )}
    </>
  );
}

function Seat({ label, cards }: { label: string; cards?: Card[] }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex gap-1">
        {(cards ?? [undefined, undefined]).map((c, i) => (
          <PlayingCard key={i} card={c} size="md" />
        ))}
      </div>
      <span className="text-[13px] text-[var(--text-muted)]">{label}</span>
    </div>
  );
}

/** Your last decision next to the solver's. */
function Grade({ d }: { d: Decision }) {
  const best = d.evs.indexOf(Math.max(...d.evs));
  const verdict = Number.isNaN(d.loss)
    ? 'Not graded: the solver never reaches this spot with your hand.'
    : d.loss < DEFAULTS.pot * 0.005
      ? 'Best play.'
      : `Best was ${actionLabel(d.actions[best]).toLowerCase()}: you gave up ${d.loss.toFixed(1)} chips (${((d.loss / DEFAULTS.pot) * 100).toFixed(1)}% of the pot).`;
  return (
    <div className="mt-4 border-t border-[var(--line)] pt-3">
      <p className={`text-[15px] font-semibold ${Number.isNaN(d.loss) ? '' : d.loss < DEFAULTS.pot * 0.005 ? 'text-emerald-400' : d.loss < DEFAULTS.pot * 0.05 ? 'text-amber-300' : 'text-rose-400'}`}>
        {verdict}
      </p>
      <table className="mt-2 w-full text-[13px] tabular-nums">
        <thead className="text-[var(--text-muted)]">
          <tr>
            <th className="py-1 text-left font-normal">Action</th>
            <th className="py-1 text-right font-normal">Solver</th>
            <th className="py-1 text-right font-normal">EV</th>
          </tr>
        </thead>
        <tbody>
          {d.actions.map((a, i) => (
            <tr key={a} className={`border-t border-[var(--line)] ${i === d.chosen ? 'font-semibold' : ''}`}>
              <td className="py-1">
                {actionLabel(a)}
                {i === d.chosen && ' (you)'}
              </td>
              <td className="py-1 text-right">{(d.freq[i] * 100).toFixed(0)}%</td>
              <td className="py-1 text-right">{Number.isNaN(d.loss) ? '–' : d.evs[i].toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Who won, once the hand is over. */
function result(hand: Hand): string {
  const pot = DEFAULTS.pot + hand.node.bets[0] + hand.node.bets[1];
  const last = hand.log.at(-1) ?? '';
  if (last === 'You: fold') return `You fold. Villain takes ${pot}.`;
  if (last === 'Villain: fold') return `Villain folds. You take ${pot}.`;
  const mine = evaluate([...hand.holes[hand.hero][hand.heroIdx], ...hand.board]);
  const theirs = evaluate([...hand.holes[1 - hand.hero][hand.villainIdx], ...hand.board]);
  if (mine === theirs) return `Split pot: ${describe(mine)}.`;
  return mine > theirs ? `You win ${pot} with ${describe(mine)}.` : `Villain wins ${pot} with ${describe(theirs)}.`;
}
