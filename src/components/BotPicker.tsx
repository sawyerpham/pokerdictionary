// Choosing an opponent, chess.com "Play Bots" style: big cards grouped Pros / Entertainers / Archetypes with
// their style and description. A tap seats the player. Random makes a new player; Custom opens the
// sliders, and custom players are the only ones you can edit.
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { blankProfile, KNOBS, PRESETS, type Profile } from '../engine/profiles';
import { findProfile, useSettings } from '../state/settingsStore';
import { Group, Row } from './RuleControls';

const isEmoji = (a: string) => !/^[A-Z0-9]{1,3}$/.test(a);

export function Avatar({ p, size = 32 }: { p: Profile; size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{
        width: size,
        height: size,
        fontSize: isEmoji(p.avatar) ? size * 0.5 : size * 0.36,
        background: isEmoji(p.avatar) ? 'rgb(255 255 255 / 0.12)' : p.color,
      }}
    >
      {p.avatar}
    </span>
  );
}

/** "NPC 3" -> "N3", "Lucky Lou" -> "LL". */
const initials = (name: string) =>
  (name.match(/[A-Za-z0-9]+/g) ?? ['?']).map((w, _i, all) => (all.length === 1 ? w.slice(0, 2) : /^\d+$/.test(w) ? w : w[0])).join('').toUpperCase().slice(0, 3);

const styleLine = (p: Profile) => `VPIP ${p.vpip} · PFR ${p.pfr} · Agg ${p.aggression} · Bluff ${p.bluff}`;

/** A modal sheet: native <dialog> for focus trapping and Esc. */
function Sheet({
  title,
  onClose,
  action,
  wide,
  children,
}: {
  title: string;
  onClose: () => void;
  action?: { label: string; run: () => void };
  wide?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className={`no-scrollbar m-auto max-h-[92vh] overflow-y-auto rounded-[14px] bg-[var(--bg-main)] p-0 text-[var(--text-primary)] backdrop:bg-black/60 backdrop:backdrop-blur-sm ${
        wide ? 'w-[min(64rem,calc(100%-1.5rem))]' : 'w-[min(40rem,calc(100%-1.5rem))]'
      }`}
    >
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--line)] bg-[rgb(22_22_24/0.8)] px-4 py-2 backdrop-blur-xl">
        <button type="button" onClick={() => ref.current?.close()} className="min-h-11 min-w-16 text-left text-[17px] text-[var(--accent)]">
          Cancel
        </button>
        <span className="text-headline">{title}</span>
        <span className="min-w-16 text-right">
          {action && (
            <button type="button" onClick={action.run} className="min-h-11 text-[17px] font-semibold text-[var(--accent)]">
              {action.label}
            </button>
          )}
        </span>
      </div>
      {children}
    </dialog>
  );
}

/** Every slider of a custom player, with what each one means. `onDone` gets the saved player. */
function Editor({ draft, isNew, onDone, onCancel }: { draft: Profile; isNew: boolean; onDone: (p: Profile) => void; onCancel: () => void }) {
  const [p, setP] = useState(draft);
  const save = useSettings((s) => s.saveProfile);
  const remove = useSettings((s) => s.deleteProfile);
  const set = (patch: Partial<Profile>) => setP((cur) => ({ ...cur, ...patch, pfr: Math.min(patch.pfr ?? cur.pfr, patch.vpip ?? cur.vpip) }));
  const randomize = () =>
    set(Object.fromEntries(KNOBS.map((k) => [k.key, Math.round((k.min + Math.random() * (k.max - k.min)) / k.step) * k.step])));
  const textInput = 'min-w-0 flex-1 rounded-[8px] bg-[var(--bg-second)] px-2.5 py-1.5 text-[17px] outline-none ring-1 ring-[var(--line)] focus:ring-[var(--accent)]';

  return (
    <Sheet
      title={isNew ? 'Custom player' : 'Edit player'}
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
      <div className="space-y-6 p-4">
        <div className="flex items-center gap-3">
          <Avatar p={p} size={56} />
          <div className="min-w-0 flex-1">
            <p className="text-title-2 truncate">{p.name || 'Unnamed'}</p>
            <p className="text-footnote text-[var(--text-muted)] tabular-nums">{styleLine(p)}</p>
          </div>
        </div>
        <Group title="Name">
          <Row title="Name">
            <input
              aria-label="Name"
              value={p.name}
              maxLength={24}
              onChange={(e) => set({ name: e.target.value, avatar: initials(e.target.value) })}
              className={textInput}
            />
          </Row>
        </Group>
        {[...new Set(KNOBS.map((k) => k.group))].map((g) => (
          <Group key={g} title={g}>
            {KNOBS.filter((k) => k.group === g).map((k) => (
              <div key={k.key} className="px-4 py-2.5 [&+&]:border-t [&+&]:border-[var(--line)]">
                <div className="flex items-baseline justify-between">
                  <label htmlFor={k.key} className="text-[15px]">
                    {k.label}
                  </label>
                  <span className="text-[15px] text-[var(--text-muted)] tabular-nums">
                    {p[k.key]}
                    {k.unit ? ` ${k.unit}` : ''}
                  </span>
                </div>
                <p className="text-footnote mb-1 text-[var(--text-muted)]">{k.help}</p>
                <input
                  id={k.key}
                  type="range"
                  min={k.min}
                  max={k.max}
                  step={k.step}
                  value={p[k.key]}
                  onChange={(e) => set({ [k.key]: Number(e.target.value) })}
                  className="w-full accent-[var(--accent)]"
                />
              </div>
            ))}
          </Group>
        ))}
        <div className="overflow-hidden rounded-[10px] bg-[var(--bg-second)] [&>button+button]:border-t [&>button+button]:border-[var(--line)]">
          <button type="button" onClick={randomize} className="min-h-11 w-full px-4 text-left text-[17px] text-[var(--accent)]">
            Randomize style
          </button>
          {!isNew && (
            <button
              type="button"
              onClick={() => {
                remove(p.id);
                onCancel();
              }}
              className="min-h-11 w-full px-4 text-left text-[17px] text-rose-400"
            >
              Delete player
            </button>
          )}
        </div>
      </div>
    </Sheet>
  );
}

/** One big card: avatar, name, description, style numbers. Tapping it seats the player. */
function Card({
  title,
  blurb,
  stats,
  avatar,
  seated,
  onPick,
  onEdit,
}: {
  title: string;
  blurb: string;
  stats?: string;
  avatar: ReactNode;
  seated?: boolean;
  onPick: () => void;
  onEdit?: () => void;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        disabled={seated}
        onClick={onPick}
        className="flex h-full w-full gap-3 rounded-[14px] bg-[var(--bg-second)] p-4 text-left transition-colors hover:bg-[var(--bg-third)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[var(--bg-second)]"
      >
        {avatar}
        <span className="min-w-0 flex-1">
          <span className="text-headline block truncate pr-10">{title}</span>
          <span className="text-footnote mt-0.5 block text-[var(--text-muted)]">{seated ? 'At the table' : blurb}</span>
          {stats && <span className="text-caption mt-1.5 block text-[var(--text-muted)] tabular-nums">{stats}</span>}
        </span>
      </button>
      {onEdit && (
        <button type="button" onClick={onEdit} className="absolute top-3 right-3 min-h-8 px-2 text-[15px] text-[var(--accent)]">
          Edit
        </button>
      )}
    </div>
  );
}

const GRID = 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3';

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
    <Card
      key={p.id}
      title={p.name}
      blurb={p.blurb}
      stats={styleLine(p)}
      avatar={<Avatar p={p} size={48} />}
      seated={taken.has(p.id)}
      onPick={() => pick(p.id)}
      onEdit={onEdit}
    />
  );

  return (
    <Sheet title={current ? `Replace ${findProfile(current, custom).name}` : 'Add player'} onClose={onClose} wide>
      <div className="space-y-6 p-4 sm:p-5">
        <section className={GRID}>
          <Card
            title="Random"
            blurb="A new player with a random name and style."
            avatar={<span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10 text-2xl">🎲</span>}
            onPick={() => pick()}
          />
          <Card
            title="Custom"
            blurb="Build your own with every style slider."
            avatar={<span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10 text-2xl">🛠️</span>}
            onPick={() => setEditing({ draft: blankProfile(nextNpc), isNew: true })}
          />
          {mine.map((p) => card(p, () => setEditing({ draft: p, isNew: false })))}
        </section>
        {(['Pros', 'Entertainers', 'Archetypes'] as const).map((g) => (
          <section key={g}>
            <h3 className="text-footnote mb-2 px-1 text-[var(--text-muted)] uppercase">{g}</h3>
            <div className={GRID}>
              {PRESETS.filter((p) => p.group === g).map((p) => card(p))}
            </div>
          </section>
        ))}
      </div>
    </Sheet>
  );
}
