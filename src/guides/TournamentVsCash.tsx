import type { Guide } from './registry';
import { SRC } from './sources';
import { Cite, GuideH2, GuideP, GuideTable, Sources } from './ui';

const SOURCES = [SRC.cashGame, SRC.tournament, SRC.icm, SRC.rake];
const CASH = 1, TOURNEY = 2, ICM = 3, RAKE = 4;

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
      <h3 className="card-title">Chips vs prize money</h3>
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
      <GuideH2 id="the-difference">The difference</GuideH2>
      <GuideTable
        rows={[
          ['', 'Cash game', 'Tournament'],
          ['Chips', 'Money', 'No cash value'],
          ['Leaving', 'Between any two hands', 'When you bust'],
          ['Blinds', 'Fixed', 'Rise on a schedule'],
          ['Ends', 'When you get up', 'One player has every chip'],
          ['Prizes', 'Your stack', 'By finishing place, about 1/10 paid'],
          ['Fee', 'Rake or seat time', 'In the buy-in or separate'],
        ]}
      />
      <GuideP>
        Cash players may not pocket part of their stack while seated.<Cite n={CASH} /> Tournament places are set by the order of
        knockouts.<Cite n={TOURNEY} /> Rake is usually 2.5% to 10% of a pot, up to a cap.<Cite n={RAKE} />
      </GuideP>

      <GuideH2 id="icm">Tournament chip value (ICM)</GuideH2>
      <GuideP>
        The Independent Chip Model estimates each player's share of the prizes: the chance of finishing first equals their share
        of the chips, and the other places follow the same rule.<Cite n={ICM} />
      </GuideP>
      <IcmChart />
      <GuideP>
        If A wins 10% of the chips from C, A's prize share goes from {f1(BASE[0])} to {f1(WIN[0])}. Losing 10% takes it to{' '}
        {f1(LOSE[0])}. Chips lost cost more than chips won, so take fewer close all-ins near pay jumps.<Cite n={ICM} />
      </GuideP>

      <Sources list={SOURCES} />
    </>
  );
}

export const tournamentGuide: Guide = {
  slug: 'tournament-vs-cash',
  title: 'Tournaments vs Cash Games',
  description: 'What differs, and what tournament chips are worth.',
  sections: [
    { id: 'the-difference', title: 'The difference' },
    { id: 'icm', title: 'ICM' },
    { id: 'sources', title: 'Sources' },
  ],
  Content,
};
