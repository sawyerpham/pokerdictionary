import { useCallback, useEffect, useState } from 'react';
import { atLeast, ROLE_LABEL, useAccount, type Role } from '../state/account';

interface Row {
  id: number;
  email: string;
  name: string | null;
  role: Role;
  created: number;
  coachToday: number;
  coachTotal: number;
  lastSeen: number | null;
  synced: number;
}

interface Stats {
  users: number;
  roles: Record<Role, number>;
  joined: { day: number; week: number; month: number };
  signedIn: { day: number; week: number; month: number };
  sessions: number;
  coach: { today: number; week: number; month: number; all: number };
  syncing: number;
  changes: { at: number; by: string | null; user: string | null; old: Role; new: Role }[];
}

const date = (s: number) => new Date(s * 1000).toLocaleDateString();
const ago = (s: number | null) => {
  if (!s) return 'Never';
  const d = Math.floor((Date.now() / 1000 - s) / 86400);
  return d < 1 ? 'Today' : d === 1 ? 'Yesterday' : d < 30 ? `${d} days ago` : date(s);
};
const kb = (n: number) => (n ? `${Math.max(1, Math.round(n / 1024))} KB` : '–');

function Tile({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <div className="rounded-[12px] bg-[var(--bg-second)] p-4">
      <p className="text-[13px] text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 text-[28px] leading-none font-semibold tracking-[-0.02em] tabular-nums">{value}</p>
      <p className="mt-2 text-[13px] text-[var(--text-muted)] tabular-nums">{note}</p>
    </div>
  );
}

/** Account types and usage. Admins set default and premium; only owners grant or remove Admin. Owners are set on the server. */
export function AdminPage() {
  const me = useAccount((s) => s.me);
  const [rows, setRows] = useState<Row[]>();
  const [stats, setStats] = useState<Stats>();
  const [error, setError] = useState<string>();
  const admin = atLeast(me, 'admin');
  const owner = me?.role === 'owner';

  const load = useCallback(() => {
    const get = (url: string) => fetch(url).then((r) => (r.ok ? r.json() : Promise.reject()));
    Promise.all([get('/api/admin/users'), get('/api/admin/stats')]).then(
      ([u, s]) => {
        setRows(u);
        setStats(s);
      },
      () => setError('Couldn’t load accounts.'),
    );
  }, []);

  useEffect(() => {
    if (admin) load();
  }, [admin, load]);

  const setRole = async (row: Row, role: Role) => {
    setError(undefined);
    const res = await fetch(`/api/admin/users/${row.id}/role`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role }) });
    if (!res.ok) return setError((await res.json().catch(() => ({}))).detail ?? 'That didn’t work.');
    load();
  };

  if (me === undefined) return null;
  if (!admin)
    return (
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <h1 className="text-title-2 mb-1">Admin</h1>
        <p className="text-[15px] text-[var(--text-muted)]">Only owners and admins can see this page.</p>
      </main>
    );

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <h1 className="text-title-2 mb-1">Admin</h1>
      <p className="mb-6 text-[15px] text-[var(--text-muted)]">
        Premium gets the AI coach. Admins set accounts to Default or Premium and see these stats. Only an owner grants or removes Admin; owners are set on the
        server.
      </p>
      {error && <p className="mb-4 text-[15px] text-rose-400">{error}</p>}

      {stats && (
        <section className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Tile
            label="Accounts"
            value={stats.users}
            note={`${stats.roles.premium} premium · ${stats.roles.admin + stats.roles.owner} admin`}
          />
          <Tile label="New this week" value={stats.joined.week} note={`${stats.joined.day} today · ${stats.joined.month} in 30 days`} />
          <Tile label="Signed in this week" value={stats.signedIn.week} note={`${stats.signedIn.day} today · ${stats.signedIn.month} in 30 days`} />
          <Tile label="Coach replies today" value={stats.coach.today} note={`${stats.coach.week} this week · ${stats.coach.all} ever`} />
          <Tile label="Syncing data" value={stats.syncing} note={`${stats.sessions} active sessions`} />
        </section>
      )}

      <h2 className="mb-3 text-[13px] text-[var(--text-muted)]">Accounts</h2>
      <div className="mb-8 overflow-x-auto rounded-[12px] bg-[var(--bg-second)]">
        <table className="w-full text-[14px]">
          <thead className="text-left text-[13px] whitespace-nowrap text-[var(--text-muted)]">
            <tr>
              <th className="p-3 font-normal">Account</th>
              <th className="p-3 font-normal">Type</th>
              <th className="p-3 font-normal">Last sign-in</th>
              <th className="p-3 text-right font-normal">Coach today / all</th>
              <th className="p-3 text-right font-normal">Synced</th>
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
                  {r.role === 'owner' || (r.role === 'admin' && !owner) ? (
                    <span className="font-medium">{ROLE_LABEL[r.role]}</span>
                  ) : (
                    <select
                      aria-label={`Account type for ${r.email}`}
                      value={r.role}
                      onChange={(e) => void setRole(r, e.target.value as Role)}
                      className="min-h-9 rounded-[8px] bg-[var(--bg-third)] px-2 ring-1 ring-[var(--line)]"
                    >
                      {(['default', 'premium', 'admin'] as const)
                        .filter((role) => owner || role !== 'admin')
                        .map((role) => (
                          <option key={role} value={role}>
                            {ROLE_LABEL[role]}
                          </option>
                        ))}
                    </select>
                  )}
                </td>
                <td className="p-3 whitespace-nowrap text-[var(--text-muted)]">{ago(r.lastSeen)}</td>
                <td className="p-3 text-right tabular-nums">
                  {r.coachToday} / {r.coachTotal}
                </td>
                <td className="p-3 text-right whitespace-nowrap text-[var(--text-muted)] tabular-nums">{kb(r.synced)}</td>
                <td className="p-3 text-right text-[var(--text-muted)] tabular-nums">{date(r.created)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows && !error && <p className="p-3 text-[15px] text-[var(--text-muted)]">Loading…</p>}
      </div>

      {stats && (
        <>
          <h2 className="mb-3 text-[13px] text-[var(--text-muted)]">Recent type changes</h2>
          <div className="rounded-[12px] bg-[var(--bg-second)] text-[14px]">
            {stats.changes.length === 0 && <p className="p-3 text-[var(--text-muted)]">None yet.</p>}
            {stats.changes.map((c, i) => (
              <p key={i} className={`flex flex-wrap gap-x-2 p-3 ${i ? 'border-t border-[var(--line)]' : ''}`}>
                <span>{c.user ?? 'Deleted account'}</span>
                <span className="text-[var(--text-muted)]">
                  {ROLE_LABEL[c.old]} → {ROLE_LABEL[c.new]}
                </span>
                <span className="ml-auto text-[var(--text-muted)]">
                  by {c.by ?? 'deleted account'} · {date(c.at)}
                </span>
              </p>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
