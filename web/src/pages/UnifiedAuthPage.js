import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '@/App';
import { runtime } from '@/runtime';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  Sparkles,
  Briefcase,
  Hammer,
} from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import Logo from '@/components/Logo';
import ThemeToggle from '@/components/ThemeToggle';
import ForgotPasswordModal from '@/components/ForgotPasswordModal';
import { useLang } from '@/contexts/LanguageContext';

// WEB-P1.5: removed hardcoded OAuth Client ID fallback.
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';

/**
 * UnifiedAuthPage — single auth entry for the platform.
 *
 * Default flow = CLIENT (the primary funnel: hire-our-team).
 * BUILDER is a secondary, opt-in path triggered by a discrete link at the
 * bottom of the card ("Apply as a Builder").
 *
 * Visuals on the left are STATIC structure (4-stage JSON pipeline) for both
 * roles — only the internal animation cycles. The pill toggle has been
 * removed: the card geometry never shifts when the user switches role.
 *
 * Builder mode is signalled by:
 *   • A small "Applying as a Builder" pill at the top of the card with a
 *     "← back to client" arrow.
 *   • Heading suffix becomes "as Builder".
 *   • Form submits with role=developer, post-auth redirect → /developer/dashboard.
 *   • Google OAuth (client-only) is hidden.
 *
 * URL params: ?mode=signin|register & ?role=client|builder & ?ref=CODE.
 * Legacy paths /client/auth and /builder/auth still resolve here and preset
 * role accordingly.
 */
const UnifiedAuthPage = () => {
  const { tByEn } = useLang();
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [searchParams] = useSearchParams();

  // ----- estimate context (from /describe → /estimate-result) --------------
  const fromEstimateState = location.state || {};
  const pendingLeadId = fromEstimateState.estimate?.lead_id || null;
  const fromEstimate = !!fromEstimateState.fromEstimate;

  // ----- initial mode / role -----------------------------------------------
  const initialMode = (() => {
    const m = (searchParams.get('mode') || '').toLowerCase();
    if (m === 'signin' || m === 'register') return m;
    if (fromEstimate) return 'register';
    return 'signin';
  })();

  const initialRole = (() => {
    const path = (location.pathname || '').toLowerCase();
    if (path.includes('/builder/')) return 'builder';
    const r = (searchParams.get('role') || '').toLowerCase();
    if (r === 'builder' || r === 'developer') return 'builder';
    return 'client';
  })();

  const [mode, setMode] = useState(initialMode);
  const [role, setRole] = useState(initialRole);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [demoLoadingRole, setDemoLoadingRole] = useState(null);
  const [error, setError] = useState('');
  const [forgotOpen, setForgotOpen] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', name: '' });

  const isBuilder = role === 'builder';

  // ----- referral capture (handles both client + builder programs) ---------
  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (!refCode) return;
    if (isBuilder) {
      localStorage.setItem('dev_referral_code', refCode);
      runtime
        .post(`/api/public/capture-referral`, {
          ref: refCode,
          session_id: `sess_${Date.now()}`,
          program: 'developer_growth',
        })
        .catch(() => {});
    } else {
      localStorage.setItem('devos_ref', refCode);
      runtime
        .post(`/api/public/capture-referral`, { ref: refCode, session_id: null })
        .catch(() => {});
    }
  }, [searchParams, isBuilder]);

  const bindReferral = async () => {
    if (isBuilder) {
      const refCode = localStorage.getItem('dev_referral_code');
      if (refCode) {
        try {
          await runtime.post(`/api/developer/growth/bind`, { referral_code: refCode });
          localStorage.removeItem('dev_referral_code');
        } catch (_e) {
          /* silent */
        }
      }
    } else {
      const refCode = localStorage.getItem('devos_ref');
      if (refCode) {
        try {
          await runtime.post(`/api/referral/bind`, { referral_code: refCode });
          localStorage.removeItem('devos_ref');
        } catch (_e) {
          /* silent */
        }
      }
    }
  };

  // ----- lead claim (client only) ------------------------------------------
  const claimPendingLead = async () => {
    if (!pendingLeadId || isBuilder) return null;
    try {
      const r = await runtime.post(`/api/leads/${pendingLeadId}/claim`, {}, { timeoutMs: 15000 });
      return r.data?.project_id || null;
    } catch (err) {
      console.warn('lead claim failed', err);
      return null;
    }
  };

  // ----- post-auth redirect -------------------------------------------------
  const postAuthRedirect = async () => {
    await bindReferral();
    const base = process.env.PUBLIC_URL || '/api/web-ui';
    if (isBuilder) {
      window.location.href = `${base}/developer/dashboard`;
      return;
    }
    const projectId = await claimPendingLead();
    const target = projectId ? `/client/projects/${projectId}` : '/client/dashboard';
    window.location.href = `${base}${target}`;
  };

  // ----- email + password submit -------------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const apiRole = isBuilder ? 'developer' : 'client';
    try {
      if (mode === 'register') {
        await runtime.post(`/api/auth/register`, {
          email: form.email,
          password: form.password,
          name: form.name,
          role: apiRole,
        });
      }
      await login(form.email, form.password);
      await postAuthRedirect();
    } catch (err) {
      if (err?.requires_2fa && err?.challenge_token) {
        setLoading(false);
        navigate('/two-factor-challenge', {
          state: {
            challenge_token: err.challenge_token,
            email: err.email || form.email,
            ttl_seconds: err.ttl_seconds,
            from: isBuilder ? '/developer/dashboard' : '/client/dashboard',
          },
          replace: true,
        });
        return;
      }
      setError(err.response?.data?.detail || err.message || tByEn('Authentication failed'));
    } finally {
      setLoading(false);
    }
  };

  // ----- demo (no signup) ---------------------------------------------------
  const handleDemo = async (demoRole) => {
    setDemoLoadingRole(demoRole);
    setError('');
    try {
      const apiRole = demoRole === 'builder' ? 'developer' : 'client';
      await runtime.post(`/api/auth/demo`, { role: apiRole });
      const base = process.env.PUBLIC_URL || '/api/web-ui';
      if (demoRole === 'builder') {
        window.location.href = `${base}/developer/dashboard`;
      } else {
        const projectId = await claimPendingLead();
        const target = projectId ? `/client/projects/${projectId}` : '/client/dashboard';
        window.location.href = `${base}${target}`;
      }
    } catch (err) {
      console.error('Demo login error:', err);
      setError(err.response?.data?.detail || 'Demo access failed. Please try again.');
    } finally {
      setDemoLoadingRole(null);
    }
  };

  // ----- Google OAuth (client-side product flow only) ----------------------
  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    setLoading(true);
    try {
      const credential = credentialResponse?.credential;
      if (!credential) throw new Error('No credential from Google');
      await runtime.post(`/api/auth/google`, { credential });
      await postAuthRedirect();
    } catch (err) {
      setError(err.response?.data?.detail || err.message || tByEn('Google sign-in failed'));
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError(tByEn('Google sign-in was cancelled or blocked by the browser'));
  };

  // ----- copy table ---------------------------------------------------------
  const copy = useMemo(() => {
    if (mode === 'signin') {
      return {
        title: tByEn(isBuilder ? 'Sign in as Builder' : 'Sign in'),
        subtitle: isBuilder
          ? tByEn('Access your workspace and tasks.')
          : tByEn('Access your projects and dashboard.'),
        cta: tByEn('Sign In'),
      };
    }
    return {
      title: tByEn(isBuilder ? 'Apply as Builder' : 'Create your account'),
      subtitle: isBuilder
        ? tByEn('Get assigned to vetted, scoped projects.')
        : tByEn('Describe your idea and ship it with our team.'),
      cta: isBuilder ? tByEn('Apply') : tByEn('Create Account'),
    };
  }, [mode, isBuilder]);

  return (
    <div className="min-h-screen bg-background lg:flex" data-testid="unified-auth-page">
      {/* ───────────────────────── LEFT — visual (fixed, decoupled) ──────
          position: fixed on lg+ so right-side content (tabs, fields, mode
          changes) never shifts this panel. */}
      <div className="hidden lg:block lg:fixed lg:inset-y-0 lg:left-0 lg:w-1/2 overflow-hidden">
        <div className="absolute inset-0 bg-signal/15" />
        <div className="relative z-10 h-full w-full flex items-center justify-center p-12">
          <ClientFlowAnimation />
        </div>
      </div>

      {/* ───────────────────────── RIGHT — form (scrolls independently) */}
      <div className="w-full lg:ml-[50%] lg:w-1/2 flex flex-col min-h-screen">
        <div className="p-6 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm transition-colors px-3 py-2 rounded-xl hover:bg-muted"
            data-testid="back-btn"
          >
            <ArrowLeft className="w-4 h-4" />
            {tByEn('Back to home')}
          </button>
          <ThemeToggle />
        </div>

        <div className="flex-1 flex items-center justify-center px-6 pb-12">
          <div className="w-full max-w-[460px]">
            <div className="flex items-center mb-8">
              <Logo height={140} className="h-[140px] w-auto max-w-none" />
            </div>

            {/* Builder mode pill — small, top of card */}
            {isBuilder && (
              <button
                type="button"
                onClick={() => setRole('client')}
                className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full border border-border bg-muted text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
                data-testid="builder-mode-pill"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <Hammer className="w-3.5 h-3.5" />
                {tByEn('Applying as a Builder — switch to Client')}
              </button>
            )}

            {/* Heading */}
            <h1
              className="text-[28px] font-bold text-foreground tracking-tight leading-tight mb-2"
              data-testid="auth-heading"
            >
              {copy.title}
            </h1>
            <p className="text-muted-foreground text-base mb-6" data-testid="auth-subheading">
              {copy.subtitle}
            </p>

            <div className="rounded-2xl border border-border bg-card shadow-sm p-7">
              {/* From-estimate banner */}
              {fromEstimate && fromEstimateState.estimate?.estimate && (
                <div
                  className="mb-5 p-4 rounded-xl border flex items-start gap-3"
                  style={{
                    background: 'rgba(11,143,94,0.06)',
                    borderColor: 'rgba(11,143,94,0.30)',
                  }}
                  data-testid="auth-from-estimate-banner"
                >
                  <Sparkles
                    className="w-4 h-4 mt-0.5"
                    style={{ color: 'var(--t-signal)' }}
                  />
                  <div className="text-sm">
                    <div className="font-semibold text-foreground">
                      {tByEn('Your estimate is saved')}
                      <span
                        className="font-mono ml-1.5"
                        style={{ color: 'var(--t-signal)' }}
                      >
                        $
                        {Math.round(
                          fromEstimateState.estimate.estimate.final_price || 0
                        ).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-0.5">
                      {tByEn("Sign up or log in — we'll claim it for you and open your project workspace.")}
                    </p>
                  </div>
                </div>
              )}

              {/* Tabs */}
              <div className="flex p-1 bg-muted rounded-xl mb-6 border border-border">
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className={`flex-1 py-3 text-sm font-semibold rounded-lg transition-all ${
                    mode === 'signin'
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  data-testid="tab-signin"
                >
                  {tByEn('Sign In')}
                </button>
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className={`flex-1 py-3 text-sm font-semibold rounded-lg transition-all ${
                    mode === 'register'
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  data-testid="tab-register"
                >
                  {tByEn('Register')}
                </button>
              </div>

              {/* Error */}
              {error && (
                <div
                  className="mb-5 p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-sm text-destructive"
                  data-testid="error-message"
                >
                  {error}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'register' && (
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                      {tByEn('Name')}
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder={tByEn("Your name")}
                      className="w-full bg-muted border border-border rounded-xl px-4 py-3.5 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                      required={mode === 'register'}
                      data-testid="input-name"
                    />
                  </div>
                )}

                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                    {tByEn('Email')}
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder={isBuilder ? 'you@email.com' : 'you@company.com'}
                    className="w-full bg-muted border border-border rounded-xl px-4 py-3.5 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    required
                    data-testid="input-email"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                    {tByEn('Password')}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder={tByEn("••••••••")}
                      className="w-full bg-muted border border-border rounded-xl px-4 py-3.5 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all pr-12"
                      required
                      data-testid="input-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      data-testid="toggle-password-visibility"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {mode === 'signin' && (
                  <div className="flex justify-end -mt-1">
                    <button
                      type="button"
                      onClick={() => setForgotOpen(true)}
                      className="text-xs font-medium text-primary hover:underline"
                      data-testid="forgot-password-link"
                    >
                      {tByEn('Forgot password?')}
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold py-4 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 mt-6 disabled:opacity-50"
                  data-testid="submit-btn"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : copy.cta}
                </button>
              </form>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-card px-3 text-[11px] uppercase tracking-wider font-medium text-muted-foreground">
                    {tByEn('or continue with')}
                  </span>
                </div>
              </div>

              {/* Google Sign-In — client mode only */}
              {GOOGLE_CLIENT_ID && !isBuilder ? (
                <div
                  className="flex justify-center mb-4"
                  data-testid="google-signin-wrapper"
                >
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={handleGoogleError}
                    useOneTap={false}
                    theme="outline"
                    size="large"
                    shape="pill"
                    text={mode === 'signin' ? 'signin_with' : 'continue_with'}
                    width="320"
                  />
                </div>
              ) : null}

              {/* Demo buttons — two roles side-by-side, no signup */}
              <div className="grid grid-cols-2 gap-2.5" data-testid="demo-row">
                <button
                  type="button"
                  onClick={() => handleDemo('client')}
                  disabled={demoLoadingRole !== null}
                  className="bg-transparent hover:bg-muted border border-border text-foreground font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                  data-testid="demo-client-btn"
                >
                  {demoLoadingRole === 'client' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Briefcase className="w-4 h-4 text-primary" />
                      {tByEn('Client demo')}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleDemo('builder')}
                  disabled={demoLoadingRole !== null}
                  className="bg-transparent hover:bg-muted border border-border text-foreground font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                  data-testid="demo-builder-btn"
                >
                  {demoLoadingRole === 'builder' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Hammer className="w-4 h-4 text-primary" />
                      {tByEn('Builder demo')}
                    </>
                  )}
                </button>
              </div>
              <p
                className="text-[11px] text-muted-foreground text-center mt-2"
                data-testid="demo-hint"
              >
                {tByEn('No signup — instant cabinet, demo data, 1 day session.')}
              </p>
            </div>

            {/* Footer: secondary "Apply as Builder" link (only when client) */}
            {!isBuilder && (
              <div
                className="text-center mt-6 text-sm text-muted-foreground"
                data-testid="builder-link-row"
              >
                {tByEn('Are you a developer?')}{' '}
                <button
                  type="button"
                  onClick={() => setRole('builder')}
                  className="font-semibold text-primary hover:underline inline-flex items-center gap-1"
                  data-testid="apply-as-builder-link"
                >
                  <Hammer className="w-3.5 h-3.5" />
                  {tByEn('Apply as a Builder →')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <ForgotPasswordModal
        open={forgotOpen}
        onClose={() => setForgotOpen(false)}
        defaultEmail={form.email}
      />
    </div>
  );
};

/* ============================================================ ANIMATION */

/**
 * ClientFlowAnimation — STATIC structure, animation happens only inside.
 * 4 stage indicators light up sequentially; the JSON terminal swaps payload
 * to match the current stage. Used for both client and builder modes — the
 * left panel never re-layouts when the user switches role.
 */
const ClientFlowAnimation = () => {
  const { tByEn } = useLang();
  const [step, setStep] = useState(0);
  const steps = [
    {
      label: tByEn('Your request'),
      json: `{
  "idea": "Marketplace App",
  "features": [
    "User accounts",
    "Product listings",
    "Payments"
  ]
}`,
    },
    {
      label: tByEn('Our scope'),
      json: `{
  "project": "Marketplace MVP",
  "stages": 4,
  "estimate": "120h",
  "team": 2
}`,
    },
    {
      label: tByEn('In progress'),
      json: `{
  "stage": "Development",
  "progress": "65%",
  "completed": [
    "Auth API",
    "Product CRUD"
  ]
}`,
    },
    {
      label: tByEn('Delivery'),
      json: `{
  "version": "1.0",
  "status": "ready",
  "includes": [
    "Source code",
    "Documentation",
    "Preview link"
  ]
}`,
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => (prev + 1) % steps.length);
    }, 3500);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full max-w-md" data-testid="client-flow-animation">
      <div className="flex items-center justify-between mb-8">
        {[tByEn('Request'), tByEn('Scope'), tByEn('Build'), tByEn('Ship')].map((s, i) => (
          <div key={i} className="flex items-center">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-semibold transition-all ${
                i <= step
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                  : 'bg-muted text-muted-foreground border border-border'
              }`}
            >
              {i + 1}
            </div>
            {i < 3 && (
              <div
                className={`w-8 h-0.5 transition-all ${
                  i < step ? 'bg-primary' : 'bg-border'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <div className="border border-border rounded-2xl overflow-hidden bg-surface shadow-2xl">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-white/[0.02]">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/60" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
            <div className="w-3 h-3 rounded-full bg-green-500/60" />
          </div>
          <span className="text-xs text-muted-foreground ml-2 font-mono">
            {steps[step].label}
          </span>
        </div>
        <div className="p-6 min-h-[260px] font-mono text-sm">
          <pre className="text-muted-foreground whitespace-pre animate-fade-in">
            {steps[step].json}
          </pre>
        </div>
      </div>

      <div className="text-center mt-8">
        <p className="text-muted-foreground">{tByEn('From idea to production.')}</p>
        <p className="text-foreground font-semibold mt-1">
          {tByEn('You decide. We deliver.')}
        </p>
      </div>
    </div>
  );
};

export default UnifiedAuthPage;
