import React, { useState, useEffect } from 'react';
import {
  Calendar, Clock, Plus, Filter, CheckCircle2, XCircle, AlertCircle,
  Gamepad2, User, Phone, DollarSign
} from 'lucide-react';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function Bookings({ onStartSessionForDevice }) {
  const { t, lang } = useLanguage();
  const { authFetch } = useAuth();

  const [bookings, setBookings] = useState([]);
  const [devices, setDevices] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [viewMode, setViewMode] = useState('day'); // 'day', 'all'
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Form states
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState('20:00');
  const [endTime, setEndTime] = useState('22:00');
  const [sessionType, setSessionType] = useState('multi');
  const [depositAmount, setDepositAmount] = useState(0);
  const [notes, setNotes] = useState('');

  const loadData = async () => {
    try {
      const devRes = await authFetch('/api/devices');
      const devData = await devRes.json();
      if (devData.success) {
        setDevices(devData.devices);
        if (devData.devices.length > 0 && !deviceId) {
          setDeviceId(devData.devices[0].id);
        }
      }

      const queryUrl = viewMode === 'day' ? `/api/bookings?date=${selectedDate}` : '/api/bookings';
      const bRes = await authFetch(queryUrl);
      const bData = await bRes.json();
      if (bData.success) {
        setBookings(bData.bookings);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDate, viewMode]);

  const handleCreateBooking = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const res = await authFetch('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          customerName,
          phone,
          deviceId,
          bookingDate,
          startTime,
          endTime,
          sessionType,
          depositAmount: Number(depositAmount),
          notes
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'فشل تسجيل الحجز');
      }

      setCreateModalOpen(false);
      setCustomerName('');
      setPhone('');
      setDepositAmount(0);
      setNotes('');
      loadData();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleStatusChange = async (bookingId, newStatus) => {
    try {
      await authFetch(`/api/bookings/${bookingId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'confirmed':
        return <span className="badge badge-available">مؤكد</span>;
      case 'pending':
        return <span className="badge badge-reserved">معلق</span>;
      case 'completed':
        return <span className="badge badge-fixed">مكتمل</span>;
      case 'cancelled':
        return <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>ملغي</span>;
      case 'no_show':
        return <span className="badge" style={{ background: 'rgba(100, 116, 139, 0.2)', color: '#94a3b8' }}>لم يحضر</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900 }}>نظام الحجوزات والتقويم (Bookings Calendar)</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
            جدولة وتنظيم حجوزات الأجهزة والرومات مع نظام منع التعارض المزدوج التلقائي
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <input
            type="date"
            className="form-control"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{ width: 170, padding: '0.45rem 0.75rem' }}
          />
          <button
            className={`btn ${viewMode === 'day' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.85rem' }}
            onClick={() => setViewMode('day')}
          >
            عرض اليوم
          </button>
          <button
            className={`btn ${viewMode === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.85rem' }}
            onClick={() => setViewMode('all')}
          >
            جميع الحجوزات
          </button>
          <button className="btn btn-success" onClick={() => setCreateModalOpen(true)}>
            <Plus size={16} />
            حجز جديد
          </button>
        </div>
      </div>

      {/* Bookings List / Calendar Cards */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)' }}>جاري تحميل الحجوزات...</div>
      ) : bookings.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)' }}>
          <Calendar size={48} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
          <h3>لا توجد حجوزات مسجلة لهذا التاريخ</h3>
          <p style={{ marginTop: '0.35rem', fontSize: '0.9rem' }}>اضغط على "حجز جديد" لجدولة حجز لجهاز أو غرفة خاصة.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {bookings.map(b => (
            <div key={b.id} className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div>
                    <h4 style={{ fontSize: '1.15rem', fontWeight: 800 }}>{b.customer_name}</h4>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Phone size={12} /> {b.phone}
                    </span>
                  </div>
                  {getStatusBadge(b.status)}
                </div>

                <div style={{ background: 'var(--bg-surface-2)', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '0.85rem', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-dim)' }}>الجهاز:</span>
                    <span style={{ fontWeight: 800, color: '#60a5fa' }}>{b.device_name} {b.room_name ? `(${b.room_name})` : ''}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-dim)' }}>التاريخ والوقت:</span>
                    <span className="font-digits" style={{ fontWeight: 700 }}>
                      {b.booking_date} ({b.start_time} - {b.end_time})
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-dim)' }}>نمط اللعب:</span>
                    <span>{b.session_type === 'multi' ? 'Multiplayer (جماعي)' : 'Single (فردي)'}</span>
                  </div>
                  {b.deposit_amount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-dim)' }}>العربون المدفوع:</span>
                      <span className="font-digits" style={{ color: '#10b981', fontWeight: 800 }}>{b.deposit_amount} ج.م</span>
                    </div>
                  )}
                  {b.notes && (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '0.2rem' }}>
                      📝 {b.notes}
                    </div>
                  )}
                </div>
              </div>

              {/* Status Actions */}
              <div style={{ display: 'flex', gap: '0.45rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
                {b.status === 'confirmed' && (
                  <>
                    <button
                      className="btn btn-primary"
                      style={{ flex: 1, fontSize: '0.82rem', padding: '0.4rem' }}
                      onClick={() => handleStatusChange(b.id, 'completed')}
                    >
                      حضر (بدء الجلسة)
                    </button>
                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: '0.82rem', padding: '0.4rem 0.65rem' }}
                      onClick={() => handleStatusChange(b.id, 'no_show')}
                    >
                      لم يحضر
                    </button>
                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: '0.82rem', padding: '0.4rem 0.65rem' }}
                      onClick={() => handleStatusChange(b.id, 'cancelled')}
                    >
                      إلغاء
                    </button>
                  </>
                )}
                {b.status !== 'confirmed' && (
                  <button
                    className="btn btn-secondary"
                    style={{ flex: 1, fontSize: '0.82rem', padding: '0.4rem' }}
                    onClick={() => handleStatusChange(b.id, 'confirmed')}
                  >
                    إعادة تأكيد الحجز
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Booking Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="إنشاء حجز جديد"
        maxWidth="580px"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setCreateModalOpen(false)}>
              إلغاء
            </button>
            <button className="btn btn-success" onClick={handleCreateBooking}>
              <CheckCircle2 size={16} />
              تأكيد الحجز
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateBooking}>
          {errorMsg && (
            <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', border: '1px solid rgba(239, 68, 68, 0.3)', fontSize: '0.85rem' }}>
              {errorMsg}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">اسم العميل:</label>
              <input
                type="text"
                className="form-control"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">رقم الهاتف:</label>
              <input
                type="text"
                className="form-control"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">الجهاز المطلوب:</label>
            <select
              className="form-control"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              required
            >
              {devices.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name} (#{d.device_number}) - {d.group_name} {d.room_name ? `(${d.room_name})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.65rem', marginBottom: '1rem' }}>
            <div>
              <label className="form-label">التاريخ:</label>
              <input
                type="date"
                className="form-control"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="form-label">من الساعة:</label>
              <input
                type="time"
                className="form-control"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="form-label">إلى الساعة:</label>
              <input
                type="time"
                className="form-control"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <label className="form-label">نمط اللعب:</label>
              <select
                className="form-control"
                value={sessionType}
                onChange={(e) => setSessionType(e.target.value)}
              >
                <option value="single">Single (فردي)</option>
                <option value="multi">Multiplayer (جماعي)</option>
              </select>
            </div>
            <div>
              <label className="form-label">العربون (ج.م):</label>
              <input
                type="number"
                min="0"
                step="20"
                className="form-control"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">ملاحظات الحجز:</label>
            <input
              type="text"
              className="form-control"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: بطولة فيفا بين 4 أفراد، يفضل تحضير دراع إضافي..."
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
