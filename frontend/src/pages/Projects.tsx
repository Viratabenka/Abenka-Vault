import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { projectsApi } from '../api/client';

type Project = {
  id: string;
  name: string;
  owner?: { id: string; name: string };
  members?: Array<{ user: { id: string; name: string; email: string } }>;
};

export default function Projects() {
  const { user } = useAuth();
  const [list, setList] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'ACCOUNTANT';

  useEffect(() => {
    projectsApi.list().then(setList).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await projectsApi.create({ name, startDate });
      setName('');
      setStartDate('');
      setShowForm(false);
      const next = await projectsApi.list();
      setList(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-slate-400">Loading projects…</div>;
  if (error) return <div className="text-red-400">{error}</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold text-white">Projects</h1>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium"
        >
          {showForm ? 'Cancel' : 'New project'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mb-6 p-5 bg-vault-card border border-vault-border rounded-xl space-y-4"
        >
          <div>
            <label className="block text-sm text-slate-400 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-2 rounded-lg bg-vault-dark border border-vault-border text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Start date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              className="w-full px-4 py-2 rounded-lg bg-vault-dark border border-vault-border text-white"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm disabled:opacity-50"
          >
            Create
          </button>
        </form>
      )}

      <div className="space-y-2">
        {list.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between p-4 bg-vault-card border border-vault-border rounded-xl hover:border-brand-500/50 transition"
          >
            <Link to={`/projects/${p.id}`} className="flex-1 min-w-0">
              <span className="font-medium text-white">{p.name}</span>
              {p.owner && <span className="ml-2 text-slate-400 text-sm">— {p.owner.name}</span>}
              {p.members && p.members.length > 0 && (
                <span className="ml-2 text-slate-500 text-xs">
                  · {p.members.length} user{p.members.length !== 1 ? 's' : ''} assigned
                </span>
              )}
            </Link>
            {isAdmin && (
              <Link
                to={`/projects/${p.id}`}
                className="ml-3 px-3 py-1.5 rounded-lg bg-vault-dark border border-vault-border text-slate-300 hover:text-white text-sm shrink-0"
              >
                Assign users
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
