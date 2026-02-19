import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authApi, usersApi } from '../api/client';

type UserRow = { id: string; name: string; email: string; role: string };

export default function UserManagement() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addName, setAddName] = useState('');
  const [addRole, setAddRole] = useState<'FOUNDER' | 'ADMIN'>('FOUNDER');
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addSuccess, setAddSuccess] = useState<{ tempPassword: string; email: string } | null>(null);
  const [passwordUserId, setPasswordUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [removeUserId, setRemoveUserId] = useState<string | null>(null);
  const [removeSubmitting, setRemoveSubmitting] = useState(false);

  const isAdmin = user?.role === 'ADMIN';

  const loadUsers = () => {
    usersApi.list().then(setUsers).catch((e) => setError(e.message)).finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    loadUsers();
  }, [isAdmin]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setAddSubmitting(true);
    setAddSuccess(null);
    try {
      const res = await authApi.invite(addEmail.trim(), addName.trim(), addRole);
      setAddSuccess({ tempPassword: res.tempPassword ?? '', email: res.email });
      setAddEmail('');
      setAddName('');
      setAddRole('FOUNDER');
      loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add user');
    } finally {
      setAddSubmitting(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordUserId || newPassword.length < 6) return;
    if (newPassword !== newPasswordConfirm) {
      setError('Passwords do not match');
      return;
    }
    setError('');
    setPasswordSubmitting(true);
    try {
      await usersApi.setPassword(passwordUserId, newPassword);
      setPasswordUserId(null);
      setNewPassword('');
      setNewPasswordConfirm('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set password');
    } finally {
      setPasswordSubmitting(false);
    }
  };

  const handleRemove = async () => {
    if (!removeUserId) return;
    setError('');
    setRemoveSubmitting(true);
    try {
      await usersApi.delete(removeUserId);
      setRemoveUserId(null);
      loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove user');
    } finally {
      setRemoveSubmitting(false);
    }
  };

  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  if (loading) return <div className="text-slate-400">Loading users…</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <header>
        <h1 className="font-display text-2xl font-semibold text-white">User management</h1>
        <p className="text-slate-400 text-sm mt-1">Add users, change passwords, and remove users (Admin only)</p>
      </header>

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 text-red-400 text-sm border border-red-500/30">
          {error}
        </div>
      )}

      {addSuccess && (
        <div className="p-4 rounded-lg bg-green-500/10 text-green-400 text-sm border border-green-500/30">
          User added. Email: {addSuccess.email}. Temporary password: <strong>{addSuccess.tempPassword}</strong>{' '}
          — share securely and ask them to change on first login.
        </div>
      )}

      <section className="bg-vault-card border border-vault-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-vault-border">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Add user</p>
          <h2 className="text-lg font-semibold text-white mt-0.5">Invite a new user</h2>
        </div>
        <form onSubmit={handleAddUser} className="p-6 flex flex-wrap gap-4 items-end">
          <div className="min-w-[200px]">
            <label className="block text-slate-400 text-sm mb-1">Email</label>
            <input
              type="email"
              value={addEmail}
              onChange={(e) => setAddEmail(e.target.value)}
              required
              className="w-full px-4 py-2 rounded-lg bg-vault-dark border border-vault-border text-white focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div className="min-w-[180px]">
            <label className="block text-slate-400 text-sm mb-1">Name</label>
            <input
              type="text"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              required
              className="w-full px-4 py-2 rounded-lg bg-vault-dark border border-vault-border text-white focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div className="min-w-[120px]">
            <label className="block text-slate-400 text-sm mb-1">Role</label>
            <select
              value={addRole}
              onChange={(e) => setAddRole(e.target.value as 'FOUNDER' | 'ADMIN')}
              className="w-full px-4 py-2 rounded-lg bg-vault-dark border border-vault-border text-white focus:ring-2 focus:ring-brand-500"
            >
              <option value="FOUNDER">Founder</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={addSubmitting}
            className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-medium disabled:opacity-50"
          >
            {addSubmitting ? 'Adding…' : 'Add user'}
          </button>
        </form>
      </section>

      <section className="bg-vault-card border border-vault-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-vault-border">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Users</p>
          <h2 className="text-lg font-semibold text-white mt-0.5">All users</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-vault-border bg-vault-dark/40">
                <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-slate-500">Name</th>
                <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-slate-500">Email</th>
                <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-slate-500">Role</th>
                <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-vault-border/50 hover:bg-vault-dark/20">
                  <td className="px-6 py-3 text-white font-medium">{u.name}</td>
                  <td className="px-6 py-3 text-slate-300 text-sm">{u.email}</td>
                  <td className="px-6 py-3 text-slate-300 text-sm">{u.role}</td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPasswordUserId(u.id);
                          setNewPassword('');
                          setNewPasswordConfirm('');
                          setError('');
                        }}
                        className="text-sm text-brand-400 hover:text-brand-300"
                      >
                        Change password
                      </button>
                      {u.id !== user?.id && (
                        <button
                          type="button"
                          onClick={() => {
                            setRemoveUserId(u.id);
                            setError('');
                          }}
                          className="text-sm text-red-400 hover:text-red-300"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {passwordUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-vault-card border border-vault-border rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-white mb-4">Set new password</h3>
            <form onSubmit={handleSetPassword} className="space-y-4">
              <div>
                <label className="block text-slate-400 text-sm mb-1">New password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={6}
                  required
                  className="w-full px-4 py-2 rounded-lg bg-vault-dark border border-vault-border text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-sm mb-1">Confirm new password</label>
                <input
                  type="password"
                  value={newPasswordConfirm}
                  onChange={(e) => setNewPasswordConfirm(e.target.value)}
                  minLength={6}
                  required
                  className="w-full px-4 py-2 rounded-lg bg-vault-dark border border-vault-border text-white"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setPasswordUserId(null);
                    setNewPassword('');
                    setNewPasswordConfirm('');
                  }}
                  className="px-4 py-2 rounded-lg border border-vault-border text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordSubmitting}
                  className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-medium disabled:opacity-50"
                >
                  {passwordSubmitting ? 'Saving…' : 'Set password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {removeUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-vault-card border border-vault-border rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-white mb-2">Remove user</h3>
            <p className="text-slate-400 text-sm mb-4">
              This will permanently delete the user and their related data. This cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setRemoveUserId(null)}
                className="px-4 py-2 rounded-lg border border-vault-border text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRemove}
                disabled={removeSubmitting}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium disabled:opacity-50"
              >
                {removeSubmitting ? 'Removing…' : 'Remove user'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
