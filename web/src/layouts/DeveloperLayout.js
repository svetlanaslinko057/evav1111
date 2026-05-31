import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/App';
import { ConnectionStatusBadge } from '@/components/ConnectionStatus';
import NotificationBell from '@/components/NotificationBell';
import ThemeToggle from '@/components/ThemeToggle';
import { Home, DollarSign, LogOut, User, Trophy, Monitor, ShoppingCart, Inbox, Sparkles } from 'lucide-react';
import Logo from '@/components/Logo';
import MobileNav from '@/components/MobileNav';
import { useLang } from '@/contexts/LanguageContext';

const DeveloperLayout = () => {
  const { tByEn } = useLang();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex" data-testid="developer-layout">
      <MobileNav role="developer" />
      {/* Sidebar */}
      <aside className="app-sidebar w-[240px] border-r border-border flex flex-col sticky top-0 h-screen bg-card app-safe-top">
        {/* Logo Section */}
        <div className="px-4 pt-6 pb-4">
          <div className="flex items-center">
            <Logo height={32} className="h-8 w-auto max-w-full" />
          </div>
          <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">{tByEn('Ship code. Earn rewards.')}</p>
          <div className="mt-2 flex items-center gap-2">
            <ConnectionStatusBadge />
            <NotificationBell />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          <NavItem to="/developer/dashboard" icon={<Home className="w-[18px] h-[18px]" />} label={tByEn("Dashboard")} />
          <NavItem to="/developer/acceptance" icon={<Inbox className="w-[18px] h-[18px]" />} label={tByEn("Acceptance")} />
          <NavItem to="/developer/marketplace" icon={<ShoppingCart className="w-[18px] h-[18px]" />} label={tByEn("Marketplace")} />
          <NavItem to="/developer/workspace" icon={<Monitor className="w-[18px] h-[18px]" />} label={tByEn("Workspace")} />
          <NavItem to="/developer/earnings" icon={<DollarSign className="w-[18px] h-[18px]" />} label={tByEn("Earnings")} />
          <NavItem to="/developer/validation" icon={<Sparkles className="w-[18px] h-[18px]" />} label={tByEn("Validation")} />
          <NavItem to="/developer/profile" icon={<User className="w-[18px] h-[18px]" />} label={tByEn("Profile")} />
          <NavItem to="/developer/leaderboard" icon={<Trophy className="w-[18px] h-[18px]" />} label={tByEn("Leaderboard")} />
        </nav>

        {/* User */}
        <div className="p-3 border-t border-border">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{tByEn('Theme')}</span>
            <ThemeToggle />
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted border border-border">
            <div className="w-9 h-9 rounded-lg bg-signal/15 flex items-center justify-center font-semibold text-sm border border-border">
              {user?.name?.[0]?.toUpperCase() || 'D'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name || tByEn('Developer')}</p>
              <p className="text-[11px] text-muted-foreground capitalize">{user?.level || tByEn('Developer')}</p>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
              data-testid="logout-btn"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="app-main flex-1 min-h-screen overflow-auto bg-background">
        <Outlet />
      </main>
    </div>
  );
};

const NavItem = ({ to, icon, label, badge }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
        isActive 
          ? 'bg-signal/10 text-foreground border border-signal/30' 
          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
      }`
    }
  >
    {icon}
    <span className="flex-1">{label}</span>
    {badge && (
      <span className="px-2 py-0.5 text-xs bg-signal/15 text-signal rounded-full">{badge}</span>
    )}
  </NavLink>
);

export default DeveloperLayout;
