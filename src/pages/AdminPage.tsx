import { useEffect, useState } from 'react';
import { atLeast, ROLE_LABEL, useAccount, type Role } from '../state/account';

interface Row {
  id: number;
  email: string;
  name: string | null;
  role: Role;
  created: number;
  coachToday: number;
}

/** Owners and admins set every other account's type. Owners are set on the server only. */
export function AdminPage() {
  const me = useAccount((s) => s.me);
  const [rows, setRows] = useState<Row[]>();
  const [error, setError] = useState<string>();
  const admin = atLeast(me, 'admin');

  useEffect(() => {
    if (!admin) return;
    fetch('/api/admin/users')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setRows, () => setError('Couldn’t load accounts.'));
  }, [admin]);

  const setRole = async (row: Row, role: Role) => {
    setError(undefined);
    const res = await fetch(`/api/admin/users/${row.id}/role`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role }) });
    if (!res.ok) return setError((await res.json().catch(() => ({}))).detail ?? 'That didn’t work.');
    setRows((old) => old?.map((r) => (r.id === row.id ? { ...r, role } : r)));
  };

  if (me === undefined) return null;
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
      <h1 className="text-title-2 mb-1">Admin</h1>
      {!admin ? (
        <p className="text-[15px] text-[var(--text-muted)]">Only owners and admins can see this page.</p>
      ) : (
        <>
          <p className="mb-4 text-[15px] text-[var(--text-muted)]">
            Premium gets the AI coach. Admins can also change account types here. Owners are set on the server and can’t be changed here.
          </p>
          {error && <p className="mb-3 text-[15px] text-rose-400">{error}</p>}
          <div className="overflow-x-auto rounded-[12px] bg-[var(--bg-second)]">
            <table className="w-full text-[15px]">
              <thead className="text-left text-[13px] text-[var(--text-muted)]">
                <tr>
                  <th className="p-3 font-normal">Account</th>
                  <th className="p-3 font-normal">Type</th>
                  <th className="p-3 text-right font-normal">Coach today</th>
                  <th className="p-3 text-right font-normal">Joined</th>
                </tr>
              </thead>
              <tbody>
                {rows?.map((r) => (
                  <tr key={r.id} className="border-t border-[var(--line)]">
                    <td className="p-3">
                      <div>{r.name ?? r.email}</div>
                      {r.name && <div className="text-[13px] text-[var(--text-muted)]">{r.email}</div>}
                    </td>
                    <td className="p-3">
                      {r.role === 'owner' ? (
                        <span className="font-semibold">Owner</span>
                      ) : (
                        <select
                          aria-label={`Account type for ${r.email}`}
                          value={r.role}
                          onChange={(e) => void setRole(r, e.target.value as Role)}
                          className="min-h-11 rounded-[8px] bg-[var(--bg-third)] px-2"
                        >
                          {(['default', 'premium', 'admin'] as const).map((role) => (
                            <option key={role} value={role}>
                              {ROLE_LABEL[role]}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="p-3 text-right tabular-nums">{r.coachToday}</td>
                    <td className="p-3 text-right tabular-nums text-[var(--text-muted)]">{new Date(r.created * 1000).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows && !error && <p className="p-3 text-[15px] text-[var(--text-muted)]">Loading…</p>}
          </div>
        </>
      )}
    </main>
  );
}
