import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Menu, X, Bell, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { menuGroups } from '../routes/menuConfig';

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const SidebarContent = () => (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 px-4 py-5 border-b border-blue-800">
        <h1 className="text-white font-bold text-lg">CV Wijaya ERP</h1>
        <p className="text-blue-200 text-xs mt-0.5">{user?.role_name}</p>
      </div>
      <nav className="min-h-0 flex-1 overflow-y-auto py-4 px-2">
        {menuGroups.map((group) => (
          <div key={group.label} className="mb-4">
            <p className="px-3 text-xs font-semibold text-blue-300 uppercase tracking-wider mb-1">{group.label}</p>
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm mb-0.5 transition ${
                      isActive ? 'bg-white/15 text-white font-medium' : 'text-blue-100 hover:bg-white/10'
                    }`
                  }
                >
                  <Icon size={18} />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className={`fixed inset-y-0 left-0 z-40 flex h-full w-64 flex-col overflow-hidden bg-blue-900 transition-transform duration-300 lg:static lg:shrink-0 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <SidebarContent />
      </aside>

      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="shrink-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between z-20">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2 hover:bg-slate-100 rounded-lg">
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <button className="p-2 hover:bg-slate-100 rounded-lg relative">
              <Bell size={20} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-700 rounded-full flex items-center justify-center text-white text-sm font-bold">
                {user?.name?.charAt(0)}
              </div>
              <span className="text-sm font-medium hidden sm:block">{user?.name}</span>
              <ChevronDown size={14} className="text-slate-400 hidden sm:block" />
            </div>
            <button onClick={handleLogout} className="p-2 hover:bg-red-50 text-red-600 rounded-lg" title="Logout">
              <LogOut size={20} />
            </button>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
