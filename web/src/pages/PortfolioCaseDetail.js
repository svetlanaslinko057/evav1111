import { useEffect, useState, useCallback } from 'react';
import { useLang } from '../contexts/LanguageContext';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Calendar,
  DollarSign,
  Clock,
  Users,
  Layers,
  CheckCircle2,
  Star,
  Wrench,
  Archive,
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import Logo from '@/components/Logo';
import PortfolioInquiryModal from '@/components/PortfolioInquiryModal';

/**
 * PortfolioCaseDetail — public case study page.
 *
 *   /portfolio/:caseId
 *
 * Pulled from GET /api/portfolio/cases/:case_id (only `published`).
 * Bottom is an upsell layer: 3 CTAs that all open `PortfolioInquiryModal`
 * with different `intent` values (order_similar, consultation, calculate).
 */
const STATUS_META = {
  delivered:   { label: 'Delivered',    Icon: CheckCircle2, dot: '#10b981' },
  in_progress: { label: 'In progress',  Icon: Clock,        dot: '#f59e0b' },
  maintenance: { label: 'Maintenance',  Icon: Wrench,       dot: '#38bdf8' },
  archived:    { label: 'Archived',     Icon: Archive,      dot: '#64748b' },
};

export default function PortfolioCaseDetail() {
  const { tByEn } = useLang();
  const { caseId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lightboxIdx, setLightboxIdx] = useState(null);
  const [modal, setModal] = useState(null); // { intent }

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const base = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/+$/, '');
      const r = await axios.get(`${base}/api/portfolio/cases/${caseId}`);
      setData(r.data);
    } catch (e) {
      setError(e.response?.data?.detail || 'Case not found');
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => { load(); }, [load]);

  // Close lightbox on Esc
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setLightboxIdx(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (loading) {
    return (
      <Frame>
        <div className="max-w-5xl mx-auto px-6 sm:px-10 pt-32 pb-20">
          <div className="h-8 w-40 rounded bg-muted animate-pulse mb-6" />
          <div className="aspect-[16/9] rounded-2xl bg-muted animate-pulse" />
        </div>
      </Frame>
    );
  }

  if (error || !data) {
    return (
      <Frame>
        <div className="max-w-3xl mx-auto px-6 sm:px-10 pt-32 pb-20 text-center">
          <h1 className="text-3xl font-bold mb-3">{tByEn('Case not found')}</h1>
          <p className="text-muted-foreground mb-6">{error || 'This portfolio case is no longer available.'}</p>
          <button
            onClick={() => navigate('/')}
            className="px-5 py-2.5 rounded-xl font-semibold inline-flex items-center gap-2"
            style={{ background: 'var(--t-signal)', color: 'var(--t-signal-ink)' }}
          >
            <ArrowLeft className="w-4 h-4" /> {tByEn('Back to home')}
          </button>
        </div>
      </Frame>
    );
  }

  const c = data;
  const status = STATUS_META[c.status] || STATUS_META.delivered;
  const StatusIcon = status.Icon;
  const allImages = [c.image_url, ...(c.gallery || [])].filter(Boolean);

  // Date range pretty-print
  const fmtDate = (d) => {
    if (!d) return null;
    try {
      const dt = new Date(d);
      if (Number.isNaN(dt.getTime())) return d;
      return dt.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
    } catch { return d; }
  };
  const dateRange = (c.start_date || c.end_date)
    ? `${fmtDate(c.start_date) || '…'} → ${fmtDate(c.end_date) || 'ongoing'}`
    : null;

  return (
    <Frame>
      {/* Sticky upsell bar on mobile */}
      <div
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 px-4 py-3 flex gap-2"
        style={{
          background: 'var(--token-surface-elevated)',
          borderTop: '1px solid var(--token-border)',
          boxShadow: '0 -8px 24px rgba(0,0,0,0.25)',
        }}
      >
        <button
          onClick={() => setModal({ intent: 'order_similar' })}
          className="flex-1 px-4 py-3 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-2"
          style={{ background: 'var(--t-signal)', color: 'var(--t-signal-ink)' }}
          data-testid="sticky-order-cta"
        >
          <Sparkles className="w-4 h-4" /> {tByEn('Order similar')}
        </button>
      </div>

      <main className="pb-32 lg:pb-20">
        {/* Back link */}
        <div className="max-w-6xl mx-auto px-6 sm:px-10 pt-24 sm:pt-28 pb-4">
          <Link
            to="/#portfolio"
            className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 transition-colors"
            data-testid="back-to-portfolio"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> {tByEn('Back to portfolio')}
          </Link>
        </div>

        {/* Hero */}
        <section className="max-w-6xl mx-auto px-6 sm:px-10 pt-6 pb-10">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {c.industry && (
              <span className="text-[10px] font-mono font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {c.industry}
              </span>
            )}
            {c.featured && (
              <span
                className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] inline-flex items-center gap-1 px-2 py-0.5 rounded"
                style={{ background: 'rgba(11,143,94,0.10)', color: 'var(--t-signal)' }}
              >
                <Star className="w-2.5 h-2.5" /> {tByEn('Featured')}
              </span>
            )}
            <span
              className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] inline-flex items-center gap-1.5"
              style={{ color: 'var(--t-text-secondary)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: status.dot }} />
              <StatusIcon className="w-3 h-3" />
              {status.label}
            </span>
          </div>

          <h1
            className="text-4xl sm:text-5xl font-bold leading-tight mb-3"
            style={{ letterSpacing: '-0.02em' }}
            data-testid="case-title"
          >
            {c.title}
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-3xl">
            {c.client_name}
            {c.product_type ? ` · ${c.product_type}` : ''}
          </p>
        </section>

        {/* Hero image */}
        {allImages.length > 0 && (
          <section className="max-w-6xl mx-auto px-6 sm:px-10">
            <button
              onClick={() => setLightboxIdx(0)}
              className="block w-full rounded-2xl overflow-hidden border border-border bg-muted aspect-[16/9] cursor-zoom-in"
              style={{ boxShadow: '0 14px 36px rgba(0,0,0,0.18)' }}
              data-testid="case-hero-image"
            >
              <img
                src={allImages[0]}
                alt={c.title}
                className="w-full h-full object-cover"
              />
            </button>
          </section>
        )}

        {/* Video presentation */}
        {c.video_url && (
          <section className="max-w-6xl mx-auto px-6 sm:px-10 mt-8">
            <div className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-muted-foreground mb-3 flex items-center gap-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: 'var(--t-signal)' }} />
              {tByEn('Video walkthrough')}
            </div>
            <CaseVideoPlayer url={c.video_url} title={c.title} />
          </section>
        )}

        {/* Body grid: content + meta sidebar */}
        <section className="max-w-6xl mx-auto px-6 sm:px-10 mt-12 grid lg:grid-cols-[1fr_320px] gap-10">
          <div>
            {c.show_description && c.description && (
              <Block title={tByEn('Overview')}>
                <p className="text-[15px] leading-relaxed">{c.description}</p>
              </Block>
            )}

            {c.challenge && (
              <Block title={tByEn('The challenge')}>
                <p className="text-[15px] leading-relaxed whitespace-pre-line">{c.challenge}</p>
              </Block>
            )}

            {c.solution && (
              <Block title={tByEn('Our solution')}>
                <p className="text-[15px] leading-relaxed whitespace-pre-line">{c.solution}</p>
              </Block>
            )}

            {c.case_study && (
              <Block title={tByEn('Inside the build')}>
                <div className="text-[15px] leading-relaxed whitespace-pre-line">{c.case_study}</div>
              </Block>
            )}

            {c.results && (
              <Block title={tByEn('Results')}>
                <div
                  className="rounded-xl p-5 text-[15px] leading-relaxed font-medium"
                  style={{
                    background: 'rgba(11,143,94,0.08)',
                    border: '1px solid rgba(11,143,94,0.20)',
                    color: 'var(--t-text-primary)',
                  }}
                  data-testid="case-results"
                >
                  → {c.results}
                </div>
              </Block>
            )}

            {Array.isArray(c.technologies) && c.technologies.length > 0 && (
              <Block title={tByEn('Stack')}>
                <div className="flex flex-wrap gap-2">
                  {c.technologies.map((t) => (
                    <span
                      key={t}
                      className="text-xs font-mono font-semibold px-2.5 py-1 rounded-md"
                      style={{
                        background: 'var(--token-surface)',
                        border: '1px solid var(--token-border)',
                        color: 'var(--t-text-primary)',
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </Block>
            )}

            {/* Gallery */}
            {allImages.length > 1 && (
              <Block title={tByEn('Screens')}>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {allImages.slice(1).map((src, i) => (
                    <button
                      key={i}
                      onClick={() => setLightboxIdx(i + 1)}
                      className="block aspect-[4/3] rounded-lg overflow-hidden border border-border bg-muted cursor-zoom-in transition-transform hover:scale-[1.02]"
                      data-testid={`case-gallery-${i}`}
                    >
                      <img src={src} alt={`screen ${i + 2}`} className="w-full h-full object-cover" loading="lazy" />
                    </button>
                  ))}
                </div>
              </Block>
            )}

            {c.external_url && (
              <Block title={tByEn('Live product')}>
                <a
                  href={c.external_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold"
                  style={{ color: 'var(--t-signal)' }}
                  data-testid="case-external-link"
                >
                  {c.external_url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </Block>
            )}

            {/* Testimonials — multiple reviews (new) */}
            {Array.isArray(c.testimonials) && c.testimonials.length > 0 && (
              <Block title={c.testimonials.length === 1 ? 'Client testimonial' : 'What clients say'}>
                <div className="space-y-3">
                  {c.testimonials.map((t, i) => (
                    <TestimonialCard key={i} t={t} />
                  ))}
                </div>
              </Block>
            )}

            {/* Legacy single-string testimonial — back-compat */}
            {!c.testimonials?.length && c.testimonial && (
              <Block title={tByEn('Client testimonial')}>
                <blockquote
                  className="rounded-xl p-5 text-[15px] leading-relaxed italic"
                  style={{
                    background: 'var(--token-surface)',
                    borderLeft: '3px solid var(--t-signal)',
                    color: 'var(--t-text-primary)',
                  }}
                >
                  "{c.testimonial}"
                </blockquote>
              </Block>
            )}
          </div>

          {/* Sidebar — meta + sticky CTA */}
          <aside className="lg:sticky lg:top-24 self-start space-y-4">
            <div
              className="rounded-2xl p-5"
              style={{
                background: 'var(--token-surface-elevated)',
                border: '1px solid var(--token-border)',
                boxShadow: 'var(--token-shadow-card)',
              }}
            >
              <div className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-muted-foreground mb-3">
                {tByEn('Project facts')}
              </div>
              <dl className="space-y-2.5 text-sm">
                {c.show_budget && c.budget != null && (
                  <MetaRow Icon={DollarSign} label={tByEn('Budget')}>
                    ${Math.round(c.budget).toLocaleString()}
                  </MetaRow>
                )}
                {c.duration_weeks != null && (
                  <MetaRow Icon={Clock} label="Duration">
                    {c.duration_weeks} weeks
                  </MetaRow>
                )}
                {c.hours_spent != null && (
                  <MetaRow Icon={Layers} label={tByEn('Engineering hours')}>
                    {c.hours_spent.toLocaleString()}h
                  </MetaRow>
                )}
                {c.team_size != null && (
                  <MetaRow Icon={Users} label={tByEn('Team size')}>
                    {c.team_size} {c.team_size === 1 ? 'person' : 'people'}
                  </MetaRow>
                )}
                {dateRange && (
                  <MetaRow Icon={Calendar} label="Timeline">
                    {dateRange}
                  </MetaRow>
                )}
                {c.quality_score != null && (
                  <MetaRow Icon={CheckCircle2} label={tByEn('Quality score')}>
                    {c.quality_score}/100
                  </MetaRow>
                )}
              </dl>
              {Array.isArray(c.tags) && c.tags.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-1.5">
                  {c.tags.map((t) => (
                    <span
                      key={t}
                      className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded text-muted-foreground"
                      style={{ background: 'var(--token-surface)' }}
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Inline upsell card */}
            <div
              className="rounded-2xl p-5"
              style={{
                background:
                  'linear-gradient(160deg, rgba(11,143,94,0.18), rgba(11,143,94,0.04))',
                border: '1px solid rgba(11,143,94,0.30)',
              }}
              data-testid="case-upsell-card"
            >
              <div className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--t-signal)' }}>
                {c.cta_headline ? c.cta_headline : 'Like this?'}
              </div>
              <p className="text-sm font-semibold text-foreground mb-1">
                {tByEn('We can build you something similar.')}
              </p>
              {c.starting_from != null && (
                <p className="text-xs text-muted-foreground mb-3">
                  Similar projects starting from{' '}
                  <span className="font-mono font-bold text-foreground">
                    ${Math.round(c.starting_from).toLocaleString()}
                  </span>
                </p>
              )}
              <div className="space-y-2 mt-3">
                <button
                  onClick={() => setModal({ intent: 'order_similar' })}
                  className="w-full px-4 py-2.5 rounded-lg text-sm font-bold inline-flex items-center justify-center gap-2"
                  style={{ background: 'var(--t-signal)', color: 'var(--t-signal-ink)' }}
                  data-testid="upsell-order"
                >
                  <Sparkles className="w-4 h-4" /> {tByEn('Order similar')}
                </button>
                <button
                  onClick={() => setModal({ intent: 'consultation' })}
                  className="w-full px-4 py-2.5 rounded-lg text-sm font-semibold inline-flex items-center justify-center gap-2"
                  style={{ background: 'var(--token-surface-elevated)', border: '1px solid var(--token-border)', color: 'var(--t-text-primary)' }}
                  data-testid="upsell-consult"
                >
                  <Calendar className="w-4 h-4" /> {tByEn('Free consultation')}
                </button>
                <button
                  onClick={() => navigate('/describe')}
                  className="w-full px-4 py-2.5 rounded-lg text-sm font-semibold inline-flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
                  data-testid="upsell-describe"
                >
                  {tByEn('Use the AI estimator')} <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </aside>
        </section>

        {/* Full-width final CTA band */}
        <section className="mt-20 py-16 border-t border-border" style={{ background: 'var(--token-surface)' }}>
          <div className="max-w-4xl mx-auto px-6 sm:px-10 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold mb-3" style={{ letterSpacing: '-0.02em' }}>
              {tByEn('Ready to build something like this?')}
            </h2>
            <p className="text-base text-muted-foreground max-w-2xl mx-auto mb-8">
              Get a structured estimate for a project like this — or book a 30-minute consultation first.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => setModal({ intent: 'order_similar' })}
                className="px-6 py-3.5 rounded-xl font-bold inline-flex items-center justify-center gap-2"
                style={{
                  background: 'var(--t-signal)',
                  color: 'var(--t-signal-ink)',
                  boxShadow: '0 12px 28px rgba(11,143,94,0.30)',
                }}
                data-testid="final-cta-order"
              >
                <Sparkles className="w-4 h-4" /> {tByEn('Get my estimate')}
              </button>
              <button
                onClick={() => setModal({ intent: 'consultation' })}
                className="px-6 py-3.5 rounded-xl font-semibold inline-flex items-center justify-center gap-2"
                style={{ background: 'transparent', border: '1px solid var(--token-border)', color: 'var(--t-text-primary)' }}
                data-testid="final-cta-consult"
              >
                <Calendar className="w-4 h-4" /> {tByEn('Free consultation')}
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Lightbox */}
      {lightboxIdx != null && allImages[lightboxIdx] && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-6 cursor-zoom-out"
          style={{ background: 'rgba(0,0,0,0.92)' }}
          onClick={() => setLightboxIdx(null)}
          data-testid="case-lightbox"
        >
          <img
            src={allImages[lightboxIdx]}
            alt={`screen ${lightboxIdx + 1}`}
            className="max-w-full max-h-full object-contain rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Inquiry modal */}
      <PortfolioInquiryModal
        open={!!modal}
        onClose={() => setModal(null)}
        caseId={c.case_id}
        caseTitle={c.title}
        intent={modal?.intent || 'order_similar'}
      />
    </Frame>
  );
}

/* ============================================================ */

function Frame({ children }) {
  return (
    <div className="min-h-screen bg-background text-foreground" data-testid="portfolio-case-detail">
      <Header />
      {children}
      <Footer />
    </div>
  );
}

function Header() {
  const { tByEn } = useLang();
  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b border-border"
      style={{ background: 'color-mix(in srgb, var(--token-bg) 80%, transparent)' }}
    >
      <div className="max-w-6xl mx-auto px-6 sm:px-10 h-16 flex items-center justify-between">
        <Link to="/" className="inline-flex items-center" data-testid="header-logo">
          <Logo height={32} className="h-8 w-auto" />
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            to="/#portfolio"
            className="hidden sm:inline-flex text-sm text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg"
          >
            {tByEn('All cases')}
          </Link>
        </div>
      </div>
    </nav>
  );
}

function Footer() {
  const { tByEn } = useLang();
  return (
    <footer className="border-t border-border" style={{ background: 'var(--token-surface)' }}>
      <div className="max-w-6xl mx-auto px-6 sm:px-10 py-8 text-xs text-muted-foreground flex justify-between items-center">
        <span>© {new Date().getFullYear()} DevOS · Execution layer for software</span>
        <Link to="/" className="hover:text-foreground">{tByEn('Home')}</Link>
      </div>
    </footer>
  );
}

function Block({ title, children }) {
  return (
    <div className="mb-8">
      <div className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-muted-foreground mb-3">
        {title}
      </div>
      {children}
    </div>
  );
}

function MetaRow({ Icon, label, children }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <dt className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </dt>
        <dd className="text-sm font-semibold text-foreground mt-0.5">{children}</dd>
      </div>
    </div>
  );
}

/* ============ Video player — YouTube / Vimeo / direct mp4 ============ */
function CaseVideoPlayer({ url, title }) {
  const { tByEn } = useLang();
  if (!url) return null;
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
  if (ytMatch) {
    return (
      <div
        className="aspect-video rounded-2xl overflow-hidden border border-border"
        style={{ boxShadow: '0 14px 36px rgba(0,0,0,0.18)' }}
        data-testid="case-video-youtube"
      >
        <iframe
          src={`https://www.youtube.com/embed/${ytMatch[1]}`}
          title={`${title} video`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
          frameBorder="0"
        />
      </div>
    );
  }
  // Vimeo
  const vmMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vmMatch) {
    return (
      <div
        className="aspect-video rounded-2xl overflow-hidden border border-border"
        style={{ boxShadow: '0 14px 36px rgba(0,0,0,0.18)' }}
        data-testid="case-video-vimeo"
      >
        <iframe
          src={`https://player.vimeo.com/video/${vmMatch[1]}`}
          title={`${title} video`}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
          frameBorder="0"
        />
      </div>
    );
  }
  // Direct mp4/webm/ogg
  return (
    <video
      src={url}
      controls
      preload="metadata"
      className="w-full aspect-video rounded-2xl border border-border bg-black"
      style={{ boxShadow: '0 14px 36px rgba(0,0,0,0.18)' }}
      data-testid="case-video-mp4"
    >
      {tByEn('Your browser does not support the video tag.')}
    </video>
  );
}

/* ============ Testimonial card ============ */
function TestimonialCard({ t }) {
  const rating = Math.max(0, Math.min(5, Number(t.rating) || 0));
  return (
    <article
      className="rounded-2xl p-5"
      style={{
        background: 'var(--token-surface-elevated)',
        border: '1px solid var(--token-border)',
        boxShadow: 'var(--token-shadow-card)',
      }}
      data-testid="case-testimonial"
    >
      {rating > 0 && (
        <div className="flex items-center gap-0.5 mb-3" aria-label={`${rating} out of 5 stars`}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className="w-3.5 h-3.5"
              style={{
                color: i < rating ? '#f59e0b' : 'var(--token-border)',
                fill: i < rating ? '#f59e0b' : 'transparent',
              }}
            />
          ))}
        </div>
      )}
      <blockquote className="text-[15px] leading-relaxed italic mb-4 text-foreground">
        "{t.quote}"
      </blockquote>
      <div className="flex items-center gap-3">
        {t.avatar_url ? (
          // eslint-disable-next-line
          <img
            src={t.avatar_url}
            alt={`${t.name} photo`}
            className="w-10 h-10 rounded-full object-cover shrink-0 border border-border"
            loading="lazy"
          />
        ) : (
          <div
            className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-sm font-bold"
            style={{
              background: 'var(--token-surface)',
              color: 'var(--t-text-secondary)',
            }}
          >
            {(t.name || '?').slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <div className="text-sm font-bold text-foreground truncate">{t.name}</div>
          <div className="text-xs text-muted-foreground truncate">
            {[t.role, t.company].filter(Boolean).join(' · ')}
          </div>
        </div>
      </div>
    </article>
  );
}
