/**
 * LanguageToggle — header-mounted dropdown selector.
 * Replaces the previous EN|UK segmented control with a proper dropdown
 * so adding more languages stays clean.
 */
import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check, Globe } from 'lucide-react';
import { useLang } from '@/contexts/LanguageContext';

export default function LanguageToggle({ palette, fontMono }) {
  const { lang, setLang, languages } = useLang();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const C = palette || {};
  const border = C.border2 || 'rgba(0,0,0,0.14)';
  const surface = C.bg1 || '#fff';
  const surfacePanel = C.bg3 || '#fff';
  const text1 = C.text1 || '#111';
  const text2 = C.text2 || '#555';
  const text3 = C.text3 || '#888';
  const signal = C.signal || '#A07A2E';
  const monoFont = fontMono || "'IBM Plex Mono','JetBrains Mono',ui-monospace,monospace";

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const current = languages.find((l) => l.id === lang) || languages[0];

  return (
    <div
      ref={wrapRef}
      data-testid="language-toggle"
      style={{ position: 'relative', display: 'inline-block', fontFamily: monoFont }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        data-testid="language-toggle-button"
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          background: surface,
          border: `1px solid ${border}`,
          borderRadius: 8,
          padding: '7px 10px 7px 10px',
          color: text1,
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: '0.06em',
          cursor: 'pointer',
          lineHeight: 1,
        }}
      >
        <Globe size={13} strokeWidth={2} color={text3} />
        <span>{current.label}</span>
        <ChevronDown
          size={13}
          strokeWidth={2}
          color={text3}
          style={{ transition: 'transform 160ms ease', transform: open ? 'rotate(180deg)' : 'none' }}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          data-testid="language-toggle-menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            margin: 0,
            padding: 6,
            listStyle: 'none',
            background: surfacePanel,
            border: `1px solid ${border}`,
            borderRadius: 10,
            boxShadow: '0 12px 32px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.06)',
            minWidth: 168,
            zIndex: 200,
          }}
        >
          {languages.map((l) => {
            const active = l.id === lang;
            return (
              <li key={l.id} style={{ margin: 0 }}>
                <button
                  type="button"
                  onClick={() => {
                    setLang(l.id);
                    setOpen(false);
                  }}
                  data-testid={`lang-${l.id}`}
                  role="option"
                  aria-selected={active}
                  style={{
                    width: '100%',
                    display: 'grid',
                    gridTemplateColumns: '32px 1fr 18px',
                    alignItems: 'center',
                    gap: 8,
                    padding: '9px 10px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: 7,
                    cursor: 'pointer',
                    textAlign: 'left',
                    color: text1,
                    fontFamily: monoFont,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = surface)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <span
                    style={{
                      fontSize: 11,
                      letterSpacing: '0.1em',
                      fontWeight: 700,
                      color: active ? signal : text3,
                    }}
                  >
                    {l.label}
                  </span>
                  <span style={{ fontSize: 13, fontFamily: 'inherit', color: text1, fontWeight: 500 }}>
                    {l.name}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {active ? <Check size={14} strokeWidth={2.4} color={signal} /> : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
