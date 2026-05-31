import { useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { ArrowUpRight, Plus, ChevronRight, CheckCircle2, Clock, Wrench, Archive, Layers, Lock } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import LanguageToggle from '@/components/LanguageToggle';
import { useLang } from '@/contexts/LanguageContext';
import Logo from '@/components/Logo';
import DescribeWidget from '@/components/DescribeWidget';
import AnimatedHeading from '@/components/AnimatedHeading';
import FooterExtras from '@/components/FooterExtras';
import MobileCabinetSection from '@/components/MobileCabinetSection';

/**
 * LandingPageLight — operational light variant.
 *
 * Direction: serious operational system in a warm-paper light aesthetic.
 * References: Stripe Press, Notion Calendar (light), early Vercel docs,
 * Raycast marketing site.
 *
 * Hard rules:
 *   - No "var(--t-signal)" startup-green anywhere. No bright mint. No marketing gradients.
 *   - Warm parchment substrate (#F5F2EC), never pure white.
 *   - Real depth via layered warm-paper surfaces, not glassmorphism.
 *   - Editorial grotesk display (Instrument Sans) + IBM Plex Mono operational labels.
 *   - SEQ-NN sequence typography, not numbered green circles.
 *   - Operational language, not marketing bullets.
 *   - CTA is a heavy graphite material on the warm paper, with real shadow physics.
 *
 * Palette (locked, light-only):
 *   bg-0      #F5F2EC    warm parchment substrate
 *   bg-1      #EDE9DF    operational layer
 *   bg-2      #E3DECF    focus layer
 *   bg-3      #FFFFFF    sharp / inset surface
 *   border-1  rgba(26,23,20,0.08)
 *   border-2  rgba(26,23,20,0.14)
 *   border-3  rgba(26,23,20,0.22)
 *   text-1    #1A1714    warm dark ink
 *   text-2    #5C544D    warm secondary
 *   text-3    #8C8278    warm muted
 *   signal    #A07A2E    bronze, ONLY for live/pulse signals
 *   cta-bg    #1A1714    heavy graphite material
 *   cta-ink   #F5F2EC    paper text on heavy material
 */

const C = {
  bg0: '#F5F2EC',
  bg1: '#EDE9DF',
  bg2: '#E3DECF',
  bg3: '#FFFFFF',
  border1: 'rgba(26,23,20,0.08)',
  border2: 'rgba(26,23,20,0.14)',
  border3: 'rgba(26,23,20,0.22)',
  text1: '#1A1714',
  text2: '#5C544D',
  text3: '#8C8278',
  signal: '#A07A2E',
  ctaBg: '#1A1714',
  ctaInk: '#F5F2EC',
};

const FONT_DISPLAY =
  "'Instrument Sans', 'Inter Tight', 'Inter', ui-sans-serif, system-ui, sans-serif";
const FONT_BODY =
  "'Inter', 'Inter Tight', ui-sans-serif, system-ui, sans-serif";
const FONT_MONO =
  "'IBM Plex Mono', 'JetBrains Mono', ui-monospace, SFMono-Regular, monospace";

const LandingPageLight = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const id = 'instrument-sans-font';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600&display=swap';
    document.head.appendChild(link);
  }, []);

  return (
    <div
      data-testid="landing-page"
      style={{
        background: C.bg0,
        color: C.text1,
        fontFamily: FONT_BODY,
        minHeight: '100vh',
        // Very subtle warm radial substrate cue — not a marketing glow.
        backgroundImage:
          'radial-gradient(1200px 600px at 50% -20%, rgba(160,122,46,0.04), transparent 60%)',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
      }}
    >
      <Header
        onLogin={() => navigate('/auth?mode=signin')}
        onStart={() => navigate('/auth?mode=register&role=client')}
      />

      <main>
        <Hero onStart={() => navigate('/auth?mode=register&role=client')} />
        <EstimatorBlock />
        <SequenceSection />
        <BuildModesSection onStart={() => navigate('/auth?mode=register&role=client')} />
        <SystemSection />
        <CapabilitiesSection />
        <UseCasesSection />
        <PortfolioSection />
        <MobileCabinetSection
          C={C}
          FONT_DISPLAY={FONT_DISPLAY}
          FONT_BODY={FONT_BODY}
          FONT_MONO={FONT_MONO}
          tone="light"
        />
        <FinalCTA onStart={() => navigate('/auth?mode=register&role=client')} />
      </main>

      <Footer />
    </div>
  );
};

/* ============================================================ HEADER */
const Header = ({ onLogin, onStart }) => {
  const { t } = useLang();
  return (
  <header
    data-testid="landing-header"
    style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: `${C.bg0}E6`,
      borderBottom: `1px solid ${C.border1}`,
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
    }}
  >
    <div
      style={{
        maxWidth: 1240,
        margin: '0 auto',
        padding: '0 32px',
        height: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 24,
      }}
    >
      <a
        href="/"
        data-testid="landing-logo"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          textDecoration: 'none',
        }}
      >
        <Logo height={36} testId="landing-logo-mark" />
      </a>

      <nav
        className="landing-nav-desktop"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 28,
          fontSize: 13,
          color: C.text2,
        }}
      >
        <HeaderLink href="#sequence" testid="nav-flow">{t('nav.how')}</HeaderLink>
        <HeaderLink href="#modes" testid="nav-build-modes">{t('nav.modes')}</HeaderLink>
        <HeaderLink href="#system" testid="nav-system">{t('nav.system')}</HeaderLink>
        <HeaderLink href="#capabilities" testid="nav-capabilities">{t('nav.capabilities')}</HeaderLink>
        <HeaderLink href="#use-cases" testid="nav-use-cases">{t('nav.use_cases')}</HeaderLink>
        <HeaderLink href="#mobile" testid="nav-mobile">{t('nav.mobile')}</HeaderLink>
      </nav>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <LanguageToggle palette={C} fontMono={FONT_MONO} />
        <ThemeToggle />
        <button
          onClick={onLogin}
          data-testid="nav-login"
          style={{
            background: 'transparent',
            border: 'none',
            color: C.text2,
            fontSize: 13,
            padding: '6px 10px',
            cursor: 'pointer',
            fontFamily: FONT_BODY,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = C.text1)}
          onMouseLeave={(e) => (e.currentTarget.style.color = C.text2)}
        >
          {t('nav.login')}
        </button>
        <HeavyButton onClick={onStart} testid="nav-start" size="sm">
          {t('nav.start')}
        </HeavyButton>
      </div>
    </div>

    <style>{`
      @media (max-width: 880px) {
        .landing-nav-desktop { display: none !important; }
      }
    `}</style>
  </header>
  );
};

const HeaderLink = ({ href, children, testid }) => (
  <a
    href={href}
    data-testid={testid}
    style={{
      color: 'inherit',
      textDecoration: 'none',
      transition: 'color 120ms ease',
    }}
    onMouseEnter={(e) => (e.currentTarget.style.color = C.text1)}
    onMouseLeave={(e) => (e.currentTarget.style.color = C.text2)}
  >
    {children}
  </a>
);

/* ============================================================ HEAVY BUTTON
 * Tactile dark material on warm paper. Inset light + real shadow + press deflection.
 */
const HeavyButton = ({ children, onClick, testid, size = 'md' }) => {
  const [pressed, setPressed] = useState(false);
  const padding =
    size === 'sm' ? '8px 14px' : size === 'lg' ? '16px 24px' : '12px 20px';
  const fontSize = size === 'sm' ? 13 : size === 'lg' ? 15 : 14;
  const drop = pressed
    ? '0 1px 0 rgba(0,0,0,0.20), 0 2px 4px rgba(0,0,0,0.10)'
    : '0 1px 0 rgba(0,0,0,0.22), 0 10px 24px rgba(26,23,20,0.20), 0 2px 4px rgba(26,23,20,0.10)';
  return (
    <button
      data-testid={testid}
      onClick={onClick}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onBlur={() => setPressed(false)}
      style={{
        background: C.ctaBg,
        color: C.ctaInk,
        border: `1px solid ${C.ctaBg}`,
        borderRadius: 8,
        padding,
        fontSize,
        fontWeight: 600,
        fontFamily: FONT_BODY,
        letterSpacing: '-0.005em',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -1px 0 rgba(0,0,0,0.40), ${drop}`,
        transform: pressed ? 'translateY(1px)' : 'translateY(0)',
        transition: 'transform 60ms ease, box-shadow 120ms ease',
      }}
    >
      {children}
    </button>
  );
};

/* ============================================================ HERO
   Split into two logically equal columns. Each column is a vertical flex
   stretched to the same height — narrative content on the left, proof
   surfaces on the right. Both columns end at the SAME bottom baseline
   where stat tiles sit (2 on the left, 1 on the right), giving the
   composition a clean horizontal rhythm at the bottom edge. */
const Hero = ({ onStart }) => {
  const { t, tByEn } = useLang();
  return (
  <section
    data-testid="hero"
    style={{
      position: 'relative',
      padding: '72px 32px 64px',
      overflow: 'hidden',
    }}
  >
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        background:
          'radial-gradient(820px 500px at 12% 16%, rgba(160,122,46,0.07), transparent 60%)',
      }}
    />
    <div
      className="hero-grid"
      style={{
        position: 'relative',
        maxWidth: 1240,
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.05fr) minmax(0, 1fr)',
        gap: 72,
        alignItems: 'stretch',
      }}
    >
      {/* ============ LEFT COLUMN: NARRATIVE ============ */}
      <div
        className="hero-col hero-col--left"
        style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100%',
        }}
      >
        <div style={{ flex: '0 0 auto' }}>
          <AnimatedHeading
            as="h1"
            immediate
            testId="hero-heading-anim"
            kicker={
              <>
                <span
                  aria-hidden
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 999,
                    background: C.signal,
                    display: 'inline-block',
                    marginRight: 8,
                    boxShadow: '0 0 0 3px rgba(160,122,46,0.14)',
                  }}
                />
                {tByEn('OPERATIONAL · EXECUTION SUBSTRATE')}
              </>
            }
            kickerStyle={kickerStyle}
            title={`Software,\nactually shipped.`}
            titleStyle={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 600,
              fontSize: 'clamp(48px, 6.4vw, 84px)',
              lineHeight: 0.98,
              letterSpacing: '-0.035em',
              color: C.text1,
              margin: '24px 0 0',
            }}
            sub="Describe what you need. The system scopes it, prices it, assigns builders, runs QA and locks delivery against a contract — without retainers, packages or back-and-forth."
            subStyle={{
              color: C.text2,
              marginTop: 28,
              fontSize: 18,
              lineHeight: 1.55,
              maxWidth: 540,
            }}
          />

          {/* Escrow promise — inline pill, woven into the narrative on the left */}
          <HeroEscrowPill />
        </div>

        {/* spacer pushes the stat strip to the bottom baseline */}
        <div style={{ flex: '1 1 auto' }} />

        {/* LEFT BOTTOM STATS — 2 tiles (animated counters) */}
        <div
          className="hero-stats hero-stats--left"
          style={{
            marginTop: 40,
            paddingTop: 24,
            borderTop: `1px solid ${C.border1}`,
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 28,
          }}
        >
          <HeroStat label="Projects executed" target={500} lead={5} suffix="+" />
          <HeroStat label="Median MVP time" valueText="4 wk" />
        </div>
      </div>

      {/* ============ RIGHT COLUMN: PROOF ============ */}
      <div
        className="hero-col hero-col--right"
        style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100%',
          gap: 16,
        }}
      >
        <PipelinePanel />

        {/* spacer pushes the stat strip to the bottom baseline */}
        <div style={{ flex: '1 1 auto' }} />

        {/* RIGHT BOTTOM STATS — 2 tiles (mirrors left, total = 4) */}
        <div
          className="hero-stats hero-stats--right"
          style={{
            marginTop: 16,
            paddingTop: 24,
            borderTop: `1px solid ${C.border1}`,
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 28,
          }}
        >
          <HeroStat label="Contract-met delivery" valueText="98%" />
          <HeroStat label="Vetted builders" target={200} lead={5} suffix="+" />
        </div>
      </div>
    </div>

    <style>{`
      @media (max-width: 980px) {
        .hero-grid { grid-template-columns: 1fr !important; gap: 48px !important; align-items: stretch !important; }
        .hero-col { min-height: auto !important; }
        .hero-stats--right { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
      }
      @media (max-width: 540px) {
        .hero-stats { grid-template-columns: 1fr !important; }
      }
    `}</style>
  </section>
  );
};

/* HeroStat — bottom-baseline stat tile.
   - If `target` is provided → animated tabular counter (lifts from below page
     fold, uses the same IntersectionObserver pattern as the lower ProofMetric).
   - Else `valueText` is rendered statically.
   This consolidates the old top-of-page TrustItem strip + lower ProofRow into
   a single 4-tile bottom strip (2 left + 2 right), eliminating the duplicate. */
const HeroStat = ({ label, target, lead, suffix, valueText }) => {
  const { tByEn } = useLang();
  label = tByEn(label);
  valueText = tByEn(valueText);
  const ref = useRef(null);
  const animated = typeof target === 'number';
  const [value, setValue] = useState(animated ? Math.max(0, target - (lead ?? 5)) : 0);
  const [done, setDone] = useState(!animated);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!animated) return;
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setValue(target);
      setDone(true);
      return;
    }
    let interval = null;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting || startedRef.current) return;
          startedRef.current = true;
          io.disconnect();
          const ld = lead ?? 5;
          let current = Math.max(0, target - ld);
          interval = setInterval(() => {
            current += 1;
            if (current >= target) {
              setValue(target);
              setDone(true);
              clearInterval(interval);
              interval = null;
            } else {
              setValue(current);
            }
          }, 800);
        });
      },
      { threshold: 0.3 }
    );
    io.observe(node);
    return () => {
      io.disconnect();
      if (interval) clearInterval(interval);
    };
  }, [animated, target, lead]);

  return (
    <div ref={ref} style={{ textAlign: 'center' }}>
      <div
        style={{
          fontFamily: FONT_DISPLAY,
          fontWeight: 500,
          fontSize: 'clamp(28px, 3vw, 36px)',
          letterSpacing: '-0.03em',
          color: C.text1,
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'center',
          marginBottom: 12,
        }}
      >
        {animated ? (
          <>
            <span style={{ display: 'inline-block', minWidth: '1ch' }}>{value}</span>
            <span
              aria-hidden
              style={{
                marginLeft: 1,
                opacity: done ? 1 : 0,
                transform: done ? 'translateY(0)' : 'translateY(6px)',
                transition: `opacity 320ms ${MODE_EASE}, transform 320ms ${MODE_EASE}`,
                display: 'inline-block',
              }}
            >
              {suffix}
            </span>
          </>
        ) : (
          <span>{valueText}</span>
        )}
      </div>
      <div style={kickerStyle}>{label}</div>
    </div>
  );
};

/* HeroEscrowPill — compact left-column inline element. Replaces the bulky
   right-side HeroEscrowCallout: same promise (escrow / no pay-forward) but
   woven into the narrative as a single-line pill, leaving the right column
   to the pipeline visual alone. */
const HeroEscrowPill = () => { const { tByEn } = useLang(); return (  <div
    data-testid="hero-escrow-pill"
    style={{
      marginTop: 28,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 12,
      padding: '10px 16px 10px 12px',
      borderRadius: 999,
      background: 'rgba(160,122,46,0.08)',
      border: '1px solid rgba(160,122,46,0.28)',
      maxWidth: '100%',
    }}
  >
    <span
      aria-hidden
      style={{
        width: 26,
        height: 26,
        borderRadius: 999,
        background: 'rgba(160,122,46,0.18)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#7A5A1F',
        flexShrink: 0,
      }}
    >
      <Lock size={13} strokeWidth={2.2} />
    </span>
    <span
      style={{
        fontFamily: FONT_MONO,
        fontSize: 11,
        color: '#7A5A1F',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
      }}
    >
      {tByEn('Escrow-locked')}
    </span>
    <span
      style={{
        width: 1,
        height: 14,
        background: 'rgba(160,122,46,0.30)',
        flexShrink: 0,
      }}
    />
    <span
      style={{
        fontSize: 14,
        color: C.text1,
        fontWeight: 500,
        letterSpacing: '-0.005em',
      }}
    >
      {tByEn("You don't pay forward. Funds release on delivery.")}
    </span>
  </div>
); };

/* ============================================================ ESTIMATOR BLOCK
   Full-width dedicated section below the hero. Houses the entire
   "describe → estimate" data-logic (text/URL input, file upload, build-mode
   selector, calculation submit) as a single breathing surface. The block
   is split into three horizontal regions stacked top-to-bottom:
     1. HEAD        — title + 3 latency/cost/scope-stability stats
     2. WORKBENCH   — DescribeWidget gets the full canvas, with a thin
                      meta-rail on the right showing what the system reads.
     3. AFTERMATH   — 4-step "what happens next" strip, full-width.
   This replaces the previous cramped two-column layout where the widget
   had to share space with a vertical "next steps" aside. */
const EstimatorBlock = () => {
  const { tByEn } = useLang();
  return (
  <section
    data-testid="estimator-block"
    id="estimator"
    style={{
      position: 'relative',
      padding: '32px 32px 112px',
    }}
  >
    <div style={{ maxWidth: 1240, margin: '0 auto' }}>
      <div
        style={{
          background: C.bg3,
          border: `1px solid ${C.border1}`,
          borderRadius: 20,
          padding: '56px 56px 48px',
          boxShadow:
            '0 1px 0 rgba(255,255,255,0.6), 0 28px 70px rgba(26,23,20,0.07), 0 6px 18px rgba(26,23,20,0.04)',
        }}
      >
        {/* ============ 1. HEAD ============ */}
        <div
          className="estimator-head"
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 1fr)',
            gap: 48,
            alignItems: 'end',
            paddingBottom: 36,
            borderBottom: `1px solid ${C.border1}`,
          }}
        >
          <div>
            <div style={kickerStyle}>{tByEn('ESTIMATOR · INSTANT SCOPE & PRICE')}</div>
            <h2
              style={{
                fontFamily: FONT_DISPLAY,
                fontWeight: 500,
                fontSize: 'clamp(32px, 3.8vw, 48px)',
                letterSpacing: '-0.025em',
                lineHeight: 1.04,
                color: C.text1,
                margin: '14px 0 0',
              }}
            >
              {tByEn('Describe your project. Get a real price.')}
            </h2>
            <p
              style={{
                color: C.text2,
                fontSize: 16,
                lineHeight: 1.55,
                marginTop: 18,
                maxWidth: 560,
              }}
            >
              {tByEn('Text, a link, or both. Attach a PDF, doc or image if you have one. The system reads it, scopes the modules, picks a build mode and returns a fixed price — in ~15 seconds.')}
            </p>
          </div>

          <ul
            className="estimator-head-stats"
            style={{
              margin: 0,
              padding: 0,
              listStyle: 'none',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 24,
            }}
          >
            {[
              ['~15s', tByEn('estimate latency')],
              ['$0', tByEn('no signup, no card')],
              ['fixed', tByEn('no scope-creep')],
            ].map(([k, v]) => (
              <li
                key={v}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  paddingLeft: 14,
                  borderLeft: `1px solid ${C.border1}`,
                }}
              >
                <span
                  style={{
                    color: C.text1,
                    fontFamily: FONT_DISPLAY,
                    fontWeight: 500,
                    fontSize: 22,
                    letterSpacing: '-0.01em',
                    lineHeight: 1,
                  }}
                >
                  {k}
                </span>
                <span
                  style={{
                    fontFamily: FONT_MONO,
                    fontSize: 11,
                    color: C.text2,
                    letterSpacing: '0.02em',
                  }}
                >
                  {v}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* ============ 2. WORKBENCH ============ */}
        <div
          data-testid="hero-describe"
          className="estimator-body"
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.45fr) minmax(0, 1fr)',
            gap: 48,
            alignItems: 'stretch',
            paddingTop: 40,
            paddingBottom: 40,
          }}
        >
          {/* primary canvas — the data-logic gets full breathing room */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
            }}
          >
            <div style={kickerStyle}>{tByEn('YOUR INPUT')}</div>
            <DescribeWidget mode="inline" />
          </div>

          {/* meta-rail: what the system reads from the input */}
          <aside
            className="estimator-meta"
            style={{
              background: C.bg1,
              border: `1px solid ${C.border1}`,
              borderRadius: 14,
              padding: '28px 28px',
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
            }}
          >
            <div style={kickerStyle}>{tByEn('HOW IT READS YOU')}</div>
            <div
              style={{
                fontFamily: FONT_DISPLAY,
                fontWeight: 500,
                fontSize: 18,
                color: C.text1,
                letterSpacing: '-0.005em',
                lineHeight: 1.3,
              }}
            >
              {tByEn('Paste a competitor URL, drop a brief, or just type the idea — the parser pulls the same signals either way.')}
            </div>
            <ul
              style={{
                margin: 0,
                padding: 0,
                listStyle: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}
            >
              {[
                ['URL', tByEn('competitor scan · stack hints · feature lift')],
                ['FILE', tByEn('PDF · doc · image OCR · structured fields')],
                ['TEXT', tByEn('natural language → module decomposition')],
                ['MODE', tByEn('AI · hybrid · full engineering rail')],
              ].map(([k, v]) => (
                <li
                  key={k}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '56px 1fr',
                    alignItems: 'baseline',
                    gap: 14,
                  }}
                >
                  <span
                    style={{
                      fontFamily: FONT_MONO,
                      fontSize: 11,
                      color: C.text1,
                      letterSpacing: '0.08em',
                    }}
                  >
                    {k}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      color: C.text2,
                      lineHeight: 1.5,
                    }}
                  >
                    {v}
                  </span>
                </li>
              ))}
            </ul>
            <div
              style={{
                marginTop: 'auto',
                paddingTop: 16,
                borderTop: `1px solid ${C.border1}`,
                fontFamily: FONT_MONO,
                fontSize: 11,
                color: C.text3,
                letterSpacing: '0.04em',
              }}
            >
              {tByEn('auto-parse · 15s budget · zero-friction')}
            </div>
          </aside>
        </div>

        {/* ============ 3. AFTERMATH ============ */}
        <div
          className="estimator-aftermath"
          style={{
            paddingTop: 36,
            borderTop: `1px solid ${C.border1}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: 16,
              flexWrap: 'wrap',
            }}
          >
            <div style={kickerStyle}>{tByEn('WHAT HAPPENS NEXT')}</div>
            <a href="#sequence" data-testid="hero-join-button" style={ghostButton}>
              {tByEn('See the operational flow')}
              <ChevronRight size={14} strokeWidth={2} />
            </a>
          </div>

          <ol
            className="estimator-steps"
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              gap: 24,
            }}
          >
            {[
              { n: '01', t: tByEn('Estimate returned'), d: tByEn('Modules, hours, fixed price — in ~15 seconds.') },
              { n: '02', t: tByEn('You review & confirm'), d: tByEn('Tweak scope, change build mode, accept.') },
              { n: '03', t: tByEn('Contract & escrow'), d: tByEn('Auto-generated, signed, funds locked.') },
              { n: '04', t: tByEn('Build starts'), d: tByEn('Builders assigned, QA gates active, you watch.') },
            ].map((s, i) => (
              <li
                key={s.n}
                style={{
                  position: 'relative',
                  paddingLeft: 20,
                  borderLeft: `1px solid ${i === 0 ? C.text1 : C.border2}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  minHeight: 92,
                }}
              >
                <span
                  style={{
                    fontFamily: FONT_MONO,
                    fontSize: 11,
                    color: C.text3,
                    letterSpacing: '0.08em',
                  }}
                >
                  {s.n}
                </span>
                <div
                  style={{
                    fontFamily: FONT_DISPLAY,
                    fontWeight: 500,
                    fontSize: 15,
                    color: C.text1,
                    letterSpacing: '-0.005em',
                  }}
                >
                  {s.t}
                </div>
                <div
                  style={{
                    color: C.text2,
                    fontSize: 13,
                    lineHeight: 1.5,
                  }}
                >
                  {s.d}
                </div>
              </li>
            ))}
          </ol>

          <div
            style={{
              marginTop: 4,
              paddingTop: 18,
              borderTop: `1px solid ${C.border1}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              flexWrap: 'wrap',
              fontFamily: FONT_MONO,
              fontSize: 11,
              color: C.text3,
              letterSpacing: '0.04em',
            }}
          >
            <span>auto-orchestrated · contract-bound · qa-gated</span>
            <span>v1.0 · runtime-honest pricing</span>
          </div>
        </div>
      </div>
    </div>

    <style>{`
      @media (max-width: 980px) {
        .estimator-head { grid-template-columns: 1fr !important; gap: 28px !important; align-items: start !important; }
        .estimator-head-stats { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
        .estimator-body { grid-template-columns: 1fr !important; gap: 32px !important; }
        .estimator-steps { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
      }
      @media (max-width: 640px) {
        .estimator-head-stats { grid-template-columns: 1fr !important; }
        .estimator-steps { grid-template-columns: 1fr !important; }
      }
    `}</style>
  </section>
  );
};

/* PIPELINE PANEL */
const PIPELINE_ROWS = [
  { seq: '01', name: 'Intake', meta: 'idea · structured', state: 'done' },
  { seq: '02', name: 'Scope', meta: '6 modules · $4,200', state: 'done' },
  { seq: '03', name: 'Contract', meta: 'escrow staged', state: 'done' },
  { seq: '04', name: 'Build', meta: '3 builders · live', state: 'active' },
  { seq: '05', name: 'QA', meta: '12 / 12 verified', state: 'pending' },
  { seq: '06', name: 'Delivery', meta: 'release locked', state: 'pending' },
];

const PipelinePanel = () => {
  const { tByEn } = useLang();
  const [tick, setTick] = useState(0);
  const [hovered, setHovered] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1400);
    return () => clearInterval(t);
  }, []);

  // Cascade: active step walks through SEQ-01 → SEQ-06 in a continuous loop.
  // Rows before active are 'done', the active row pulses, rows after are 'pending'.
  // Pace: one step per ~1400ms (matches `tick` cadence), so full cycle ≈ 8.4s.
  const activeIdx = tick % PIPELINE_ROWS.length;

  return (
    <div
      data-testid="pipeline-ui"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        background: C.bg3,
        border: `1px solid ${hovered ? 'rgba(26,23,20,0.18)' : C.border2}`,
        borderRadius: 12,
        boxShadow: hovered
          ? '0 1px 0 rgba(255,255,255,0.6), 0 28px 60px rgba(26,23,20,0.12), 0 4px 14px rgba(26,23,20,0.06)'
          : '0 1px 0 rgba(255,255,255,0.6), 0 24px 60px rgba(26,23,20,0.10), 0 4px 14px rgba(26,23,20,0.06)',
        overflow: 'hidden',
        transform: hovered ? 'translate3d(0, -3px, 0)' : 'translate3d(0, 0, 0)',
        transition: 'transform 260ms ease, box-shadow 220ms ease, border-color 200ms ease',
        willChange: 'transform',
      }}
    >
      <div
        style={{
          padding: '12px 16px',
          borderBottom: `1px solid ${C.border1}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: C.bg1,
          fontFamily: FONT_MONO,
          fontSize: 11,
          color: C.text3,
          letterSpacing: '0.04em',
        }}
      >
        <span>devos · execution.pipeline</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span
            aria-hidden
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background: C.signal,
              opacity: tick % 2 === 0 ? 1 : 0.45,
              transition: 'opacity 600ms ease',
            }}
          />
          LIVE
        </span>
      </div>

      <div>
        {PIPELINE_ROWS.map((r, i) => {
          // Derive state from active index (cascade), ignoring static `r.state`.
          const state = i < activeIdx ? 'done' : i === activeIdx ? 'active' : 'pending';
          return (
          <div
            key={r.seq}
            style={{
              display: 'grid',
              gridTemplateColumns: '64px 1fr auto',
              gap: 16,
              alignItems: 'center',
              padding: '14px 16px',
              borderTop: i === 0 ? 'none' : `1px solid ${C.border1}`,
              background:
                state === 'active' ? 'rgba(160,122,46,0.06)' : 'transparent',
              transition: 'background 320ms ease',
            }}
          >
            <span
              style={{
                fontFamily: FONT_MONO,
                fontSize: 11,
                color: state === 'pending' ? C.text3 : C.text2,
                letterSpacing: '0.06em',
                transition: 'color 320ms ease',
              }}
            >
              SEQ-{r.seq}
            </span>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 14,
                  color: C.text1,
                  fontFamily: FONT_DISPLAY,
                  fontWeight: 500,
                  letterSpacing: '-0.005em',
                }}
              >
                {r.name}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: C.text2,
                  fontFamily: FONT_MONO,
                  marginTop: 2,
                }}
              >
                {r.meta}
              </div>
            </div>
            <StatePill state={state} />
          </div>
          );
        })}
      </div>

      <div
        style={{
          padding: '10px 16px',
          borderTop: `1px solid ${C.border1}`,
          background: C.bg1,
          fontFamily: FONT_MONO,
          fontSize: 11,
          color: C.text3,
          display: 'flex',
          justifyContent: 'space-between',
          letterSpacing: '0.04em',
        }}
      >
        <span>auto-orchestrated · contract-bound · qa-gated</span>
        <span>{tByEn('v1.0')}</span>
      </div>
    </div>
  );
};

/* ============================================================ HERO ESCROW CALLOUT - removed (dead code) */
const StatePill = ({ state }) => {
  const map = {
    done: { label: 'DONE', color: C.text2, bg: C.bg1, border: C.border1 },
    active: {
      label: 'RUNNING',
      color: '#7A5A1F',
      bg: 'rgba(160,122,46,0.10)',
      border: 'rgba(160,122,46,0.38)',
    },
    pending: { label: 'QUEUED', color: C.text3, bg: 'transparent', border: C.border1 },
  };
  const m = map[state];
  return (
    <span
      style={{
        fontFamily: FONT_MONO,
        fontSize: 10,
        letterSpacing: '0.08em',
        color: m.color,
        background: m.bg,
        border: `1px solid ${m.border}`,
        padding: '4px 8px',
        borderRadius: 4,
      }}
    >
      {m.label}
    </span>
  );
};

/* ============================================================ SEQUENCE */
const SEQUENCE = [
  {
    seq: '01',
    title: 'Describe what you want',
    body: 'Plain text. Goals, users, constraints. The system parses it into a structured intake.',
    meta: 'intake.structured',
  },
  {
    seq: '02',
    title: 'Pick the execution mode',
    body: 'AI Build, AI + Engineering, or Full Engineering. The mode adjusts who actually writes the code.',
    meta: 'mode.selected',
  },
  {
    seq: '03',
    title: 'Receive scope and price',
    body: 'Modules, timeline and a real number derived from your project. No fixed packages, no estimate-by-feel.',
    meta: 'scope.computed',
  },
  {
    seq: '04',
    title: 'Sign a scope-locked contract',
    body: 'Escrow is staged. Payments release only against verified delivery. Nothing starts before this.',
    meta: 'contract.bound',
  },
  {
    seq: '05',
    title: 'Watch execution run',
    body: 'Builders work, QA verifies, the dashboard streams state in real time. Money releases on done — not on talk.',
    meta: 'runtime.live',
  },
];

const SequenceSection = () => (
  <section
    id="sequence"
    data-testid="flow-section"
    style={{ padding: '120px 32px', borderTop: `1px solid ${C.border1}` }}
  >
    <div style={{ maxWidth: 1240, margin: '0 auto' }}>
      <SectionHeader
        kicker="HOW IT RUNS"
        title={tByEn('An operational sequence, not a sales funnel.')}
        sub="From a plain-text idea to a contract-bound, QA-gated delivery — without sales calls between steps."
      />

      <div
        style={{
          marginTop: 56,
          border: `1px solid ${C.border1}`,
          borderRadius: 14,
          background: C.bg3,
          overflow: 'hidden',
          boxShadow:
            '0 1px 0 rgba(255,255,255,0.6), 0 12px 40px rgba(26,23,20,0.08)',
        }}
      >
        {SEQUENCE.map((s, i) => (
          <SequenceRow key={s.seq} step={s} first={i === 0} />
        ))}
      </div>
    </div>
  </section>
);

const SequenceRow = ({ step, first }) => {
  const [hover, setHover] = useState(false);
  const { tByEn } = useLang();
  return (
    <div
      data-testid={`flow-step-${step.seq}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: '110px 1fr 160px',
        gap: 32,
        padding: '32px 32px',
        alignItems: 'start',
        borderTop: first ? 'none' : `1px solid ${C.border1}`,
        background: hover ? C.bg1 : 'transparent',
        transition: 'background 150ms ease',
      }}
    >
      <div
        style={{
          fontFamily: FONT_MONO,
          fontSize: 12,
          letterSpacing: '0.1em',
          color: hover ? C.signal : C.text3,
          transition: 'color 150ms ease',
          paddingTop: 4,
        }}
      >
        SEQ-{step.seq}
      </div>
      <div>
        <div
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 22,
            fontWeight: 500,
            letterSpacing: '-0.015em',
            color: C.text1,
            lineHeight: 1.2,
          }}
        >
          {tByEn(step.title)}
        </div>
        <p
          style={{
            color: C.text2,
            fontSize: 14.5,
            lineHeight: 1.6,
            marginTop: 8,
            maxWidth: 620,
          }}
        >
          {tByEn(step.body)}
        </p>
      </div>
      <div
        style={{
          fontFamily: FONT_MONO,
          fontSize: 11.5,
          letterSpacing: '0.04em',
          color: C.text3,
          textAlign: 'right',
          paddingTop: 6,
        }}
      >
        → {step.meta}
      </div>
    </div>
  );
};

/* ============================================================ BUILD MODES */
const BUILD_MODES = [
  {
    id: 'ai-build',
    name: 'AI Build',
    sub: 'Fastest path · prototypes & internal tools',
    desc: 'AI generates the structure and most of the implementation. Engineering review is light, scoped to integrations and release.',
    points: [
      'Highest automation, lowest cost',
      'Prototypes, internal tools, validation MVPs',
      'Light engineering oversight',
    ],
  },
  {
    id: 'ai-eng',
    name: 'AI + Engineering',
    sub: 'Recommended for most MVPs',
    desc: 'AI builds the scaffolding and the obvious parts. Engineers own architecture, critical logic, integrations and full QA.',
    points: [
      'Balanced velocity and review',
      'Customer-facing MVPs, B2B products',
      'Full QA gate, scope-locked contract',
    ],
    recommended: true,
  },
  {
    id: 'full-eng',
    name: 'Full Engineering',
    sub: 'Production-grade systems',
    desc: 'Senior developers own architecture and implementation end-to-end. AI is used internally for speed, never as the final author.',
    points: [
      'Custom architecture, manual implementation',
      'Production systems, regulated domains',
      'Dedicated team, full delivery control',
    ],
  },
];

const BuildModesSection = ({ onStart }) => {
  const [hoveredId, setHoveredId] = useState(null);
  const gridRef = useRef(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const node = gridRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setRevealed(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setRevealed(true);
            io.disconnect();
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  return (
    <section
      id="modes"
      data-testid="build-modes-section"
      style={{ padding: '120px 32px', borderTop: `1px solid ${C.border1}` }}
    >
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <SectionHeader
          kicker="EXECUTION MODES"
          title={tByEn('Choose how it gets built.')}
          sub="The mode decides who writes the code. The system then computes the actual scope and price from your project — once, before you commit."
        />

        <div
          ref={gridRef}
          className="modes-grid"
          style={{
            marginTop: 56,
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 16,
          }}
          onMouseLeave={() => setHoveredId(null)}
        >
          {BUILD_MODES.map((m, i) => (
            <ModePanel
              key={m.id}
              mode={m}
              onStart={onStart}
              index={i}
              revealed={revealed}
              hoveredId={hoveredId}
              setHoveredId={setHoveredId}
            />
          ))}
        </div>

        <p
          style={{
            textAlign: 'center',
            color: C.text3,
            fontSize: 13,
            fontFamily: FONT_MONO,
            marginTop: 40,
            letterSpacing: '0.04em',
          }}
        >
          — no packages · no retainers · price computed from your scope —
        </p>
      </div>

      <style>{`
        @media (max-width: 920px) {
          .modes-grid { grid-template-columns: 1fr !important; }
        }
        @keyframes evax-gold-breath {
          0%, 100% { box-shadow: 0 1px 0 rgba(255,255,255,0.7), 0 18px 44px rgba(26,23,20,0.12), 0 0 0 0 rgba(160,122,46,0.00); }
          50%      { box-shadow: 0 1px 0 rgba(255,255,255,0.7), 0 22px 52px rgba(26,23,20,0.14), 0 0 0 4px rgba(160,122,46,0.10); }
        }
      `}</style>
    </section>
  );
};

const MODE_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

const ModePanel = ({ mode, onStart, index, revealed, hoveredId, setHoveredId }) => {
  const isHovered = hoveredId === mode.id;
  const isDimmed = hoveredId !== null && !isHovered;
  const revealDelay = index * 110;
  const { tByEn } = useLang();

  return (
    <div
      data-testid={`build-mode-${mode.id}`}
      onMouseEnter={() => setHoveredId(mode.id)}
      style={{
        position: 'relative',
        background: isHovered ? '#FFFFFF' : C.bg3,
        border: `1px solid ${
          isHovered
            ? mode.recommended
              ? 'rgba(160,122,46,0.55)'
              : 'rgba(26,23,20,0.22)'
            : mode.recommended
              ? 'rgba(160,122,46,0.40)'
              : C.border1
        }`,
        borderRadius: 14,
        padding: 32,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: isHovered
          ? mode.recommended
            ? '0 1px 0 rgba(255,255,255,0.7), 0 22px 52px rgba(26,23,20,0.14), 0 0 0 4px rgba(160,122,46,0.08)'
            : '0 1px 0 rgba(255,255,255,0.7), 0 22px 52px rgba(26,23,20,0.14)'
          : mode.recommended
            ? '0 1px 0 rgba(255,255,255,0.7), 0 14px 36px rgba(26,23,20,0.10)'
            : '0 1px 0 rgba(255,255,255,0.6), 0 8px 24px rgba(26,23,20,0.06)',
        // Scroll reveal + hover lift composed into one transform
        transform: revealed
          ? isHovered
            ? 'translate3d(0, -6px, 0)'
            : isDimmed
              ? 'translate3d(0, 0, 0) scale(0.985)'
              : 'translate3d(0, 0, 0)'
          : 'translate3d(0, 28px, 0)',
        opacity: revealed ? (isDimmed ? 0.66 : 1) : 0,
        filter: revealed ? 'blur(0)' : 'blur(6px)',
        transition: [
          `transform 900ms ${MODE_EASE} ${revealDelay}ms`,
          `opacity 900ms ${MODE_EASE} ${revealDelay}ms`,
          `filter 900ms ${MODE_EASE} ${revealDelay}ms`,
          'border-color 220ms ease',
          'box-shadow 280ms ease',
          'background 220ms ease',
        ].join(', '),
        willChange: 'transform, opacity, filter',
      }}
    >
      {/* Top accent line — draws from left to right on hover. Strict
          developer feel: like a cursor / loading bar reaching across. */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          height: 2,
          width: isHovered ? '100%' : 0,
          background: mode.recommended
            ? 'linear-gradient(90deg, rgba(160,122,46,0) 0%, rgba(160,122,46,0.85) 30%, rgba(160,122,46,1) 100%)'
            : 'linear-gradient(90deg, rgba(26,23,20,0) 0%, rgba(26,23,20,0.72) 30%, rgba(26,23,20,1) 100%)',
          transition: `width 520ms ${MODE_EASE}`,
          borderTopLeftRadius: 14,
          borderTopRightRadius: 14,
        }}
      />

      {mode.recommended && (
        <div
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            fontFamily: FONT_MONO,
            fontSize: 10,
            letterSpacing: '0.12em',
            color: '#7A5A1F',
            padding: '3px 8px',
            border: '1px solid rgba(160,122,46,0.40)',
            borderRadius: 4,
            background: 'rgba(160,122,46,0.08)',
            transition: 'background 220ms ease, border-color 220ms ease',
            ...(isHovered
              ? {
                  background: 'rgba(160,122,46,0.16)',
                  borderColor: 'rgba(160,122,46,0.60)',
                }
              : null),
          }}
        >
          {tByEn('RECOMMENDED')}
        </div>
      )}

      <div style={{ ...kickerStyle, marginBottom: 14 }}>
        {mode.id.toUpperCase().replace('-', ' / ')}
      </div>
      <h3
        style={{
          fontFamily: FONT_DISPLAY,
          fontWeight: 500,
          fontSize: 26,
          letterSpacing: '-0.02em',
          color: C.text1,
          margin: 0,
          transition: 'transform 380ms ease',
          transform: isHovered ? 'translateY(-1px)' : 'translateY(0)',
        }}
      >
        {tByEn(mode.name)}
      </h3>
      <div
        style={{
          color: C.text3,
          fontSize: 13,
          marginTop: 6,
          fontFamily: FONT_MONO,
        }}
      >
        {tByEn(mode.sub)}
      </div>

      <p
        style={{
          color: C.text2,
          fontSize: 14.5,
          lineHeight: 1.6,
          marginTop: 22,
        }}
      >
        {tByEn(mode.desc)}
      </p>

      <div
        style={{
          marginTop: 22,
          borderTop: `1px solid ${C.border1}`,
          paddingTop: 18,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          flex: 1,
        }}
      >
        {mode.points.map((p) => (
          <div
            key={p}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              fontSize: 13.5,
              color: C.text2,
              lineHeight: 1.5,
            }}
          >
            <Plus
              size={12}
              strokeWidth={2}
              style={{
                color: isHovered ? (mode.recommended ? '#A07A2E' : C.text1) : C.text3,
                marginTop: 4,
                transition: 'color 220ms ease',
              }}
            />
            <span>{tByEn(p)}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onStart}
        data-testid={`build-mode-${mode.id}-cta`}
        style={{
          marginTop: 28,
          background: isHovered ? C.bg1 : 'transparent',
          color: C.text1,
          border: `1px solid ${isHovered ? C.border3 : C.border2}`,
          borderRadius: 8,
          padding: '12px 16px',
          fontFamily: FONT_BODY,
          fontSize: 13.5,
          fontWeight: 500,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          transition: 'background 180ms ease, border-color 180ms ease',
        }}
      >
        {tByEn('Estimate with')} {tByEn(mode.name)}
        <ArrowUpRight
          size={14}
          strokeWidth={2.25}
          style={{
            transform: isHovered ? 'translate(2px, -2px)' : 'translate(0, 0)',
            transition: `transform 320ms ${MODE_EASE}`,
          }}
        />
      </button>
    </div>
  );
};

/* ============================================================ SYSTEM */
const SYSTEM_CARDS = [
  {
    code: 'SCOPE.AI',
    title: 'AI Scoping',
    desc: 'Turns a raw idea into architecture, modules, timeline and price — in minutes, not weeks.',
  },
  {
    code: 'TASKS.RUNTIME',
    title: 'Task System',
    desc: 'Every step decomposed, assigned and tracked. No tickets lost, no silent stalls.',
  },
  {
    code: 'QA.GATE',
    title: 'QA Validation',
    desc: 'Every feature passes a structured QA gate before it ever reaches you for approval.',
  },
  {
    code: 'BUILDERS.NET',
    title: 'Developer Network',
    desc: 'Vetted senior builders. Auto-matched to scope, capacity-balanced, reputation-tracked.',
  },
  {
    code: 'CONTRACT.BIND',
    title: 'Contract & Payments',
    desc: 'Scope is locked, escrow is staged, money releases on verified delivery — not on talk.',
  },
  {
    code: 'OBSERV.LIVE',
    title: 'Transparency Layer',
    desc: 'Live dashboard: what is being built right now, by whom, with which risks. No black box.',
  },
];

const SystemSection = () => (
  <section
    id="system"
    data-testid="system-section"
    style={{ padding: '120px 32px', borderTop: `1px solid ${C.border1}` }}
  >
    <div style={{ maxWidth: 1240, margin: '0 auto' }}>
      <SectionHeader
        kicker="THE SUBSTRATE"
        title={tByEn('The execution layer that runs underneath.')}
        sub="Not freelancers. Not agencies. A structured runtime that turns ideas into delivered software."
      />

      <div
        className="system-grid"
        style={{
          marginTop: 56,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 1,
          background: C.border1,
          border: `1px solid ${C.border1}`,
          borderRadius: 14,
          overflow: 'hidden',
        }}
      >
        {SYSTEM_CARDS.map((c) => (
          <SystemCard key={c.code} card={c} />
        ))}
      </div>
    </div>

    <style>{`
      @media (max-width: 920px) {
        .system-grid { grid-template-columns: 1fr !important; }
      }
    `}</style>
  </section>
);

const SystemCard = ({ card }) => {
  const [hover, setHover] = useState(false);
  const { tByEn } = useLang();
  return (
    <div
      data-testid={`system-card-${card.title.toLowerCase().replace(/\s+/g, '-')}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? C.bg1 : C.bg3,
        padding: 28,
        minHeight: 180,
        transition: 'background 180ms ease',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          ...kickerStyle,
          color: hover ? C.signal : C.text3,
          transition: 'color 180ms ease',
        }}
      >
        {card.code}
      </div>
      <h3
        style={{
          fontFamily: FONT_DISPLAY,
          fontWeight: 500,
          fontSize: 20,
          letterSpacing: '-0.015em',
          color: C.text1,
          margin: '14px 0 10px',
        }}
      >
        {tByEn(card.title)}
      </h3>
      <p
        style={{
          color: C.text2,
          fontSize: 14,
          lineHeight: 1.6,
          margin: 0,
        }}
      >
        {tByEn(card.desc)}
      </p>
    </div>
  );
};

/* ============================================================ CAPABILITIES */
const CAPABILITY_GROUPS = [
  {
    code: 'STACK.CORE',
    title: 'Core stack',
    chips: ['React', 'Next.js', 'Vue', 'Node.js', 'NestJS', 'Express', 'Python', 'FastAPI'],
  },
  {
    code: 'STACK.MOBILE',
    title: 'Mobile',
    chips: ['React Native', 'Expo', 'iOS', 'Android', 'Push notifications'],
  },
  {
    code: 'STACK.INFRA',
    title: 'APIs & infra',
    chips: ['REST', 'GraphQL', 'Stripe', 'PayPal', 'MongoDB', 'PostgreSQL', 'MySQL', 'Redis'],
  },
  {
    code: 'STACK.AUTOM',
    title: 'Automation & no-code',
    chips: ['n8n', 'Make', 'Zapier', 'Webflow', 'Bubble', 'Airtable'],
  },
];

const CapabilitiesSection = () => {
  const [hoveredId, setHoveredId] = useState(null);
  return (
    <section
      id="capabilities"
      data-testid="capabilities-section"
      style={{ padding: '120px 32px', borderTop: `1px solid ${C.border1}` }}
    >
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <SectionHeader
          kicker="CAPABILITIES"
          title={tByEn('What the system can ship.')}
          sub="One execution layer, every modern stack. The system picks the right tool for the job — you take delivery."
        />

        <div
          className="cap-grid"
          style={{
            marginTop: 56,
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 16,
          }}
          onMouseLeave={() => setHoveredId(null)}
        >
          {CAPABILITY_GROUPS.map((g) => (
            <CapabilityCard
              key={g.title}
              g={g}
              isHovered={hoveredId === g.code}
              onEnter={() => setHoveredId(g.code)}
            />
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 720px) {
          .cap-grid { grid-template-columns: 1fr !important; }
        }
        @keyframes evax-cursor-blink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
      `}</style>
    </section>
  );
};

const TAG_STAGGER_MS = 45;
const TAG_LIFT_MS = 280;

const CapabilityCard = ({ g, isHovered, onEnter }) => {
  const { tByEn } = useLang();
  return (
    <div
      data-testid={`capability-${g.title.toLowerCase().replace(/\s+/g, '-')}`}
      onMouseEnter={onEnter}
      style={{
        position: 'relative',
        background: C.bg3,
        border: `1px solid ${isHovered ? 'rgba(26,23,20,0.20)' : C.border1}`,
        borderRadius: 14,
        padding: 28,
        overflow: 'hidden',
        transition: 'border-color 240ms ease',
      }}
    >
      {/* Mono cursor blink — bottom-right "card selected" indicator */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          right: 16,
          bottom: 14,
          fontFamily: FONT_MONO,
          fontSize: 14,
          lineHeight: 1,
          color: C.text1,
          opacity: isHovered ? 1 : 0,
          transition: `opacity 220ms ease ${isHovered ? '120ms' : '0ms'}`,
          animation: isHovered ? 'evax-cursor-blink 1100ms steps(1) infinite' : 'none',
        }}
      >
        ▍
      </span>

      <div style={{ position: 'relative', display: 'inline-block' }}>
        <div style={kickerStyle}>{g.code}</div>
        {/* Kicker underline — draws left→right on hover */}
        <span
          aria-hidden
          style={{
            position: 'absolute',
            left: 0,
            bottom: -3,
            height: 1,
            width: isHovered ? '100%' : 0,
            background: C.text2,
            transition: `width 420ms ${MODE_EASE}`,
          }}
        />
      </div>

      <h3
        style={{
          fontFamily: FONT_DISPLAY,
          fontWeight: 500,
          fontSize: 20,
          letterSpacing: '-0.015em',
          color: C.text1,
          margin: '10px 0 18px',
        }}
      >
        {g.title}
      </h3>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {g.chips.map((chip, i) => {
          const delay = isHovered ? i * TAG_STAGGER_MS : 0;
          return (
            <span
              key={chip}
              style={{
                fontFamily: FONT_MONO,
                fontSize: 12,
                letterSpacing: '0.02em',
                color: isHovered ? C.text1 : C.text2,
                background: isHovered ? '#FFFFFF' : C.bg1,
                border: `1px solid ${isHovered ? 'rgba(26,23,20,0.32)' : C.border1}`,
                padding: '5px 10px',
                borderRadius: 6,
                transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
                boxShadow: isHovered
                  ? '0 4px 12px rgba(26,23,20,0.06), inset 0 0 0 1px rgba(255,255,255,0.6)'
                  : 'none',
                transition: [
                  `transform ${TAG_LIFT_MS}ms ${MODE_EASE} ${delay}ms`,
                  `background ${TAG_LIFT_MS}ms ease ${delay}ms`,
                  `border-color ${TAG_LIFT_MS}ms ease ${delay}ms`,
                  `color ${TAG_LIFT_MS}ms ease ${delay}ms`,
                  `box-shadow ${TAG_LIFT_MS}ms ease ${delay}ms`,
                ].join(', '),
              }}
            >
              {tByEn(chip)}
            </span>
          );
        })}
      </div>

      {/* Build-progress bar at the bottom of the card */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          left: 0,
          bottom: 0,
          height: 2,
          width: isHovered ? '100%' : 0,
          background:
            'linear-gradient(90deg, rgba(26,23,20,0) 0%, rgba(26,23,20,0.72) 30%, rgba(26,23,20,1) 100%)',
          transition: `width 520ms ${MODE_EASE}`,
          borderBottomLeftRadius: 14,
          borderBottomRightRadius: 14,
        }}
      />
    </div>
  );
};

/* ============================================================ USE CASES */
const USE_CASES = [
  { tag: 'USE.STARTUP', title: 'Startup MVPs', body: 'From idea deck to live product in weeks.' },
  { tag: 'USE.INTERNAL', title: 'Internal tools', body: 'Operations dashboards, admin panels, ops automations.' },
  { tag: 'USE.MARKET', title: 'Marketplaces', body: 'Two-sided platforms with payments and trust layers.' },
  { tag: 'USE.AI', title: 'AI products', body: 'LLM-powered apps with retrieval, agents and pipelines.' },
  { tag: 'USE.AUTOM', title: 'Automation systems', body: 'n8n / Make workflows wired into your stack.' },
  { tag: 'USE.MOBILE', title: 'Mobile apps', body: 'React Native / Expo apps with push, billing and OTA updates.' },
];

const UseCasesSection = () => (
  <section
    id="use-cases"
    data-testid="use-cases-section"
    style={{ padding: '120px 32px', borderTop: `1px solid ${C.border1}` }}
  >
    <div style={{ maxWidth: 1240, margin: '0 auto' }}>
      <SectionHeader
        kicker="WHAT IT EXECUTES"
        title={tByEn('Built for teams that need to ship.')}
        sub="If it can be specified, the system can deliver it."
      />

      <div
        style={{
          marginTop: 56,
          border: `1px solid ${C.border1}`,
          borderRadius: 14,
          background: C.bg3,
          overflow: 'hidden',
        }}
      >
        {USE_CASES.map((u, i) => (
          <UseCaseRow key={u.tag} u={u} first={i === 0} />
        ))}

        {/* Universal CTA — replaces 6 chevrons-to-nowhere with one
            meaningful action that scrolls to the estimator. */}
        <UseCasesFooter />
      </div>
    </div>
  </section>
);

/* Vertical accent bar grows from top-to-bottom on hover (height: 0 → 100%).
   Tag shifts to signal color, title slides 4px right. Subtle, operational —
   intentionally different from the portfolio card's circular FAB chevron. */
const UseCaseRow = ({ u, first }) => {
  const [hover, setHover] = useState(false);
  const { tByEn } = useLang();
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: '160px 1fr',
        gap: 32,
        padding: '22px 32px 22px 36px',
        alignItems: 'center',
        borderTop: first ? 'none' : `1px solid ${C.border1}`,
        background: hover ? C.bg1 : 'transparent',
        transition: 'background 220ms ease',
        cursor: 'default',
        overflow: 'hidden',
      }}
    >
      {/* Left accent bar — height grows on hover, top-anchored */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 3,
          height: hover ? '100%' : '0%',
          background: C.signal,
          transition: 'height 320ms cubic-bezier(0.22, 1, 0.36, 1)',
          transformOrigin: 'top',
        }}
      />

      <span
        style={{
          fontFamily: FONT_MONO,
          fontSize: 11.5,
          letterSpacing: '0.08em',
          color: hover ? C.signal : C.text3,
          transition: 'color 220ms ease',
        }}
      >
        {u.tag}
      </span>

      <div
        style={{
          transform: hover ? 'translateX(4px)' : 'translateX(0)',
          transition: 'transform 280ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <div
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 17,
            fontWeight: 500,
            letterSpacing: '-0.01em',
            color: C.text1,
          }}
        >
          {tByEn(u.title)}
        </div>
        <div
          style={{
            color: C.text2,
            fontSize: 13.5,
            marginTop: 4,
            lineHeight: 1.5,
          }}
        >
          {tByEn(u.body)}
        </div>
      </div>
    </div>
  );
};

/* Single universal CTA at the bottom of the use-case list — the only arrow
   in this section, and it actually leads somewhere (the estimator). */
const UseCasesFooter = () => {
  const [hover, setHover] = useState(false);
  const { tByEn } = useLang();
  return (
    <a
      href="#estimator"
      data-testid="use-cases-cta"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: '160px 1fr auto',
        gap: 32,
        padding: '24px 32px 24px 36px',
        alignItems: 'center',
        borderTop: `1px solid ${C.border1}`,
        background: hover ? C.bg1 : C.bg2,
        textDecoration: 'none',
        transition: 'background 220ms ease',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <span
        aria-hidden
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 3,
          height: '100%',
          background: C.signal,
        }}
      />
      <span
        style={{
          fontFamily: FONT_MONO,
          fontSize: 11.5,
          letterSpacing: '0.08em',
          color: C.signal,
        }}
      >
        USE.YOURS
      </span>
      <div>
        <div
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 17,
            fontWeight: 500,
            letterSpacing: '-0.01em',
            color: C.text1,
          }}
        >
          {tByEn("Don't see your category? Describe it directly.")}
        </div>
        <div
          style={{
            color: C.text2,
            fontSize: 13.5,
            marginTop: 4,
            lineHeight: 1.5,
          }}
        >
          {tByEn('The estimator scopes anything you can articulate — links, files, text.')}
        </div>
      </div>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 18px',
          borderRadius: 999,
          background: hover ? C.text1 : 'transparent',
          border: `1px solid ${hover ? C.text1 : C.border2}`,
          color: hover ? C.bg1 : C.text1,
          fontFamily: FONT_DISPLAY,
          fontSize: 13,
          fontWeight: 500,
          letterSpacing: '-0.005em',
          transition: 'background 220ms ease, color 220ms ease, border-color 220ms ease',
        }}
      >
        {tByEn('Open estimator')}
        <ArrowUpRight
          size={14}
          strokeWidth={2}
          style={{
            transform: hover ? 'translate(3px, -3px)' : 'translate(0, 0)',
            transition: 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        />
      </div>
    </a>
  );
};

/* ============================================================ PORTFOLIO
 * Public showcase of admin-managed delivered cases.
 * Replaces "testimonials theatre" with status + quality score.
 * Pulls from GET /api/portfolio/cases (published only).
 * ============================================================ */
const PORTFOLIO_STATUS_LIGHT = {
  delivered:   { label: 'DELIVERED',    Icon: CheckCircle2, dot: '#0F8F5E' },
  in_progress: { label: 'IN PROGRESS',  Icon: Clock,        dot: '#C97A0F' },
  maintenance: { label: 'MAINTENANCE',  Icon: Wrench,       dot: '#3B7EA1' },
  archived:    { label: 'ARCHIVED',     Icon: Archive,      dot: '#8C8278' },
};

const PortfolioSection = () => {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hoveredId, setHoveredId] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const gridRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    const base = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/+$/, '');
    axios
      .get(`${base}/api/portfolio/cases`)
      .then((r) => {
        if (!mounted) return;
        setCases(Array.isArray(r.data) ? r.data : []);
      })
      .catch(() => mounted && setError('Could not load portfolio'))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (loading || error || cases.length === 0) return;
    const node = gridRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setRevealed(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setRevealed(true);
            io.disconnect();
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );
    io.observe(node);
    return () => io.disconnect();
  }, [loading, error, cases.length]);

  if (!loading && !error && cases.length === 0) return null;

  return (
    <section
      id="portfolio"
      data-testid="portfolio-section"
      style={{ padding: '120px 32px', borderTop: `1px solid ${C.border1}` }}
    >
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <SectionHeader
          kicker="PORTFOLIO · DELIVERED CASES"
          title={tByEn('Shipped, not pitched.')}
          sub="Every card is a project we actually delivered. Status and quality scores are tracked — no testimonials theatre."
        />

        {loading ? (
          <div
            className="portfolio-grid"
            style={{
              marginTop: 56,
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 20,
            }}
          >
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  border: `1px solid ${C.border1}`,
                  borderRadius: 14,
                  background: C.bg3,
                  overflow: 'hidden',
                  height: 360,
                }}
              />
            ))}
          </div>
        ) : error ? (
          <p
            data-testid="portfolio-error"
            style={{ color: C.text2, marginTop: 32, fontSize: 14 }}
          >
            {error}
          </p>
        ) : (
          <div
            ref={gridRef}
            className="portfolio-grid"
            style={{
              marginTop: 56,
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 20,
            }}
            onMouseLeave={() => setHoveredId(null)}
          >
            {cases.map((c, i) => (
              <PortfolioCardLight
                key={c.case_id}
                c={c}
                index={i}
                revealed={revealed}
                hoveredId={hoveredId}
                setHoveredId={setHoveredId}
              />
            ))}
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 960px) {
          .portfolio-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
        }
        @media (max-width: 640px) {
          .portfolio-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
};

const PortfolioCardLight = ({ c, index, revealed, hoveredId, setHoveredId }) => {
  const navigate = useNavigate();
  const { tByEn } = useLang();
  const status = PORTFOLIO_STATUS_LIGHT[c.status] || PORTFOLIO_STATUS_LIGHT.delivered;
  const StatusIcon = status.Icon;
  const openCase = () => navigate(`/portfolio/${c.case_id}`);

  const isHovered = hoveredId === c.case_id;
  const isDimmed = hoveredId !== null && !isHovered;
  const revealDelay = (index || 0) * 110;
  const accentGold = !!c.featured;

  return (
    <article
      data-testid={`portfolio-card-${c.case_id}`}
      role="link"
      tabIndex={0}
      aria-label={`Open case study: ${c.title}`}
      onClick={openCase}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openCase();
        }
      }}
      onMouseEnter={() => setHoveredId(c.case_id)}
      style={{
        position: 'relative',
        border: `1px solid ${
          isHovered
            ? accentGold
              ? 'rgba(160,122,46,0.55)'
              : 'rgba(26,23,20,0.22)'
            : accentGold
              ? 'rgba(160,122,46,0.40)'
              : C.border1
        }`,
        borderRadius: 14,
        background: isHovered ? '#FFFFFF' : C.bg3,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        outline: 'none',
        boxShadow: isHovered
          ? accentGold
            ? '0 1px 0 rgba(255,255,255,0.7), 0 22px 52px rgba(26,23,20,0.14), 0 0 0 4px rgba(160,122,46,0.08)'
            : '0 1px 0 rgba(255,255,255,0.7), 0 22px 52px rgba(26,23,20,0.14)'
          : accentGold
            ? '0 1px 0 rgba(255,255,255,0.7), 0 14px 36px rgba(26,23,20,0.10)'
            : '0 1px 2px rgba(26,23,20,0.03)',
        transform: revealed
          ? isHovered
            ? 'translate3d(0, -6px, 0)'
            : isDimmed
              ? 'translate3d(0, 0, 0) scale(0.985)'
              : 'translate3d(0, 0, 0)'
          : 'translate3d(0, 28px, 0)',
        opacity: revealed ? (isDimmed ? 0.66 : 1) : 0,
        filter: revealed ? 'blur(0)' : 'blur(6px)',
        transition: [
          `transform 900ms ${MODE_EASE} ${revealDelay}ms`,
          `opacity 900ms ${MODE_EASE} ${revealDelay}ms`,
          `filter 900ms ${MODE_EASE} ${revealDelay}ms`,
          'border-color 220ms ease',
          'box-shadow 280ms ease',
          'background 220ms ease',
        ].join(', '),
        willChange: 'transform, opacity, filter',
      }}
    >
      {/* Top accent — same developer-cursor line as build-modes */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          height: 2,
          width: isHovered ? '100%' : 0,
          background: accentGold
            ? 'linear-gradient(90deg, rgba(160,122,46,0) 0%, rgba(160,122,46,0.85) 30%, rgba(160,122,46,1) 100%)'
            : 'linear-gradient(90deg, rgba(26,23,20,0) 0%, rgba(26,23,20,0.72) 30%, rgba(26,23,20,1) 100%)',
          transition: `width 520ms ${MODE_EASE}`,
          borderTopLeftRadius: 14,
          borderTopRightRadius: 14,
          zIndex: 2,
        }}
      />

      <div
        style={{
          aspectRatio: '16 / 9',
          background: C.bg2,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {c.image_url ? (
          // eslint-disable-next-line
          <img
            src={c.image_url}
            alt={c.title}
            loading="lazy"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              transform: isHovered ? 'scale(1.035)' : 'scale(1)',
              transition: `transform 700ms ${MODE_EASE}`,
            }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: C.text3,
            }}
          >
            <Layers size={28} strokeWidth={1.5} />
          </div>
        )}
        {c.featured && (
          <span
            style={{
              position: 'absolute',
              top: 12,
              left: 12,
              padding: '4px 8px',
              borderRadius: 6,
              background: C.ctaBg,
              color: C.ctaInk,
              fontFamily: FONT_MONO,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
            }}
          >
            {tByEn('Featured')}
          </span>
        )}
      </div>

      <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <h3
            style={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 500,
              fontSize: 18,
              letterSpacing: '-0.015em',
              lineHeight: 1.25,
              color: C.text1,
              margin: 0,
            }}
          >
            {c.title}
          </h3>
          {c.industry && (
            <span
              style={{
                fontFamily: FONT_MONO,
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.12em',
                color: C.text3,
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
                marginTop: 4,
              }}
            >
              {c.industry}
            </span>
          )}
        </div>

        <div style={{ fontSize: 12.5, color: C.text2 }}>
          {c.client_name}
          {c.product_type ? ` · ${c.product_type}` : ''}
        </div>

        {c.show_description && c.description && (
          <p
            style={{
              fontSize: 13.5,
              color: C.text2,
              lineHeight: 1.55,
              margin: '4px 0 0',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {c.description}
          </p>
        )}

        {Array.isArray(c.technologies) && c.technologies.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {c.technologies.slice(0, 4).map((t) => (
              <span
                key={t}
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 10,
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: 6,
                  background: C.bg1,
                  color: C.text2,
                  border: `1px solid ${C.border1}`,
                }}
              >
                {t}
              </span>
            ))}
            {c.technologies.length > 4 && (
              <span
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 10,
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: 6,
                  background: C.bg1,
                  color: C.text3,
                  border: `1px solid ${C.border1}`,
                }}
              >
                +{c.technologies.length - 4}
              </span>
            )}
          </div>
        )}

        {c.results && (
          <div
            style={{
              marginTop: 10,
              fontFamily: FONT_MONO,
              fontSize: 12,
              fontWeight: 600,
              color: C.signal,
              lineHeight: 1.4,
            }}
          >
            → {c.results}
          </div>
        )}

        <div
          style={{
            marginTop: 'auto',
            paddingTop: 14,
            borderTop: `1px solid ${C.border1}`,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontFamily: FONT_MONO,
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: '0.12em',
              color: C.text2,
              textTransform: 'uppercase',
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 999,
                background: status.dot,
                display: 'inline-block',
              }}
            />
            <StatusIcon size={11} strokeWidth={2} />
            {tByEn(status.label)}
          </span>

          {c.quality_score != null && (
            <span
              style={{
                fontFamily: FONT_MONO,
                fontSize: 10.5,
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: 6,
                background: C.bg1,
                color: C.text1,
                border: `1px solid ${C.border1}`,
                letterSpacing: '0.06em',
              }}
            >
              {tByEn('Q')} {c.quality_score}/100
            </span>
          )}

          {c.duration_weeks != null && (
            <span
              style={{
                fontFamily: FONT_MONO,
                fontSize: 11,
                fontWeight: 600,
                color: C.text3,
              }}
            >
              · {c.duration_weeks}{tByEn('w')}
            </span>
          )}

          {c.show_budget && c.budget != null && (
            <span
              style={{
                marginLeft: 'auto',
                fontFamily: FONT_MONO,
                fontSize: 12,
                fontWeight: 700,
                color: C.text1,
              }}
            >
              ${Math.round(c.budget).toLocaleString()}
            </span>
          )}
        </div>
      </div>
    </article>
  );
};

/* ============================================================ PROOF ROW */
const PROOF = [
  { k: 'projects executed', target: 500, lead: 5, suffix: '+', animated: true },
  { k: 'contract-met delivery', static: '98%' },
  { k: 'median MVP time', static: '4 wk' },
  { k: 'vetted builders', target: 200, lead: 5, suffix: '+', animated: true },
];

const COUNT_TICK_MS = 800; // exactly 0.8s per tick, fixed

const ProofMetric = ({ target, lead, suffix }) => {
  const ref = useRef(null);
  const [value, setValue] = useState(Math.max(0, target - lead));
  const [done, setDone] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setValue(target);
      setDone(true);
      return;
    }
    let interval = null;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting || startedRef.current) return;
          startedRef.current = true;
          io.disconnect();
          const start = Math.max(0, target - lead);
          let current = start;
          interval = setInterval(() => {
            current += 1;
            if (current >= target) {
              setValue(target);
              setDone(true);
              clearInterval(interval);
              interval = null;
            } else {
              setValue(current);
            }
          }, COUNT_TICK_MS);
        });
      },
      { threshold: 0.4 }
    );
    io.observe(node);
    return () => {
      io.disconnect();
      if (interval) clearInterval(interval);
    };
  }, [target, lead]);

  return (
    <div
      ref={ref}
      style={{
        fontFamily: FONT_DISPLAY,
        fontWeight: 500,
        fontSize: 36,
        letterSpacing: '-0.03em',
        color: C.text1,
        lineHeight: 1,
        fontVariantNumeric: 'tabular-nums',
        display: 'flex',
        alignItems: 'baseline',
      }}
    >
      <span style={{ display: 'inline-block', minWidth: '1ch' }}>{value}</span>
      <span
        aria-hidden
        style={{
          marginLeft: 1,
          opacity: done ? 1 : 0,
          transform: done ? 'translateY(0)' : 'translateY(6px)',
          transition: `opacity 320ms ${MODE_EASE}, transform 320ms ${MODE_EASE}`,
          display: 'inline-block',
          color: C.text1,
        }}
      >
        {suffix}
      </span>
    </div>
  );
};

const ProofStatic = ({ text }) => (
  <div
    style={{
      fontFamily: FONT_DISPLAY,
      fontWeight: 500,
      fontSize: 36,
      letterSpacing: '-0.03em',
      color: C.text1,
      lineHeight: 1,
    }}
  >
    {text}
  </div>
);

/* ============================================================ FINAL CTA */
const FinalCTA = ({ onStart }) => {
  const { t } = useLang();
  return (
  <section
    data-testid="final-cta"
    style={{ padding: '120px 32px', borderTop: `1px solid ${C.border1}` }}
  >
    <div
      style={{
        maxWidth: 1080,
        margin: '0 auto',
        background: C.bg3,
        border: `1px solid ${C.border2}`,
        borderRadius: 16,
        padding: '64px 48px',
        textAlign: 'center',
        boxShadow:
          '0 1px 0 rgba(255,255,255,0.7), 0 24px 60px rgba(26,23,20,0.10)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            'radial-gradient(600px 240px at 50% 0%, rgba(160,122,46,0.06), transparent 60%)',
        }}
      />
      <div style={{ ...kickerStyle, position: 'relative' }}>
        {t('cta.kicker')}
      </div>
      <h2
        style={{
          position: 'relative',
          fontFamily: FONT_DISPLAY,
          fontWeight: 500,
          fontSize: 'clamp(36px, 4.6vw, 56px)',
          letterSpacing: '-0.025em',
          lineHeight: 1.05,
          color: C.text1,
          margin: '18px 0 16px',
          whiteSpace: 'pre-line',
        }}
      >
        {t('cta.title')}
      </h2>
      <p
        style={{
          position: 'relative',
          color: C.text2,
          fontSize: 16,
          lineHeight: 1.55,
          maxWidth: 580,
          margin: '0 auto',
        }}
      >
        {t('cta.sub')}
      </p>
      <div
        style={{
          position: 'relative',
          marginTop: 36,
          display: 'flex',
          gap: 16,
          alignItems: 'center',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}
      >
        <HeavyButton onClick={onStart} testid="final-cta-start" size="lg">
          {t('cta.button')}
          <ArrowUpRight size={16} strokeWidth={2.25} />
        </HeavyButton>
        <span
          style={{
            fontFamily: FONT_MONO,
            fontSize: 12,
            color: C.text3,
            letterSpacing: '0.04em',
          }}
        >
          {t('cta.foot')}
        </span>
      </div>
    </div>
  </section>
  );
};

/* ============================================================ FOOTER */
const Footer = () => {
  const { tByEn } = useLang();
  return (
  <footer
    data-testid="footer"
    style={{ borderTop: `1px solid ${C.border1}` }}
  >
    <div
      className="footer-grid"
      style={{
        maxWidth: 1240,
        margin: '0 auto',
        padding: '48px 32px 32px',
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: 24,
        alignItems: 'center',
      }}
    >
      <div>
        <Logo height={28} testId="landing-footer-logo" />
        <p
          style={{
            color: C.text3,
            fontSize: 12.5,
            marginTop: 14,
            fontFamily: FONT_MONO,
            letterSpacing: '0.02em',
          }}
        >
          {tByEn('Execution substrate for software · real builders · scope-locked delivery')}
        </p>
      </div>
      <div style={{ display: 'flex', gap: 20, fontSize: 13, color: C.text2 }}>
        <HeaderLink href="#sequence">{tByEn('How it works')}</HeaderLink>
        <HeaderLink href="#system">{tByEn('System')}</HeaderLink>
        <HeaderLink href="#capabilities">{tByEn('Capabilities')}</HeaderLink>
        <HeaderLink href="#use-cases">{tByEn('Use cases')}</HeaderLink>
      </div>
    </div>
    <div style={{ borderTop: `1px solid ${C.border1}` }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <FooterExtras tone="light" mono={FONT_MONO} />
      </div>
    </div>

    <style>{`
      @media (max-width: 720px) {
        .footer-grid { grid-template-columns: 1fr !important; }
      }
    `}</style>
  </footer>
  );
};

/* ============================================================ PRIMITIVES */
const kickerStyle = {
  fontFamily: FONT_MONO,
  fontSize: 11,
  letterSpacing: '0.14em',
  color: C.text3,
  textTransform: 'uppercase',
  display: 'inline-flex',
  alignItems: 'center',
};

const ghostButton = {
  background: 'transparent',
  color: C.text1,
  border: `1px solid ${C.border2}`,
  borderRadius: 8,
  padding: '16px 22px',
  fontFamily: FONT_BODY,
  fontSize: 14,
  fontWeight: 500,
  textDecoration: 'none',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  transition: 'background 120ms ease, border-color 120ms ease',
};

const SectionHeader = ({ kicker, title, sub }) => {
  const { tByEn } = useLang();
  return (
  <AnimatedHeading
    as="h2"
    kicker={tByEn(kicker)}
    kickerStyle={kickerStyle}
    title={tByEn(title)}
    titleStyle={{
      fontFamily: FONT_DISPLAY,
      fontWeight: 500,
      fontSize: 'clamp(32px, 4vw, 48px)',
      letterSpacing: '-0.025em',
      lineHeight: 1.05,
      color: C.text1,
      margin: '14px 0 0',
    }}
    sub={tByEn(sub)}
    subStyle={{
      color: C.text2,
      fontSize: 16,
      lineHeight: 1.55,
      marginTop: 18,
      maxWidth: 620,
    }}
  />
  );
};

export default LandingPageLight;
