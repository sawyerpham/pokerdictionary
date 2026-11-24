import { ActionRow, Group, Row, Segmented, Toggle } from '../components/RuleControls';
import { STAKES, useSettings } from '../state/settingsStore';

export function SettingsPage() {
  const s = useSettings((st) => st.settings);
  const update = useSettings((st) => st.update);
  const reset = useSettings((st) => st.reset);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:py-12">
      <h1 className="text-large-title mb-8 px-1">Settings</h1>
      <div className="space-y-8">
        <Group title="Game">
          <Row title="Blinds">
            <Segmented
              label="Blinds"
              value={s.bb}
              options={STAKES.map((x) => ({ value: x.bb, label: `${x.sb}/${x.bb}` }))}
              onChange={(bb) => update(STAKES.find((x) => x.bb === bb)!)}
            />
          </Row>
          <Row title="Your buy-in" hint="In big blinds">
            <Segmented label="Buy-in" value={s.buyInBb} options={[40, 100, 200, 300].map((v) => ({ value: v, label: `${v}` }))} onChange={(v) => update({ buyInBb: v })} />
          </Row>
          <Row title="NPCs rebuy" hint="When they can't cover the big blind">
            <Toggle label="NPCs rebuy" checked={s.autoRebuy} onChange={(v) => update({ autoRebuy: v })} />
          </Row>
        </Group>

        <Group title="Spectate">
          <Row title="Show all hole cards">
            <Toggle label="Show all hole cards" checked={s.spectateShowCards} onChange={(v) => update({ spectateShowCards: v })} />
          </Row>
        </Group>

        <Group title="Appearance">
          <Row title="Animations" hint="Dealing, chips, folds and shoves">
            <Toggle label="Animations" checked={s.animations} onChange={(v) => update({ animations: v })} />
          </Row>
          <Row title="Speed" hint="Animations and NPC think time">
            <Segmented label="Speed" value={s.speed} options={[0.5, 1, 2, 4].map((v) => ({ value: v, label: `${v === 0.5 ? '½' : v}×` }))} onChange={(v) => update({ speed: v })} />
          </Row>
        </Group>

        <ActionRow onClick={reset}>Reset Settings</ActionRow>
      </div>
    </main>
  );
}
