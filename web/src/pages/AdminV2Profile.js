/**
 * Admin · Profile — admin identity + system snapshot + permissions + audit.
 *
 * Source: GET /api/admin/mobile/profile (role-agnostic admin data + snapshot + links)
 */
import { useEffect, useState, useCallback } from 'react';
import { useLang } from '../contexts/LanguageContext';
import { useAuth } from '@/App';
import { useNavigate } from 'react-router-dom';
import { Shield, ShieldCheck, ShieldAlert, KeyRound, User, LogOut, Activity, ExternalLink } from 'lucide-react';

import { runtime } from '@/runtime';
import TwoFactorSetupModal from '@/components/TwoFactorSetupModal';
export default function AdminV2Profile() {
  const { tByEn } = useLang();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [security, setSecurity] = useState(null);
  const [setupModalOpen, setSetupModalOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await runtime.get(`/api/admin/mobile/profile`);
      setData(r.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
    // 2FA status — independent of profile load, ok to fail silently
    try {
      const s = await runtime.get(`/api/account/me/2fa/recovery-codes/status`);
      setSecurity(s.data);
    } catch {
      setSecurity({ enabled: false, total: 0, unused: 0 });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleLogout = async () => {
    if (!window.confirm('Sign out of admin session?')) return;
    await logout();
    navigate('/');
  };

  const admin = data?.admin || {
    id: user?.user_id,
    name: user?.name || 'Admin',
    email: user?.email,
    role: 'admin',
  };

  return (
    <div className="p-6 max-w-7xl mx-auto" data-testid="admin-profile">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{tByEn('Profile')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{tByEn('Admin identity · permissions · audit')}</p>
      </div>

      {/* Identity */}
      <div className="bg-card border border-emerald-500/30 rounded-xl p-6 mb-6" data-testid="admin-identity">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-signal/15 flex items-center justify-center border border-border">
            <Shield className="w-7 h-7 text-emerald-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[10px] bg-emerald-500/20 text-emerald-400 rounded uppercase tracking-wider font-bold">
                {admin.role || 'admin'}
              </span>
            </div>
            <h2 className="text-2xl font-bold mt-1">{admin.name}</h2>
            <p className="text-sm text-muted-foreground">{admin.email}</p>
          </div>
        </div>
      </div>

      {/* Snapshot */}
      {data?.snapshot && (
        <div className="bg-card border border-border rounded-xl p-6 mb-6" data-testid="admin-snapshot">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-4">
            {tByEn('System snapshot')}
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <SnapItem label="Active developers" value={data.snapshot.active_devs} />
            <SnapItem label="Active modules" value={data.snapshot.active_modules} />
            <SnapItem
              label="QA pending"
              value={data.snapshot.qa_pending}
              highlight={data.snapshot.qa_pending > 0}
            />
          </div>
        </div>
      )}

      {/* Permissions (static for v1 — admin has full access) */}
      <div className="bg-card border border-border rounded-xl p-6 mb-6" data-testid="admin-permissions">
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-4">
          {tByEn('Permissions')}
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {[
            'Module QA decisions',
            'Withdrawal approvals',
            'Payout batch dispatch',
            'Team management',
            'System settings',
            'Audit log access',
          ].map((p) => (
            <div key={p} className="flex items-center gap-2 text-sm">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>{p}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Security · 2FA (inline, lives inside Profile per UX policy) */}
      <div className="bg-card border border-border rounded-xl p-6 mb-6" data-testid="admin-security">
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-4">
          {tByEn('Security')}
        </h3>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${security?.enabled ? 'bg-success/10 border-success/30' : 'bg-warning/10 border-warning/30'}`}>
              {security?.enabled
                ? <ShieldCheck className="w-5 h-5 text-success" />
                : <ShieldAlert className="w-5 h-5 text-warning" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold">{tByEn('Two-factor authentication')}</p>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                  security?.enabled ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'
                }`}>{security?.enabled ? 'Enabled' : 'Disabled'}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {security?.enabled
                  ? `Authenticator required at sign-in · ${security?.unused ?? 0}/${security?.total ?? 0} recovery codes`
                  : 'Anyone with your password can sign in. Turn on a 6-digit code from your authenticator app.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (security?.enabled) {
                navigate('/account/2fa/recovery');
              } else {
                setSetupModalOpen(true);
              }
            }}
            data-testid="admin-2fa-action-btn"
            className={`shrink-0 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
              security?.enabled
                ? 'bg-muted hover:bg-muted/70 text-foreground border border-border'
                : 'bg-signal text-[var(--t-signal-ink)] hover:opacity-90'
            }`}
          >
            {security?.enabled ? (
              <span className="flex items-center gap-2"><KeyRound className="w-4 h-4" /> {tByEn('Manage')}</span>
            ) : (
              'Enable 2FA'
            )}
          </button>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        <button
          onClick={() => navigate('/admin/dashboard')}
          className="flex items-center gap-3 bg-card hover:bg-muted border border-border rounded-xl p-4 transition-colors"
          data-testid="nav-dashboard-btn"
        >
          <Activity className="w-5 h-5 text-emerald-400" />
          <div className="flex-1 text-left">
            <p className="font-bold">{tByEn('Dashboard')}</p>
            <p className="text-xs text-muted-foreground">{tByEn('Open live operations')}</p>
          </div>
          <ExternalLink className="w-4 h-4 text-muted-foreground" />
        </button>
        <button
          onClick={() => navigate('/admin/system')}
          className="flex items-center gap-3 bg-card hover:bg-muted border border-border rounded-xl p-4 transition-colors"
          data-testid="nav-system-btn"
        >
          <User className="w-5 h-5 text-emerald-400" />
          <div className="flex-1 text-left">
            <p className="font-bold">{tByEn('System & audit log')}</p>
            <p className="text-xs text-muted-foreground">{tByEn('Integrations · templates · actions')}</p>
          </div>
          <ExternalLink className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl font-bold transition-colors"
        data-testid="admin-logout-btn"
      >
        <LogOut className="w-4 h-4" />
        {tByEn('Logout')}
      </button>

      {loading && <p className="text-center text-muted-foreground text-sm mt-6">Loading…</p>}

      <TwoFactorSetupModal
        open={setupModalOpen}
        onClose={() => setSetupModalOpen(false)}
        onEnabled={() => {
          // refresh security status after enabling
          load();
        }}
      />
    </div>
  );
}

function SnapItem({ label, value, highlight }) {
  return (
    <div className="text-center">
      <p className={`text-3xl font-bold ${highlight ? 'text-amber-400' : 'text-foreground'}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}
