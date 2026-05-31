/**
 * Admin · Portfolio — manage public showcase cases + lead inquiries.
 *
 * Tabs:
 *   - Cases       (existing) — CRUD with rich editor (incl. video + testimonials)
 *   - Inquiries   (new)      — list of leads captured from public CTAs
 *
 * Backend:
 *   GET    /api/admin/portfolio
 *   POST   /api/admin/portfolio
 *   PATCH  /api/admin/portfolio/{case_id}
 *   DELETE /api/admin/portfolio/{case_id}
 *   GET    /api/admin/portfolio/inquiries[?status=...]
 *   PATCH  /api/admin/portfolio/inquiries/{inquiry_id}   { status, internal_notes }
 *   DELETE /api/admin/portfolio/inquiries/{inquiry_id}
 *
 * Layout: p-6 max-w-7xl mx-auto (matches AdminV2System pattern).
 * Mobile-responsive: grid cols collapse to 1 on phone, editor inputs stack.
 */
import { useEffect, useState, useCallback } from 'react';
import { useLang } from '../contexts/LanguageContext';
import {
  Plus, Edit3, Trash2, Star, StarOff, Eye, EyeOff, Image as ImageIcon,
  X, Upload, CheckCircle2, Clock, Wrench, Archive, Mail, Phone, Building2,
  ExternalLink, MessageSquare, ArrowRight, Inbox, Briefcase,
} from 'lucide-react';
import { runtime } from '@/runtime';

const STATUS_OPTIONS = [
  { value: 'delivered',   label: 'Delivered',    Icon: CheckCircle2, tone: 'success' },
  { value: 'in_progress', label: 'In progress',  Icon: Clock,        tone: 'warning' },
  { value: 'maintenance', label: 'Maintenance',  Icon: Wrench,       tone: 'info' },
  { value: 'archived',    label: 'Archived',     Icon: Archive,      tone: 'muted' },
];

const INQUIRY_STATUS = ['new', 'contacted', 'qualified', 'converted', 'closed'];
const INQUIRY_STATUS_COLOR = {
  new:       'bg-sky-500/15     text-sky-400     border-sky-500/30',
  contacted: 'bg-amber-500/15   text-amber-400   border-amber-500/30',
  qualified: 'bg-violet-500/15  text-violet-400  border-violet-500/30',
  converted: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  closed:    'bg-muted          text-muted-foreground border-border',
};

const emptyForm = {
  title: '', description: '', client_name: '', industry: '', product_type: '',
  technologies: '', results: '', image_url: '', budget: '',
  show_budget: false, show_description: true, status: 'delivered',
  quality_score: '', duration_weeks: '', featured: false, published: true,
  sort_order: 0,
  // Deep case fields
  case_study: '', challenge: '', solution: '',
  hours_spent: '', team_size: '', start_date: '', end_date: '',
  tags: '', cta_headline: '', starting_from: '', external_url: '',
  gallery: '',   // newline-separated URLs
  // Media
  video_url: '',
  testimonials: [],  // [{name, role, company, quote, avatar_url, rating}]
};

export default function AdminV2Portfolio() {
  const { tByEn } = useLang();
  const [tab, setTab] = useState('cases');

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto" data-testid="admin-portfolio">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{tByEn('Portfolio')}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">{tByEn('Public showcase + leads')}</p>
        </div>
        <div className="inline-flex rounded-lg p-1 bg-muted self-start" role="tablist">
          <TabBtn id="cases"     active={tab} setTab={setTab} Icon={Briefcase}>{tByEn('Cases')}</TabBtn>
          <TabBtn id="inquiries" active={tab} setTab={setTab} Icon={Inbox}>{tByEn('Inquiries')}</TabBtn>
        </div>
      </div>

      {tab === 'cases'     && <CasesTab />}
      {tab === 'inquiries' && <InquiriesTab />}
    </div>
  );
}

function TabBtn({ id, active, setTab, children, Icon }) {
  const on = active === id;
  return (
    <button
      onClick={() => setTab(id)}
      role="tab"
      aria-selected={on}
      data-testid={`portfolio-tab-${id}`}
      className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-md inline-flex items-center gap-1.5 transition-colors ${
        on
          ? 'bg-signal text-[var(--t-signal-ink)]'
          : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {children}
    </button>
  );
}

/* =================================================================
 *  CASES TAB
 * ================================================================= */

function CasesTab() {
  const { tByEn } = useLang();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editor, setEditor] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const r = await runtime.get('/api/admin/portfolio');
      setCases(Array.isArray(r.data) ? r.data : []);
    } catch (e) {
      setError(e.response?.data?.detail || 'Could not load portfolio cases');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onSave = async (payload, caseId) => {
    if (caseId) {
      await runtime.patch(`/api/admin/portfolio/${caseId}`, payload);
    } else {
      await runtime.post('/api/admin/portfolio', payload);
    }
    setEditor(null);
    await load();
  };

  const onDelete = async (caseId) => {
    if (!window.confirm('Delete this portfolio case? This cannot be undone.')) return;
    try {
      await runtime.delete(`/api/admin/portfolio/${caseId}`);
      await load();
    } catch (e) {
      alert(e.response?.data?.detail || 'Delete failed');
    }
  };

  const toggle = async (c, field) => {
    try {
      await runtime.patch(`/api/admin/portfolio/${c.case_id}`, { [field]: !c[field] });
      await load();
    } catch (e) {
      alert(e.response?.data?.detail || 'Update failed');
    }
  };

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-muted-foreground">{cases.length} cases total</p>
        <button
          onClick={() => setEditor({ mode: 'create', data: emptyForm })}
          data-testid="portfolio-add"
          className="px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-2 bg-signal text-[var(--t-signal-ink)] hover:opacity-90 transition"
        >
          <Plus className="w-4 h-4" /> {tByEn('New case')}
        </button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400">{error}</div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : cases.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center text-sm text-muted-foreground">
          {tByEn('No cases yet. Click')} <span className="font-bold text-foreground">{tByEn('New case')}</span> {tByEn('to add one.')}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {cases.map((c) => (
            <CaseCard
              key={c.case_id}
              c={c}
              onEdit={() => setEditor({ mode: 'edit', data: c })}
              onDelete={() => onDelete(c.case_id)}
              onToggle={(f) => toggle(c, f)}
            />
          ))}
        </div>
      )}

      {editor && (
        <CaseEditorModal
          mode={editor.mode}
          initial={editor.data}
          onClose={() => setEditor(null)}
          onSave={(payload) => onSave(payload, editor.mode === 'edit' ? editor.data.case_id : null)}
        />
      )}
    </>
  );
}

function CaseCard({ c, onEdit, onDelete, onToggle }) {
  const { tByEn } = useLang();
  const status = STATUS_OPTIONS.find((s) => s.value === c.status) || STATUS_OPTIONS[0];
  const toneClass = {
    success: 'bg-emerald-500/15 text-emerald-400',
    warning: 'bg-amber-500/15 text-amber-400',
    info:    'bg-sky-500/15 text-sky-400',
    muted:   'bg-muted text-muted-foreground',
  }[status.tone];
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col" data-testid={`portfolio-case-${c.case_id}`}>
      <div className="aspect-[16/9] bg-muted relative overflow-hidden">
        {c.image_url ? (
          // eslint-disable-next-line
          <img src={c.image_url} alt={c.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <ImageIcon className="w-8 h-8" />
          </div>
        )}
        <div className="absolute top-2 left-2 flex gap-1.5">
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${c.published ? 'bg-emerald-500/15 text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
            {c.published ? 'Live' : 'Draft'}
          </span>
          {c.featured && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 flex items-center gap-1">
              <Star className="w-2.5 h-2.5" /> {tByEn('Featured')}
            </span>
          )}
          {c.video_url && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-violet-500/15 text-violet-400">
              {tByEn('Video')}
            </span>
          )}
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold leading-tight">{c.title}</h3>
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground shrink-0">{c.industry}</span>
        </div>
        <p className="text-xs text-muted-foreground">{c.client_name} · {c.product_type}</p>
        {c.description && <p className="text-sm text-foreground/80 line-clamp-2">{c.description}</p>}

        <div className="flex flex-wrap gap-2 mt-1">
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${toneClass}`}>
            <status.Icon className="w-2.5 h-2.5" /> {status.label}
          </span>
          {c.quality_score != null && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-signal/15 text-signal">
              Q {c.quality_score}/100
            </span>
          )}
          {c.testimonials?.length > 0 && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-muted text-foreground">
              ★ {c.testimonials.length} reviews
            </span>
          )}
        </div>

        <div className="mt-auto pt-3 flex flex-wrap items-center gap-2 border-t border-border">
          <a
            href={`/portfolio/${c.case_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-signal hover:underline inline-flex items-center gap-1"
            data-testid={`case-view-${c.case_id}`}
          >
            {tByEn('View')} <ExternalLink className="w-3 h-3" />
          </a>
          <span className="ml-auto inline-flex gap-1">
            <button onClick={() => onToggle('published')} className="p-1.5 rounded hover:bg-muted" title={c.published ? 'Unpublish' : 'Publish'} data-testid={`case-toggle-pub-${c.case_id}`}>
              {c.published ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>
            <button onClick={() => onToggle('featured')} className="p-1.5 rounded hover:bg-muted" title={tByEn('Toggle featured')} data-testid={`case-toggle-feat-${c.case_id}`}>
              {c.featured ? <Star className="w-3.5 h-3.5 text-amber-400" /> : <StarOff className="w-3.5 h-3.5" />}
            </button>
            <button onClick={onEdit} className="p-1.5 rounded hover:bg-muted" title={tByEn('Edit')} data-testid={`case-edit-${c.case_id}`}>
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button onClick={onDelete} className="p-1.5 rounded hover:bg-red-500/10 hover:text-red-400" title={tByEn('Delete')} data-testid={`case-delete-${c.case_id}`}>
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}

/* =================================================================
 *  INQUIRIES TAB
 * ================================================================= */

function InquiriesTab() {
  const { tByEn } = useLang();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const url = filter ? `/api/admin/portfolio/inquiries?status=${filter}` : '/api/admin/portfolio/inquiries';
      const r = await runtime.get(url);
      setItems(Array.isArray(r.data) ? r.data : []);
    } catch (e) {
      setError(e.response?.data?.detail || 'Could not load inquiries');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (inq, newStatus) => {
    try {
      await runtime.patch(`/api/admin/portfolio/inquiries/${inq.inquiry_id}`, { status: newStatus });
      await load();
    } catch (e) {
      alert(e.response?.data?.detail || 'Update failed');
    }
  };

  const remove = async (inq) => {
    if (!window.confirm(`Delete inquiry from ${inq.full_name}? This cannot be undone.`)) return;
    try {
      await runtime.delete(`/api/admin/portfolio/inquiries/${inq.inquiry_id}`);
      await load();
    } catch (e) {
      alert(e.response?.data?.detail || 'Delete failed');
    }
  };

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-muted-foreground">{items.length} inquiries {filter && `(${filter})`}</p>
        <div className="flex flex-wrap gap-1.5">
          <FilterChip active={filter === ''}          onClick={() => setFilter('')}          label="All" />
          {INQUIRY_STATUS.map((s) => (
            <FilterChip key={s} active={filter === s} onClick={() => setFilter(s)} label={s} />
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400">{error}</div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center text-sm text-muted-foreground">
          {tByEn('No inquiries yet. They\'ll show up here when visitors submit the public form.')}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((inq) => (
            <InquiryRow key={inq.inquiry_id} inq={inq} onStatus={updateStatus} onDelete={() => remove(inq)} />
          ))}
        </div>
      )}
    </>
  );
}

function FilterChip({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      data-testid={`inq-filter-${label || 'all'}`}
      className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border ${
        active
          ? 'bg-signal text-[var(--t-signal-ink)] border-signal'
          : 'bg-card text-muted-foreground border-border hover:text-foreground'
      }`}
    >
      {label}
    </button>
  );
}

function InquiryRow({ inq, onStatus, onDelete }) {
  const intentLabel = {
    order_similar: 'Order similar',
    consultation:  'Free consultation',
    calculate:     'Calculate scope',
  }[inq.intent] || inq.intent;

  const idx = INQUIRY_STATUS.indexOf(inq.status);
  const nextStatus = idx >= 0 && idx < INQUIRY_STATUS.length - 1
    ? INQUIRY_STATUS[idx + 1]
    : null;

  const created = new Date(inq.created_at).toLocaleString();

  return (
    <article className="bg-card border border-border rounded-xl p-4 sm:p-5" data-testid={`inquiry-${inq.inquiry_id}`}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${INQUIRY_STATUS_COLOR[inq.status] || INQUIRY_STATUS_COLOR.new}`}>
              {inq.status}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-signal">
              {intentLabel}
            </span>
            <span className="text-[10px] text-muted-foreground">{created}</span>
          </div>
          <h3 className="font-bold text-base truncate">{inq.full_name}</h3>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
            <a href={`mailto:${inq.email}`} className="inline-flex items-center gap-1 hover:text-signal truncate" data-testid={`inq-email-${inq.inquiry_id}`}>
              <Mail className="w-3 h-3 shrink-0" /> {inq.email}
            </a>
            {inq.phone && (
              <a href={`tel:${inq.phone}`} className="inline-flex items-center gap-1 hover:text-signal">
                <Phone className="w-3 h-3" /> {inq.phone}
              </a>
            )}
            {inq.company && (
              <span className="inline-flex items-center gap-1">
                <Building2 className="w-3 h-3" /> {inq.company}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          {nextStatus && (
            <button
              onClick={() => onStatus(inq, nextStatus)}
              data-testid={`inq-advance-${inq.inquiry_id}`}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-signal text-[var(--t-signal-ink)] hover:opacity-90 inline-flex items-center gap-1"
            >
              → {nextStatus}
            </button>
          )}
          <select
            value={inq.status}
            onChange={(e) => onStatus(inq, e.target.value)}
            data-testid={`inq-status-${inq.inquiry_id}`}
            className="text-xs bg-app-surface border border-border rounded px-2 py-1.5"
          >
            {INQUIRY_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button
            onClick={onDelete}
            className="p-1.5 rounded hover:bg-red-500/10 hover:text-red-400"
            data-testid={`inq-delete-${inq.inquiry_id}`}
            title={tByEn('Delete')}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {inq.case_title && (
        <div className="mb-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          REF · <a href={`/portfolio/${inq.case_id}`} target="_blank" rel="noopener noreferrer" className="text-signal hover:underline">{inq.case_title}</a>
        </div>
      )}

      <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
        <MessageSquare className="w-3.5 h-3.5 inline mr-1.5 text-muted-foreground" />
        {inq.message}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {inq.budget_range && (
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-muted text-foreground">
            BUDGET · {inq.budget_range}
          </span>
        )}
        {inq.timeline && (
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-muted text-foreground">
            TIMELINE · {inq.timeline}
          </span>
        )}
      </div>
    </article>
  );
}

/* =================================================================
 *  CASE EDITOR MODAL
 * ================================================================= */

function CaseEditorModal({ mode, initial, onClose, onSave }) {
  const { tByEn } = useLang();
  const [form, setForm] = useState(() => ({
    ...emptyForm,
    ...initial,
    technologies: Array.isArray(initial?.technologies) ? initial.technologies.join(', ') : (initial?.technologies || ''),
    budget: initial?.budget != null ? String(initial.budget) : '',
    quality_score: initial?.quality_score != null ? String(initial.quality_score) : '',
    duration_weeks: initial?.duration_weeks != null ? String(initial.duration_weeks) : '',
    sort_order: initial?.sort_order != null ? initial.sort_order : 0,
    case_study: initial?.case_study || '',
    challenge: initial?.challenge || '',
    solution: initial?.solution || '',
    hours_spent: initial?.hours_spent != null ? String(initial.hours_spent) : '',
    team_size: initial?.team_size != null ? String(initial.team_size) : '',
    start_date: initial?.start_date || '',
    end_date: initial?.end_date || '',
    tags: Array.isArray(initial?.tags) ? initial.tags.join(', ') : '',
    cta_headline: initial?.cta_headline || '',
    starting_from: initial?.starting_from != null ? String(initial.starting_from) : '',
    external_url: initial?.external_url || '',
    gallery: Array.isArray(initial?.gallery) ? initial.gallery.join('\n') : '',
    video_url: initial?.video_url || '',
    testimonials: Array.isArray(initial?.testimonials) ? initial.testimonials : [],
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => {
    const v = e?.target?.type === 'checkbox' ? e.target.checked : e?.target?.value ?? e;
    setForm((f) => ({ ...f, [k]: v }));
  };

  const onUpload = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      setError('Image is larger than 5MB. Please pick a smaller one.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setForm((s) => ({ ...s, image_url: String(reader.result) }));
    reader.readAsDataURL(f);
  };

  /* ---------------- Testimonials helpers ---------------- */
  const addTestimonial = () =>
    setForm((s) => ({
      ...s,
      testimonials: [...(s.testimonials || []), { name: '', role: '', company: '', quote: '', avatar_url: '', rating: 5 }],
    }));

  const updateTestimonial = (idx, field, value) =>
    setForm((s) => ({
      ...s,
      testimonials: s.testimonials.map((t, i) => (i === idx ? { ...t, [field]: value } : t)),
    }));

  const removeTestimonial = (idx) =>
    setForm((s) => ({ ...s, testimonials: s.testimonials.filter((_, i) => i !== idx) }));

  const submit = async (e) => {
    e?.preventDefault?.();
    setBusy(true);
    setError('');
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        client_name: form.client_name.trim(),
        industry: form.industry.trim(),
        product_type: form.product_type.trim(),
        technologies: form.technologies ? form.technologies.split(',').map((s) => s.trim()).filter(Boolean) : [],
        results: form.results.trim(),
        image_url: form.image_url || null,
        budget: form.budget === '' ? null : Number(form.budget),
        show_budget: !!form.show_budget,
        show_description: !!form.show_description,
        status: form.status,
        quality_score: form.quality_score === '' ? null : Number(form.quality_score),
        duration_weeks: form.duration_weeks === '' ? null : Number(form.duration_weeks),
        featured: !!form.featured,
        published: !!form.published,
        sort_order: Number(form.sort_order) || 0,
        // Deep case
        case_study: form.case_study.trim() || null,
        challenge: form.challenge.trim() || null,
        solution: form.solution.trim() || null,
        hours_spent: form.hours_spent === '' ? null : Number(form.hours_spent),
        team_size: form.team_size === '' ? null : Number(form.team_size),
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        tags: form.tags ? form.tags.split(',').map((s) => s.trim()).filter(Boolean) : [],
        cta_headline: form.cta_headline.trim() || null,
        starting_from: form.starting_from === '' ? null : Number(form.starting_from),
        external_url: form.external_url.trim() || null,
        gallery: form.gallery ? form.gallery.split(/\r?\n/).map((s) => s.trim()).filter(Boolean) : [],
        // Media
        video_url: form.video_url.trim() || null,
        testimonials: (form.testimonials || [])
          .map((t) => ({
            name: (t.name || '').trim(),
            role: (t.role || '').trim(),
            company: (t.company || '').trim(),
            quote: (t.quote || '').trim(),
            avatar_url: (t.avatar_url || '').trim(),
            rating: Number(t.rating) || 0,
          }))
          .filter((t) => t.name && t.quote),
      };
      await onSave(payload);
    } catch (e2) {
      setError(e2.response?.data?.detail || 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay flex items-center justify-center p-2 sm:p-4" data-testid="portfolio-editor-overlay">
      <div
        className="w-full max-w-3xl rounded-2xl p-4 sm:p-6 relative max-h-[94vh] overflow-y-auto"
        style={{
          background: 'var(--token-surface-elevated)',
          border: '1px solid var(--token-border)',
          boxShadow: 'var(--token-shadow-hover)',
        }}
        data-testid="portfolio-editor"
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
          data-testid="portfolio-editor-close"
          aria-label={tByEn('Close')}
        >
          <X className="w-4 h-4" />
        </button>

        <h2 className="text-lg sm:text-xl font-bold mb-1 pr-10">{mode === 'edit' ? 'Edit case' : 'New case'}</h2>
        <p className="text-xs text-muted-foreground mb-5">{tByEn('Star-marked fields are public. Optional rich content (case study, video, reviews) shows on the detail page.')}</p>

        {error && <div className="mb-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400">{error}</div>}

        <form onSubmit={submit} className="space-y-5">
          {/* Image */}
          <div>
            <Label>{tByEn('Cover image')}</Label>
            <div className="flex items-start gap-3 flex-col sm:flex-row">
              <div className="w-full sm:w-40 h-32 sm:h-24 rounded-lg overflow-hidden border border-border bg-muted flex items-center justify-center shrink-0">
                {form.image_url ? (
                  // eslint-disable-next-line
                  <img src={form.image_url} alt="preview" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 space-y-2 w-full">
                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-muted hover:bg-muted/70 text-sm font-semibold cursor-pointer">
                  <Upload className="w-4 h-4" /> Upload (≤5MB)
                  <input type="file" accept="image/*" className="hidden" onChange={onUpload} data-testid="portfolio-image-upload" />
                </label>
                <Input value={form.image_url || ''} onChange={set('image_url')} placeholder={tByEn('…or paste image URL / data-URL')} testId="portfolio-image-url" />
              </div>
            </div>
          </div>

          {/* Required */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label={tByEn('Title *')}><Input value={form.title} onChange={set('title')} required testId="portfolio-title" /></Field>
            <Field label={tByEn('Client name *')}><Input value={form.client_name} onChange={set('client_name')} required testId="portfolio-client" /></Field>
            <Field label={tByEn('Industry *')}><Input value={form.industry} onChange={set('industry')} required testId="portfolio-industry" /></Field>
            <Field label={tByEn('Product type *')}><Input value={form.product_type} onChange={set('product_type')} placeholder="web_app · mobile_app · saas …" required testId="portfolio-product-type" /></Field>
          </div>

          <Field label={tByEn('Short description')}>
            <textarea value={form.description} onChange={set('description')} rows={2}
              className="w-full px-3 py-2 rounded-lg bg-app-surface border border-border text-sm focus:outline-none focus:border-signal"
              data-testid="portfolio-description" />
          </Field>

          <Field label={tByEn('Technologies (comma-separated)')}>
            <Input value={form.technologies} onChange={set('technologies')} placeholder={tByEn('React, Node.js, PostgreSQL')} testId="portfolio-technologies" />
          </Field>

          <Field label={tByEn('Headline result / outcome')}>
            <Input value={form.results} onChange={set('results')} placeholder={tByEn('60% reduction in delivery delays')} testId="portfolio-results" />
          </Field>

          {/* ---- Deep case ---- */}
          <SectionHeader>{tByEn('Deep case (detail page)')}</SectionHeader>
          <Field label={tByEn('The challenge')}><Textarea value={form.challenge} onChange={set('challenge')} rows={3} testId="portfolio-challenge" /></Field>
          <Field label={tByEn('Our solution')}><Textarea value={form.solution} onChange={set('solution')} rows={3} testId="portfolio-solution" /></Field>
          <Field label={tByEn('Inside the build (case study, long-form)')}><Textarea value={form.case_study} onChange={set('case_study')} rows={5} testId="portfolio-case-study" /></Field>

          {/* Numbers */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Field label={tByEn('Budget (USD)')}><Input type="number" value={form.budget} onChange={set('budget')} placeholder="50000" testId="portfolio-budget" /></Field>
            <Field label={tByEn('Starting from $')}><Input type="number" value={form.starting_from} onChange={set('starting_from')} placeholder="25000" testId="portfolio-starting-from" /></Field>
            <Field label={tByEn('Hours spent')}><Input type="number" value={form.hours_spent} onChange={set('hours_spent')} placeholder="1840" testId="portfolio-hours" /></Field>
            <Field label={tByEn('Team size')}><Input type="number" value={form.team_size} onChange={set('team_size')} placeholder="5" testId="portfolio-team-size" /></Field>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Field label={tByEn('Quality (0–100)')}><Input type="number" min={0} max={100} value={form.quality_score} onChange={set('quality_score')} placeholder="92" testId="portfolio-quality" /></Field>
            <Field label={tByEn('Duration (weeks)')}><Input type="number" value={form.duration_weeks} onChange={set('duration_weeks')} placeholder="14" testId="portfolio-duration" /></Field>
            <Field label={tByEn('Start date')}><Input type="date" value={form.start_date} onChange={set('start_date')} testId="portfolio-start-date" /></Field>
            <Field label={tByEn('End date')}><Input type="date" value={form.end_date} onChange={set('end_date')} testId="portfolio-end-date" /></Field>
          </div>

          <Field label={tByEn('Tags (comma-separated)')}>
            <Input value={form.tags} onChange={set('tags')} placeholder={tByEn('HIPAA, Real-time, WebRTC')} testId="portfolio-tags" />
          </Field>

          <Field label={tByEn('External URL (live product)')}>
            <Input value={form.external_url} onChange={set('external_url')} placeholder="https://example.com" testId="portfolio-external-url" />
          </Field>

          <Field label={tByEn('Gallery URLs (one per line)')}>
            <Textarea value={form.gallery} onChange={set('gallery')} rows={3} placeholder={"https://...\nhttps://..."} testId="portfolio-gallery" />
          </Field>

          {/* ---- Media ---- */}
          <SectionHeader>{tByEn('Media')}</SectionHeader>
          <Field label={tByEn('Video presentation URL (YouTube · Vimeo · MP4)')}>
            <Input value={form.video_url} onChange={set('video_url')} placeholder="https://youtube.com/watch?v=..." testId="portfolio-video-url" />
          </Field>

          {/* ---- Testimonials editor ---- */}
          <SectionHeader>Reviews ({form.testimonials.length})</SectionHeader>
          {form.testimonials.map((t, i) => (
            <div key={i} className="rounded-xl border border-border bg-app-surface p-3 space-y-2 relative" data-testid={`testimonial-${i}`}>
              <button
                type="button"
                onClick={() => removeTestimonial(i)}
                className="absolute top-2 right-2 p-1 rounded hover:bg-red-500/10 hover:text-red-400"
                aria-label={tByEn('Remove review')}
                data-testid={`testimonial-remove-${i}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Input value={t.name} onChange={(e) => updateTestimonial(i, 'name', e.target.value)} placeholder={tByEn('Name *')} testId={`testimonial-name-${i}`} />
                <Input value={t.role} onChange={(e) => updateTestimonial(i, 'role', e.target.value)} placeholder={tByEn('Role')} testId={`testimonial-role-${i}`} />
                <Input value={t.company} onChange={(e) => updateTestimonial(i, 'company', e.target.value)} placeholder={tByEn('Company')} testId={`testimonial-company-${i}`} />
                <Input value={t.avatar_url} onChange={(e) => updateTestimonial(i, 'avatar_url', e.target.value)} placeholder={tByEn('Avatar URL (optional)')} testId={`testimonial-avatar-${i}`} />
              </div>
              <Textarea value={t.quote} onChange={(e) => updateTestimonial(i, 'quote', e.target.value)} rows={2} placeholder={tByEn('Quote *')} testId={`testimonial-quote-${i}`} />
              <div className="flex items-center gap-2">
                <Label inline>{tByEn('Rating')}</Label>
                <Input type="number" min={0} max={5} value={t.rating} onChange={(e) => updateTestimonial(i, 'rating', e.target.value)} testId={`testimonial-rating-${i}`} />
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addTestimonial}
            data-testid="testimonial-add"
            className="w-full px-3 py-2 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-2 bg-muted hover:bg-muted/70"
          >
            <Plus className="w-3.5 h-3.5" /> {tByEn('Add review')}
          </button>

          {/* ---- Visibility & upsell ---- */}
          <SectionHeader>{tByEn('Visibility & upsell')}</SectionHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Status">
              <select value={form.status} onChange={set('status')}
                className="w-full px-3 py-2 rounded-lg bg-app-surface border border-border text-sm focus:outline-none focus:border-signal"
                data-testid="portfolio-status">
                {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </Field>
            <Field label={tByEn('Sort order (lower = first)')}><Input type="number" value={form.sort_order} onChange={set('sort_order')} testId="portfolio-sort" /></Field>
            <Field label={tByEn('Upsell headline (overrides default)')}>
              <Input value={form.cta_headline} onChange={set('cta_headline')} placeholder={tByEn('Building HIPAA-grade software?')} testId="portfolio-cta" />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Toggle label={tByEn('Published (visible publicly)')}   checked={form.published}        onChange={set('published')}        testId="portfolio-toggle-published" />
            <Toggle label="Featured"                       checked={form.featured}         onChange={set('featured')}         testId="portfolio-toggle-featured" />
            <Toggle label={tByEn('Show budget on card')}            checked={form.show_budget}      onChange={set('show_budget')}      testId="portfolio-toggle-budget" />
            <Toggle label={tByEn('Show description on card')}       checked={form.show_description} onChange={set('show_description')} testId="portfolio-toggle-description" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold bg-muted hover:bg-muted/70">{tByEn('Cancel')}</button>
            <button type="submit" disabled={busy}
              data-testid="portfolio-editor-save"
              className="px-5 py-2 rounded-lg text-sm font-bold bg-signal text-[var(--t-signal-ink)] hover:opacity-90 disabled:opacity-50">
              {busy ? 'Saving…' : (mode === 'edit' ? 'Save changes' : 'Create case')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ========== Small UI atoms ========== */

function SectionHeader({ children }) {
  return (
    <div className="mt-6 mb-1 text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground border-t border-border pt-4 flex items-center gap-2">
      <ArrowRight className="w-3 h-3" />
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Label({ children, inline = false }) {
  return <div className={`text-[10px] font-bold tracking-[0.18em] text-muted-foreground uppercase ${inline ? 'mr-2' : 'mb-1.5'}`}>{children}</div>;
}

function Input({ type = 'text', value, onChange, placeholder, required, testId, min, max }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      data-testid={testId}
      min={min}
      max={max}
      className="w-full px-3 py-2 rounded-lg bg-app-surface border border-border text-sm focus:outline-none focus:border-signal"
    />
  );
}

function Textarea({ value, onChange, rows = 3, placeholder, testId }) {
  return (
    <textarea
      value={value}
      onChange={onChange}
      rows={rows}
      placeholder={placeholder}
      data-testid={testId}
      className="w-full px-3 py-2 rounded-lg bg-app-surface border border-border text-sm focus:outline-none focus:border-signal font-mono"
    />
  );
}

function Toggle({ label, checked, onChange, testId }) {
  return (
    <label className="flex items-center gap-3 px-3 py-2 rounded-lg bg-app-surface border border-border cursor-pointer hover:border-signal/50 transition-colors">
      <input type="checkbox" checked={checked} onChange={onChange} data-testid={testId} className="w-4 h-4 accent-signal" />
      <span className="text-sm text-foreground">{label}</span>
    </label>
  );
}
