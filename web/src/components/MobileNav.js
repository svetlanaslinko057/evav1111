import { useState, useEffect, useCallback } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Menu, X, LogOut, User,
  LayoutDashboard, GitBranch, ShieldCheck, DollarSign, Users,
  Settings, Brain, Map, ShieldAlert, Inbox, Wallet, Image as ImageIcon,
  Home, Folder, Bell, Gift, Trophy, Activity, Sparkles,
  Monitor, ShoppingCart, Terminal, Coins, ListChecks, Radar, FolderKanban,
} from 'lucide-react';
import { useAuth } from '@/App';
import { useTheme } from '@/contexts/ThemeContext';
import { ConnectionStatusBadge } from '@/components/ConnectionStatus';
import NotificationBell from '@/components/NotificationBell';
import ThemeToggle from '@/components/ThemeToggle';
import Logo from '@/components/Logo';
import { useLang } from '@/contexts/LanguageContext';

/* ============================================================================
 * MobileNav — single-file home for all mobile (<768px) nav primitives.
 *
 *   - useIsMobile()       — matchMedia hook, true when viewport < 768px.
 *   - MobileTopBar        — 56px sticky header (hamburger + logo + bell + theme).
 *   - MobileDrawer        — slide-in left drawer with full nav + theme + logout.
 *   - MobileBottomNav     — fixed 4-5 item bottom nav per role.
 *   - MobileNav           — convenience wrapper that renders all three.
 *
 * Strategy:
 *   • The four desktop layouts (AdminLayout/Client/Developer/Tester) keep their
 *     existing sidebar/main markup. They additionally render <MobileNav role="x" />.
 *   • mobile.css hides the desktop sidebar on <768px, shows mobile primitives.
 *   • On >=768px, mobile.css hides MobileNav primitives via display:none.
 *
 * No heavy gesture libs — pure React state + CSS transitions.
 * ============================================================================ */

/* ---- Hook: useIsMobile ---------------------------------------------------- */
export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia(`(max-width: ${breakpoint - 0.02}px)`).matches
      : false
  );
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia(`(max-width: ${breakpoint - 0.02}px)`);
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener
      ? mq.addEventListener('change', handler)
      : mq.addListener(handler);
    return () => {
      mq.removeEventListener
        ? mq.removeEventListener('change', handler)
        : mq.removeListener(handler);
    };
  }, [breakpoint]);
  return isMobile;
}

/* ---- Body scroll lock helper --------------------------------------------- */
function useBodyScrollLock(active) {
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    if (active) document.body.setAttribute('data-mobile-overlay', 'true');
    else document.body.removeAttribute('data-mobile-overlay');
    return () => document.body.removeAttribute('data-mobile-overlay');
  }, [active]);
}

/* ---- Drawer navigation maps per role -------------------------------------- */
const DRAWER_MAPS = {
  admin: {
    label: 'Admin',
    groups: [
      {
        label: 'Operations',
        items: [
          { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
          { to: '/admin/leads',     icon: Inbox,           label: 'Leads' },
          { to: '/admin/execution-intelligence', icon: Brain, label: 'Cognition' },
          { to: '/admin/pressure-topology',      icon: Map,   label: 'Topology' },
          { to: '/admin/workflow',  icon: GitBranch,       label: 'Workflow' },
          { to: '/admin/qa',        icon: ShieldCheck,     label: 'QA' },
        ],
      },
      {
        label: 'Resources',
        items: [
          { to: '/admin/finance',    icon: DollarSign, label: 'Finance' },
          { to: '/admin/payouts-v2', icon: Wallet,     label: 'Payouts' },
          { to: '/admin/team',       icon: Users,      label: 'Team' },
        ],
      },
      {
        label: 'System',
        items: [
          { to: '/admin/system',    icon: Settings,  label: 'System' },
          { to: '/admin/portfolio', icon: ImageIcon, label: 'Portfolio' },
          { to: '/admin/profile',   icon: User,      label: 'Profile' },
        ],
      },
    ],
  },
  client: {
    label: 'Client',
    groups: [
      {
        label: 'Workspace',
        items: [
          { to: '/client/dashboard',    icon: Home,      label: 'Home' },
          { to: '/client/projects',     icon: Folder,    label: 'Projects' },
          { to: '/client/transparency', icon: Activity,  label: 'Transparency' },
          { to: '/client/validation',   icon: Sparkles,  label: 'Validation' },
        ],
      },
      {
        label: 'Community',
        items: [
          { to: '/client/referrals',   icon: Gift,    label: 'Referrals' },
          { to: '/client/leaderboard', icon: Trophy,  label: 'Leaderboard' },
          { to: '/client/profile',     icon: User,    label: 'My Profile' },
        ],
      },
    ],
  },
  developer: {
    label: 'Developer',
    groups: [
      {
        label: 'Work',
        items: [
          { to: '/developer/dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
          { to: '/developer/acceptance',  icon: Inbox,           label: 'Acceptance' },
          { to: '/developer/marketplace', icon: ShoppingCart,    label: 'Marketplace' },
          { to: '/developer/workspace',   icon: Monitor,         label: 'Workspace' },
        ],
      },
      {
        label: 'Account',
        items: [
          { to: '/developer/earnings',    icon: DollarSign, label: 'Earnings' },
          { to: '/developer/performance', icon: Trophy,     label: 'Performance' },
          { to: '/developer/profile',     icon: User,       label: 'Profile' },
        ],
      },
    ],
  },
  tester: {
    label: 'Tester',
    groups: [
      {
        label: 'QA',
        items: [
          { to: '/tester/hub',     icon: Radar,       label: 'Hub' },
          { to: '/tester/queue',   icon: ListChecks,  label: 'Queue' },
        ],
      },
      {
        label: 'Account',
        items: [
          { to: '/tester/profile', icon: User, label: 'Profile' },
        ],
      },
    ],
  },
};

/* ---- Bottom-nav maps per role (4-5 items only) --------------------------- */
const BOTTOM_NAV = {
  admin: [
    { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/workflow',  icon: GitBranch,       label: 'Workflow' },
    { to: '/admin/finance',   icon: Wallet,          label: 'Finance' },
    { to: '/admin/team',      icon: Users,           label: 'Team' },
    { to: '/admin/profile',   icon: User,            label: 'Profile' },
  ],
  client: [
    { to: '/client/dashboard',    icon: Home,         label: 'Home' },
    { to: '/client/projects',     icon: FolderKanban, label: 'Projects' },
    { to: '/client/transparency', icon: Activity,     label: 'Status' },
    { to: '/client/profile',      icon: User,         label: 'Profile' },
  ],
  developer: [
    { to: '/developer/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/developer/workspace', icon: Terminal,        label: 'Workspace' },
    { to: '/developer/earnings',  icon: Coins,           label: 'Earnings' },
    { to: '/developer/profile',   icon: User,            label: 'Profile' },
  ],
  tester: [
    { to: '/tester/hub',     icon: Radar,       label: 'Hub' },
    { to: '/tester/queue',   icon: ListChecks,  label: 'Queue' },
    { to: '/tester/profile', icon: User,        label: 'Profile' },
  ],
};

/* ============================================================================
 * <MobileTopBar />
 * ============================================================================ */
export function MobileTopBar({ onOpenDrawer, roleLabel }) {
  const { tByEn } = useLang();
  return (
    <header className="m-topbar" data-testid="mobile-topbar">
      <div className="m-topbar__left">
        <button
          type="button"
          className="m-topbar__btn"
          onClick={onOpenDrawer}
          aria-label={tByEn('Open navigation menu')}
          data-testid="mobile-topbar-hamburger-button"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>
      <Logo height={26} className="m-topbar__logo" testId="mobile-topbar-logo" />
      <div className="m-topbar__right">
        <NotificationBell />
      </div>
    </header>
  );
}

/* ============================================================================
 * <MobileDrawer />
 * ============================================================================ */
export function MobileDrawer({ open, onClose, role }) {
  const { tByEn } = useLang();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  useBodyScrollLock(open);

  // Close on route change
  useEffect(() => {
    if (open) onClose?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // ESC to close
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const handleLogout = async () => {
    onClose?.();
    await logout();
    navigate('/');
  };

  const map = DRAWER_MAPS[role] || DRAWER_MAPS.client;

  return (
    <>
      <div
        className="m-drawer-backdrop"
        data-open={open}
        onClick={onClose}
        data-testid="mobile-drawer-backdrop"
      />
      <aside
        className="m-drawer"
        data-open={open}
        aria-hidden={!open}
        role="dialog"
        aria-modal="true"
        aria-label={tByEn('Navigation drawer')}
        data-testid="mobile-drawer"
      >
        <div className="m-drawer__header">
          <Logo height={26} />
          <button
            type="button"
            className="m-drawer__close"
            onClick={onClose}
            aria-label={tByEn('Close menu')}
            data-testid="mobile-drawer-close-button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 pb-2">
          <div className="flex items-center gap-2">
            <ConnectionStatusBadge />
            <span className="text-[11px] uppercase tracking-wider text-token-muted font-semibold">
              {map.label}
            </span>
          </div>
        </div>

        <nav className="m-drawer__nav" data-testid="mobile-drawer-nav">
          {map.groups.map((group) => (
            <div key={group.label}>
              <span className="m-drawer__group-label">{group.label}</span>
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = location.pathname === item.to ||
                  location.pathname.startsWith(item.to + '/');
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    data-active={active}
                    data-testid={`mobile-drawer-nav-${item.to.replace(/\//g, '-')}`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="m-drawer__footer">
          <div className="m-drawer__footer-row">
            <span className="text-[11px] uppercase tracking-wider text-token-muted font-semibold">Theme</span>
            <ThemeToggle data-testid="mobile-drawer-theme-toggle" />
          </div>
          <div
            className="flex items-center gap-3 p-3 rounded-xl"
            style={{
              background: 'var(--token-surface-elevated)',
              border: '1px solid var(--token-border)',
            }}
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center font-semibold text-sm"
              style={{
                background: 'var(--token-success-tint, rgba(46,191,111,0.15))',
                color: 'var(--token-primary, #2EBF6F)',
                border: '1px solid var(--token-success-border, rgba(46,191,111,0.3))',
              }}
            >
              {user?.name?.[0]?.toUpperCase() || (map.label[0] || 'U')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-token-primary">{user?.name || 'User'}</p>
              <p className="text-[11px] text-token-muted capitalize truncate">{user?.active_role || user?.role || ''}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="p-2 rounded-lg transition-colors text-token-muted hover:text-token-primary"
              aria-label={tByEn('Sign out')}
              data-testid="mobile-drawer-signout-button"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

/* ============================================================================
 * <MobileBottomNav />
 * ============================================================================ */
export function MobileBottomNav({ role }) {
  const location = useLocation();
  const items = BOTTOM_NAV[role] || BOTTOM_NAV.client;

  return (
    <nav className="m-bottomnav" data-testid="mobile-bottomnav" role="navigation" aria-label={tByEn('Primary mobile')}>
      {items.map((item) => {
        const Icon = item.icon;
        const active = location.pathname === item.to ||
          location.pathname.startsWith(item.to + '/');
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className="m-bottomnav__item"
            data-active={active}
            data-testid={`bottomnav-${role}-${item.to.replace(/\//g, '-')}`}
          >
            <Icon />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

/* ============================================================================
 * <MobileNav />  — single mount point used by all 4 layouts
 *
 * Usage in layout:
 *   <MobileNav role="admin" />     // (or "client" / "developer" / "tester")
 * ============================================================================ */
export default function MobileNav({ role = 'client' }) {
  const { tByEn } = useLang();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  return (
    <>
      <MobileTopBar onOpenDrawer={openDrawer} roleLabel={DRAWER_MAPS[role]?.label} />
      <MobileDrawer open={drawerOpen} onClose={closeDrawer} role={role} />
      <MobileBottomNav role={role} />
    </>
  );
}
