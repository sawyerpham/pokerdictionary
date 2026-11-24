import { useEffect, useRef, useState } from 'react';
import { blankProfile, DEFAULT_LINEUP, KNOBS, PRESETS, type Profile } from '../engine/profiles';
import { Group, Row, SectionHeader, Segmented } from '../components/RuleControls';
import { allProfiles, findProfile, useSettings } from '../state/settingsStore';

const GROUPS = ['Pros', 'Entertainers', 'Archetypes', 'Custom'] as const;
const isEmoji = (a: string) => !/^[A-Z]{1,3}$/.test(a);

function Avatar({ p, size = 32 }: { p: Profile; size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, fontSize: isEmoji(p.avatar) ? size * 0.5 : size * 0.36, background: isEmoji(p.avatar) ? 'rgb(255 255 255 / 0.12)' : p.color }}
    >
      {p.avatar}
    </span>
  );
}

const styleLine = (p: Profile) => `VPIP ${p.vpip} · PFR ${p.pfr} · Agg ${p.aggression} · Bluff ${p.bluff}`;

/** Full-screen sheet to edit every knob of one NPC. */
function Editor({ draft, onClose }: { draft: Profile; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [p, setP] = useState(draft);
  const custom = useSettings((s) => s.custom);
  const save = useSettings((s) => s.saveProfile);
  const remove = useSettings((s) => s.deleteProfile);
  const preset = PRESETS.find((x) => x.id === p.id);
  const edited = custom.some((c) => c.id === p.id);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  const set = (patch: Partial<Profile>) => setP((cur) => ({ ...cur, ...patch, pfr: Math.min(patch.pfr ?? cur.pfr, patch.vpip ?? cur.vpip) }));
  const done = () => {
    save(p);
    onClose();
  };
  const randomize = () =>
    set(Object.fromEntries(KNOBS.filter((k) => k.key !== 'buyInBb').map((k) => [k.key, Math.round((k.min + Math.random() * (k.max - k.min)) / k.step) * k.step])));
  const groups = [...new Set(KNOBS.map((k) => k.group))];
  const textInput = 'min-w-0 flex-1 rounded-[8px] bg-[var(--bg-main)] px-2.5 py-1.5 text-[17px] outline-none focus:ring-1 focus:ring-[var(--accent)]';

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="no-scrollbar m-auto max-h-[92vh] w-[min(36rem,calc(100%-2rem))] overflow-y-auto rounded-[14px] bg-[var(--bg-main)] p-0 text-[var(--text-primary)] backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--line)] bg-[rgb(22_22_24/0.8)] px-4 py-2 backdrop-blur-xl">
        <button type="button" onClick={() => ref.current?.close()} className="min-h-11 text-[17px] text-[var(--accent)]">
          Cancel
        </button>
        <span className="text-headline">{preset ? 'Edit preset' : 'Edit player'}</span>
        <button type="button" onClick={done} className="min-h-11 text-[17px] font-semibold text-[var(--accent)]">
          Done
        </button>
      </div>
      <div className="space-y-6 p-4">
        <div className="flex items-center gap-3">
          <Avatar p={p} size={56} />
          <div className="min-w-0 flex-1">
            <p className="text-title-2 truncate">{p.name || 'Unnamed'}</p>
            <p className="text-footnote text-[var(--text-muted)]">{styleLine(p)}</p>
          </div>
        </div>

        <Group title="Identity">
          <Row title="Name">
            <input aria-label="Name" value={p.name} maxLength={24} onChange={(e) => set({ name: e.target.value })} className={textInput} />
          </Row>
          <Row title="Avatar" hint="Initials or one emoji">
            <input aria-label="Avatar" value={p.avatar} maxLength={3} onChange={(e) => set({ avatar: e.target.value.toUpperCase() })} className={`${textInput} max-w-20 text-center`} />
          </Row>
          <Row title="Color">
            <input aria-label="Color" type="color" value={p.color} onChange={(e) => set({ color: e.target.value })} className="h-8 w-14 cursor-pointer rounded bg-transparent" />
          </Row>
          <Row title="Description">
            <input aria-label="Description" value={p.blurb} maxLength={90} onChange={(e) => set({ blurb: e.target.value })} className={textInput} />
          </Row>
        </Group>

        {groups.map((g) => (
          <Group key={g} title={g}>
            {KNOBS.filter((k) => k.group === g).map((k) => (
              <div key={k.key} className="px-4 py-2.5 [&+&]:border-t [&+&]:border-[var(--line)]">
                <div className="mb-1 flex items-baseline justify-between">
                  <label htmlFor={k.key} className="text-[15px]">
                    {k.label}
                  </label>
                  <span className="text-[15px] text-[var(--text-muted)] tabular-nums">
                    {p[k.key]}
                    {k.unit ? ` ${k.unit}` : ''}
                  </span>
                </div>
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
          <button
            type="button"
            onClick={() => {
              save({ ...p, id: blankProfile().id, group: 'Custom', name: `${p.name} copy`.slice(0, 24) });
              onClose();
            }}
            className="min-h-11 w-full px-4 text-left text-[17px] text-[var(--accent)]"
          >
            Save as new player
          </button>
          {preset && edited && (
            <button
              type="button"
              onClick={() => {
                remove(p.id);
                onClose();
              }}
              className="min-h-11 w-full px-4 text-left text-[17px] text-rose-400"
            >
              Reset to original
            </button>
          )}
          {!preset && custom.some((c) => c.id === p.id) && (
            <button
              type="button"
              onClick={() => {
                remove(p.id);
                onClose();
              }}
              className="min-h-11 w-full px-4 text-left text-[17px] text-rose-400"
            >
              Delete player
            </button>
          )}
        </div>
      </div>
    </dialog>
  );
}

export function PlayersPage() {
  const settings = useSettings((s) => s.settings);
  const custom = useSettings((s) => s.custom);
  const update = useSettings((s) => s.update);
  const [group, setGroup] = useState<(typeof GROUPS)[number]>('Pros');
  const [editing, setEditing] = useState<Profile>();
  const profiles = allProfiles(custom);
  const lineup = DEFAULT_LINEUP.map((d, i) => settings.lineup[i] ?? d);
  const seatTo = (slot: number, id: string) => update({ lineup: lineup.map((x, i) => (i === slot ? id : x)) });
  const shown = profiles.filter((p) => p.group === group);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:py-12">
      <h1 className="text-large-title mb-8 px-1">Players</h1>

      <div className="space-y-8">
        <section>
          <SectionHeader>At the table</SectionHeader>
          <div className="overflow-hidden rounded-[10px] bg-[var(--bg-second)]">
            {lineup.slice(0, settings.players).map((id, slot) => {
              const p = findProfile(id, custom);
              const spectateOnly = slot === settings.players - 1;
              return (
                <div key={slot} className="pl-4 [&+&>div]:border-t [&+&>div]:border-[var(--line)]">
                  <div className="flex min-h-14 items-center gap-3 py-2 pr-4">
                    <Avatar p={p} />
                    <div className="min-w-0 flex-1">
                      <p className="text-footnote text-[var(--text-muted)]">{spectateOnly ? 'Your seat, when spectating' : `Seat ${slot + 2}`}</p>
                      <select
                        aria-label={`Player in seat ${slot + 2}`}
                        value={id}
                        onChange={(e) => seatTo(slot, e.target.value)}
                        className="w-full max-w-64 truncate bg-transparent text-[17px] outline-none"
                      >
                        {GROUPS.map((g) => (
                          <optgroup key={g} label={g}>
                            {profiles
                              .filter((x) => x.group === g)
                              .map((x) => (
                                <option key={x.id} value={x.id} className="bg-[var(--bg-second)]">
                                  {x.name}
                                </option>
                              ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                    <button type="button" onClick={() => setEditing(p)} className="min-h-11 px-1 text-[15px] text-[var(--accent)]">
                      Edit
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-footnote mt-1.5 px-4 text-[var(--text-muted)]">Change the number of seats on the table with Players − / +.</p>
        </section>

        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
            <Segmented label="Library" value={group} options={GROUPS.map((g) => ({ value: g, label: g }))} onChange={setGroup} />
            <button type="button" onClick={() => setEditing(blankProfile())} className="min-h-11 px-2 text-[17px] text-[var(--accent)]">
              New player
            </button>
          </div>
          {shown.length === 0 ? (
            <p className="rounded-[10px] bg-[var(--bg-second)] p-8 text-center text-[15px] text-[var(--text-muted)]">
              Your players appear here. Create one, or edit a preset and save it as a new player.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {shown.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setEditing(p)}
                  className="flex gap-3 rounded-[14px] bg-[var(--bg-second)] p-4 text-left transition-colors hover:bg-[var(--bg-third)]"
                >
                  <Avatar p={p} size={40} />
                  <div className="min-w-0">
                    <p className="text-headline">
                      {p.name}
                      {custom.some((c) => c.id === p.id) && p.group !== 'Custom' && <span className="text-footnote ml-1.5 text-[var(--text-muted)]">edited</span>}
                    </p>
                    <p className="text-footnote mt-0.5 text-[var(--text-muted)]">{p.blurb}</p>
                    <p className="text-caption mt-1.5 text-[var(--text-muted)] tabular-nums">{styleLine(p)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
          <p className="text-footnote mt-3 px-4 text-[var(--text-muted)]">
            Pro and celebrity styles are playful caricatures of public reputations, not affiliated with or endorsed by anyone named.
          </p>
        </section>
      </div>

      {editing && <Editor key={editing.id} draft={editing} onClose={() => setEditing(undefined)} />}
    </main>
  );
}
