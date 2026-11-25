import type { Guide } from './registry';
import { SRC } from './sources';
import { BoardTextures } from './diagrams';
import { Cite, GuideFormula, GuideH2, GuideTable, GuideUl, Sources, withFraction } from './ui';

const SOURCES = [SRC.upswingSizing, SRC.upswingRfi, SRC.betting, SRC.robertsRules];
const SIZING = 1, RFI = 2, BETTING = 3, RULES = 4;

// What a bet of b (as a share of the pot) offers a caller: they call b to win 1 + b.
const OFFER = [0.25, 0.33, 0.5, 0.66, 0.75, 1, 1.5, 2].map((b) => [
  `${Math.round(b * 100)}% pot`,
  withFraction(Math.round((b / (1 + 2 * b)) * 100)),
  `${+((1 + b) / b).toFixed(1)} : 1`,
]);

function Content() {
  return (
    <>
      <GuideH2 id="what-a-bet-does">The price you offer</GuideH2>
      <GuideFormula>caller needs = bet ÷ (pot + 2 × bet)</GuideFormula>
      <GuideTable rows={[['Bet', 'Caller needs', 'Pot odds offered'], ...OFFER]} />

      <GuideH2 id="preflop">Preflop</GuideH2>
      <GuideUl>
        <li>Open about 2.25 bb (many use 2 bb, 2.5 bb on the button).<Cite n={RFI} /> Bigger when weak players will call anyway.<Cite n={SIZING} /></li>
        <li>3-bet about three times the raise in position, four times out of position.<Cite n={SIZING} /></li>
        <li>The minimum raise is the size of the previous bet or raise; the maximum is your stack.<Cite n={[BETTING, RULES]} /></li>
      </GuideUl>

      <GuideH2 id="board-texture">After the flop</GuideH2>
      <BoardTextures cite={<Cite n={SIZING} />} />
      <GuideUl>
        <li>3-bet pots: continuation bet 25–40%.<Cite n={SIZING} /></li>
        <li>Second bet on the turn: at least 66% of the pot.<Cite n={SIZING} /></li>
        <li>Overbet only when you can hold the best hand and they can't.<Cite n={SIZING} /></li>
        <li>Plan all streets from the flop so you aren't left with a tiny river bet.<Cite n={SIZING} /></li>
      </GuideUl>

      <Sources list={SOURCES} />
    </>
  );
}

export const betSizingGuide: Guide = {
  slug: 'bet-sizing',
  title: 'Bet Sizing',
  description: 'What each size offers, and how big to bet.',
  sections: [
    { id: 'what-a-bet-does', title: 'The price' },
    { id: 'preflop', title: 'Preflop' },
    { id: 'board-texture', title: 'After the flop' },
    { id: 'sources', title: 'Sources' },
  ],
  Content,
};
