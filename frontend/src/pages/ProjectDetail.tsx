import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { projectsApi, contributionsApi, salesApi, type SalesEntry } from '../api/client';

type Contribution = Record<string, unknown>;
type ProjectMember = { userId: string; user: { id: string; name: string; email: string; role: string } };

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState<Awaited<ReturnType<typeof projectsApi.get>> | null>(null);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [allUsers, setAllUsers] = useState<Array<{ id: string; name: string; email: string; role: string }>>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [logDate, setLogDate] = useState(new Date().toISOString().slice(0, 10));
  const [logHours, setLogHours] = useState('');
  const [logNotes, setLogNotes] = useState('');
  const [submittingLog, setSubmittingLog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [assignableUsersError, setAssignableUsersError] = useState('');
  const [loadingAssignable, setLoadingAssignable] = useState(false);
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'ACCOUNTANT';
  const canAssignMembers = isAdmin;
  const canDeleteProject = user?.role === 'ADMIN';
  const [deleting, setDeleting] = useState(false);
  const [salesEntries, setSalesEntries] = useState<SalesEntry[]>([]);
  const [showSalesForm, setShowSalesForm] = useState(false);
  const [salesEntryDate, setSalesEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [salesAmount, setSalesAmount] = useState('');
  const [salesNotes, setSalesNotes] = useState('');
  const [salesAllocations, setSalesAllocations] = useState<Record<string, number>>({});
  const [submittingSales, setSubmittingSales] = useState(false);
  const [deletingSalesId, setDeletingSalesId] = useState<string | null>(null);

  const loadAssignableUsers = () => {
    if (!id) return;
    setAssignableUsersError('');
    setLoadingAssignable(true);
    projectsApi
      .getAssignableUsers(id)
      .then((list) => setAllUsers(Array.isArray(list) ? list : []))
      .catch((e) => {
        setAssignableUsersError(e instanceof Error ? e.message : 'Failed to load users');
        setAllUsers([]);
      })
      .finally(() => setLoadingAssignable(false));
  };

  const refresh = () => {
    if (!id) return;
    Promise.all([
      projectsApi.get(id),
      contributionsApi.list(id),
      projectsApi.getMembers(id),
      salesApi.listByProject(id).catch(() => [] as SalesEntry[]),
    ])
      .then(([p, c, m, sales]) => {
        setProject(p);
        setContributions(c);
        setMembers(m);
        setSalesEntries(Array.isArray(sales) ? sales : []);
        if (user?.id && isAdmin) {
          projectsApi.getAssignableUsers(id).then((list) => setAllUsers(Array.isArray(list) ? list : [])).catch(() => setAllUsers([]));
        }
      })
      .catch((e) => setError(e.message));
  };

  useEffect(() => {
    if (!id) return;
    Promise.all([
      projectsApi.get(id),
      contributionsApi.list(id),
      projectsApi.getMembers(id),
      salesApi.listByProject(id).catch(() => [] as SalesEntry[]),
    ])
      .then(([proj, c, m, sales]) => {
        setProject(proj);
        setContributions(c as Contribution[]);
        setMembers((m as ProjectMember[]) ?? []);
        setSalesEntries(Array.isArray(sales) ? sales : []);
        const canLoadAssignable = proj && user?.id && isAdmin;
        if (canLoadAssignable) {
          return projectsApi.getAssignableUsers(id).then((list) => {
            setAllUsers(Array.isArray(list) ? list : []);
            setAssignableUsersError('');
          }).catch((e) => {
            setAssignableUsersError(e instanceof Error ? e.message : 'Failed to load user list');
            setAllUsers([]);
          });
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, isAdmin, user?.id]);

  const handleAddMember = async () => {
    if (!id || !selectedUserId) return;
    setError('');
    try {
      await projectsApi.addMember(id, selectedUserId);
      setSelectedUserId('');
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add');
    }
  };

  const handleDeleteProject = async () => {
    if (!id || !project) return;
    if (!window.confirm(`Delete project "${project.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    setError('');
    try {
      await projectsApi.delete(id);
      navigate('/projects');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete project');
    } finally {
      setDeleting(false);
    }
  };

  const salesCandidates = project
    ? [
        ...(project.owner ? [{ id: project.owner.id, name: project.owner.name }] : []),
        ...members.map((m) => ({ id: m.user.id, name: m.user.name })),
      ].filter((u, i, arr) => arr.findIndex((x) => x.id === u.id) === i)
    : [];

  const handleSalesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !salesAmount || salesCandidates.length === 0) return;
    const allocations = salesCandidates.map((u) => ({
      userId: u.id,
      contributionPercent: salesAllocations[u.id] ?? 0,
    }));
    const sum = allocations.reduce((s, a) => s + a.contributionPercent, 0);
    if (Math.abs(sum - 100) > 0.01) {
      setError('Contribution percentages must total 100');
      return;
    }
    setError('');
    setSubmittingSales(true);
    try {
      await salesApi.create(id, {
        entryDate: salesEntryDate,
        salesAmount: parseFloat(salesAmount),
        notes: salesNotes || undefined,
        allocations,
      });
      setSalesAmount('');
      setSalesNotes('');
      setSalesAllocations({});
      setShowSalesForm(false);
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add sales entry');
    } finally {
      setSubmittingSales(false);
    }
  };

  const handleDeleteSales = async (salesEntryId: string) => {
    if (!id) return;
    if (!window.confirm('Remove this sales entry?')) return;
    setDeletingSalesId(salesEntryId);
    try {
      await salesApi.delete(id, salesEntryId);
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete');
    } finally {
      setDeletingSalesId(null);
    }
  };

  const handleRemoveMember = async (memberUserId: string) => {
    if (!id) return;
    if (!window.confirm('Do you want to remove this member from the project?')) return;
    try {
      await projectsApi.removeMember(id, memberUserId);
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to remove');
    }
  };

  const handleLogHours = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !logHours) return;
    setError('');
    setSubmittingLog(true);
    try {
      await contributionsApi.create(id, {
        type: 'TIME',
        date: logDate,
        hours: parseFloat(logHours),
        notes: logNotes || undefined,
      });
      setLogHours('');
      setLogNotes('');
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to log hours');
    } finally {
      setSubmittingLog(false);
    }
  };

  if (loading) return <div className="text-slate-400">Loading…</div>;
  if (!project) return null;

  const totalPoints = contributions.reduce((s, c) => s + Number((c as { points?: number }).points ?? 0), 0);
  const memberIds = new Set(members.map((m) => m.userId));
  const availableUsers = allUsers.filter((u) => !memberIds.has(u.id) && u.id !== project.owner?.id);

  return (
    <div className="max-w-5xl mx-auto">
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center justify-between gap-2">
          <span>{error}</span>
          <button type="button" onClick={() => setError('')} className="text-red-400 hover:text-red-300">Dismiss</button>
        </div>
      )}
      <div className="flex items-center justify-between gap-4 mb-4">
        <Link to="/projects" className="text-brand-400 hover:underline text-sm">
          ← Projects
        </Link>
        {canDeleteProject && (
          <button
            type="button"
            onClick={handleDeleteProject}
            disabled={deleting}
            className="px-3 py-1.5 rounded-lg border border-red-500/50 text-red-400 hover:bg-red-500/10 text-sm disabled:opacity-50"
          >
            {deleting ? 'Deleting…' : 'Delete project'}
          </button>
        )}
      </div>
      <h1 className="font-display text-2xl font-semibold text-white mb-2">{project.name}</h1>
      <p className="text-slate-400 text-sm mb-6">Owner: {project.owner?.name}</p>

      {canAssignMembers && (
        <section className="mb-6 p-4 bg-vault-card border border-vault-border rounded-xl">
          <h2 className="text-lg font-semibold text-white mb-3">Assign founders and users to this project</h2>
          <p className="text-slate-400 text-sm mb-3">Only Admin can assign. Assigned founders can view this project and log hours against it.</p>
          {assignableUsersError && (
            <div className="mb-3 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm flex items-center justify-between gap-2">
              <span>{assignableUsersError}</span>
              <button type="button" onClick={loadAssignableUsers} disabled={loadingAssignable} className="text-amber-400 hover:text-amber-300 text-sm">Retry</button>
            </div>
          )}
          {availableUsers.length === 0 && !assignableUsersError && !loadingAssignable && allUsers.length === 0 && (
            <p className="mb-3 text-slate-500 text-sm">User list not loaded. <button type="button" onClick={loadAssignableUsers} className="text-brand-400 hover:underline">Load users</button></p>
          )}
          <div className="flex flex-wrap items-end gap-3 mb-3">
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="px-3 py-2 rounded-lg bg-vault-dark border border-vault-border text-white min-w-[220px]"
              disabled={loadingAssignable}
            >
              <option value="">{loadingAssignable ? 'Loading…' : availableUsers.length === 0 ? 'No users to assign' : 'Select user to assign…'}</option>
              {availableUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email}) — {u.role}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleAddMember}
              disabled={!selectedUserId}
              className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm disabled:opacity-50"
            >
              Assign to project
            </button>
          </div>
          {members.length > 0 ? (
            <div>
              <p className="text-slate-400 text-sm mb-1">Assigned users ({members.length})</p>
              <ul className="flex flex-wrap gap-2">
                {members.map((m) => (
                  <li key={m.userId} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-vault-dark border border-vault-border text-slate-300 text-sm">
                    {m.user.name}
                    <span className="text-slate-500 text-xs">({m.user.role})</span>
                    <button type="button" onClick={() => handleRemoveMember(m.userId)} className="text-red-400 hover:text-red-300">
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-slate-500 text-sm">No users assigned yet. Use the dropdown above to assign users to this project.</p>
          )}
        </section>
      )}

      <div className="mb-6 p-4 bg-vault-card border border-vault-border rounded-xl">
        <p className="text-slate-400 text-sm">Total points (this project)</p>
        <p className="text-2xl font-semibold text-white">{totalPoints.toFixed(2)}</p>
      </div>

      <section className="mb-6 p-4 bg-vault-card border border-vault-border rounded-xl">
        <h2 className="text-lg font-semibold text-white mb-2">Sales</h2>
        <p className="text-slate-400 text-sm mb-3">Sales entries with founder contribution % (12% of amount in first year, 5% thereafter). Notional and hours feed into Company dashboard.</p>
        {isAdmin && salesCandidates.length > 0 && (
          <>
            {!showSalesForm ? (
              <button type="button" onClick={() => setShowSalesForm(true)} className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm mb-4">
                Add sales entry
              </button>
            ) : (
              <form onSubmit={handleSalesSubmit} className="mb-4 p-4 rounded-xl bg-vault-dark border border-vault-border space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 text-sm mb-1">Entry date</label>
                    <input type="date" value={salesEntryDate} onChange={(e) => setSalesEntryDate(e.target.value)} required className="w-full px-3 py-2 rounded-lg bg-vault-dark border border-vault-border text-white" />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-sm mb-1">Sales amount (₹)</label>
                    <input type="number" min="0" step="0.01" value={salesAmount} onChange={(e) => setSalesAmount(e.target.value)} required className="w-full px-3 py-2 rounded-lg bg-vault-dark border border-vault-border text-white" />
                  </div>
                </div>
                <div>
                  <label className="block text-slate-400 text-sm mb-1">Contribution % per founder (must total 100)</label>
                  <div className="flex flex-wrap gap-4 mt-2">
                    {salesCandidates.map((u) => (
                      <div key={u.id} className="flex items-center gap-2">
                        <span className="text-slate-300 text-sm w-24 truncate">{u.name}</span>
                        <input type="number" min="0" max="100" step="0.5" value={salesAllocations[u.id] ?? ''} onChange={(e) => setSalesAllocations((prev) => ({ ...prev, [u.id]: parseFloat(e.target.value) || 0 }))} className="w-20 px-2 py-1 rounded bg-vault-dark border border-vault-border text-white text-sm" placeholder="0" />
                        <span className="text-slate-500 text-xs">%</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-slate-400 text-sm mb-1">Notes (optional)</label>
                  <input type="text" value={salesNotes} onChange={(e) => setSalesNotes(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-vault-dark border border-vault-border text-white" />
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={submittingSales} className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm disabled:opacity-50">
                    {submittingSales ? 'Saving…' : 'Save sales entry'}
                  </button>
                  <button type="button" onClick={() => { setShowSalesForm(false); setSalesAmount(''); setSalesAllocations({}); }} className="px-4 py-2 rounded-lg border border-vault-border text-slate-300 hover:text-white text-sm">
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </>
        )}
        {salesEntries.length === 0 ? (
          <p className="text-slate-500 text-sm">No sales entries yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-vault-border">
                  <th className="py-2 pr-3 text-slate-400 font-medium">Date</th>
                  <th className="py-2 pr-3 text-slate-400 font-medium">Amount (₹)</th>
                  <th className="py-2 pr-3 text-slate-400 font-medium">Allocations</th>
                  {isAdmin && <th className="py-2 pr-3 text-slate-400 font-medium"></th>}
                </tr>
              </thead>
              <tbody>
                {salesEntries.map((s) => (
                  <tr key={s.id} className="border-b border-vault-border/50">
                    <td className="py-2 pr-3 text-slate-300">{new Date(s.entryDate).toLocaleDateString()}</td>
                    <td className="py-2 pr-3 text-white">{Number(s.salesAmount).toLocaleString('en-IN')}</td>
                    <td className="py-2 pr-3 text-slate-300">
                      {s.allocations.map((a) => `${(a.user as { name?: string })?.name ?? a.userId}: ${Number(a.contributionPercent)}%`).join(', ')}
                    </td>
                    {isAdmin && (
                      <td className="py-2 pr-3">
                        <button type="button" onClick={() => handleDeleteSales(s.id)} disabled={deletingSalesId === s.id} className="text-red-400 hover:text-red-300 text-xs disabled:opacity-50">
                          {deletingSalesId === s.id ? 'Deleting…' : 'Delete'}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold text-white mb-3">Log hours</h2>
        <form onSubmit={handleLogHours} className="bg-vault-card border border-vault-border rounded-xl p-4 flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-slate-400 text-sm mb-1">Date</label>
            <input type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)} required className="px-3 py-2 rounded-lg bg-vault-dark border border-vault-border text-white" />
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-1">Hours</label>
            <input type="number" step="0.25" min="0" value={logHours} onChange={(e) => setLogHours(e.target.value)} required className="px-3 py-2 rounded-lg bg-vault-dark border border-vault-border text-white w-24" />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-slate-400 text-sm mb-1">Notes</label>
            <input type="text" value={logNotes} onChange={(e) => setLogNotes(e.target.value)} placeholder="Optional" className="px-3 py-2 rounded-lg bg-vault-dark border border-vault-border text-white w-full" />
          </div>
          <button type="submit" disabled={submittingLog} className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm disabled:opacity-50">
            {submittingLog ? 'Saving…' : 'Log hours'}
          </button>
        </form>
      </section>

      <h2 className="text-lg font-semibold text-white mb-3">Contributions</h2>
      <div className="bg-vault-card border border-vault-border rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-vault-border">
              <th className="p-3 text-slate-400 font-medium">Date</th>
              <th className="p-3 text-slate-400 font-medium">Contributor</th>
              <th className="p-3 text-slate-400 font-medium">Type</th>
              <th className="p-3 text-slate-400 font-medium">Hours / Amount</th>
              <th className="p-3 text-slate-400 font-medium">Points</th>
            </tr>
          </thead>
          <tbody>
            {contributions.map((c: Contribution & { points?: number }, i: number) => (
              <tr key={i} className="border-b border-vault-border/50">
                <td className="p-3 text-slate-300">
                  {typeof c.date === 'string' ? new Date(c.date).toLocaleDateString() : '-'}
                </td>
                <td className="p-3 text-white">{(c.user as { name?: string })?.name ?? '-'}</td>
                <td className="p-3 text-slate-300">{String(c.type)}</td>
                <td className="p-3 text-slate-300">
                  {c.type === 'TIME'
                    ? Number(c.hours ?? 0).toFixed(1)
                    : Number(c.amount ?? 0).toFixed(2)}
                </td>
                <td className="p-3 text-slate-300">{Number(c.points ?? 0).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
