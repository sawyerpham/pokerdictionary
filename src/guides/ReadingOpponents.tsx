import type { Guide } from './registry';
import { SRC } from './sources';
import { PlayerTypes } from './diagrams';
import { Cite, GuideH2, GuideNote, GuideP, GuideTable, GuideUl, Sources } from './ui';

const SOURCES = [SRC.strategy, SRC.vpip, SRC.hud, SRC.sklansky, SRC.ftop];
const STRATEGY = 1, VPIP = 2, HUD = 3, SKLANSKY = 4, FTOP = 5;

function Content() {
  return (
    <>
      <GuideP>
        You can't see your opponents' cards, but you can see how they play. Every hand you watch narrows down what they hold the
        next time they bet.<Cite n={STRATEGY} />
      </GuideP>

      <GuideH2 id="two-axes">Two questions about every player</GuideH2>
      <GuideUl>
        <li>
          <strong>Tight or loose?</strong> Loose players play many hands and rarely fold. Tight players play few and fold often.
          <Cite n={STRATEGY} />
        </li>
        <li>
          <strong>Aggressive or passive?</strong> Aggressive players bet and raise. Passive players check and call.
          <Cite n={STRATEGY} />
        </li>
      </GuideUl>
      <GuideP>The two answers put a player in one of four corners.</GuideP>
      <PlayerTypes />
      <GuideTable
        rows={[
          ['', 'Passive', 'Aggressive'],
          [
            'Tight',
            'Rock / Nit: few hands, rarely bets without a strong one. Steal their blinds, believe their raises.',
            'TAG: few hands, played hard. The default winning style. Avoid marginal spots against them.',
          ],
          [
            'Loose',
            'Calling Station / Fish: plays and calls too much. Value bet thinly and often, and almost never bluff.',
            'LAG / Maniac: plays many hands and keeps betting. Call down lighter, and let them bluff into your strong hands.',
          ],
        ]}
      />

      <GuideH2 id="stats">Reading the stats</GuideH2>
      <GuideP>
        Tracking software sums this up in two numbers. <strong>VPIP</strong> is how often a player puts money in before the flop
        by calling, limping or raising. Blinds alone don't count.<Cite n={VPIP} /> <strong>PFR</strong> is how often they raise.
      </GuideP>
      <GuideP>
        The difference between them, sometimes called "the gap", is how often they just call. A player at VPIP 20, PFR 12 calls
        or limps 8% of the time. Someone at VPIP 30, PFR 10 has a big gap: expect them to call your raises often and defend
        their blinds.<Cite n={HUD} /> Against callers like that, raise strong hands bigger and bluff less.
      </GuideP>
      <GuideNote>
        Every NPC here has these numbers in the player picker. Compare their VPIP and PFR before a session and you'll know which
        corner each one sits in before the first hand.
      </GuideNote>

      <GuideH2 id="ranges">Thinking in ranges</GuideH2>
      <GuideP>
        Don't try to put a player on one exact hand. Start from every hand they could hold, their range, and remove hands with
        each action.<Cite n={STRATEGY} /> A tight player who finally enters a pot holds a stronger-than-average hand.<Cite n={STRATEGY} /> A raise from
        under the gun means a narrower range than a raise from the button.
      </GuideP>
      <GuideP>
        This is the fundamental theorem in practice. The closer your guess is to their real cards, the closer your play gets
        to how you'd play if you could see them.<Cite n={[FTOP, SKLANSKY]} />
      </GuideP>

      <GuideH2 id="your-image">Your own table image</GuideH2>
      <GuideP>
        Your opponents are reading you too. Your <strong>table image</strong> is how they see your play.<Cite n={STRATEGY} /> If
        you've been caught bluffing, your next big bet is more likely to be called, so lean towards value. If you've folded for an
        hour, a bluff is more likely to work. Playing out of character uses that image to make them misjudge your hand.
        <Cite n={STRATEGY} />
      </GuideP>

      <Sources list={SOURCES} />
    </>
  );
}

export const readingGuide: Guide = {
  slug: 'reading-opponents',
  title: 'Reading Opponents',
  description: 'Player types, what VPIP and PFR reveal, thinking in ranges, and your own table image.',
  sections: [
    { id: 'two-axes', title: 'Two questions' },
    { id: 'stats', title: 'Reading the stats' },
    { id: 'ranges', title: 'Thinking in ranges' },
    { id: 'your-image', title: 'Your table image' },
    { id: 'sources', title: 'Sources' },
  ],
  Content,
};
