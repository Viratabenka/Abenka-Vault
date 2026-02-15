import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { revenueApi, projectsApi } from '../api/client';
import type { RevenueEntry, RevenueEntryType } from '../api/client';

type ProjectWithPipeline = {
  id: string;
  name: string;
  monthlyRevenuePipeline?: number | null;
};

export default function Revenue() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [entries, setEntries] = useState<RevenueEntry[]>([]);
  const [pipelineProjects, setPipelineProjects] = useState<ProjectWithPipeline[]>([]);
  const [pipelineValues, setPipelineValues] = useState<Record<string, string>>({});
  const [savingPipelineId, setSavingPipelineId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [projectId, setProjectId] = useState('');
  const [type, setType] = useState<RevenueEntryType>('ONE_TIME_REVENUE');
  const [amount, setAmount] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = user?.role === 'ADMIN';

  const refresh = () => {
    revenueApi
      .list()
      .then((r) => {
        setProjects(r.projects);
        setEntries(r.entries);
      })
      .catch((e) => setError(e.message));
    if (isAdmin) {
      projectsApi
        .list()
        .then((list) => {
          setPipelineProjects(list);
          setPipelineValues(
            list.reduce(
              (acc, p) => ({
                ...acc,
                [p.id]: p.monthlyRevenuePipeline != null ? String(p.monthlyRevenuePipeline) : '',
              }),
              {} as Record<string, string>,
            ),
          );
        })
        .catch(() => {});
    }
  };

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    revenueApi
      .list()
      .then((r) => {
        setProjects(r.projects);
        setEntries(r.entries);
        if (r.projects.length && !projectId) setProjectId(r.projects[0].id);
      })
      .catch((e) => setError(e.message));
    projectsApi
      .list()
      .then((list) => {
        setPipelineProjects(list);
        setPipelineValues(
          list.reduce(
            (acc, p) => ({
              ...acc,
              [p.id]: p.monthlyRevenuePipeline != null ? String(p.monthlyRevenuePipeline) : '',
            }),
            {} as Record<string, string>,
          ),
        );
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isAdmin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !amount) return;
    setError('');
    setSubmitting(true);
    try {
      await revenueApi.create({
        projectId,
        type,
        amount: parseFloat(amount),
        entryDate,
        notes: notes || undefined,
      });
      setAmount('');
      setNotes('');
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await revenueApi.delete(id);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const handleSavePipeline = async (projectId: string) => {
    const raw = pipelineValues[projectId]?.trim();
    const amount = raw === '' ? 0 : parseFloat(raw);
    if (raw !== '' && (Number.isNaN(amount) || amount < 0)) return;
    setSavingPipelineId(projectId);
    setError('');
    try {
      await projectsApi.update(projectId, { monthlyRevenuePipeline: amount });
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSavingPipelineId(null);
    }
  };

  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  if (loading) return <div className="text-slate-400">Loading revenue…</div>;
  if (error) return <div className="text-red-400">{error}</div>;

  const phaseTotal = pipelineProjects.reduce(
    (s, p) => s + (p.monthlyRevenuePipeline != null ? Number(p.monthlyRevenuePipeline) : 0),
    0,
  );
  const remainingTo15Lakh = Math.max(0, 15_00_000 - phaseTotal);

  const entriesByProject = entries.reduce((acc, e) => {
    const pid = e.projectId;
    if (!acc[pid]) acc[pid] = [];
    acc[pid].push(e);
    return acc;
  }, {} as Record<string, RevenueEntry[]>);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <h1 className="font-display text-2xl font-semibold text-white">Revenue</h1>
      <p className="text-slate-400 text-sm">Monthly revenue (pipeline) by project and one-time revenue & expense entries.</p>

      <section className="bg-green-500/10 border border-green-500/40 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-white mb-2">Monthly revenue (phase target)</h2>
        <p className="text-slate-400 text-sm mb-2">One value per project. Shown on Company dashboard toward the 15 Lakh target.</p>
        <p className="text-2xl font-semibold text-green-400">₹{phaseTotal.toLocaleString('en-IN')}</p>
        <p className="text-slate-400 text-sm mt-1">Remaining to reach 15 Lakh: ₹{remainingTo15Lakh.toLocaleString('en-IN')}</p>
        {pipelineProjects.length > 0 && (
          <div className="mt-4 pt-4 border-t border-green-500/30 overflow-x-auto">
            <table className="w-full text-left min-w-[400px]">
              <thead>
                <tr className="border-b border-vault-border">
                  <th className="py-2 pr-3 text-slate-400 font-medium">Project</th>
                  <th className="py-2 pr-3 text-slate-400 font-medium">Monthly revenue (₹)</th>
                  <th className="py-2 text-slate-400 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {pipelineProjects.map((p) => (
                  <tr key={p.id} className="border-b border-vault-border/50">
                    <td className="py-2 pr-3 text-white">{p.name}</td>
                    <td className="py-2 pr-3">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={pipelineValues[p.id] ?? ''}
                        onChange={(e) =>
                          setPipelineValues((prev) => ({ ...prev, [p.id]: e.target.value }))
                        }
                        className="px-3 py-2 rounded-lg bg-vault-dark border border-vault-border text-white w-36"
                        placeholder="0"
                      />
                    </td>
                    <td className="py-2">
                      <button
                        type="button"
                        onClick={() => handleSavePipeline(p.id)}
                        disabled={savingPipelineId === p.id}
                        className="px-3 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm disabled:opacity-50"
                      >
                        {savingPipelineId === p.id ? 'Saving…' : 'Save'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="bg-vault-card border border-vault-border rounded-xl p-5">
        <h2 className="text-lg font-semibold text-white mb-3">Add revenue or expense</h2>
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-slate-400 text-sm mb-1">Project</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              required
              className="px-3 py-2 rounded-lg bg-vault-dark border border-vault-border text-white min-w-[200px]"
            >
              <option value="">Select project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as RevenueEntryType)}
              className="px-3 py-2 rounded-lg bg-vault-dark border border-vault-border text-white"
            >
              <option value="ONE_TIME_REVENUE">One-time revenue</option>
              <option value="EXPENSE">Total expense</option>
            </select>
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-1">Amount (₹)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="px-3 py-2 rounded-lg bg-vault-dark border border-vault-border text-white w-32"
            />
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-1">Entry date</label>
            <input
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              required
              className="px-3 py-2 rounded-lg bg-vault-dark border border-vault-border text-white"
            />
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-slate-400 text-sm mb-1">Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional"
              className="px-3 py-2 rounded-lg bg-vault-dark border border-vault-border text-white w-full"
            />
          </div>
          <button type="submit" disabled={submitting || !projectId || !amount} className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm disabled:opacity-50">
            {submitting ? 'Adding…' : 'Add'}
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white mb-3">Entries by project</h2>
        {projects.length === 0 ? (
          <p className="text-slate-500">No projects yet. Create a project in the Projects tab first.</p>
        ) : (
          <div className="space-y-6">
            {projects.map((p) => (
              <div key={p.id} className="bg-vault-card border border-vault-border rounded-xl overflow-hidden">
                <h3 className="p-4 border-b border-vault-border text-white font-medium">{p.name}</h3>
                {(entriesByProject[p.id]?.length ?? 0) === 0 ? (
                  <p className="p-4 text-slate-500 text-sm">No revenue or expense entries yet.</p>
                ) : (
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-vault-border">
                        <th className="p-3 text-slate-400 font-medium">Type</th>
                        <th className="p-3 text-slate-400 font-medium">Amount (₹)</th>
                        <th className="p-3 text-slate-400 font-medium">Period</th>
                        <th className="p-3 text-slate-400 font-medium">Date</th>
                        <th className="p-3 text-slate-400 font-medium">Notes</th>
                        <th className="p-3 text-slate-400 font-medium"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(entriesByProject[p.id] ?? []).map((e) => (
                        <tr key={e.id} className="border-b border-vault-border/50">
                          <td className="p-3 text-slate-300">
                            {e.type === 'MONTHLY_REVENUE' ? 'Monthly revenue' : e.type === 'ONE_TIME_REVENUE' ? 'One-time revenue' : 'Expense'}
                          </td>
                          <td className={`p-3 font-medium ${e.type === 'EXPENSE' ? 'text-red-400' : 'text-green-400'}`}>
                            {e.type === 'EXPENSE' ? '-' : ''}₹{Number(e.amount).toLocaleString('en-IN')}
                          </td>
                          <td className="p-3 text-slate-300">{e.periodMonth ?? '-'}</td>
                          <td className="p-3 text-slate-300">{new Date(e.entryDate).toLocaleDateString()}</td>
                          <td className="p-3 text-slate-400 text-sm">{e.notes ?? '-'}</td>
                          <td className="p-3">
                            <button type="button" onClick={() => handleDelete(e.id)} className="text-red-400 hover:text-red-300 text-sm">Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
