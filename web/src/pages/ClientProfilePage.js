/**
 * Client Profile · web cabinet
 *
 * Mirrors the Expo `app/client/profile.tsx` layout, adapted for desktop:
 *   • Identity hero (avatar, name, email)
 *   • Quick stats (active projects, total invested, member since)
 *   • Editable account details (name, phone, company, timezone, language)
 *   • Email change flow (OTP) — delegated to /account
 *   • Password & 2FA management — link to /account/2fa/recovery
 *   • Account actions: documents, referrals, support, data export, sign-out
 *
 * Backend authority — no client-side math; pure projections from:
 *   GET  /api/account/me
 *   GET  /api/projects/mine
 *   GET  /api/client/owner-summary  (fallback: /api/client/costs)
 *   PATCH /api/account/me
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import { useLang } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/App';
import { runtime } from '@/runtime';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  User, Mail, Phone, Building2, Globe, Languages,
  ShieldCheck, KeyRound, FileText, Gift, LifeBuoy,
  Download, LogOut, Sparkles, Save, Pencil, X, Check, Camera,
} from 'lucide-react';

const fmtMoney = (n) => {
  const v = Number.isFinite(Number(n)) ? Number(n) : 0;
  return `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
};

const fmtMember = (iso) => {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  } catch { return '—'; }
};

export default function ClientProfilePage() {
  const { tByEn } = useLang();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [me, setMe] = useState(null);
  const [stats, setStats] = useState({ active_projects: 0, total_invested: 0, member_since: null });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', company: '', timezone: '', language: '' });
  const [savedToast, setSavedToast] = useState(false);
  const fileInputRef = useRef(null);

  // ── load identity + stats projections ──────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [meRes, projRes, ownerRes] = await Promise.all([
        runtime.get('/api/account/me').catch(() => null),
        runtime.get('/api/projects/mine').catch(() => null),
        runtime.get('/api/client/owner-summary').catch(() => null),
      ]);
      const meData = meRes?.data || null;
      setMe(meData);
      if (meData) {
        setForm({
          name: meData.name || '',
          phone: meData.phone || '',
          company: meData.company || '',
          timezone: meData.timezone || '',
          language: meData.language || '',
        });
      }
      const projects = Array.isArray(projRes?.data) ? projRes.data : (projRes?.data?.items || []);
      setStats({
        active_projects: projects.length,
        total_invested: ownerRes?.data?.invested ?? 0,
        member_since: meData?.created_at || user?.created_at || null,
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const onSave = async () => {
    setSaving(true);
    try {
      const payload = {};
      for (const k of ['name', 'phone', 'company', 'timezone', 'language']) {
        if ((form[k] || '') !== (me?.[k] || '')) payload[k] = form[k] || null;
      }
      if (Object.keys(payload).length === 0) { setEditing(false); return; }
      const r = await runtime.patch('/api/account/me', payload);
      setMe(r.data || me);
      setEditing(false);
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2400);
    } catch (e) {
      console.warn('profile save failed', e);
    } finally {
      setSaving(false);
    }
  };

  // ── avatar upload ──────────────────────────────────────────────
  const onAvatarPick = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const sigRes = await runtime.get('/api/account/me/avatar/signature').catch(() => null);
      const isMock = sigRes?.data?.mock === true;
      if (isMock) {
        // Mock provider — server accepts multipart and stores a placeholder URL.
        // NOTE: do NOT set Content-Type header manually — the browser will
        // attach the correct `multipart/form-data; boundary=…` automatically.
        const fd = new FormData();
        fd.append('file', file);
        const r = await runtime.post('/api/account/me/avatar', fd);
        if (r?.data?.avatar_url) {
          setMe({ ...(me || {}), avatar_url: r.data.avatar_url });
        }
      } else {
        // Real Cloudinary flow — upload directly then post the public_id back.
        // Falls back gracefully if anything fails.
        const fd = new FormData();
        Object.entries(sigRes.data || {}).forEach(([k, v]) => v != null && fd.append(k, String(v)));
        fd.append('file', file);
        const upload = await fetch(`https://api.cloudinary.com/v1_1/${sigRes.data.cloud_name}/image/upload`, {
          method: 'POST',
          body: fd,
        }).then((r) => r.json());
        if (upload?.public_id) {
          const r = await runtime.post('/api/account/me/avatar', {
            public_id: upload.public_id,
            secure_url: upload.secure_url,
          });
          if (r?.data) setMe(r.data);
        }
      }
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2400);
    } catch (e) {
      console.warn('avatar upload failed', e);
    } finally {
      setUploading(false);
    }
  };

  const initial = (me?.name || me?.email || 'C').trim().charAt(0).toUpperCase();

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto" data-testid="client-profile-loading">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-muted rounded-2xl" />
          <div className="h-48 bg-muted rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6" data-testid="client-profile">
      {/* ── Page title ────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="profile-page-title">{tByEn('My Profile')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{tByEn('Personal details, security, and account preferences.')}</p>
        </div>
        {savedToast && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--t-signal)]/15 text-[var(--t-signal)] text-sm font-medium border border-[var(--t-signal)]/30">
            <Check className="w-4 h-4" /> {tByEn('Saved')}
          </div>
        )}
      </div>

      {/* ── Identity hero ─────────────────────────────────────── */}
      <Card className="border border-border bg-card">
        <CardContent className="p-6 flex items-center gap-5">
          {/* Avatar (clickable for upload) */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => onAvatarPick(e.target.files?.[0])}
            data-testid="avatar-file-input"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="group relative w-20 h-20 rounded-2xl bg-[var(--t-signal)]/15 flex items-center justify-center text-2xl font-bold text-[var(--t-signal)] border border-border overflow-hidden cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--t-signal)]/40 transition-shadow shrink-0"
            aria-label={tByEn('Upload profile photo')}
            data-testid="avatar-upload-btn"
          >
            {me?.avatar_url ? (
              <img src={me.avatar_url} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <span>{initial}</span>
            )}
            <span className="absolute inset-0 bg-black/55 text-white opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold uppercase tracking-wide">
              <Camera className="w-5 h-5" />
              {uploading ? 'Uploading…' : 'Change'}
            </span>
          </button>

          {/* Right column: name + email + role inline */}
          <div className="flex-1 min-w-0 flex flex-col gap-1.5">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-bold text-foreground truncate" data-testid="profile-display-name">
                {me?.name || me?.email || 'Account'}
              </h2>
              {me?.role && (
                <span className="text-[11px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground">
                  {me.role}
                </span>
              )}
            </div>
            {me?.email && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
                <Mail className="w-4 h-4 shrink-0" />
                <span className="truncate" data-testid="profile-email-inline">{me.email}</span>
              </div>
            )}
            {!me?.name && (
              <p className="text-xs text-muted-foreground italic mt-0.5">
                {tByEn('Add your full name in')} <span className="font-semibold text-foreground">{tByEn('Account details')}</span> below — it appears on contracts and invoices.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Quick stats ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard testid="stat-projects" label={tByEn('Active projects')} value={String(stats.active_projects)} />
        <StatCard testid="stat-invested" label={tByEn('Total invested')} value={fmtMoney(stats.total_invested)} accent />
        <StatCard testid="stat-member" label={tByEn('Member since')} value={fmtMember(stats.member_since)} />
      </div>

      {/* ── Account details (editable) ────────────────────────── */}
      <Card className="border border-border bg-card" data-testid="profile-account-details">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <User className="w-5 h-5" /> {tByEn('Account details')}
          </CardTitle>
          {!editing ? (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)} data-testid="profile-edit-btn">
              <Pencil className="w-4 h-4 mr-1.5" /> {tByEn('Edit')}
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => { setEditing(false); setForm({ name: me?.name || '', phone: me?.phone || '', company: me?.company || '', timezone: me?.timezone || '', language: me?.language || '' }); }}>
                <X className="w-4 h-4 mr-1.5" /> {tByEn('Cancel')}
              </Button>
              <Button size="sm" onClick={onSave} disabled={saving} className="bg-[var(--t-signal)] text-[var(--t-signal-ink)] hover:opacity-90" data-testid="profile-save-btn">
                <Save className="w-4 h-4 mr-1.5" /> {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Full name" icon={<User className="w-4 h-4" />} value={form.name} onChange={(v) => setForm({ ...form, name: v })} editing={editing} placeholder={tByEn('Your full name')} testid="field-name" />
          <Field label={tByEn('Phone')} icon={<Phone className="w-4 h-4" />} value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} editing={editing} placeholder="+1 555 555 5555" testid="field-phone" />
          <Field label={tByEn('Company')} icon={<Building2 className="w-4 h-4" />} value={form.company} onChange={(v) => setForm({ ...form, company: v })} editing={editing} placeholder={tByEn('Company name (for contracts)')} testid="field-company" />
          <Field label={tByEn('Timezone')} icon={<Globe className="w-4 h-4" />} value={form.timezone} onChange={(v) => setForm({ ...form, timezone: v })} editing={editing} placeholder={tByEn('e.g., Europe/Berlin')} testid="field-timezone" />
          <Field label={tByEn('Language')} icon={<Languages className="w-4 h-4" />} value={form.language} onChange={(v) => setForm({ ...form, language: v })} editing={editing} placeholder="en, ru, …" testid="field-language" />
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 flex items-center gap-1.5"><Mail className="w-4 h-4" /> {tByEn('Email')}</p>
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted px-3 py-2.5">
              <span className="text-sm text-foreground truncate">{me?.email}</span>
              <button
                onClick={() => navigate('/account')}
                className="text-xs font-semibold text-[var(--t-signal)] hover:underline"
                data-testid="change-email-btn"
              >
                {tByEn('Change')}
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Security ──────────────────────────────────────────── */}
      <Card className="border border-border bg-card" data-testid="profile-security">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <ShieldCheck className="w-5 h-5" /> {tByEn('Security')}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SecurityRow
            icon={<KeyRound className="w-5 h-5" />}
            title={tByEn('Two-factor authentication')}
            sub={me?.security?.two_factor_enabled ? tByEn('Enabled — protecting sign-in') : tByEn('Recommended for contract-signing accounts')}
            cta="Manage 2FA"
            onClick={() => navigate('/account/2fa/recovery')}
            testid="manage-2fa-btn"
            highlight={!me?.security?.two_factor_enabled}
          />
          <SecurityRow
            icon={<User className="w-5 h-5" />}
            title={tByEn('Account & sessions')}
            sub="Password, devices, recovery, data export."
            cta="Open Account"
            onClick={() => navigate('/account')}
            testid="manage-account-btn"
          />
        </CardContent>
      </Card>

      {/* ── Quick actions ─────────────────────────────────────── */}
      <Card className="border border-border bg-card" data-testid="profile-actions">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Sparkles className="w-5 h-5" /> {tByEn('Account actions')}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ActionRow icon={<FileText className="w-4 h-4" />} label={tByEn('Documents & contracts')} onClick={() => navigate('/client/documents')} testid="action-documents" />
          <ActionRow icon={<Gift className="w-4 h-4" />} label="Referrals" onClick={() => navigate('/client/referrals')} testid="action-referrals" />
          <ActionRow icon={<LifeBuoy className="w-4 h-4" />} label="Support" onClick={() => navigate('/client/support')} testid="action-support" />
          <ActionRow icon={<Download className="w-4 h-4" />} label={tByEn('Export my data')} onClick={async () => {
            try {
              const r = await runtime.get('/api/account/me/export');
              const blob = new Blob([JSON.stringify(r.data, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `account-export-${new Date().toISOString().slice(0, 10)}.json`;
              a.click();
              URL.revokeObjectURL(url);
            } catch (e) { console.warn('export failed', e); }
          }} testid="action-export" />
        </CardContent>
      </Card>

      {/* ── Sign out ──────────────────────────────────────────── */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={async () => { await logout(); navigate('/'); }}
          className="border-border text-foreground hover:bg-muted"
          data-testid="profile-signout-btn"
        >
          <LogOut className="w-4 h-4 mr-2" /> {tByEn('Sign out')}
        </Button>
      </div>
    </div>
  );
}

// ─── Small atoms ──────────────────────────────────────────────────
function StatCard({ label, value, accent, testid }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5" data-testid={testid}>
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
      <p className={`text-2xl font-bold mt-1.5 ${accent ? 'text-[var(--t-signal)]' : 'text-foreground'}`}>{value}</p>
    </div>
  );
}

function Field({ label, icon, value, onChange, editing, placeholder, testid }) {
  const { tByEn } = useLang();
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 flex items-center gap-1.5">{icon} {label}</p>
      {editing ? (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-[var(--t-signal)]/60 transition-colors"
          data-testid={testid}
        />
      ) : (
        <div className="rounded-lg border border-border bg-muted px-3 py-2.5 text-sm text-foreground min-h-[40px] flex items-center" data-testid={`${testid}-value`}>
          {value || <span className="text-muted-foreground">{tByEn('Not set')}</span>}
        </div>
      )}
    </div>
  );
}

function SecurityRow({ icon, title, sub, cta, onClick, testid, highlight }) {
  return (
    <div className={`flex items-start gap-3 p-4 rounded-lg border bg-muted ${highlight ? 'border-[var(--t-signal)]/40' : 'border-border'}`}>
      <div className="text-foreground mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
      </div>
      <Button size="sm" onClick={onClick} className="bg-[var(--t-signal)] text-[var(--t-signal-ink)] hover:opacity-90 shrink-0" data-testid={testid}>
        {cta}
      </Button>
    </div>
  );
}

function ActionRow({ icon, label, onClick, testid }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-3.5 rounded-lg border border-border bg-background hover:bg-muted transition-colors text-left"
      data-testid={testid}
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="flex-1 text-sm font-medium text-foreground">{label}</span>
      <span className="text-muted-foreground text-xs">→</span>
    </button>
  );
}
