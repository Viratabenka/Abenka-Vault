import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-vault-card border-b border-vault-border px-6 py-4 flex items-center justify-between">
        <Link to="/" className="font-display font-semibold text-xl text-white">
          Abenka Vault
        </Link>
        <p className="text-slate-400 text-sm">Secure equity, clear contributions.</p>
        <nav className="flex items-center gap-6">
          <Link to="/dashboard" className="text-slate-300 hover:text-white">
            My dashboard
          </Link>
          <Link to="/projects" className="text-slate-300 hover:text-white">
            Projects
          </Link>
          <Link to="/company" className="text-slate-300 hover:text-white">
            Company
          </Link>
          {user?.role === 'ADMIN' && (
            <Link to="/revenue" className="text-slate-300 hover:text-white">
              Revenue
            </Link>
          )}
          <span className="text-slate-500">{user?.name}</span>
          <button
            type="button"
            onClick={handleLogout}
            className="text-slate-400 hover:text-white text-sm"
          >
            Log out
          </button>
        </nav>
      </header>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}
