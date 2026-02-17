import { Outlet, Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col relative">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed -z-10"
        style={{ backgroundImage: "url('/abenka-background.png')" }}
        aria-hidden
      />
      <div className="absolute inset-0 bg-vault-dark/70 -z-[5]" aria-hidden />
      <header className="bg-vault-card/90 border-b border-vault-border px-6 py-4 flex items-center justify-between backdrop-blur-sm">
        <Link to="/" className="font-display font-semibold text-xl text-white hover:opacity-90">
          Abenka Vault
        </Link>
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="" className="h-14 w-auto object-contain" aria-hidden />
          <p className="text-slate-400 text-sm">Where contributions meet equity.</p>
        </div>
        <nav className="flex items-center gap-6">
          <NavLink
            to="/dashboard"
            end
            className={({ isActive }) =>
              `text-sm font-medium transition-colors py-1 border-b-2 ${
                isActive
                  ? 'text-white border-white'
                  : 'text-slate-300 hover:text-white border-transparent'
              }`
            }
          >
            My dashboard
          </NavLink>
          <NavLink
            to="/projects"
            className={({ isActive }) =>
              `text-sm font-medium transition-colors py-1 border-b-2 ${
                isActive
                  ? 'text-white border-white'
                  : 'text-slate-300 hover:text-white border-transparent'
              }`
            }
          >
            Projects
          </NavLink>
          <NavLink
            to="/company"
            end
            className={({ isActive }) =>
              `text-sm font-medium transition-colors py-1 border-b-2 ${
                isActive
                  ? 'text-white border-white'
                  : 'text-slate-300 hover:text-white border-transparent'
              }`
            }
          >
            Company
          </NavLink>
          {user?.role === 'ADMIN' && (
            <NavLink
              to="/revenue"
              end
              className={({ isActive }) =>
                `text-sm font-medium transition-colors py-1 border-b-2 ${
                  isActive
                    ? 'text-white border-white'
                    : 'text-slate-300 hover:text-white border-transparent'
                }`
              }
            >
              Revenue
            </NavLink>
          )}
          <span className="text-teal-400">{user?.name}</span>
          <button
            type="button"
            onClick={handleLogout}
            className="text-slate-400 hover:text-white text-sm"
          >
            Log out
          </button>
        </nav>
      </header>
      <main className="flex-1 p-6 relative z-0">
        <Outlet />
      </main>
    </div>
  );
}
