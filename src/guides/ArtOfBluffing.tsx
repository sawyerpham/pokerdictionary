import type { Guide } from './registry';
import { SRC } from './sources';
import { BluffChart } from './diagrams';
import { Cite, GuideFormula, GuideH2, GuideH3, GuideNote, GuideP, GuideTable, GuideUl, Sources } from './ui';

const SOURCES = [SRC.bluff, SRC.sklansky, SRC.mop, SRC.ftop, SRC.potOdds, SRC.strategy, SRC.upswingSizing, SRC.hud];
const BLUFF = 1, SKLANSKY = 2, MOP = 3, FTOP = 4, POTODDS = 5, STRATEGY = 6, SIZING = 7, HUD = 8;

// For a pot of 1 and a bet of b: a bluff needs folds b/(1+b); the caller needs equity b/(1+2b); the caller must defend 1/(1+b).
const ROWS = [
  ['⅓ pot', 1 / 3],
  ['½ pot', 1 / 2],
  ['⅔ pot', 2 / 3],
  ['Pot', 1],
  ['2× pot', 2],
].map(([label, b]) => {
  const x = b as number;
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  return [label as string, pct(x / (1 + x)), pct(x / (1 + 2 * x)), pct(1 / (1 + x))];
});

function Content() {
  return (
    <>
      <GuideP>
        A bluff is a bet or raise with a hand you don't think is best, meant to make a better hand fold.<Cite n={BLUFF} /> Bluffs
        win pots you'd lose, but their main job is protecting your strong hands. If you never bluff, nobody pays you off.
      </GuideP>

      <GuideH2 id="why-it-works">Why bluffing works</GuideH2>
      <GuideP>
        Poker is a game of hidden information. By Sklansky's fundamental theorem, you gain whenever an opponent plays differently
        from how they would if they could see your cards.<Cite n={[FTOP, SKLANSKY]} /> A successful bluff is the clearest
        example: they fold the best hand, a mistake they'd never make with your cards face up.
      </GuideP>
      <GuideP>
        Bluffing also keeps your bets believable. If you only bet with strong hands, observant opponents call only when they can
        beat them and fold everything else. Occasional bluffs disguise your strong hands as well as your weak ones.
        <Cite n={BLUFF} />
      </GuideP>

      <GuideH2 id="the-math">The math of a bluff</GuideH2>
      <GuideH3>How often it has to work</GuideH3>
      <GuideP>A pure bluff (no chance to win if called) risks the bet to win the pot. It breaks even when:</GuideP>
      <GuideFormula>needed fold rate = bet ÷ (pot + bet)</GuideFormula>
      <GuideP>A half-pot bluff has to work one time in three. A pot-sized bluff has to work half the time.</GuideP>
      <GuideH3>How often to bluff</GuideH3>
      <GuideP>
        Sklansky: "the optimal bluffing strategy is to bluff in such a way that the chances against your bluffing are identical
        to the pot odds your opponent is getting."<Cite n={[BLUFF, SKLANSKY]} /> On the river, a caller risks the bet to win the
        pot plus your bet, so they need:
      </GuideP>
      <GuideFormula>caller's needed equity = bet ÷ (pot + 2 × bet)</GuideFormula>
      <GuideP>
        If that same share of your river bets are bluffs, calling and folding earn your opponent the same.<Cite n={[POTODDS, MOP]} />{' '}
        Bluffs at that frequency roughly break even on their own. Their profit comes from the calls your value bets now get.
        <Cite n={[BLUFF, MOP]} />
      </GuideP>
      <GuideH3>How often to call</GuideH3>
      <GuideP>
        Turned around: if you fold more than the bluff's needed fold rate, any two cards can bluff you profitably. The share of
        your range you have to keep against a bet is the <strong>minimum defense frequency</strong>:
      </GuideP>
      <GuideFormula>minimum defense = pot ÷ (pot + bet)</GuideFormula>
      <BluffChart />
      <GuideTable rows={[['Bet size', 'Bluff must work', 'Bluffs in a balanced river bet', 'Caller must defend'], ...ROWS]} />
      <GuideNote>
        These numbers are for the river, where no cards are left. Earlier, a bluff that gets called can still improve, which
        changes the math (see semi-bluffs). They're a baseline for unknown opponents. Against real players, how often{' '}
        <em>they</em> fold matters more.<Cite n={MOP} />
      </GuideNote>

      <GuideH2 id="semi-bluffs">Semi-bluffs</GuideH2>
      <GuideP>
        A semi-bluff is a bet with a hand that's behind but can improve, like a flush or straight draw. It wins two ways: everyone
        folds now, or you hit and win at showdown.<Cite n={[BLUFF, SKLANSKY]} /> Because of that second way, a semi-bluff needs
        fewer folds than a pure bluff to be profitable. That's why most good bluffs on the flop and turn are draws.
      </GuideP>

      <GuideH2 id="choosing-bluffs">Choosing which hands to bluff</GuideH2>
      <GuideUl>
        <li>
          <strong>Hands with equity first.</strong> Draws make better bluffs than hands with nothing, especially before the river.
          <Cite n={BLUFF} />
        </li>
        <li>
          <strong>Hands that can't win by checking.</strong> On the river, bluff with your weakest hands, not with hands that might
          win a showdown. Betting a medium hand only gets called by better ones.
        </li>
        <li>
          <strong>Tell a consistent story.</strong> Your bet has to make sense with how you played the earlier streets. A sudden
          river shove from someone who checked and called all the way rarely looks like a strong hand.
        </li>
        <li>
          <strong>Boards that favour you.</strong> When only your range can hold the strongest hands, big bets and overbets work
          best, as bluffs and for value.<Cite n={SIZING} />
        </li>
        <li>
          <strong>Position helps.</strong> Acting last, you see a check before you decide, and you choose when the bluff happens.
          <Cite n={STRATEGY} />
        </li>
      </GuideUl>

      <GuideH2 id="who-to-bluff">Who to bluff, and who not to</GuideH2>
      <GuideUl>
        <li>
          <strong>Bluff tight players.</strong> They fold too often to make you pay.
        </li>
        <li>
          <strong>Don't bluff loose players.</strong> Bluffs and semi-bluffs work less well against opponents who seldom fold.
          <Cite n={STRATEGY} /> Value bet them instead.
        </li>
        <li>
          <strong>Watch the VPIP–PFR gap.</strong> A big gap (say VPIP 30, PFR 10) marks someone who calls a lot before the flop
          and is likely to keep calling.<Cite n={HUD} />
        </li>
        <li>
          <strong>Fewer opponents, more bluffs.</strong> Every extra player in the pot is another chance someone holds a hand
          they won't fold.
        </li>
      </GuideUl>
      <GuideNote>
        On this table every NPC has a <strong>Bluffing</strong> and a <strong>Calling down</strong> slider. Check them in the
        player picker: bluff the low Calling down players, and keep value betting the Calling Station types.
      </GuideNote>

      <Sources list={SOURCES} />
    </>
  );
}

export const bluffingGuide: Guide = {
  slug: 'art-of-bluffing',
  title: 'The Art of Bluffing',
  description: 'Why bluffs work, how often they need to, which hands to bluff with, and who to bluff.',
  sections: [
    { id: 'why-it-works', title: 'Why bluffing works' },
    { id: 'the-math', title: 'The math of a bluff' },
    { id: 'semi-bluffs', title: 'Semi-bluffs' },
    { id: 'choosing-bluffs', title: 'Choosing bluffs' },
    { id: 'who-to-bluff', title: 'Who to bluff' },
    { id: 'sources', title: 'Sources' },
  ],
  Content,
};
