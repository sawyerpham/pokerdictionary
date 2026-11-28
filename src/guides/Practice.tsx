import { Link } from 'react-router-dom';
import type { Guide } from './registry';
import { SRC } from './sources';
import { Cite, GuideH2, GuideH3, GuideNote, GuideOl, GuideP, GuideUl, Sources } from './ui';

const SOURCES = [
  SRC.pokerNow, SRC.replayPoker, SRC.gtowArena, SRC.gtowFree, SRC.equilab,
  SRC.equilabBrowser, SRC.texasSolver, SRC.pokerTracker, SRC.equilabForum,
];
const NOW = 1, REPLAY = 2, ARENA = 3, GTOW = 4, EQ = 5, EQWEB = 6, SOLVER = 7, PT4 = 8, RULES = 9;

const here = (to: string, text: string) => (
  <Link to={to} className="text-[var(--accent-soft)] hover:underline">
    {text}
  </Link>
);

function Content() {
  return (
    <>
      <GuideH2 id="loop">The practice loop</GuideH2>
      <GuideP>Playing more hands doesn't make you better by itself. Improvement comes from checking the hands you weren't sure about. A simple loop:</GuideP>
      <GuideOl>
        <li><strong>Play</strong> a session, free or for low stakes.</li>
        <li><strong>Mark</strong> every hand where you hesitated or lost a big pot. Write down the stacks, your position and each street's action.</li>
        <li><strong>Check</strong> those hands with an equity calculator or a solver after the session.</li>
        <li><strong>Drill</strong> the one spot you got wrong most often until the answer is automatic.</li>
      </GuideOl>

      <GuideH2 id="play">Play for free</GuideH2>
      <GuideUl>
        <li>
          <strong>This site:</strong> the {here('/table', 'Table')} plays 2–9 handed against NPCs you can tune. Turn on the equity hint,
          or spectate to watch how different player types play.
        </li>
        <li>
          <strong>Poker Now:</strong> start a private hold'em or Omaha game in the browser and send friends the link. No download,
          play chips only.<Cite n={NOW} />
        </li>
        <li>
          <strong>Replay Poker:</strong> play-money cash games, sit-and-gos and tournaments against strangers.<Cite n={REPLAY} />
        </li>
        <li>
          <strong>GTO Wizard PokerArena:</strong> free games where you can check your decisions against a solver after each hand.<Cite n={ARENA} />
        </li>
      </GuideUl>
      <GuideNote>
        Play-money players call far too often because nothing is at stake. Treat it as practice for your own decisions,
        not for reading opponents, and bluff less than you would for real money.
      </GuideNote>

      <GuideH2 id="drill">Drill specific spots</GuideH2>
      <GuideUl>
        <li>
          <strong>GTO Wizard (free plan):</strong> the preflop charts are free to study. The postflop solutions and trainer hands
          have a small daily allowance, which is plenty for one focused spot a day.<Cite n={GTOW} />
        </li>
        <li>
          <strong>Equilab's Equity Trainer:</strong> quizzes you on estimating equity until the numbers come without a calculator.<Cite n={EQ} />
        </li>
        <li>
          <strong>Preflop first:</strong> learn one opening range per position from the {here('/guides/preflop', 'Preflop guide')} before
          spending time on postflop spots. It comes up every hand.
        </li>
      </GuideUl>

      <GuideH2 id="tools">Check your math</GuideH2>
      <GuideH3>Equity calculators</GuideH3>
      <GuideUl>
        <li>
          <strong>Equilab:</strong> free, from PokerStrategy.com. It calculates your equity against a hand or a whole range, and
          its Scenario Analyser shows how each turn or river card changes things.<Cite n={EQ} /> It used to be Windows only, but it
          now also runs in the browser on Mac, phones and tablets.<Cite n={EQWEB} />
        </li>
        <li>
          <strong>This site:</strong> the {here('/evaluator', 'Evaluator')} gives quick win/tie/lose odds for hands you enter.
        </li>
      </GuideUl>
      <GuideH3>Solvers</GuideH3>
      <GuideP>
        A solver works out a game-theory-optimal strategy for a spot: how often to bet, at what size, and with which hands.
        Use it to learn why a line works, not to memorize trees.
      </GuideP>
      <GuideUl>
        <li>
          <strong>TexasSolver:</strong> free and open source for personal use, with a desktop interface. You set the ranges, board
          and bet sizes, then let it solve.<Cite n={SOLVER} />
        </li>
        <li>
          <strong>GTO Wizard:</strong> already-solved spots you can browse, with nothing to set up.<Cite n={GTOW} />
        </li>
      </GuideUl>

      <GuideH2 id="review">Review your hands</GuideH2>
      <GuideUl>
        <li>
          <strong>Trackers:</strong> if you play online, PokerTracker 4 imports your hand histories so you can replay hands and see
          your own stats, like how often you put money in preflop. It's paid, with a free trial.<Cite n={PT4} />
        </li>
        <li>
          <strong>Forums:</strong> post the hands you're unsure about to the Two Plus Two forums or r/poker. Give the stakes,
          stacks, positions, every street's action, and what you knew about the opponent. Leave out the result, so people judge
          the decision rather than how it turned out.
        </li>
      </GuideUl>
      <GuideNote>
        Don't run equity calculators or solvers while playing for real money online. Most sites ban real-time help, and some
        require these programs to be closed before you even open their software.<Cite n={RULES} /> Check your site's list of
        permitted tools.
      </GuideNote>

      <Sources list={SOURCES} />
    </>
  );
}

export const practiceGuide: Guide = {
  slug: 'practice',
  title: 'Practicing on Your Own',
  description: 'Free games, trainers, equity calculators, solvers and hand review.',
  sections: [
    { id: 'loop', title: 'The practice loop' },
    { id: 'play', title: 'Play for free' },
    { id: 'drill', title: 'Drill specific spots' },
    { id: 'tools', title: 'Check your math' },
    { id: 'review', title: 'Review your hands' },
    { id: 'sources', title: 'Sources' },
  ],
  Content,
};
