import { Link } from 'react-router-dom';
import type { Guide } from './registry';
import { SRC } from './sources';
import { BoardTextures, PotOddsBar } from './diagrams';
import { Cite, GuideFormula, GuideH2, GuideH3, GuideNote, GuideP, GuideTable, GuideUl, Sources } from './ui';

const SOURCES = [SRC.ftop, SRC.sklansky, SRC.upswingRfi, SRC.startingHands, SRC.sklanskyMalmuth, SRC.upswingSizing, SRC.potOdds, SRC.strategy];
const FTOP = 1, SKLANSKY = 2, RFI = 3, STARTING = 4, HPFAP = 5, SIZING = 6, POTODDS = 7, STRATEGY = 8;

function Content() {
  return (
    <>
      <GuideP>
        What to do and when: the handful of decisions that come up in every hand, in the order you meet them.
      </GuideP>

      <GuideH2 id="the-goal">The goal: make better decisions than your opponents</GuideH2>
      <GuideP>
        Sklansky's <em>fundamental theorem of poker</em>: every time you play a hand differently from how you would if you could
        see your opponents' cards, they gain; every time they do the same, you gain.<Cite n={[FTOP, SKLANSKY]} /> Winning comes
        from making fewer of those mistakes than the other players, not from any single pot.
      </GuideP>
      <GuideP>
        That's why results over a few hands mean little. A good call that loses was still a good call. Judge a decision by its
        expected value (what it wins on average), not by the card that came next.
      </GuideP>

      <GuideH2 id="raise-or-fold">Before the flop: raise or fold</GuideH2>
      <GuideP>
        When nobody has entered the pot, raise the hands you want to play and fold the rest. Don't just call the big blind
        (limp).<Cite n={RFI} /> A raise can win the blinds right away and usually gets you heads-up, where good hands play best.
        Limping invites several callers, and even aces drop to about 53% equity against five opponents who each hold a top-20%
        hand.<Cite n={RFI} />
      </GuideP>
      <GuideUl>
        <li>
          <strong>Size:</strong> one size from every seat except the small blind, around 2.25 big blinds, is simple and sound.
          Many top players use 2 bb, and 2.5 bb from the button.<Cite n={RFI} />
        </li>
        <li>
          <strong>Raise bigger</strong> when weak players in the blinds or calling stations will call anyway. Your strong hands
          win more.<Cite n={[RFI, SIZING]} />
        </li>
        <li>
          <strong>Raise more hands the later you act.</strong> Fewer players are left behind you to wake up with a strong hand,
          and you'll have position after the flop. The{' '}
          <Link to="/guides/positions" className="text-[var(--accent)] hover:underline">
            positions guide
          </Link>{' '}
          has the ranges.
        </li>
      </GuideUl>

      <GuideH3>Which hands</GuideH3>
      <GuideP>
        Big pairs, big aces and suited broadway cards are good from every seat. Small pairs, suited connectors and suited aces
        join as you get closer to the button. Weak offsuit hands like K7 or J5 are folds from early seats. Ranking systems like
        Sklansky's hand groups and the Chen formula order all 169 starting hands.<Cite n={[STARTING, HPFAP]} /> The NPCs here
        use the Chen formula.
      </GuideP>

      <GuideH2 id="facing-a-raise">Facing a raise</GuideH2>
      <GuideUl>
        <li>
          <strong>Re-raise your best hands for value.</strong> Call mainly with hands that play well after the flop, and mainly
          when you'll be in position, where you act last on every street.<Cite n={STRATEGY} />
        </li>
        <li>
          <strong>3-bet bigger out of position.</strong> From the blinds, about four times the open instead of three, because
          you'll have to act first for the rest of the hand.<Cite n={SIZING} />
        </li>
        <li>
          <strong>Respect early-position raises.</strong> A raise from under the gun shows a tighter range than one from the
          button, so call and 3-bet it with stronger hands.
        </li>
      </GuideUl>

      <GuideH2 id="after-the-flop">After the flop</GuideH2>
      <BoardTextures />
      <GuideP>
        Ask what you want: worse hands to call (value), better hands to fold (bluff), or to see the next card cheaply. If betting
        does neither of the first two, checking is usually better.
      </GuideP>
      <GuideUl>
        <li>
          <strong>Continuation bet (c-bet):</strong> the preflop raiser often bets the flop. Bet small, 25–35% of the pot, on dry
          boards like K-7-2 with different suits, which change little and favour the raiser. Bet bigger, 55–80%, on connected or
          two-suited boards where draws can catch up.<Cite n={SIZING} />
        </li>
        <li>
          <strong>Value bet</strong> when worse hands will call, and bet bigger against players who call with the same hands
          whatever the size.<Cite n={SIZING} />
        </li>
        <li>
          <strong>Aggression beats passivity.</strong> Betting can win the pot two ways, by a fold now or the best hand later.
          Calling wins only one way.<Cite n={STRATEGY} />
        </li>
        <li>
          <strong>Turn barrels:</strong> when you bet again on the turn, make it at least about two-thirds of the pot. By then
          your range should be strong hands and bluffs, not medium hands.<Cite n={SIZING} />
        </li>
      </GuideUl>

      <GuideH2 id="pot-odds">When to call: pot odds</GuideH2>
      <GuideP>Compare the price of a call with your chance of winning:</GuideP>
      <GuideFormula>needed equity = call ÷ (pot + call)</GuideFormula>
      <PotOddsBar />
      <GuideP>
        The pot includes the opponent's bet. If your equity is higher, calling makes money in the long run.<Cite n={POTODDS} />
      </GuideP>
      <GuideH3>Counting outs: the rule of 2 and 4</GuideH3>
      <GuideP>
        Outs are the cards that make your hand. Multiply your outs by 4 on the flop (two cards to come) or by 2 on the turn for
        a quick equity estimate.<Cite n={POTODDS} />
      </GuideP>
      <GuideTable
        rows={[
          ['Draw', 'Outs', 'Flop (×4)', 'Turn (×2)'],
          ['Flush draw', '9', '≈36%', '≈18%'],
          ['Open-ended straight draw', '8', '≈32%', '≈16%'],
          ['Gutshot straight draw', '4', '≈16%', '≈8%'],
          ['Two overcards', '6', '≈24%', '≈12%'],
        ]}
      />
      <GuideNote>
        Example: on the turn you have a flush draw (9 outs, about 18%). Your opponent bets $10 into $40. You'd call $10 to win
        $50, which needs 10 ÷ 60 ≈ 17%. That's a narrow call. Facing a $40 bet you'd need 40 ÷ 120 ≈ 33%, so it's a fold unless
        you expect to win a lot more when you hit (<em>implied odds</em>).<Cite n={POTODDS} />
      </GuideNote>

      <GuideH2 id="when-to-fold">When to fold</GuideH2>
      <GuideUl>
        <li>When the price is higher than your equity and you won't win enough later to make up the difference.</li>
        <li>
          When a tight, passive player suddenly raises big on the turn or river. Players who rarely bluff are usually telling
          the truth.<Cite n={STRATEGY} />
        </li>
        <li>
          When you're out of position with a medium hand in a pot that keeps growing. Medium hands win small pots and lose big
          ones.
        </li>
      </GuideUl>

      <Sources list={SOURCES} />
    </>
  );
}

export const fundamentalsGuide: Guide = {
  slug: 'fundamentals',
  title: 'Fundamentals',
  description: 'What to do and when: preflop raising, facing raises, betting after the flop, pot odds, and folding.',
  sections: [
    { id: 'the-goal', title: 'The goal' },
    { id: 'raise-or-fold', title: 'Raise or fold' },
    { id: 'facing-a-raise', title: 'Facing a raise' },
    { id: 'after-the-flop', title: 'After the flop' },
    { id: 'pot-odds', title: 'Pot odds' },
    { id: 'when-to-fold', title: 'When to fold' },
    { id: 'sources', title: 'Sources' },
  ],
  Content,
};
