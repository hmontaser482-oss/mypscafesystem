import React, { useState, useEffect } from 'react';
import {
  Gamepad2, Play, Pause, Square, Plus, ArrowRightLeft, Clock,
  DollarSign, Wrench, ShieldAlert, Sparkles, User, Coffee, CheckCircle2, AlertTriangle
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useSocket } from '../context/SocketContext';

export default function DeviceCard({
  device,
  onStartSession,
  onOpenInSessionModal,
  onCheckoutSession,
  onPauseResume,
  onReceiveMaintenance
}) {
  const { t, lang } = useLanguage();
  const { liveTicks } = useSocket();

  const activeSession = device.activeSession;
  const isRunning = device.status === 'running';
  const isPaused = device.status === 'paused';
  const isExpired = device.status === 'time_expired';
  const isAvailable = device.status === 'available';
  const isMaintenance = device.status === 'maintenance';
  const isReserved = device.status === 'reserved';

  // Local ticker for smooth second-by-second updates
  const [elapsedSeconds, setElapsedSeconds] = useState(activeSession?.totalPlayedSeconds || 0);

  useEffect(() => {
    if (activeSession) {
      setElapsedSeconds(activeSession.totalPlayedSeconds || 0);
    }
  }, [activeSession?.id]);

  // Sync with live ticks from socket
  useEffect(() => {
    const tick = liveTicks[device.id] || liveTicks[activeSession?.id];
    if (tick) {
      setElapsedSeconds(tick.totalPlayedSeconds);
    }
  }, [liveTicks, device.id, activeSession?.id]);

  // Increment elapsed seconds locally if running (STOP if time expired!)
  useEffect(() => {
    if (!isRunning || !activeSession || isExpired) return; // Stop counting if time expired
    const interval = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning, activeSession, isExpired]);

  // Format HH:MM:SS
  const formatTime = (totalSec) => {
    const s = Math.max(0, Math.floor(totalSec));
    const hours = Math.floor(s / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    const seconds = s % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  // Calculate live cost
  let displayCost = activeSession?.gamingCost || 0;
  const tickData = liveTicks[device.id] || liveTicks[activeSession?.id];
  if (tickData) {
    displayCost = tickData.grandTotal;
  } else if (activeSession && isRunning) {
    // Client estimation until next socket sync
    const hours = elapsedSeconds / 3600;
    const baseCost = Math.round(hours * activeSession.hourlyRate * 100) / 100;
    displayCost = Math.round((baseCost + (activeSession.productsCost || 0)) * 100) / 100;
  }

  // Calculate remaining time for fixed sessions
  let remainingSec = null;
  let remainingPercent = 100;
  if (activeSession?.timeMode === 'fixed' && activeSession.expectedEndTime) {
    const expTime = new Date(activeSession.expectedEndTime).getTime();
    const nowTime = Date.now();
    remainingSec = Math.max(0, Math.floor((expTime - nowTime) / 1000));
    const totalTargetSec = (activeSession.targetMinutes || 60) * 60;
    remainingPercent = Math.min(100, Math.max(0, (remainingSec / totalTargetSec) * 100));
  }

  // Card status class (add shake animation for expired sessions)
  const cardStatusClass = isExpired ? 'time-expired shake-attention' : isRunning ? 'running' : isAvailable ? 'available' : isMaintenance ? 'maintenance' : '';

  return (
    <div className={`device-card ${cardStatusClass}`}>
      {/* Top Header: Device Name & Status Badge */}
      <div className="device-card-header">
        <div className="device-title-box">
          <div className="device-type-icon">
            {device.device_type === 'PS5' ? 'PS5' : 'PS4'}
          </div>
          <div>
            <h4 className="device-name">{device.name}</h4>
            <span className="device-subtext">#{device.device_number} • {device.group_name}</span>
          </div>
        </div>

        {/* Status Badge */}
        <div>
          {isAvailable && (
            <span className="badge badge-available">
              <span className="pulse-dot available" />
              {t('available')}
            </span>
          )}
          {isRunning && (
            <span className="badge badge-running">
              <span className="pulse-dot running" />
              {t('running')}
            </span>
          )}
          {isPaused && (
            <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
              {t('paused')}
            </span>
          )}
          {isExpired && (
            <span className="badge badge-expired pulse-shake">
              <AlertTriangle size={13} />
              {t('time_expired')}
            </span>
          )}
          {isMaintenance && (
            <span className="badge badge-maintenance">
              <Wrench size={13} />
              {t('maintenance_status')}
            </span>
          )}
          {isReserved && (
            <span className="badge badge-reserved">
              {t('reserved')}
            </span>
          )}
        </div>
      </div>

      {/* Meta Pills: Room & Rates */}
      <div className="device-meta-row">
        {device.room_name && (
          <span className="meta-pill" style={{ color: device.room_is_vip ? '#fbbf24' : undefined, borderColor: device.room_is_vip ? 'rgba(251, 191, 36, 0.3)' : undefined }}>
            {device.room_is_vip && <Sparkles size={11} style={{ display: 'inline', marginLeft: 4 }} />}
            {device.room_name}
          </span>
        )}
        <span className="meta-pill">
          {lang === 'ar' ? `سينجل: ${device.effectiveSinglePrice} ج/س` : `Single: ${device.effectiveSinglePrice}/h`}
        </span>
        <span className="meta-pill">
          {lang === 'ar' ? `مالتي: ${device.effectiveMultiPrice} ج/س` : `Multi: ${device.effectiveMultiPrice}/h`}
        </span>
      </div>

      {/* Active Session Info or Available Prompt */}
      {activeSession ? (
        <div className="session-info-body">
          {/* Customer & Game info */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700 }}>
              <User size={14} style={{ color: '#60a5fa' }} />
              <span>{activeSession.customerName}</span>
            </div>
            {activeSession.gameName && (
              <span style={{ color: 'var(--text-dim)', fontSize: '0.78rem' }}>
                🎮 {activeSession.gameName}
              </span>
            )}
          </div>

          {/* Live Timer & Cost */}
          <div className="live-timer-container">
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block' }}>
                {t('duration')}
              </span>
              <span className="live-timer-val">
                {formatTime(elapsedSeconds)}
              </span>
            </div>

            <div style={{ textAlign: lang === 'ar' ? 'left' : 'right' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block' }}>
                {t('currentCost')}
              </span>
              <span className="live-cost-val">
                {displayCost} <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{t('currency')}</span>
              </span>
            </div>
          </div>

          {/* Fixed Time Countdown Bar */}
          {activeSession.timeMode === 'fixed' && remainingSec !== null && (
            <div style={{ margin: '0.5rem 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: isExpired ? '#ef4444' : '#0ea5e9', fontWeight: 700, marginBottom: '0.2rem' }}>
                <span>{t('timeRemaining')}</span>
                <span className="font-digits">{formatTime(remainingSec)}</span>
              </div>
              <div style={{ height: 4, background: 'rgba(255, 255, 255, 0.1)', borderRadius: 2, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${remainingPercent}%`,
                    background: isExpired ? '#ef4444' : 'linear-gradient(90deg, #3b82f6, #0ea5e9)',
                    transition: 'width 1s linear'
                  }}
                />
              </div>
            </div>
          )}

          {/* Mode Badges */}
          <div className="session-tags-row">
            <span style={{ fontWeight: 600 }}>
              {activeSession.sessionType === 'multi' ? '👥 Multiplayer' : '👤 Single'}
            </span>
            <span>
              {activeSession.timeMode === 'open' ? '♾️ وقت مفتوح' : `⏱️ ${activeSession.targetMinutes} دقيقة`}
            </span>
            {activeSession.productsCost > 0 && (
              <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: 3, fontWeight: 700 }}>
                <Coffee size={13} />
                +{activeSession.productsCost} ج
              </span>
            )}
          </div>
        </div>
      ) : (
        <div
          style={{
            background: 'var(--bg-surface-2)',
            borderRadius: 'var(--radius-md)',
            padding: '1.25rem',
            textAlign: 'center',
            marginBottom: '1rem',
            border: '1px dashed var(--border-subtle)',
            color: 'var(--text-dim)'
          }}
        >
          {isAvailable ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
              <Gamepad2 size={28} style={{ color: 'var(--color-available)', opacity: 0.8 }} />
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                الجهاز جاهز لاستقبال اللاعبين
              </span>
            </div>
          ) : isReserved ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ fontSize: '0.9rem', color: '#f59e0b', fontWeight: 800 }}>
                📌 محجوز: {device.activeBooking?.customer_name || 'عميل'}
              </span>
              {device.activeBooking && (
                <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                  من {device.activeBooking.start_time} إلى {device.activeBooking.end_time} ({device.activeBooking.phone})
                </span>
              )}
            </div>
          ) : isMaintenance ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
              <Wrench size={24} style={{ color: '#ef4444', opacity: 0.8 }} />
              <span style={{ fontSize: '0.85rem', color: '#ef4444', fontWeight: 700 }}>
                الجهاز في الصيانة الفنية حالياً
              </span>
            </div>
          ) : (
            <span>الجهاز غير متاح للتشغيل المباشر</span>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="device-card-actions">
        {isAvailable && (
          <button
            className="btn btn-success"
            onClick={() => onStartSession(device)}
          >
            <Play size={16} />
            {t('startSession')}
          </button>
        )}

        {isReserved && (
          <button
            className="btn btn-warning"
            style={{ background: '#f59e0b', color: '#000', fontWeight: 800, width: '100%' }}
            onClick={() => onStartSession(device)}
          >
            <Play size={16} />
            بدء الجلسة لصاحب الحجز
          </button>
        )}

        {isMaintenance && (
          <button
            className="btn btn-success"
            style={{ width: '100%', fontSize: '0.85rem' }}
            onClick={() => onReceiveMaintenance && onReceiveMaintenance(device)}
          >
            <CheckCircle2 size={16} />
            استلام وتشغيل الجهاز
          </button>
        )}

        {activeSession && (
          <>
            {/* View / Manage modal */}
            <button
              className="btn btn-secondary"
              onClick={() => onOpenInSessionModal(device, activeSession)}
              title="التحكم بالجلسة وإضافة طلبات"
            >
              {t('viewDetails')}
            </button>

            {/* Quick Add Order */}
            <button
              className="btn btn-icon btn-secondary"
              onClick={() => onOpenInSessionModal(device, activeSession, 'orders')}
              title="إضافة مشروبات وطلبات للجهاز"
            >
              <Plus size={16} style={{ color: '#10b981' }} />
            </button>

            {/* Quick Pause / Resume */}
            <button
              className="btn btn-icon btn-secondary"
              onClick={() => onPauseResume(activeSession)}
              title={isRunning ? t('pause') : t('resume')}
            >
              {isRunning ? <Pause size={16} style={{ color: '#f59e0b' }} /> : <Play size={16} style={{ color: '#10b981' }} />}
            </button>

            {/* End & Checkout */}
            <button
              className="btn btn-danger"
              onClick={() => onCheckoutSession(device, activeSession)}
              title={t('stopSession')}
            >
              <Square size={16} />
              {t('stopSession')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
