import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { projectsApi, contributionsApi } from '../api/client';

type Contribution = Record<string, unknown>;
type ProjectMember = { userId: string; user: { id: string; name: string; email: string; role: string } };

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
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
    Promise.all([projectsApi.get(id), contributionsApi.list(id), projectsApi.getMembers(id)])
      .then(([p, c, m]) => {
        setProject(p);
        setContributions(c);
        setMembers(m);
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
    ])
      .then(([proj, c, m]) => {
        setProject(proj);
        setContributions(c as Contribution[]);
        setMembers((m as ProjectMember[]) ?? []);
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

  const handleRemoveMember = async (memberUserId: string) => {
    if (!id) return;
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

  const totalPoints = contributions.reduce((s, c) => s + Number(c.points ?? 0), 0);
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
      <Link to="/projects" className="text-brand-400 hover:underline text-sm mb-4 inline-block">
        ← Projects
      </Link>
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
            {contributions.map((c: Contribution, i: number) => (
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
