import React from 'react';
import { Phone, Sparkles } from 'lucide-react';

export default function Footer() {
  return (
    <footer
      style={{
        flexShrink: 0,
        height: '52px',
        background: 'rgba(9, 14, 26, 0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(59, 130, 246, 0.2)',
        boxShadow: '0 -4px 25px rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.75rem',
        zIndex: 40,
        fontSize: '0.86rem',
        userSelect: 'none'
      }}
    >
      {/* Brand / Developer Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: '6px',
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.2))',
            border: '1px solid rgba(96, 165, 250, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#60a5fa'
          }}
        >
          <Sparkles size={14} />
        </div>
        <span style={{ color: 'var(--text-dim)', fontSize: '0.84rem' }}>تصميم وتطوير:</span>
        <span
          style={{
            background: 'linear-gradient(135deg, #60a5fa 0%, #c084fc 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: 900,
            fontSize: '0.98rem',
            letterSpacing: '0.6px',
            textShadow: '0 0 20px rgba(96, 165, 250, 0.3)'
          }}
        >
          ZO TECH
        </span>
      </div>

      {/* Social & Contact Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Instagram Pill */}
        <a
          href="https://instagram.com/zo__tech"
          target="_blank"
          rel="noopener noreferrer"
          title="تابعنا على إنستغرام"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#fda4af',
            textDecoration: 'none',
            fontWeight: 700,
            fontSize: '0.82rem',
            background: 'linear-gradient(135deg, rgba(225, 48, 108, 0.15), rgba(131, 58, 180, 0.15))',
            padding: '0.35rem 0.85rem',
            borderRadius: 'var(--radius-full)',
            border: '1px solid rgba(225, 48, 108, 0.35)',
            transition: 'all 0.25s ease',
            boxShadow: '0 2px 8px rgba(225, 48, 108, 0.15)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(225, 48, 108, 0.3), rgba(131, 58, 180, 0.3))';
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 14px rgba(225, 48, 108, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(225, 48, 108, 0.15), rgba(131, 58, 180, 0.15))';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(225, 48, 108, 0.15)';
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#f43f5e' }}>
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
          </svg>
          <span dir="ltr">instagram : zo__tech</span>
        </a>

        {/* WhatsApp Button (Opens WhatsApp with 01275984405) */}
        <a
          href="https://wa.me/201275984405"
          target="_blank"
          rel="noopener noreferrer"
          title="تواصل معنا عبر واتساب (WhatsApp)"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            color: '#22c55e',
            textDecoration: 'none',
            fontWeight: 800,
            fontSize: '0.86rem',
            background: 'rgba(34, 197, 94, 0.12)',
            padding: '0.35rem 0.85rem',
            borderRadius: 'var(--radius-full)',
            border: '1px solid rgba(34, 197, 94, 0.35)',
            transition: 'all 0.25s ease',
            boxShadow: '0 2px 8px rgba(34, 197, 94, 0.15)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(34, 197, 94, 0.25)';
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 14px rgba(34, 197, 94, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(34, 197, 94, 0.12)';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(34, 197, 94, 0.15)';
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
          </svg>
          <span className="font-digits" dir="ltr">01275984405</span>
        </a>
      </div>
    </footer>
  );
}
