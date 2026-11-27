import { useEffect, useState, type ReactNode } from 'react';
import { handName } from '../engine/cards';
import { parseHands, type Hand } from '../engine/history';
import { reviewFlops, type Reviewed } from './flopReview';
import { BUTTON, CardText, PANEL } from './ui';

// Rough ranges many winning six-max players fall in. Rules of thumb, not rules: outside one is worth a look.
const STATS: { name: string; what: string; of: (h: Hand) => boolean | undefined; lo: number; hi: number }[] = [
  { name: 'VPIP', what: 'Put money in preflop by choice', of: (h) => h.vpip, lo: 20, hi: 28 },
  { name: 'PFR', what: 'Raised preflop', of: (h) => h.pfr, lo: 16, hi: 23 },
  { name: '3-bet', what: 'Re-raised when facing one raise', of: (h) => h.threeBet, lo: 6, hi: 11 },
  { name: 'Fold to 3-bet', what: 'Folded when your raise was re-raised', of: (h) => h.foldTo3Bet, lo: 40, hi: 60 },
  { name: 'C-bet', what: 'Bet the flop after raising preflop, when checked to', of: (h) => h.cbet, lo: 45, hi: 70 },
  { name: 'Went to showdown', what: 'Of the flops you saw', of: (h) => (h.sawFlop ? h.showdown : undefined), lo: 24, hi: 32 },
  { name: 'Won at showdown', what: 'Of your showdowns', of: (h) => (h.showdown ? h.wonShowdown : undefined), lo: 48, hi: 56 },
];
const ORDER = ['UTG', 'UTG+1', 'UTG+2', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
const MIN = 30; // fewer chances than this and a stat says little
const signed = (x: number, digits = 1) => `${x >= 0 ? '+' : '−'}${Math.abs(x).toFixed(digits)}`;

function Row({ label, detail, value, flag }: { label: ReactNode; detail: string; value: string; flag?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-[var(--line)] py-2 last:border-0">
      <div className="min-w-0">
        <p className="text-[15px]">{label}</p>
        <p className="text-[13px] text-[var(--text-muted)]">{detail}</p>
      </div>
      <div className="text-right">
        <p className="text-[15px] tabular-nums">{value}</p>
        {flag && <p className="text-[13px] text-amber-300">{flag}</p>}
      </div>
    </div>
  );
}

/** Paste or upload hand histories: results, HUD stats with rough targets, and preflop choices checked against the charts. */
export function History() {
  const [text, setText] = useState('');
  const [hands, setHands] = useState<Hand[]>();
  const [reviewed, setReviewed] = useState<Reviewed[]>();
  useEffect(() => {
    setReviewed(undefined);
    if (hands?.some((h) => h.flop)) reviewFlops(hands).then(setReviewed, () => setReviewed([]));
  }, [hands]);

  const read = async (files: FileList | null) => {
    if (!files?.length) return;
    const all = await Promise.all([...files].map((f) => f.text()));
    setText('');
    setHands(parseHands(all.join('\n\n')));
  };

  const net = hands?.reduce((a, h) => a + h.net, 0) ?? 0;
  const rfi = hands?.filter((h) => h.rfi) ?? [];
  const loose = rfi.filter((h) => h.rfi!.raised && !h.rfi!.inChart);
  const tight = rfi.filter((h) => !h.rfi!.raised && h.rfi!.inChart);
  const limps = rfi.filter((h) => h.vpip && !h.rfi!.raised);
  const facing = hands?.filter((h) => h.facingOpen) ?? [];
  const facingMisses = facing.filter((h) => h.facingOpen!.loss >= 0.1);
  const habits = new Map<string, Hand[]>();
  for (const h of facingMisses) {
    const k = `${h.facingOpen!.chose} > ${h.facingOpen!.best}`;
    habits.set(k, [...(habits.get(k) ?? []), h]);
  }
  const positions = ORDER.map((p) => ({ p, hs: hands?.filter((h) => h.position === p) ?? [] })).filter((x) => x.hs.length);
  const cards = (h: Hand) => (
    <>
      <CardText card={h.hole[0]} />
      <CardText card={h.hole[1]} />
    </>
  );

  return (
    <>
      <section className={PANEL}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste hand histories here (PokerStars or GGPoker text format)…"
          rows={6}
          className="w-full rounded-[10px] bg-[var(--bg-third)] p-3 font-mono text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button type="button" disabled={!text.trim()} onClick={() => setHands(parseHands(text))} className={`${BUTTON} bg-[var(--accent)] text-white`}>
            Read hands
          </button>
          <label className={`${BUTTON} cursor-pointer bg-[var(--bg-third)]`}>
            Open files…
            <input type="file" accept=".txt,text/plain" multiple className="sr-only" onChange={(e) => read(e.target.files)} />
          </label>
          <span className="text-[13px] text-[var(--text-muted)]">Read in your browser. Nothing is uploaded.</span>
        </div>
      </section>

      {hands && hands.length === 0 && (
        <section className={`${PANEL} mt-4`}>
          <p className="text-[15px] text-rose-400">No hands found. Paste the hand history text itself, starting with a line like “PokerStars Hand #…” or “Poker Hand #…”.</p>
        </section>
      )}

      {hands && hands.length > 0 && (
        <>
          <section className={`${PANEL} mt-4`}>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div>
                <p className="text-[13px] text-[var(--text-muted)]">Hands</p>
                <p className="text-title-2 tabular-nums">{hands.length}</p>
              </div>
              <div>
                <p className="text-[13px] text-[var(--text-muted)]">Won</p>
                <p className={`text-title-2 tabular-nums ${net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{signed(net)} bb</p>
              </div>
              <div>
                <p className="text-[13px] text-[var(--text-muted)]">Per 100 hands</p>
                <p className="text-title-2 tabular-nums">{signed((net / hands.length) * 100)} bb</p>
              </div>
            </div>
            {hands.length < 1000 && <p className="mt-2 text-[13px] text-[var(--text-muted)]">Results swing a lot: over a few thousand hands, luck still outweighs skill.</p>}
          </section>

          <section className={`${PANEL} mt-4`}>
            <h2 className="text-headline mb-1">Preflop, against the charts</h2>
            <Row
              label="Opened hands the chart folds"
              detail={loose.length ? loose.slice(0, 8).map((h) => `${h.position} ${handName(h.hole)}`).join(', ') : 'None'}
              value={`${loose.length} of ${rfi.length}`}
              flag={rfi.length >= MIN && loose.length / rfi.length > 0.05 ? 'Too loose' : undefined}
            />
            <Row
              label="Folded hands the chart opens"
              detail={tight.length ? tight.slice(0, 8).map((h) => `${h.position} ${handName(h.hole)}`).join(', ') : 'None'}
              value={`${tight.length} of ${rfi.length}`}
              flag={rfi.length >= MIN && tight.length / rfi.length > 0.05 ? 'Too tight' : undefined}
            />
            <Row label="Limped when folded to you" detail="The charts raise or fold" value={`${limps.length} of ${rfi.length}`} flag={limps.length > 0 ? 'Raise instead' : undefined} />
            <Row
              label="Facing one raise (six-handed)"
              detail={
                facing.length
                  ? `Worse than the chart by 0.1 bb or more ${facingMisses.length} time${facingMisses.length === 1 ? '' : 's'}, giving up ${facingMisses.reduce((a, h) => a + h.facingOpen!.loss, 0).toFixed(1)} bb`
                  : 'No hands like this yet'
              }
              value={`${facing.length - facingMisses.length} of ${facing.length} fine`}
            />
            {[...habits]
              .sort((a, b) => b[1].reduce((x, h) => x + h.facingOpen!.loss, 0) - a[1].reduce((x, h) => x + h.facingOpen!.loss, 0))
              .slice(0, 4)
              .map(([k, hs]) => {
                const [chose, best] = k.split(' > ');
                return (
                  <Row
                    key={k}
                    label={`${chose === 'Fold' ? 'Folding' : chose === 'Call' ? 'Calling' : '3-betting'} where ${best === '3-bet' ? 'a 3-bet' : best.toLowerCase()} was best`}
                    detail={hs.slice(0, 6).map((h) => `${h.facingOpen!.spot.replace('-', ' → ')} ${handName(h.hole)}`).join(', ')}
                    value={`${hs.reduce((a, h) => a + h.facingOpen!.loss, 0).toFixed(1)} bb`}
                  />
                );
              })}
          </section>

          <section className={`${PANEL} mt-4`}>
            <h2 className="text-headline mb-1">Flop review</h2>
            {(() => {
              const heads = hands.filter((h) => h.flop).length;
              if (!heads) return <p className="text-[15px] text-[var(--text-muted)]">No six-handed, heads-up flops yet: those are the ones the solver library can grade.</p>;
              if (!reviewed) return <p className="text-[15px] text-[var(--text-muted)]">Checking {heads} heads-up flops against the solver library…</p>;
              const graded = reviewed.flatMap((r) => r.decisions.filter((d) => !Number.isNaN(d.loss)).map((d) => ({ r, d })));
              const worst = [...graded].sort((a, b) => b.d.loss - a.d.loss).slice(0, 8);
              const fmt = (a: string) => a.split(':')[0].replace('AllIn', 'All-in').toLowerCase();
              return (
                <>
                  <Row
                    label="Flop decisions graded"
                    detail={`${reviewed.length} of your ${heads} heads-up flops are in the library (it covers ${reviewed.length ? 'these pots and flops' : 'common pots and a sample of flops'})`}
                    value={String(graded.length)}
                  />
                  {graded.length > 0 && (
                    <Row
                      label="Given up per decision"
                      detail={`${graded.filter((g) => g.d.loss < 0.5).length} of ${graded.length} were the solver's best play or within 0.5% of the pot`}
                      value={`${(graded.reduce((a, g) => a + g.d.loss, 0) / graded.length).toFixed(1)}% of the pot`}
                    />
                  )}
                  {worst
                    .filter((w) => w.d.loss >= 0.5)
                    .map(({ r, d }, k) => (
                      <Row
                        key={k}
                        label={
                          <>
                            {cards(r.hand)} <span className="text-[var(--text-muted)]">on</span>{' '}
                            {r.hand.flop!.board.map((c) => (
                              <CardText key={c} card={c} />
                            ))}
                          </>
                        }
                        detail={`${r.hand.position}, ${r.pack.split('-')[0] === 'srp' ? 'single-raised' : r.pack.split('-')[0]} pot: you ${fmt(d.actions[d.chosen])}, the solver ${d.actions.map((a, k2) => `${fmt(a)} ${Math.round(d.freq[k2] * 100)}%`).join(', ')}`}
                        value={`${d.loss.toFixed(1)}%`}
                      />
                    ))}
                </>
              );
            })()}
          </section>

          <section className={`${PANEL} mt-4`}>
            <h2 className="text-headline mb-1">Stats</h2>
            {STATS.map((s) => {
              const chances = hands.filter((h) => s.of(h) !== undefined);
              const yes = chances.filter((h) => s.of(h)).length;
              const v = chances.length ? (yes / chances.length) * 100 : NaN;
              const flag =
                chances.length < MIN ? undefined : v < s.lo ? `Low (most winners ${s.lo}–${s.hi}%)` : v > s.hi ? `High (most winners ${s.lo}–${s.hi}%)` : undefined;
              return <Row key={s.name} label={s.name} detail={`${s.what} · ${chances.length} chance${chances.length === 1 ? '' : 's'}`} value={Number.isNaN(v) ? '–' : `${v.toFixed(0)}%`} flag={flag} />;
            })}
            <p className="mt-2 text-[13px] text-[var(--text-muted)]">
              Ranges are rough rules of thumb for six-max cash games, and a stat needs about {MIN} chances before it means much.
            </p>
          </section>

          <section className={`${PANEL} mt-4`}>
            <h2 className="text-headline mb-1">By position</h2>
            {positions.map(({ p, hs }) => {
              const won = hs.reduce((a, h) => a + h.net, 0);
              return <Row key={p} label={p} detail={`${hs.length} hands`} value={`${signed(won)} bb · ${signed((won / hs.length) * 100, 0)} per 100`} />;
            })}
            <p className="mt-2 text-[13px] text-[var(--text-muted)]">Everyone loses in the blinds: there you pay before seeing cards. Losing less there is the goal.</p>
          </section>

          <section className={`${PANEL} mt-4`}>
            <h2 className="text-headline mb-1">Biggest losses</h2>
            {[...hands]
              .sort((a, b) => a.net - b.net)
              .slice(0, 5)
              .filter((h) => h.net < 0)
              .map((h) => (
                <Row
                  key={h.id || h.net}
                  label={
                    <>
                      {cards(h)} <span className="text-[var(--text-muted)]">#{h.id}</span>
                    </>
                  }
                  detail={`${h.position}, ${h.players} players`}
                  value={`${signed(h.net)} bb`}
                />
              ))}
            <p className="mt-2 text-[13px] text-[var(--text-muted)]">Worth a second look, or a screenshot to the AI coach.</p>
          </section>
        </>
      )}
    </>
  );
}
