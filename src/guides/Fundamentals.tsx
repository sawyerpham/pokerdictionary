import { Link } from 'react-router-dom';
import type { Guide } from './registry';
import { SRC } from './sources';
import { BoardTextures, PotOddsBar } from './diagrams';
import { Cite, GuideFormula, GuideH2, GuideNote, GuideP, GuideTable, GuideUl, Sources, withFraction } from './ui';

const SOURCES = [SRC.upswingRfi, SRC.upswingSizing, SRC.potOdds, SRC.strategy];
const RFI = 1, SIZING = 2, POTODDS = 3, STRATEGY = 4;

function Content() {
  return (
    <>
      <GuideH2 id="raise-or-fold">Before the flop</GuideH2>
      <GuideUl>
        <li>First into the pot: raise or fold, don't limp.<Cite n={RFI} /></li>
        <li>Open about 2.25 bb (many use 2 bb, 2.5 bb on the button).<Cite n={RFI} /> Bigger when weak players will call anyway.<Cite n={SIZING} /></li>
        <li>Play more hands the later you act: see{' '}
          <Link to="/guides/positions" className="text-[var(--accent)] hover:underline">
            positions
          </Link>.
        </li>
        <li>Facing a raise: re-raise your best hands; call mainly when in position.<Cite n={STRATEGY} /></li>
        <li>3-bet about three times the raise in position, four times out of position.<Cite n={SIZING} /></li>
      </GuideUl>

      <GuideH2 id="after-the-flop">After the flop</GuideH2>
      <BoardTextures cite={<Cite n={SIZING} />} />
      <GuideUl>
        <li>Bet for value (worse hands call) or as a bluff (better hands fold); otherwise check.</li>
        <li>On the turn, bet at least two-thirds of the pot if you bet again.<Cite n={SIZING} /></li>
      </GuideUl>

      <GuideH2 id="pot-odds">When to call</GuideH2>
      <GuideFormula>needed equity = call ÷ (pot + call)</GuideFormula>
      <PotOddsBar />
      <GuideP>
        The pot includes their bet. Call when your equity is higher.<Cite n={POTODDS} /> To estimate equity, multiply your outs by
        4 on the flop or 2 on the turn.<Cite n={POTODDS} />
      </GuideP>
      <GuideTable
        rows={[
          ['Draw', 'Outs', 'Flop (×4)', 'Turn (×2)'],
          ['Flush draw', '9', `≈${withFraction(36)}`, `≈${withFraction(18)}`],
          ['Open-ended straight draw', '8', `≈${withFraction(32)}`, `≈${withFraction(16)}`],
          ['Gutshot straight draw', '4', `≈${withFraction(16)}`, `≈${withFraction(8)}`],
          ['Two overcards', '6', `≈${withFraction(24)}`, `≈${withFraction(12)}`],
        ]}
      />
      <GuideNote>
        If the price is a little too high but you'll win more when you hit, calling can still be right (implied odds).
        <Cite n={POTODDS} />
      </GuideNote>

      <Sources list={SOURCES} />
    </>
  );
}

export const fundamentalsGuide: Guide = {
  slug: 'fundamentals',
  title: 'Fundamentals',
  description: 'Preflop, after the flop, and when to call.',
  sections: [
    { id: 'raise-or-fold', title: 'Before the flop' },
    { id: 'after-the-flop', title: 'After the flop' },
    { id: 'pot-odds', title: 'When to call' },
    { id: 'sources', title: 'Sources' },
  ],
  Content,
};
