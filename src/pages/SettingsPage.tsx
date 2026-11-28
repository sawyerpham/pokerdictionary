import { ChipPile, ChipSwatch } from '../components/Chips';
import { ActionRow, Group, Row, Segmented, Toggle } from '../components/RuleControls';
import { DENOMS, VEGAS_CHIPS, type ChipDesign, useSettings } from '../state/settingsStore';

export function SettingsPage() {
  const s = useSettings((st) => st.settings);
  const update = useSettings((st) => st.update);
  const reset = useSettings((st) => st.reset);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:py-12">
      <h1 className="text-large-title mb-8 px-1">Settings</h1>
      <div className="space-y-8">
        <Group title="Spectate">
          <Row title="Show all hole cards">
            <Toggle label="Show all hole cards" checked={s.spectateShowCards} onChange={(v) => update({ spectateShowCards: v })} />
          </Row>
        </Group>

        <Group title="Appearance">
          <Row title="Positions" hint="UTG, UTG+1, HJ, CO… on each seat">
            <Toggle label="Positions" checked={s.showPositions} onChange={(v) => update({ showPositions: v })} />
          </Row>
          <Row title="Animations" hint="Dealing, chips, folds and shoves">
            <Toggle label="Animations" checked={s.animations} onChange={(v) => update({ animations: v })} />
          </Row>
          <Row title="NPC think time" hint="How long NPCs take to act">
            <Segmented
              label="NPC think time"
              value={s.npcThinkMs}
              options={[300, 700, 1200, 2000, 3000].map((v) => ({ value: v, label: `${v / 1000}s` }))}
              onChange={(v) => update({ npcThinkMs: v })}
            />
          </Row>
          <Row title="Speed" hint="Animations and NPC think time">
            <Segmented label="Speed" value={s.speed} options={[0.5, 1, 2, 4].map((v) => ({ value: v, label: `${v === 0.5 ? '½' : v}×` }))} onChange={(v) => update({ speed: v })} />
          </Row>
        </Group>

        <Group title="Chips">
          <div className="flex items-end justify-center gap-6 px-4 pt-5 pb-3">
            {DENOMS.map((d) => (
              <ChipPile key={d} amount={d * 5} bb={d} cols={1} perCol={5} />
            ))}
          </div>
          <Row title="Design">
            <Segmented<ChipDesign>
              label="Chip design"
              value={s.chipDesign}
              options={[
                { value: 'classic', label: 'Classic' },
                { value: 'striped', label: 'Striped' },
                { value: 'ring', label: 'Ring' },
                { value: 'solid', label: 'Solid' },
              ]}
              onChange={(v) => update({ chipDesign: v })}
            />
          </Row>
          {DENOMS.map((d) => (
            <Row key={d} title={`$${d.toLocaleString()}`}>
              <label className="flex cursor-pointer items-center gap-3">
                <ChipSwatch denom={d} />
                <input
                  type="color"
                  aria-label={`$${d} chip color`}
                  value={s.chipColors[d]}
                  onChange={(e) => update({ chipColors: { ...s.chipColors, [d]: e.target.value } })}
                  className="h-7 w-12 cursor-pointer rounded bg-transparent pointer-coarse:h-11"
                />
              </label>
            </Row>
          ))}
        </Group>
        <ActionRow onClick={() => update({ chipColors: VEGAS_CHIPS, chipDesign: 'classic' })}>Reset to Vegas Chips</ActionRow>

        <ActionRow onClick={reset}>Reset Settings</ActionRow>
      </div>
    </main>
  );
}
