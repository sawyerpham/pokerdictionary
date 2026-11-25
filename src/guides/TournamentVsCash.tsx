import { Link } from 'react-router-dom';
import type { Guide } from './registry';
import { SRC } from './sources';
import { Cite, GuideH2, GuideH3, GuideNote, GuideP, GuideTable, GuideUl, Sources } from './ui';

const SOURCES = [SRC.cashGame, SRC.tournament, SRC.icm, SRC.upswingCashVsMtt, SRC.rake];
const CASH = 1, TOURNEY = 2, ICM = 3, UPSWING = 4, RAKE = 5;

// Wikipedia's ICM example: stacks 50% / 30% / 20%, prizes 70 / 30 / 0. Expected prize per player, worked out
// with the model's rule (chance of 1st = chip share; the rest finish in proportion to what's left).
function icm(stacks: number[], prizes: number[]): number[] {
  const n = stacks.length;
  const ev = new Array(n).fill(0);
  const go = (left: number[], place: number, p: number) => {
    if (place >= prizes.length) return;
    const total = left.reduce((s, i) => s + stacks[i], 0);
    for (const i of left) {
      const q = p * (stacks[i] / total);
      ev[i] += q * prizes[place];
      go(left.filter((j) => j !== i), place + 1, q);
    }
  };
  go([...Array(n).keys()], 0, 1);
  return ev;
}
const BASE = icm([50, 30, 20], [70, 30]);
const WIN = icm([60, 30, 10], [70, 30]); // A wins 10% of the chips from C
const LOSE = icm([40, 30, 30], [70, 30]); // A loses 10% of the chips to C
const f1 = (x: number) => x.toFixed(1);

/** Chip share vs. prize share for the three players in the ICM example. */
function IcmChart() {
  const rows = [
    { name: 'A', chips: 50, prize: BASE[0] },
    { name: 'B', chips: 30, prize: BASE[1] },
    { name: 'C', chips: 20, prize: BASE[2] },
  ];
  return (
    <figure className="mb-6 rounded-[12px] bg-[var(--bg-main)]/50 p-4 ring-1 ring-white/5">
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.name} className="flex items-center gap-3">
            <span className="w-4 text-[15px] font-semibold">{r.name}</span>
            <div className="flex-1 space-y-1">
              {[
                ['Chips', r.chips, '#3987e5'],
                ['Prize money', r.prize, '#d95926'],
              ].map(([label, v, color]) => (
                <div key={label as string} className="flex items-center gap-2" title={`${r.name}: ${label} ${f1(v as number)}%`}>
                  <span className="h-4 rounded-r-[4px]" style={{ width: `${(v as number) * 1.4}%`, background: color as string }} />
                  <span className="text-[12px] text-[var(--text-primary)] tabular-nums">{f1(v as number)}%</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="text-footnote mt-3 flex justify-center gap-4">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[3px] bg-[#3987e5]" />
          Share of the chips
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[3px] bg-[#d95926]" />
          Share of the prize money (ICM)
        </span>
      </div>
      <figcaption className="text-footnote mt-3 text-[var(--text-muted)]">
        Three players left, prizes 70 for 1st and 30 for 2nd. The big stack's chips are worth less than their share and the
        short stack's are worth more.
      </figcaption>
    </figure>
  );
}

function Content() {
  return (
    <>
      <GuideP>
        The cards and betting rules are the same. What changes is what the chips are worth, which changes how you should play
        them. The table on this site is a cash game.
      </GuideP>

      <GuideH2 id="the-difference">The difference in one table</GuideH2>
      <GuideTable
        rows={[
          ['', 'Cash game', 'Tournament'],
          ['Chips', 'Real money; a $1 chip is $1', 'Tournament chips with no cash value'],
          ['Coming and going', 'Buy in, rebuy and leave between any two hands', 'Pay once at the start; play until you bust or win'],
          ['Blinds', 'Stay the same all night', 'Go up on a schedule, by time or hands'],
          ['How it ends', 'Whenever you get up', 'When one player has every chip'],
          ['Prizes', 'Whatever is in front of you', 'Paid by finishing place, roughly the top 1 in 10'],
          ['House fee', 'Rake from each pot, or seat time', 'Part of the buy-in, or a separate fee'],
        ]}
      />
      <GuideP>
        In cash games players can come and go between hands, and may not pocket part of their stack while staying seated.
        <Cite n={CASH} /> In tournaments everyone pays a fixed buy-in for chips that have no value outside the event, the blinds
        and antes rise as it goes, and players are ranked by the order they're knocked out.<Cite n={TOURNEY} /> Cardrooms take
        cash games' fee as rake, usually 2.5% to 10% of each pot up to a cap.<Cite n={RAKE} />
      </GuideP>

      <GuideH2 id="cash-strategy">Playing cash games</GuideH2>
      <GuideUl>
        <li>
          <strong>Every chip is worth the same.</strong> Winning $100 is exactly as good as losing $100 is bad, so the only question
          on every decision is whether it wins money on average.
        </li>
        <li>
          <strong>Stacks stay deep.</strong> With blinds that never rise and the option to top up, 100 big blinds or more is
          normal, so play after the flop matters most.<Cite n={UPSWING} />
        </li>
        <li>
          <strong>Choose your table.</strong> You can leave between any two hands, so leave tough games and sit with weaker
          players.<Cite n={CASH} />
        </li>
        <li>
          <strong>Beat the rake too.</strong> At low stakes the rake is a large cost, and a winning strategy has to account for it.
          <Cite n={[UPSWING, RAKE]} />
        </li>
      </GuideUl>

      <GuideH2 id="tournament-strategy">Playing tournaments</GuideH2>
      <GuideH3>Stacks get shorter</GuideH3>
      <GuideP>
        Because the blinds keep rising, a stack that started at 100 big blinds can be 20 a few hours later without losing a
        hand.<Cite n={TOURNEY} /> Shorter stacks leave less room to bet and then fold, so more decisions become all in or fold.
        The{' '}
        <Link to="/guides/bet-sizing" className="text-[var(--accent)] hover:underline">
          bet sizing guide
        </Link>{' '}
        covers stack-to-pot ratio.
      </GuideP>
      <GuideH3>Survival has value: ICM</GuideH3>
      <GuideP>
        Prize money isn't proportional to chips. The <strong>Independent Chip Model</strong> estimates each player's share of the
        prizes from the stacks alone. Each player's chance of finishing first equals their share of the chips, and the remaining
        places follow the same rule among the rest.<Cite n={ICM} /> Players use it to make decisions near the money and to
        split prizes in final-table deals.<Cite n={ICM} />
      </GuideP>
      <IcmChart />
      <GuideP>
        Using the same example, if A wins 10% of the chips from C, A's prize share rises from {f1(BASE[0])} to {f1(WIN[0])}, a gain
        of {f1(WIN[0] - BASE[0])}. If A loses 10% to C, it drops to {f1(LOSE[0])}, a loss of {f1(BASE[0] - LOSE[0])}. Chips you lose
        cost more than the same chips gain you.<Cite n={ICM} /> That's why, near a pay jump, a call that would be fine in a cash game
        can be a mistake: you need a stronger hand to risk your tournament.
      </GuideP>
      <GuideH3>Bigger swings</GuideH3>
      <GuideP>
        Only about one player in ten gets paid, and the top three usually win more than everyone else in the money put together.
        <Cite n={TOURNEY} /> That makes results swing far more than in cash games. Tournament regulars have losing months, even
        losing years, and need a bigger bankroll.<Cite n={UPSWING} />
      </GuideP>

      <GuideH2 id="which-to-play">Which to play</GuideH2>
      <GuideUl>
        <li>
          <strong>Cash games</strong> suit steady, analytical play with smaller swings and the freedom to stop any time.
          <Cite n={UPSWING} />
        </li>
        <li>
          <strong>Tournaments</strong> offer big wins from a small buy-in and fields full of recreational players, at the cost of
          long sessions and big swings.<Cite n={UPSWING} />
        </li>
      </GuideUl>
      <GuideNote>
        Practising here: the table is a cash game. To get a feel for short-stack tournament spots, lower your buy-in in the top bar
        (20 to 40 big blinds) and see how much simpler and riskier every decision gets.
      </GuideNote>

      <Sources list={SOURCES} />
    </>
  );
}

export const tournamentGuide: Guide = {
  slug: 'tournament-vs-cash',
  title: 'Tournaments vs Cash Games',
  description: 'What changes when chips stop being money: rising blinds, shorter stacks, ICM, payouts and swings.',
  sections: [
    { id: 'the-difference', title: 'The difference' },
    { id: 'cash-strategy', title: 'Playing cash games' },
    { id: 'tournament-strategy', title: 'Playing tournaments' },
    { id: 'which-to-play', title: 'Which to play' },
    { id: 'sources', title: 'Sources' },
  ],
  Content,
};
