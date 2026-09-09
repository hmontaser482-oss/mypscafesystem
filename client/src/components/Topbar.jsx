import React, { useState, useEffect } from 'react';
import {
  Search, Bell, Volume2, VolumeX, Globe, Clock, User, LogOut, CheckCircle2, AlertTriangle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useSocket } from '../context/SocketContext';
import { toggleSound, isSoundEnabled } from '../utils/audioEffects';

export default function Topbar({ onOpenShiftModal, onCloseShiftModal, onGlobalSearch }) {
  const { user, logout, activeShift } = useAuth();
  const { t, lang, toggleLanguage } = useLanguage();
  const { notifications, unreadCount, setUnreadCount } = useSocket();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [showNotifs, setShowNotifs] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSoundToggle = () => {
    const nextState = toggleSound();
    setSoundOn(nextState);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    if (onGlobalSearch) onGlobalSearch(e.target.value);
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        {/* Global Search */}
        <div className="global-search-container">
          <Search size={16} className="global-search-icon" />
          <input
            type="text"
            className="global-search-input"
            placeholder={t('search')}
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>

        {/* Live Clock */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-muted)', fontSize: '0.9rem', marginLeft: '0.5rem' }}>
          <Clock size={16} style={{ color: '#60a5fa' }} />
          <span className="font-digits" style={{ fontWeight: 700, letterSpacing: '0.5px' }}>
            {currentTime.toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
      </div>

      <div className="topbar-right">
        {/* Active Shift Indicator & Quick Actions */}
        {activeShift ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              <span className="pulse-dot available" />
              {lang === 'ar' ? `شيفت: ${activeShift.cashier_name}` : `Shift: ${activeShift.cashier_name}`}
            </span>
            <button
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
              onClick={onCloseShiftModal}
            >
              {t('closeShift')}
            </button>
          </div>
        ) : (
          <button
            className="btn btn-primary"
            style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
            onClick={onOpenShiftModal}
          >
            {t('openShift')}
          </button>
        )}

        {/* Sound Toggle */}
        <button
          className="btn btn-icon btn-secondary"
          onClick={handleSoundToggle}
          title={soundOn ? 'كتم الأصوات' : 'تشغيل الأصوات'}
        >
          {soundOn ? <Volume2 size={18} style={{ color: '#10b981' }} /> : <VolumeX size={18} style={{ color: 'var(--text-dim)' }} />}
        </button>

        {/* Language Toggle */}
        <button
          className="btn btn-secondary"
          style={{ fontSize: '0.82rem', padding: '0.4rem 0.75rem', gap: '0.35rem' }}
          onClick={toggleLanguage}
          title="تبديل اللغة (Language)"
        >
          <Globe size={16} />
          <span>{lang === 'ar' ? 'English' : 'عربي'}</span>
        </button>

        {/* Notifications */}
        <div style={{ position: 'relative' }}>
          <button
            className="btn btn-icon btn-secondary"
            onClick={() => {
              setShowNotifs(!showNotifs);
              setUnreadCount(0);
            }}
            title="الإشعارات"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: -2,
                  right: -2,
                  background: '#ef4444',
                  color: '#fff',
                  borderRadius: '50%',
                  width: 17,
                  height: 17,
                  fontSize: '0.68rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800
                }}
              >
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifs && (
            <div
              className="glass-panel"
              style={{
                position: 'absolute',
                top: '120%',
                left: lang === 'ar' ? 0 : 'auto',
                right: lang === 'ar' ? 'auto' : 0,
                width: 320,
                padding: '0.75rem',
                zIndex: 50,
                maxHeight: 380,
                overflowY: 'auto'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.65rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.4rem' }}>
                <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>التنبيهات الحية</span>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>{notifications.length} إشعار</span>
              </div>
              {notifications.length === 0 ? (
                <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                  لا توجد تنبيهات جديدة
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {notifications.map((n, i) => (
                    <div
                      key={n.id || i}
                      style={{
                        padding: '0.6rem',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-surface-2)',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '0.82rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, color: '#f59e0b', marginBottom: '0.2rem' }}>
                        <AlertTriangle size={14} />
                        <span>{n.title}</span>
                      </div>
                      <p style={{ color: 'var(--text-muted)' }}>{n.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cashier / User Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', borderRight: lang === 'ar' ? '1px solid var(--border-subtle)' : 'none', borderLeft: lang === 'en' ? '1px solid var(--border-subtle)' : 'none', padding: '0 0.65rem' }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <User size={18} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>{user?.full_name || 'الكاشير'}</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'capitalize' }}>{user?.role || 'Staff'}</span>
          </div>
          <button
            className="btn btn-icon btn-secondary"
            onClick={logout}
            title="تسجيل الخروج"
            style={{ width: 32, height: 32 }}
          >
            <LogOut size={15} style={{ color: '#ef4444' }} />
          </button>
        </div>
      </div>
    </header>
  );
}
