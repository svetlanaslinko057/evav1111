/**
 * MobileCabinetSection
 * ─────────────────────────────────────────────────────────────────────────────
 * Promo block for the iOS + Android companion apps.
 * Surfaces real operational primitives from /app/frontend/app/{client,developer},
 * never marketing hype. Mirrors the editorial palette of LandingPage(Light).
 *
 * Contract:
 *   <MobileCabinetSection
 *     C={palette}                   // bg0/bg1/.../signal/ctaBg/ctaInk
 *     FONT_DISPLAY=...
 *     FONT_BODY=...
 *     FONT_MONO=...
 *     tone="dark"|"light"           // controls device skin
 *   />
 *
 * Pure-CSS phone mockup (no asset dependency), feature columns for client +
 * builder roles, store-badge row with a graceful fallback when the apps are
 * gated behind beta / waitlist.
 */
import React, { useState, useMemo } from 'react';
import { useLang } from '@/contexts/LanguageContext';
import {
  Smartphone,
  ShieldCheck,
  Activity,
  Receipt,
  AlertCircle,
  Compass,
  CheckSquare,
  Timer,
  Send,
  ArrowUpRight,
  Apple,
  Bell,
} from 'lucide-react';

const ROLE_TABS = [
  { id: 'client',  labelKey: 'mobile.tab.client',  monoKey: 'mobile.tab.client.mono' },
  { id: 'builder', labelKey: 'mobile.tab.builder', monoKey: 'mobile.tab.builder.mono' },
];

const FEATURES = {
  client: [
    { id: 'c1', icon: ShieldCheck,  tag: 'C-01' },
    { id: 'c2', icon: Activity,     tag: 'C-02' },
    { id: 'c3', icon: Receipt,      tag: 'C-03' },
    { id: 'c4', icon: AlertCircle,  tag: 'C-04' },
  ],
  builder: [
    { id: 'b1', icon: Compass,    tag: 'B-01' },
    { id: 'b2', icon: CheckSquare, tag: 'B-02' },
    { id: 'b3', icon: Timer,      tag: 'B-03' },
    { id: 'b4', icon: Send,       tag: 'B-04' },
  ],
};

/* ─── Static phone-screen mockups (rendered with CSS, no asset) ────────────── */
const ClientScreenMock = ({ C }) => (
  <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
    <div style={{ fontSize: 9, letterSpacing: '0.16em', color: C.signal, fontWeight: 600 }}>
      DASHBOARD · OWNER
    </div>
    <div style={{ fontSize: 18, color: C.text1, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
      2 products
    </div>
    <div style={{ fontSize: 10, color: C.text2 }}>$48,200 invested · +$4,200 this month</div>

    <div
      style={{
        marginTop: 4,
        background: C.bg1,
        border: `1px solid ${C.border1}`,
        borderRadius: 8,
        padding: 10,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 11, color: C.text1, fontWeight: 600 }}>Acme Analytics</div>
        <Pill C={C} dot="#22C55E" label="On track" />
      </div>
      <Bar C={C} pct={62} />
      <div style={{ fontSize: 9, color: C.text3, marginTop: 4 }}>62% · 5/8 modules</div>
    </div>

    <div
      style={{
        background: C.bg1,
        border: `1px solid ${C.border1}`,
        borderRadius: 8,
        padding: 10,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 11, color: C.text1, fontWeight: 600 }}>Helios CRM</div>
        <Pill C={C} dot="#D4A574" label="Watching" />
      </div>
      <Bar C={C} pct={28} />
      <div style={{ fontSize: 9, color: C.text3, marginTop: 4 }}>28% · 2/7 modules</div>
    </div>

    <div
      style={{
        background: C.bg2,
        border: `1px solid ${C.border2}`,
        borderRadius: 8,
        padding: 10,
        marginTop: 'auto',
      }}
    >
      <div style={{ fontSize: 9, letterSpacing: '0.14em', color: C.text3, fontWeight: 600 }}>
        ATTENTION · 2
      </div>
      <div style={{ fontSize: 10, color: C.text1, marginTop: 4, fontWeight: 600 }}>
        1 approval · 1 payment
      </div>
    </div>
  </div>
);

const BuilderScreenMock = ({ C }) => (
  <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
    <div style={{ fontSize: 9, letterSpacing: '0.16em', color: C.signal, fontWeight: 600 }}>
      MARKET · LIVE
    </div>
    <div style={{ fontSize: 18, color: C.text1, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
      3 new modules
    </div>
    <div style={{ fontSize: 10, color: C.text2 }}>Matched on stack · senior · React/Node</div>

    {[
      { name: 'Stripe webhooks adapter', tag: 'B-01', pay: '$1,800', tone: '#22C55E' },
      { name: 'Auth refactor — OAuth flow', tag: 'B-02', pay: '$2,400', tone: '#D4A574' },
    ].map((m) => (
      <div
        key={m.name}
        style={{
          background: C.bg1,
          border: `1px solid ${C.border1}`,
          borderRadius: 8,
          padding: 10,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 9, letterSpacing: '0.14em', color: C.text3, fontWeight: 600 }}>
            {m.tag}
          </div>
          <Pill C={C} dot={m.tone} label={m.pay} />
        </div>
        <div style={{ fontSize: 11, color: C.text1, fontWeight: 600, marginTop: 4 }}>
          {m.name}
        </div>
      </div>
    ))}

    <div
      style={{
        background: C.bg2,
        border: `1px solid ${C.border2}`,
        borderRadius: 8,
        padding: 10,
        marginTop: 'auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <div>
        <div style={{ fontSize: 9, letterSpacing: '0.14em', color: C.text3, fontWeight: 600 }}>
          WALLET
        </div>
        <div style={{ fontSize: 13, color: C.text1, marginTop: 2, fontWeight: 700 }}>
          $4,840
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 9, letterSpacing: '0.14em', color: C.text3, fontWeight: 600 }}>
          TIMER
        </div>
        <div style={{ fontSize: 11, color: C.signal, marginTop: 2, fontWeight: 700 }}>
          01:24:08
        </div>
      </div>
    </div>
  </div>
);

const Pill = ({ C, dot, label }) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '2px 6px',
      borderRadius: 999,
      background: C.bg3,
      border: `1px solid ${C.border1}`,
      fontSize: 9,
      color: C.text2,
      fontWeight: 500,
    }}
  >
    <span style={{ width: 5, height: 5, borderRadius: 5, background: dot }} />
    {label}
  </div>
);

const Bar = ({ C, pct }) => (
  <div
    style={{
      marginTop: 8,
      height: 4,
      background: C.bg3,
      borderRadius: 999,
      overflow: 'hidden',
      border: `1px solid ${C.border1}`,
    }}
  >
    <div style={{ height: '100%', width: `${pct}%`, background: C.signal }} />
  </div>
);

/* ─── The section ────────────────────────────────────────────────────────── */
export default function MobileCabinetSection({
  C,
  FONT_DISPLAY,
  FONT_BODY,
  FONT_MONO,
  tone = 'dark',
}) {
  const [role, setRole] = useState('client');
  const features = FEATURES[role];
  const { t } = useLang();

  const kickerStyle = useMemo(
    () => ({
      fontFamily: FONT_MONO,
      fontSize: 11,
      letterSpacing: '0.14em',
      color: C.text3,
      textTransform: 'uppercase',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
    }),
    [C, FONT_MONO]
  );

  // Device chrome reads bezel from the substrate side (dark = paper bezel, light = graphite bezel).
  const bezel = tone === 'dark' ? '#1F1F23' : '#1A1714';
  const screenBg = C.bg0;

  return (
    <section
      id="mobile"
      data-testid="mobile-cabinet-section"
      style={{
        padding: '120px 32px',
        borderTop: `1px solid ${C.border1}`,
        position: 'relative',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            tone === 'dark'
              ? 'radial-gradient(900px 360px at 80% 20%, rgba(212,165,116,0.04), transparent 60%)'
              : 'radial-gradient(900px 360px at 80% 20%, rgba(160,122,46,0.05), transparent 60%)',
        }}
      />

      <div style={{ maxWidth: 1240, margin: '0 auto', position: 'relative' }}>
        {/* Header */}
        <div style={kickerStyle}>
          <Smartphone size={12} strokeWidth={2} />
          {t('mobile.kicker')}
        </div>
        <h2
          style={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 500,
            fontSize: 'clamp(32px, 4vw, 48px)',
            letterSpacing: '-0.025em',
            lineHeight: 1.05,
            color: C.text1,
            margin: '14px 0 0',
          }}
        >
          {t('mobile.title')}
        </h2>
        <p
          style={{
            color: C.text2,
            fontFamily: FONT_BODY,
            fontSize: 16,
            lineHeight: 1.55,
            marginTop: 18,
            maxWidth: 640,
          }}
        >
          {t('mobile.sub')}
        </p>

        {/* Role tabs */}
        <div
          data-testid="mobile-cabinet-tabs"
          style={{
            display: 'inline-flex',
            marginTop: 36,
            padding: 4,
            background: C.bg1,
            border: `1px solid ${C.border1}`,
            borderRadius: 10,
            gap: 4,
          }}
        >
          {ROLE_TABS.map((tab) => {
            const active = tab.id === role;
            return (
              <button
                key={tab.id}
                onClick={() => setRole(tab.id)}
                data-testid={`mobile-cabinet-tab-${tab.id}`}
                style={{
                  background: active ? C.bg3 : 'transparent',
                  color: active ? C.text1 : C.text2,
                  border: 'none',
                  padding: '10px 18px',
                  borderRadius: 7,
                  fontFamily: FONT_BODY,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  letterSpacing: '0.01em',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'background 140ms ease, color 140ms ease',
                  boxShadow: active
                    ? tone === 'dark'
                      ? '0 1px 0 rgba(245,242,236,0.04), 0 6px 16px rgba(0,0,0,0.30)'
                      : '0 1px 0 rgba(0,0,0,0.02), 0 6px 16px rgba(0,0,0,0.06)'
                    : 'none',
                }}
              >
                <span
                  style={{
                    fontFamily: FONT_MONO,
                    fontSize: 10,
                    color: active ? C.signal : C.text3,
                    letterSpacing: '0.12em',
                  }}
                >
                  {t(tab.monoKey)}
                </span>
                <span>·</span>
                {t(tab.labelKey)}
              </button>
            );
          })}
        </div>

        {/* Grid: phone mockup + feature column */}
        <div
          className="mobile-cabinet-grid"
          style={{
            marginTop: 56,
            display: 'grid',
            gridTemplateColumns: '380px 1fr',
            gap: 64,
            alignItems: 'start',
          }}
        >
          {/* Device frame */}
          <div
            style={{
              position: 'relative',
              width: 320,
              height: 640,
              margin: '0 auto',
              borderRadius: 44,
              background: bezel,
              border: `1px solid ${C.border2}`,
              padding: 10,
              boxShadow:
                tone === 'dark'
                  ? '0 1px 0 rgba(245,242,236,0.04), 0 40px 80px rgba(0,0,0,0.45), 0 12px 24px rgba(0,0,0,0.30)'
                  : '0 1px 0 rgba(255,255,255,0.6), 0 30px 60px rgba(0,0,0,0.18), 0 10px 24px rgba(0,0,0,0.10)',
            }}
          >
            {/* Notch */}
            <div
              style={{
                position: 'absolute',
                top: 14,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 110,
                height: 26,
                borderRadius: 14,
                background: '#0A0A0C',
                zIndex: 2,
              }}
            />
            {/* Screen */}
            <div
              data-testid="mobile-cabinet-device"
              style={{
                width: '100%',
                height: '100%',
                borderRadius: 36,
                background: screenBg,
                border: `1px solid ${C.border1}`,
                overflow: 'hidden',
                position: 'relative',
                fontFamily: FONT_BODY,
              }}
            >
              {/* Status bar */}
              <div
                style={{
                  height: 38,
                  paddingTop: 16,
                  paddingLeft: 28,
                  paddingRight: 28,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: 10,
                  fontWeight: 600,
                  color: C.text2,
                  fontFamily: FONT_MONO,
                }}
              >
                <span>9:41</span>
                <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                  <Bell size={10} strokeWidth={2.2} color={C.signal} />
                  <span style={{ color: C.text3 }}>5G</span>
                </span>
              </div>
              {role === 'client' ? <ClientScreenMock C={C} /> : <BuilderScreenMock C={C} />}
            </div>
          </div>

          {/* Feature column */}
          <div
            data-testid="mobile-cabinet-features"
            style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
          >
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.tag}
                  data-testid={`mobile-cabinet-feature-${f.tag}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '44px 1fr',
                    gap: 20,
                    padding: '22px 0',
                    borderTop: i === 0 ? 'none' : `1px solid ${C.border1}`,
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 10,
                      background: C.bg1,
                      border: `1px solid ${C.border1}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: C.text1,
                    }}
                  >
                    <Icon size={18} strokeWidth={1.75} />
                  </div>
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        marginBottom: 6,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: FONT_MONO,
                          fontSize: 10,
                          letterSpacing: '0.12em',
                          color: C.text3,
                        }}
                      >
                        {f.tag}
                      </span>
                      <span
                        style={{
                          fontFamily: FONT_DISPLAY,
                          fontWeight: 500,
                          fontSize: 18,
                          color: C.text1,
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {t(`mobile.f.${f.id}.title`)}
                      </span>
                    </div>
                    <p
                      style={{
                        margin: 0,
                        color: C.text2,
                        fontSize: 14.5,
                        lineHeight: 1.55,
                        fontFamily: FONT_BODY,
                      }}
                    >
                      {t(`mobile.f.${f.id}.body`)}
                    </p>
                  </div>
                </div>
              );
            })}

            {/* Store row */}
            <div
              style={{
                marginTop: 28,
                paddingTop: 28,
                borderTop: `1px solid ${C.border1}`,
                display: 'flex',
                gap: 12,
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <StoreBadge
                C={C}
                tone={tone}
                FONT_BODY={FONT_BODY}
                FONT_MONO={FONT_MONO}
                top={t('mobile.store.ios.top')}
                main={t('mobile.store.ios')}
                icon={<Apple size={22} strokeWidth={1.5} />}
                href="#"
                testid="mobile-cabinet-store-ios"
              />
              <StoreBadge
                C={C}
                tone={tone}
                FONT_BODY={FONT_BODY}
                FONT_MONO={FONT_MONO}
                top={t('mobile.store.and.top')}
                main={t('mobile.store.and')}
                icon={<PlayGlyph />}
                href="#"
                testid="mobile-cabinet-store-android"
              />
              <div
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 11,
                  color: C.text3,
                  letterSpacing: '0.04em',
                  marginLeft: 4,
                }}
              >
                {t('mobile.foot')}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 880px) {
          [data-testid="mobile-cabinet-section"] .mobile-cabinet-grid {
            grid-template-columns: 1fr !important;
            gap: 40px !important;
          }
        }
      `}</style>
    </section>
  );
}

/* ─── Store badge — material that matches the substrate ─────────────────── */
const StoreBadge = ({ C, tone, FONT_BODY, FONT_MONO, top, main, icon, href, testid }) => (
  <a
    href={href}
    onClick={(e) => e.preventDefault()}
    data-testid={testid}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      background: C.ctaBg,
      color: C.ctaInk,
      borderRadius: 10,
      padding: '10px 16px',
      textDecoration: 'none',
      minWidth: 168,
      border: tone === 'dark' ? `1px solid ${C.border2}` : 'none',
      boxShadow:
        tone === 'dark'
          ? '0 1px 0 rgba(245,242,236,0.05), 0 10px 24px rgba(0,0,0,0.35)'
          : '0 1px 0 rgba(255,255,255,0.08), 0 10px 24px rgba(0,0,0,0.22)',
      cursor: 'pointer',
      transition: 'transform 120ms ease',
    }}
    onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
    onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
  >
    {icon}
    <div style={{ lineHeight: 1.1 }}>
      <div
        style={{
          fontFamily: FONT_MONO,
          fontSize: 9,
          letterSpacing: '0.12em',
          opacity: 0.7,
          textTransform: 'uppercase',
        }}
      >
        {top}
      </div>
      <div
        style={{
          fontFamily: FONT_BODY,
          fontSize: 16,
          fontWeight: 600,
          letterSpacing: '-0.01em',
          marginTop: 2,
        }}
      >
        {main}
      </div>
    </div>
  </a>
);

/* Minimal Play triangle glyph (lucide doesn't ship a Play-store icon). */
const PlayGlyph = () => (
  <svg width="20" height="22" viewBox="0 0 20 22" fill="none" aria-hidden>
    <path
      d="M2 1.5v19a1.2 1.2 0 0 0 1.83 1.02l14.42-9.5a1.2 1.2 0 0 0 0-2.04L3.83.48A1.2 1.2 0 0 0 2 1.5Z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
    <path d="M2 1.5L13 11 2 20.5" stroke="currentColor" strokeWidth="1.2" />
  </svg>
);
