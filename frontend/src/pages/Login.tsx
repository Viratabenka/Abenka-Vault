import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed -z-10"
        style={{ backgroundImage: "url('/abenka-background.png')" }}
        aria-hidden
      />
      <div className="absolute inset-0 bg-vault-dark/70 -z-[5]" aria-hidden />
      <div className="w-full max-w-md relative z-0">
        <h1 className="font-display text-3xl font-bold text-white text-center mb-2">
          Abenka Vault
        </h1>
        <div className="flex justify-center mb-2">
          <img src="/logo.png" alt="" className="h-24 w-auto object-contain" aria-hidden />
        </div>
        <p className="text-slate-400 text-center mb-8">Secure equity, clear contributions.</p>
        <form
          onSubmit={handleSubmit}
          className="bg-vault-card border border-vault-border rounded-xl p-8 shadow-xl"
        >
          <h2 className="text-lg font-semibold text-white mb-6">Sign in</h2>
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 text-red-400 text-sm">{error}</div>
          )}
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm text-slate-400 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 rounded-lg bg-vault-dark border border-vault-border text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm text-slate-400 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2 rounded-lg bg-vault-dark border border-vault-border text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-medium disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
