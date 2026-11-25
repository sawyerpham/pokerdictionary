import type { Guide } from './registry';
import { SRC } from './sources';
import { BluffChart } from './diagrams';
import { Cite, GuideFormula, GuideH2, GuideP, GuideTable, GuideUl, Sources, withFraction } from './ui';

const SOURCES = [SRC.bluff, SRC.sklansky, SRC.mop, SRC.strategy, SRC.upswingSizing];
const BLUFF = 1, SKLANSKY = 2, MOP = 3, STRATEGY = 4, SIZING = 5;

// For a pot of 1 and a bet of b: a bluff needs folds b/(1+b); the caller needs equity b/(1+2b); the caller must defend 1/(1+b).
const ROWS = [
  ['⅓ pot', 1 / 3],
  ['½ pot', 1 / 2],
  ['⅔ pot', 2 / 3],
  ['Pot', 1],
  ['2× pot', 2],
].map(([label, b]) => {
  const x = b as number;
  const pct = (v: number) => withFraction(Math.round(v * 100));
  return [label as string, pct(x / (1 + x)), pct(x / (1 + 2 * x)), pct(1 / (1 + x))];
});

function Content() {
  return (
    <>
      <GuideH2 id="the-math">The math</GuideH2>
      <GuideFormula>folds a bluff needs = bet ÷ (pot + bet)</GuideFormula>
      <GuideFormula>share of river bets to bluff = bet ÷ (pot + 2 × bet)</GuideFormula>
      <GuideFormula>minimum defense = pot ÷ (pot + bet)</GuideFormula>
      <GuideP>
        The bluffing share equals the caller's pot odds, which makes calling and folding worth the same to them.
        <Cite n={[BLUFF, SKLANSKY, MOP]} />
      </GuideP>
      <BluffChart />
      <GuideTable rows={[['Bet size', 'Bluff must work', 'Bluffs in a balanced river bet', 'Caller must defend'], ...ROWS]} />

      <GuideH2 id="semi-bluffs">When to bluff</GuideH2>
      <GuideUl>
        <li><strong>Semi-bluff</strong> with draws: you win if they fold or if you hit.<Cite n={[BLUFF, SKLANSKY]} /></li>
        <li>On the river, bluff hands that can't win by checking.</li>
        <li>Bluff tight players and few opponents; value bet players who rarely fold.<Cite n={STRATEGY} /></li>
        <li>Bet big or overbet when only your range holds the strongest hands.<Cite n={SIZING} /></li>
      </GuideUl>

      <Sources list={SOURCES} />
    </>
  );
}

export const bluffingGuide: Guide = {
  slug: 'art-of-bluffing',
  title: 'The Art of Bluffing',
  description: 'How often to bluff and defend, and when to do it.',
  sections: [
    { id: 'the-math', title: 'The math' },
    { id: 'semi-bluffs', title: 'When to bluff' },
    { id: 'sources', title: 'Sources' },
  ],
  Content,
};
