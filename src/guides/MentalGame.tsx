import type { Guide } from './registry';
import { SRC } from './sources';
import { Cite, GuideH2, GuideNote, GuideP, GuideUl, Sources } from './ui';

const SOURCES = [SRC.tilt, SRC.tendler, SRC.ftop, SRC.upswingRfi, SRC.sklansky];
const TILT = 1, TENDLER = 2, FTOP = 3, RFI = 4, SKLANSKY = 5;

function Content() {
  return (
    <>
      <GuideP>
        Knowing the right play is half the game. The other half is still making it after three bad beats in a row.
      </GuideP>

      <GuideH2 id="what-tilt-is">What tilt is</GuideH2>
      <GuideP>
        Tilt is playing worse because of frustration, usually by becoming too aggressive. The word comes from pinball machines
        that freeze when shaken.<Cite n={TILT} /> It isn't only for beginners. Many professionals still call it a leak in their
        game.<Cite n={TILT} />
      </GuideP>

      <GuideH2 id="causes">What sets it off</GuideH2>
      <GuideUl>
        <li>
          <strong>Losing, especially to a bad beat:</strong> getting your chips in as the favourite and losing anyway.
          <Cite n={TILT} />
        </li>
        <li>
          <strong>Other players:</strong> bad manners at the table wear you down.<Cite n={TILT} />
        </li>
        <li>
          <strong>Winning:</strong> "winner's tilt" after a lucky run brings the same overconfidence and loose play as losing.
          <Cite n={TILT} />
        </li>
      </GuideUl>

      <GuideH2 id="variance">Expect to lose with good hands</GuideH2>
      <GuideP>
        Even the best starting hand loses often. Aces against five opponents who each hold a top-20% hand win only about 53% of
        the time.<Cite n={RFI} /> A 4:1 favourite still loses one time in five, and over thousands of hands that happens a lot.
      </GuideP>
      <GuideP>
        By Sklansky's fundamental theorem, you profit when opponents play differently from how they would if they could see your
        cards, and that's true whichever card comes next.<Cite n={[FTOP, SKLANSKY]} /> The money a good decision makes shows up
        over many hands, not in the one in front of you.
      </GuideP>

      <GuideH2 id="handling-it">Handling it</GuideH2>
      <GuideUl>
        <li>
          <strong>Judge decisions, not outcomes.</strong> Bad beats come from variance, not bad strategy, and deserve little
          thought.<Cite n={TILT} />
        </li>
        <li>
          <strong>Learn your triggers.</strong> Tendler treats tilt as a set of learnable patterns. Write down what set you off and
          what you did next, so you can spot it early next time.<Cite n={TENDLER} />
        </li>
        <li>
          <strong>Take a break.</strong> If you notice you're forcing hands or calling to "see if they had it", stop for a few
          minutes. Pause on the table does exactly that.
        </li>
        <li>
          <strong>Use it against others.</strong> Putting an opponent on tilt, or noticing when they are, is part of the game.
          <Cite n={TILT} /> A tilted player usually turns too aggressive, so call them down lighter.
        </li>
      </GuideUl>
      <GuideNote>
        The NPCs here tilt too. Each has a <strong>Tilt</strong> slider. After a loss of 25 big blinds or more, they play more
        hands, raise more and bluff more until they cool off over the next few hands. Phil Hellmuth and Mike Matusow are set
        high.
      </GuideNote>

      <Sources list={SOURCES} />
    </>
  );
}

export const mentalGameGuide: Guide = {
  slug: 'mental-game',
  title: 'The Mental Game',
  description: 'What tilt is, what sets it off, why good hands lose, and how to keep playing your best.',
  sections: [
    { id: 'what-tilt-is', title: 'What tilt is' },
    { id: 'causes', title: 'What sets it off' },
    { id: 'variance', title: 'Expect to lose' },
    { id: 'handling-it', title: 'Handling it' },
    { id: 'sources', title: 'Sources' },
  ],
  Content,
};
