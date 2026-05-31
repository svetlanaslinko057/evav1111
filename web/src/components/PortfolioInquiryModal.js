import { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Send, Loader2, CheckCircle2, Sparkles, Calendar, DollarSign } from 'lucide-react';
import { useLang } from '@/contexts/LanguageContext';

/**
 * PortfolioInquiryModal — lead-capture modal triggered from a case CTA.
 *
 * Three intents:
 *   - order_similar  → "Order a similar project"
 *   - consultation   → "Free consultation"
 *   - calculate      → "Calculate cost for this scope"
 *
 * Posts to POST /api/portfolio/inquiry. Theme-aware (uses --token-*).
 */
const INTENT_META = {
  order_similar: {
    title: 'Order a similar project',
    sub: 'Tell us about your scope — we\'ll come back with a structured proposal in <24h.',
    cta: 'Send request',
    Icon: Sparkles,
  },
  consultation: {
    title: 'Book a free consultation',
    sub: '30-minute call with our engineering lead. Scope, architecture, realistic timeline.',
    cta: 'Request consultation',
    Icon: Calendar,
  },
  calculate: {
    title: 'Calculate this project',
    sub: 'Send us your variation of this case — we calculate scope, hours and price.',
    cta: 'Get the estimate',
    Icon: DollarSign,
  },
};

const BUDGET_OPTIONS = [
  { value: '', label: 'Not sure yet' },
  { value: '<5k', label: 'Less than $5,000' },
  { value: '5-15k', label: '$5,000 – $15,000' },
  { value: '15-50k', label: '$15,000 – $50,000' },
  { value: '50k+', label: 'More than $50,000' },
];

const TIMELINE_OPTIONS = [
  { value: '', label: 'Flexible' },
  { value: 'asap', label: 'ASAP' },
  { value: '1-3m', label: '1–3 months' },
  { value: '3-6m', label: '3–6 months' },
  { value: '6m+', label: '6+ months' },
];

export default function PortfolioInquiryModal({ open, onClose, caseId, caseTitle, intent = 'order_similar' }) {
  const { tByEn } = useLang();
  const meta = INTENT_META[intent] || INTENT_META.order_similar;
  const IntentIcon = meta.Icon;

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    company: '',
    message: '',
    budget_range: '',
    timeline: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (open) {
      setError('');
      setSuccess(false);
      // Pre-fill message context
      setForm((f) => ({
        ...f,
        message:
          intent === 'consultation'
            ? `I'd like to discuss a project ${caseTitle ? `similar to "${caseTitle}"` : ''}.`
            : intent === 'calculate'
              ? `I want to estimate a project ${caseTitle ? `like "${caseTitle}"` : ''}. Here's my scope:`
              : `I'd like to order a project ${caseTitle ? `similar to "${caseTitle}"` : ''}.`,
      }));
    }
  }, [open, intent, caseTitle]);

  if (!open) return null;

  const set = (k) => (e) => {
    const v = e?.target?.value ?? e;
    setForm((f) => ({ ...f, [k]: v }));
  };

  const submit = async (e) => {
    e?.preventDefault?.();
    setBusy(true);
    setError('');
    try {
      if (!form.full_name.trim() || !form.email.trim() || !form.message.trim()) {
        throw new Error('Please fill in name, email and message.');
      }
      const base = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/+$/, '');
      await axios.post(`${base}/api/portfolio/inquiry`, {
        case_id: caseId || null,
        intent,
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        company: form.company.trim() || null,
        message: form.message.trim(),
        budget_range: form.budget_range || null,
        timeline: form.timeline || null,
        source_url: typeof window !== 'undefined' ? window.location.href : null,
      });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Could not send request');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(10, 12, 16, 0.72)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
      data-testid="inquiry-modal-overlay"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-2xl relative max-h-[92vh] overflow-y-auto"
        style={{
          background: 'var(--token-surface-elevated)',
          border: '1px solid var(--token-border)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.45), 0 4px 16px rgba(0,0,0,0.18)',
        }}
        data-testid="inquiry-modal"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-muted transition-colors text-foreground"
          aria-label={tByEn('Close')}
          data-testid="inquiry-modal-close"
        >
          <X className="w-4 h-4" />
        </button>

        {success ? (
          <div className="p-8 text-center" data-testid="inquiry-success">
            <div
              className="w-14 h-14 rounded-full mx-auto flex items-center justify-center mb-4"
              style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}
            >
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold mb-2">{tByEn('Request sent')}</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Thanks, <span className="font-semibold text-foreground">{form.full_name.split(' ')[0]}</span>.
              We received your inquiry and will get back to you at{' '}
              <span className="font-mono text-foreground">{form.email}</span> within 24 hours.
            </p>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-lg text-sm font-bold"
              style={{ background: 'var(--t-signal)', color: 'var(--t-signal-ink)' }}
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="p-6 sm:p-7">
            <div className="flex items-start gap-3 mb-5">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: 'rgba(11,143,94,0.10)',
                  color: 'var(--t-signal)',
                  border: '1px solid rgba(11,143,94,0.20)',
                }}
              >
                <IntentIcon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold leading-tight">{meta.title}</h2>
                <p className="text-xs text-muted-foreground mt-1">{meta.sub}</p>
                {caseTitle && (
                  <div className="mt-2 text-[10px] font-mono font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    REF · {caseTitle}
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="mb-4 px-3 py-2 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.30)', color: '#fca5a5' }}>
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label={tByEn('Full name *')}>
                <Input value={form.full_name} onChange={set('full_name')} testId="inquiry-name" required />
              </Field>
              <Field label={tByEn('Work email *')}>
                <Input type="email" value={form.email} onChange={set('email')} testId="inquiry-email" required />
              </Field>
              <Field label={tByEn('Phone (optional)')}>
                <Input value={form.phone} onChange={set('phone')} testId="inquiry-phone" placeholder="+1 555 …" />
              </Field>
              <Field label="Company (optional)">
                <Input value={form.company} onChange={set('company')} testId="inquiry-company" />
              </Field>
            </div>

            <Field label={tByEn('Message *')}>
              <textarea
                value={form.message}
                onChange={set('message')}
                rows={4}
                required
                data-testid="inquiry-message"
                className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                style={{
                  background: 'var(--token-surface)',
                  border: '1px solid var(--token-border)',
                  color: 'var(--t-text-primary)',
                }}
              />
            </Field>

            {intent !== 'consultation' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label={tByEn('Budget range')}>
                  <Select value={form.budget_range} onChange={set('budget_range')} options={BUDGET_OPTIONS} testId="inquiry-budget" />
                </Field>
                <Field label="Timeline">
                  <Select value={form.timeline} onChange={set('timeline')} options={TIMELINE_OPTIONS} testId="inquiry-timeline" />
                </Field>
              </div>
            )}

            <p className="text-[11px] text-muted-foreground mt-2 mb-4">
              By submitting, you agree to be contacted about your project. We never share your details.
            </p>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-muted hover:bg-muted/70 text-foreground"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                data-testid="inquiry-submit"
                className="px-5 py-2 rounded-lg text-sm font-bold inline-flex items-center gap-2 disabled:opacity-50"
                style={{ background: 'var(--t-signal)', color: 'var(--t-signal-ink)' }}
              >
                {busy ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Sending…
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" /> {meta.cta}
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block mb-3">
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground block mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function Input({ type = 'text', value, onChange, placeholder, required, testId }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      data-testid={testId}
      className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
      style={{
        background: 'var(--token-surface)',
        border: '1px solid var(--token-border)',
        color: 'var(--t-text-primary)',
      }}
    />
  );
}

function Select({ value, onChange, options, testId }) {
  return (
    <select
      value={value}
      onChange={onChange}
      data-testid={testId}
      className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
      style={{
        background: 'var(--token-surface)',
        border: '1px solid var(--token-border)',
        color: 'var(--t-text-primary)',
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
