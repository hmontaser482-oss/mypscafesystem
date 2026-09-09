import React, { useState, useEffect } from 'react';
import { Play, User, Clock, Users, Gamepad2, Sparkles, Check } from 'lucide-react';
import Modal from './Modal';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

export default function StartSessionModal({ isOpen, onClose, device, onSessionStarted }) {
  const { t, lang } = useLanguage();
  const { authFetch, activeShift } = useAuth();

  const [customerMode, setCustomerMode] = useState('walkin'); // 'walkin', 'registered', 'new'
  const [customerName, setCustomerName] = useState('زائر عادي');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [registeredList, setRegisteredList] = useState([]);
  const [sessionType, setSessionType] = useState('single'); // 'single', 'multi'
  const [timeMode, setTimeMode] = useState('open'); // 'open', 'fixed'
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [gameId, setGameId] = useState('');
  const [gamesList, setGamesList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch registered customers and games when opened
  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      if (device?.activeBooking) {
        setCustomerMode('walkin');
        setCustomerName(device.activeBooking.customer_name);
        setCustomerPhone(device.activeBooking.phone || '');
        if (device.activeBooking.session_type) {
          setSessionType(device.activeBooking.session_type);
        }
      } else {
        setCustomerMode('walkin');
        setCustomerName('زائر عادي');
        setCustomerPhone('');
      }

      authFetch('/api/customers?limit=100')
        .then(res => res.json())
        .then(d => { if (d.success) setRegisteredList(d.customers); });

      authFetch('/api/games')
        .then(res => res.json())
        .then(d => { if (d.success) setGamesList(d.games); });
    }
  }, [isOpen, device]);

  if (!device) return null;

  const currentRate = sessionType === 'multi' ? device.effectiveMultiPrice : device.effectiveSinglePrice;
  const estimatedCost = timeMode === 'fixed' ? Math.round((durationMinutes / 60) * currentRate * 100) / 100 : null;

  const handleStart = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      let finalCustomerId = null;
      let finalCustomerName = customerName;

      if (customerMode === 'registered') {
        finalCustomerId = customerId;
        const c = registeredList.find(x => x.id === customerId);
        if (c) finalCustomerName = c.name;
      } else if (customerMode === 'new') {
        if (!customerName || !customerPhone) {
          throw new Error('يرجى إدخال اسم ورقم هاتف العميل الجديد');
        }
        // Create new customer first
        const custRes = await authFetch('/api/customers', {
          method: 'POST',
          body: JSON.stringify({ name: customerName, phone: customerPhone })
        });
        const custData = await custRes.json();
        if (!custData.success) throw new Error(custData.message);
        finalCustomerId = custData.customerId;
      }

      const res = await authFetch('/api/sessions/start', {
        method: 'POST',
        body: JSON.stringify({
          deviceId: device.id,
          customerId: finalCustomerId,
          customerName: finalCustomerName,
          phone: customerPhone,
          bookingId: device.activeBooking?.id || null,
          sessionType,
          timeMode,
          durationMinutes: timeMode === 'fixed' ? durationMinutes : null,
          gameId: gameId || null
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'فشل بدء الجلسة');
      }

      onSessionStarted(data.sessionId);
      onClose();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`تشغيل جهاز: ${device.name}`}
      maxWidth="620px"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
            {t('cancel')}
          </button>
          <button type="button" className="btn btn-success" onClick={handleStart} disabled={loading || !activeShift}>
            <Play size={16} />
            {loading ? 'جاري البدء...' : 'بدء تشغيل الجلسة'}
          </button>
        </>
      }
    >
      <form onSubmit={handleStart}>
        {!activeShift && (
          <div style={{ padding: '0.85rem 1rem', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', border: '1px solid rgba(239, 68, 68, 0.3)', fontSize: '0.88rem' }}>
            <strong>⚠️ لا يوجد شيفت مفتوح حالياً!</strong>
            <div style={{ fontSize: '0.8rem', color: '#fca5a5', marginTop: '0.2rem' }}>
              لا يمكن بدء تشغيل أي جهاز إلا بعد فتح الشيفت أولاً من شاشة الشيفتات أو الصالة.
            </div>
          </div>
        )}

        {errorMsg && (
          <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', border: '1px solid rgba(239, 68, 68, 0.3)', fontSize: '0.88rem' }}>
            {errorMsg}
          </div>
        )}

        {device.activeBooking && (
          <div style={{ padding: '0.85rem 1rem', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', border: '1px solid rgba(245, 158, 11, 0.4)', fontSize: '0.88rem' }}>
            <div style={{ fontWeight: 800, marginBottom: '0.25rem' }}>
              ⚠️ هذا الجهاز محجوز مسبقاً!
            </div>
            <div>
              العميل صاحب الحجز: <strong>{device.activeBooking.customer_name}</strong> (هاتف: {device.activeBooking.phone})
              <br />
              الوقت: من {device.activeBooking.start_time} إلى {device.activeBooking.end_time}
            </div>
            <div style={{ fontSize: '0.78rem', marginTop: '0.35rem', color: '#e2e8f0' }}>
              * لا يمكن تشغيل هذا الجهاز إلا لنفس العميل صاحب الحجز. سيتم بدء الجلسة باسمه وتحويل الحجز لجلسة نشطة تلقائياً.
            </div>
          </div>
        )}

        {/* 1. Customer Selection */}
        <div className="form-group">
          <label className="form-label">{t('chooseCustomer')}</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <button
              type="button"
              className={`btn ${customerMode === 'walkin' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.82rem', padding: '0.5rem' }}
              onClick={() => { setCustomerMode('walkin'); setCustomerName('زائر عادي'); }}
            >
              {t('walkInCustomer')}
            </button>
            <button
              type="button"
              className={`btn ${customerMode === 'registered' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.82rem', padding: '0.5rem' }}
              onClick={() => setCustomerMode('registered')}
            >
              {t('registeredCustomer')}
            </button>
            <button
              type="button"
              className={`btn ${customerMode === 'new' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.82rem', padding: '0.5rem' }}
              onClick={() => { setCustomerMode('new'); setCustomerName(''); setCustomerPhone(''); }}
            >
              {t('newCustomer')}
            </button>
          </div>

          {customerMode === 'registered' && (
            <select
              className="form-control"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
            >
              <option value="">-- اختر عميلاً مسجلاً من القائمة --</option>
              {registeredList.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.phone}) - {c.total_visits} زيارة
                </option>
              ))}
            </select>
          )}

          {customerMode === 'new' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
              <input
                type="text"
                className="form-control"
                placeholder={t('customerName')}
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
              <input
                type="text"
                className="form-control"
                placeholder={t('customerPhone')}
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* 2. Session Type (Single vs Multi) */}
        <div className="form-group">
          <label className="form-label">نوع الجلسة (Session Type)</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div
              onClick={() => setSessionType('single')}
              style={{
                border: `2px solid ${sessionType === 'single' ? '#3b82f6' : 'var(--border-subtle)'}`,
                borderRadius: 'var(--radius-md)',
                padding: '0.9rem',
                background: sessionType === 'single' ? 'rgba(59, 130, 246, 0.12)' : 'var(--bg-surface-2)',
                cursor: 'pointer',
                textAlign: 'center'
              }}
            >
              <User size={24} style={{ color: '#60a5fa', marginBottom: '0.25rem' }} />
              <div style={{ fontWeight: 800 }}>{t('single')}</div>
              <div className="font-digits" style={{ color: '#fbbf24', fontSize: '1.1rem', fontWeight: 800, marginTop: '0.25rem' }}>
                {device.effectiveSinglePrice} {t('currency')} / {t('hourShort')}
              </div>
            </div>

            <div
              onClick={() => setSessionType('multi')}
              style={{
                border: `2px solid ${sessionType === 'multi' ? '#3b82f6' : 'var(--border-subtle)'}`,
                borderRadius: 'var(--radius-md)',
                padding: '0.9rem',
                background: sessionType === 'multi' ? 'rgba(59, 130, 246, 0.12)' : 'var(--bg-surface-2)',
                cursor: 'pointer',
                textAlign: 'center'
              }}
            >
              <Users size={24} style={{ color: '#c084fc', marginBottom: '0.25rem' }} />
              <div style={{ fontWeight: 800 }}>{t('multi')}</div>
              <div className="font-digits" style={{ color: '#fbbf24', fontSize: '1.1rem', fontWeight: 800, marginTop: '0.25rem' }}>
                {device.effectiveMultiPrice} {t('currency')} / {t('hourShort')}
              </div>
            </div>
          </div>
        </div>

        {/* 3. Time Mode (Open vs Fixed) */}
        <div className="form-group">
          <label className="form-label">نظام الوقت (Time Mode)</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <button
              type="button"
              className={`btn ${timeMode === 'open' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setTimeMode('open')}
            >
              ♾️ {t('open_time')}
            </button>
            <button
              type="button"
              className={`btn ${timeMode === 'fixed' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setTimeMode('fixed')}
            >
              ⏱️ {t('fixed_time')}
            </button>
          </div>

          {timeMode === 'fixed' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.45rem', marginBottom: '0.65rem' }}>
                {[30, 60, 120, 180].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    className={`btn ${durationMinutes === mins ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.85rem', padding: '0.5rem' }}
                    onClick={() => setDurationMinutes(mins)}
                  >
                    {mins >= 60 ? `${mins / 60} ${t('hourShort')}` : `${mins} د`}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>مدة مخصصة (بالدقائق):</span>
                <input
                  type="number"
                  min="5"
                  step="5"
                  className="form-control"
                  style={{ width: 120 }}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                />
              </div>

              {estimatedCost !== null && (
                <div style={{ marginTop: '0.65rem', padding: '0.65rem', background: 'rgba(14, 165, 233, 0.1)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(14, 165, 233, 0.25)', color: '#38bdf8', fontSize: '0.88rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>السعر التقديري للمدة ({durationMinutes} دقيقة):</span>
                  <span className="font-digits" style={{ fontWeight: 800 }}>{estimatedCost} {t('currency')}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 4. Game Selection (Optional) */}
        <div className="form-group">
          <label className="form-label">{t('selectGame')}</label>
          <select
            className="form-control"
            value={gameId}
            onChange={(e) => setGameId(e.target.value)}
          >
            <option value="">-- اختياري: اختر اللعبة التي سيلعبها العميل --</option>
            {gamesList.map(g => (
              <option key={g.id} value={g.id}>
                {g.name} ({g.platform}) - {g.category}
              </option>
            ))}
          </select>
        </div>
      </form>
    </Modal>
  );
}
