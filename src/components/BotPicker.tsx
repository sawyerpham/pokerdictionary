// Choosing an opponent as picking a card: each player is a playing-card style trading card with a rank and
// suit, portrait, name banner and stat bars. A tap seats them. Random is a face-down card; Custom opens the
// sliders, and custom players are the only ones you can edit.
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { blankProfile, KNOBS, PRESETS, type Profile } from '../engine/profiles';
import { findProfile, useSettings } from '../state/settingsStore';

const isEmoji = (a: string) => !/^[A-Z0-9]{1,3}$/.test(a);
/** "NPC 3" -> "N3", "Lucky Lou" -> "LL". */
const initials = (name: string) =>
  (name.match(/[A-Za-z0-9]+/g) ?? ['?']).map((w, _i, all) => (all.length === 1 ? w.slice(0, 2) : /^\d+$/.test(w) ? w : w[0])).join('').toUpperCase().slice(0, 3);

const SUIT_OF: Record<Profile['group'], string> = { Pros: '♠', Entertainers: '♥', Archetypes: '♦', Custom: '♣' };
const RANK_ORDER = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];
/** Every player keeps one card: the suit is their group, the rank their place in it. */
export function cardOf(p: Profile, custom: Profile[] = []) {
  const list = p.group === 'Custom' ? custom.filter((c) => c.group === 'Custom') : PRESETS.filter((x) => x.group === p.group);
  const i = Math.max(0, list.findIndex((x) => x.id === p.id));
  const suit = SUIT_OF[p.group];
  return { rank: RANK_ORDER[i % RANK_ORDER.length], suit, ink: suit === '♥' || suit === '♦' ? '#c81e4a' : '#18181b' };
}

const STATS: [string, 'vpip' | 'pfr' | 'aggression' | 'bluff'][] = [
  ['VPIP', 'vpip'],
  ['PFR', 'pfr'],
  ['AGG', 'aggression'],
  ['BLUFF', 'bluff'],
];

function Portrait({ p, size }: { p: Profile; size: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full font-black text-white shadow-[0_3px_8px_rgb(0_0_0/0.35)] ring-4 ring-white"
      style={{ width: size, height: size, fontSize: isEmoji(p.avatar) ? size * 0.5 : size * 0.36, background: isEmoji(p.avatar) ? '#e4e0d4' : p.color }}
    >
      {p.avatar}
    </span>
  );
}

/** The corner index of a playing card. */
function Corner({ rank, suit, ink, flip }: { rank: string; suit: string; ink: string; flip?: boolean }) {
  return (
    <span className={`absolute flex flex-col items-center leading-none font-black ${flip ? 'right-2 bottom-2 rotate-180' : 'top-2 left-2'}`} style={{ color: ink }} aria-hidden>
      <span className="text-[17px]">{rank}</span>
      <span className="text-[15px]">{suit}</span>
    </span>
  );
}

const FACE =
  'relative flex h-full min-h-64 w-full flex-col items-center rounded-[16px] bg-[#f7f4ea] px-3 pt-3 pb-9 text-center text-zinc-900 shadow-[0_6px_14px_rgb(0_0_0/0.45),inset_0_-4px_0_rgb(0_0_0/0.08)]';
const DEALT = 'transition-transform duration-150 hover:-translate-y-1.5 hover:-rotate-1 active:translate-y-0 motion-reduce:transform-none';

function PlayerCard({ p, custom, seated, onPick, onEdit }: { p: Profile; custom: Profile[]; seated: boolean; onPick: () => void; onEdit?: () => void }) {
  const c = cardOf(p, custom);
  return (
    <div className="relative">
      <button type="button" disabled={seated} onClick={onPick} className={`${FACE} ${seated ? 'cursor-not-allowed opacity-45 grayscale' : DEALT}`}>
        <Corner {...c} />
        <Corner {...c} flip />
        <span className="mt-3">
          <Portrait p={p} size={64} />
        </span>
        <span
          className="-mx-3 mt-2 block self-stretch py-1 text-[13px] leading-tight font-black tracking-wide text-white uppercase [text-shadow:0_1px_2px_rgb(0_0_0/0.6)]"
          style={{ background: `color-mix(in srgb, ${p.color} 75%, #111)` }}
        >
          {p.name}
        </span>
        <span className="mt-1.5 line-clamp-3 min-h-[3.1rem] text-[12px] leading-tight text-zinc-600">{p.blurb}</span>
        <span className="mt-auto w-full space-y-0.5 px-3">
          {STATS.map(([label, key]) => (
            <span key={key} className="flex items-center gap-1.5 text-[11px] font-bold">
              <span className="w-10 text-left text-zinc-500">{label}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/10">
                <span className="block h-full rounded-full" style={{ width: `${p[key]}%`, background: c.ink }} />
              </span>
              <span className="w-5 text-right tabular-nums">{p[key]}</span>
            </span>
          ))}
        </span>
        {seated && (
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 rounded-md border-4 border-zinc-900 bg-[#f7f4ea] px-3 py-1 text-[17px] font-black tracking-widest">
            SEATED
          </span>
        )}
      </button>
      {onEdit && (
        <button type="button" onClick={onEdit} className="hit absolute top-2 right-2 rounded-full bg-zinc-900 px-2.5 py-0.5 text-[12px] font-bold text-white">
          Edit
        </button>
      )}
    </div>
  );
}

/** A modal sheet on dark felt: native <dialog> for focus trapping and Esc. */
function Sheet({ title, onClose, action, wide, children }: { title: string; onClose: () => void; action?: { label: string; run: () => void }; wide?: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className={`no-scrollbar m-auto max-h-[92vh] overflow-y-auto rounded-[22px] border-[6px] border-[#2b2118] bg-[radial-gradient(ellipse_at_50%_0%,#16263f_0%,#0b1220_70%)] p-0 text-[var(--text-primary)] shadow-[0_0_0_2px_rgb(255_255_255/0.08),0_30px_80px_rgb(0_0_0/0.7)] backdrop:bg-black/70 ${
        wide ? 'w-[min(68rem,calc(100%-1rem))]' : 'w-[min(40rem,calc(100%-1rem))]'
      }`}
    >
      <div className="sticky top-0 z-20 flex items-center justify-between gap-3 bg-[#0e1828] px-4 py-3 shadow-[0_4px_12px_rgb(0_0_0/0.35)]">
        <span className="text-[20px] font-black tracking-wide uppercase">{title}</span>
        <span className="flex items-center gap-2">
          {action && (
            <button type="button" onClick={action.run} className="min-h-11 rounded-full bg-[var(--accent)] px-5 text-[15px] font-black uppercase">
              {action.label}
            </button>
          )}
          <button type="button" onClick={() => ref.current?.close()} aria-label="Cancel" className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--fill)] text-[20px] font-black">
            ✕
          </button>
        </span>
      </div>
      {children}
    </dialog>
  );
}

/** Every slider of a custom player, laid out on their card. `onDone` gets the saved player. */
function Editor({ draft, isNew, onDone, onCancel }: { draft: Profile; isNew: boolean; onDone: (p: Profile) => void; onCancel: () => void }) {
  const [p, setP] = useState(draft);
  const save = useSettings((s) => s.saveProfile);
  const remove = useSettings((s) => s.deleteProfile);
  const custom = useSettings((s) => s.custom);
  const set = (patch: Partial<Profile>) => setP((cur) => ({ ...cur, ...patch, pfr: Math.min(patch.pfr ?? cur.pfr, patch.vpip ?? cur.vpip) }));
  const randomize = () => set(Object.fromEntries(KNOBS.map((k) => [k.key, Math.round((k.min + Math.random() * (k.max - k.min)) / k.step) * k.step])));
  const c = cardOf({ ...p, group: 'Custom' }, custom);

  return (
    <Sheet
      title={isNew ? 'Build a player' : 'Edit player'}
      onClose={onCancel}
      action={{
        label: isNew ? 'Add' : 'Done',
        run: () => {
          const saved = { ...p, name: p.name.trim() || 'Custom player', group: 'Custom' as const, random: false };
          save(saved);
          onDone(saved);
        },
      }}
    >
      <div className="p-4">
        <div className="relative rounded-[16px] bg-[#f7f4ea] px-5 pt-5 pb-6 text-zinc-900 shadow-[0_6px_14px_rgb(0_0_0/0.45)]">
          <Corner {...c} />
          <div className="flex flex-col items-center gap-2">
            <Portrait p={p} size={72} />
            <input
              aria-label="Name"
              value={p.name}
              maxLength={24}
              onChange={(e) => set({ name: e.target.value, avatar: initials(e.target.value) })}
              className="w-full max-w-xs rounded-md border-2 border-zinc-900 bg-white px-3 py-1.5 text-center text-[17px] font-black uppercase"
            />
          </div>
          {[...new Set(KNOBS.map((k) => k.group))].map((g) => (
            <fieldset key={g} className="mt-5">
              <legend className="mb-1 w-full border-b-2 border-zinc-900 text-[13px] font-black tracking-widest uppercase">{g}</legend>
              {KNOBS.filter((k) => k.group === g).map((k) => (
                <div key={k.key} className="py-2">
                  <div className="flex items-baseline justify-between gap-3">
                    <label htmlFor={k.key} className="text-[15px] font-bold">
                      {k.label}
                    </label>
                    <span className="text-[17px] font-black tabular-nums" style={{ color: c.ink }}>
                      {p[k.key]}
                      {k.unit ? ` ${k.unit}` : ''}
                    </span>
                  </div>
                  <p className="text-[12px] leading-tight text-zinc-600">{k.help}</p>
                  <input id={k.key} type="range" min={k.min} max={k.max} step={k.step} value={p[k.key]} onChange={(e) => set({ [k.key]: Number(e.target.value) })} className="w-full accent-zinc-900" />
                </div>
              ))}
            </fieldset>
          ))}
        </div>
        <div className="mt-4 flex gap-3">
          <button type="button" onClick={randomize} className="min-h-11 flex-1 rounded-full bg-[var(--fill)] text-[15px] font-black uppercase">
            Randomize Style
          </button>
          {!isNew && (
            <button
              type="button"
              onClick={() => {
                remove(p.id);
                onCancel();
              }}
              className="min-h-11 flex-1 rounded-full bg-[var(--fill)] text-[15px] font-black text-rose-400 uppercase"
            >
              Delete Player
            </button>
          )}
        </div>
      </div>
    </Sheet>
  );
}

const GRID = 'grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5';

/** Pick the player for opponent `slot` (a slot past the end adds a seat). A tap seats them and closes. */
export function BotPicker({ slot, onClose }: { slot: number; onClose: () => void }) {
  const custom = useSettings((s) => s.custom);
  const opponents = useSettings((s) => s.opponents);
  const seat = useSettings((s) => s.seat);
  const [editing, setEditing] = useState<{ draft: Profile; isNew: boolean }>();
  const current = opponents[slot];
  const taken = new Set(opponents.filter((_, i) => i !== slot));
  const mine = custom.filter((c) => c.group === 'Custom' && !c.random);
  // Custom players are named NPC 1, NPC 2, ... by default.
  const nextNpc = 1 + Math.max(0, ...mine.map((c) => Number(/^NPC (\d+)$/.exec(c.name)?.[1] ?? 0)));
  const pick = (id?: string) => {
    seat(slot, id);
    onClose();
  };

  if (editing)
    return (
      <Editor
        draft={editing.draft}
        isNew={editing.isNew}
        onDone={(p) => (editing.isNew ? pick(p.id) : setEditing(undefined))}
        onCancel={() => setEditing(undefined)}
      />
    );

  const card = (p: Profile, onEdit?: () => void) => (
    <PlayerCard key={p.id} p={p} custom={custom} seated={taken.has(p.id)} onPick={() => pick(p.id)} onEdit={onEdit} />
  );

  return (
    <Sheet title={current ? `Swap out ${findProfile(current, custom).name}` : 'Deal in a player'} onClose={onClose} wide>
      <div className="space-y-7 p-4 sm:p-6">
        <section className={GRID}>
          {/* Face down: who you get is a surprise. */}
          <button type="button" onClick={() => pick()} className={`flex min-h-64 w-full rounded-[16px] bg-[#f7f4ea] p-2 shadow-[0_6px_14px_rgb(0_0_0/0.45)] ${DEALT}`}>
            <span className="flex flex-1 flex-col items-center justify-center gap-2 rounded-[11px] bg-[#0a5fd1] bg-[repeating-linear-gradient(45deg,rgb(255_255_255/0.14)_0_3px,transparent_3px_10px)] text-white">
              <span className="text-[56px] leading-none font-black">?</span>
              <span className="text-[17px] font-black tracking-widest uppercase">Random</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setEditing({ draft: blankProfile(nextNpc), isNew: true })}
            className={`flex min-h-64 w-full flex-col items-center justify-center gap-2 rounded-[16px] border-4 border-dashed border-[#f7f4ea]/60 text-[#f7f4ea] ${DEALT}`}
          >
            <span className="text-[56px] leading-none font-black">+</span>
            <span className="text-[17px] font-black tracking-widest uppercase">Custom</span>
            <span className="px-4 text-[12px] text-[#f7f4ea]/70">Build your own with every style slider.</span>
          </button>
          {mine.map((p) => card(p, () => setEditing({ draft: p, isNew: false })))}
        </section>
        {(['Pros', 'Entertainers', 'Archetypes'] as const).map((g) => (
          <section key={g}>
            <h3 className="mb-3 flex items-center gap-2 text-[15px] font-black tracking-[0.2em] text-white uppercase">
              <span className="text-[20px]">{SUIT_OF[g]}</span>
              {g}
              <span className="h-px flex-1 bg-white/20" />
            </h3>
            <div className={GRID}>{PRESETS.filter((p) => p.group === g).map((p) => card(p))}</div>
          </section>
        ))}
      </div>
    </Sheet>
  );
}
