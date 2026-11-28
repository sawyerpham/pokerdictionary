import { useRef } from 'react';
import { STAKES, useSettings } from '../state/settingsStore';
import { GearIcon } from './GearIcon';
import { Row, Segmented, Toggle } from './RuleControls';

/** The table's own cog: blinds, buy-in and NPC rebuys. */
export function TableSettings() {
  const s = useSettings((st) => st.settings);
  const update = useSettings((st) => st.update);
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        type="button"
        aria-label="Table settings"
        title="Table settings"
        onClick={() => dialog.current?.showModal()}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-[9px] text-[var(--text-muted)] transition-colors hover:bg-white/[0.06] hover:text-[var(--text-primary)]"
      >
        <GearIcon className="h-5 w-5" />
      </button>
      <dialog
        ref={dialog}
        onClick={(e) => e.target === dialog.current && dialog.current.close()} // a click on the backdrop closes it
        className="m-auto w-[min(34rem,calc(100vw-1.5rem))] rounded-[12px] border border-[var(--line)] bg-[#0f1011] p-0 text-left text-[var(--text-primary)] shadow-2xl shadow-black/60 backdrop:bg-black/60"
      >
        <h2 className="px-4 pt-4 pb-1 text-[17px] font-semibold tracking-[-0.01em]">Table settings</h2>
        <p className="px-4 pb-2 text-[13px] text-[var(--text-muted)]">Changes during a game take effect from the next hand.</p>
        <Row title="Blinds">
          <Segmented
            label="Blinds"
            value={s.bb}
            options={STAKES.map((x) => ({ value: x.bb, label: `${x.sb}/${x.bb}` }))}
            onChange={(bb) => update(STAKES.find((x) => x.bb === bb)!)}
          />
        </Row>
        <Row title="Buy-in" hint="In big blinds, for every seat">
          <Segmented label="Buy-in" value={s.buyInBb} options={[40, 100, 200, 300].map((v) => ({ value: v, label: `${v}` }))} onChange={(v) => update({ buyInBb: v })} />
        </Row>
        <Row title="NPCs rebuy" hint="When they can't cover the big blind">
          <Toggle label="NPCs rebuy" checked={s.autoRebuy} onChange={(v) => update({ autoRebuy: v })} />
        </Row>
        <form method="dialog" className="border-t border-[var(--line)] p-3 text-right">
          <button className="min-h-9 rounded-[8px] bg-[var(--fill)] px-3 text-[14px] font-medium">Done</button>
        </form>
      </dialog>
    </>
  );
}
