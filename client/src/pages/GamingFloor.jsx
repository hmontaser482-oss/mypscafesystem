import React, { useState, useEffect } from 'react';
import {
  Gamepad2, Play, Plus, RefreshCw, Filter, Sparkles, Monitor, Users, Clock, AlertTriangle
} from 'lucide-react';
import DeviceCard from '../components/DeviceCard';
import StartSessionModal from '../components/StartSessionModal';
import InSessionModal from '../components/InSessionModal';
import CheckoutModal from '../components/CheckoutModal';
import OpenShiftModal from '../components/OpenShiftModal';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useSocket } from '../context/SocketContext';

export default function GamingFloor({ globalSearchQuery }) {
  const { t, lang } = useLanguage();
  const { authFetch, activeShift, checkActiveShift } = useAuth();
  const { socket } = useSocket();

  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'available', 'running', 'vip', 'ps5', 'ps4'

  // Modals state
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [startModalOpen, setStartModalOpen] = useState(false);
  const [openShiftModalOpen, setOpenShiftModalOpen] = useState(false);
  const [inSessionModalOpen, setInSessionModalOpen] = useState(false);
  const [inSessionInitialTab, setInSessionInitialTab] = useState('orders');
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);

  const fetchDevices = async () => {
    try {
      const res = await authFetch('/api/devices');
      const data = await res.json();
      if (data.success) {
        setDevices(data.devices);
      }
    } catch (err) {
      console.error('Failed to fetch devices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  // Listen for real-time socket updates
  useEffect(() => {
    if (!socket) return;

    const handleDeviceUpdated = () => fetchDevices();
    const handleSessionStarted = () => fetchDevices();
    const handleSessionEnded = () => fetchDevices();
    const handleSessionTransferred = () => fetchDevices();

    socket.on('device:updated', handleDeviceUpdated);
    socket.on('session:started', handleSessionStarted);
    socket.on('session:ended', handleSessionEnded);
    socket.on('session:transferred', handleSessionTransferred);

    return () => {
      socket.off('device:updated', handleDeviceUpdated);
      socket.off('session:started', handleSessionStarted);
      socket.off('session:ended', handleSessionEnded);
      socket.off('session:transferred', handleSessionTransferred);
    };
  }, [socket]);

  // Actions
  const handleOpenStart = (dev) => {
    if (!activeShift) {
      setOpenShiftModalOpen(true);
      return;
    }
    setSelectedDevice(dev);
    setStartModalOpen(true);
  };

  const handleOpenInSession = (dev, session, tab = 'orders') => {
    setSelectedDevice(dev);
    setInSessionInitialTab(tab);
    setInSessionModalOpen(true);
  };

  const handleOpenCheckout = (dev) => {
    setSelectedDevice(dev);
    setCheckoutModalOpen(true);
  };

  const handlePauseResume = async (session) => {
    if (!session) return;
    const isRunning = session.status === 'running';
    const action = isRunning ? 'pause' : 'resume';
    try {
      await authFetch(`/api/sessions/${session.id}/${action}`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'إيقاف سريع من شاشة الصالة' })
      });
      fetchDevices();
    } catch (err) {
      console.error(err);
    }
  };

  const handleReceiveMaintenance = async (dev) => {
    if (!confirm(`هل تم استلام الجهاز (${dev.name}) من الصيانة وتريد إعادته للعمل الآن كـ Available؟`)) return;
    try {
      const res = await authFetch(`/api/devices/${dev.id}/set-status`, {
        method: 'POST',
        body: JSON.stringify({ status: 'available' })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.message || 'فشل استلام الجهاز');
        return;
      }
      fetchDevices();
    } catch (err) {
      console.error(err);
      alert('فشل الاتصال بالخادم');
    }
  };

  // Filter & Search
  const filteredDevices = devices.filter(d => {
    // Global search query
    if (globalSearchQuery) {
      const q = globalSearchQuery.toLowerCase();
      const matchName = d.name?.toLowerCase().includes(q);
      const matchCust = d.activeSession?.customerName?.toLowerCase().includes(q);
      const matchGroup = d.group_name?.toLowerCase().includes(q);
      const matchRoom = d.room_name?.toLowerCase().includes(q);
      if (!matchName && !matchCust && !matchGroup && !matchRoom) return false;
    }

    if (filterStatus === 'available') return d.status === 'available';
    if (filterStatus === 'running') return d.status === 'running' || d.status === 'paused' || d.status === 'time_expired';
    if (filterStatus === 'vip') return d.room_is_vip;
    if (filterStatus === 'ps5') return d.device_type === 'PS5';
    if (filterStatus === 'ps4') return d.device_type === 'PS4';
    return true;
  });

  // Summary counts
  const totalCount = devices.length;
  const availableCount = devices.filter(d => d.status === 'available').length;
  const runningCount = devices.filter(d => d.status === 'running' || d.status === 'paused' || d.status === 'time_expired').length;

  return (
    <div>
      {/* Shift Required Alert Banner */}
      {!activeShift && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(245, 158, 11, 0.15))',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 'var(--radius-md)',
          padding: '0.85rem 1.25rem',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Clock size={22} style={{ color: '#ef4444' }} />
            <div>
              <strong style={{ color: '#ef4444', display: 'block' }}>لا يوجد شيفت مفتوح حالياً للكاشير</strong>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>
                يجب فتح الشيفت أولاً لتتمكن من تشغيل الأجهزة وتسجيل الجلسات والمبيعات.
              </span>
            </div>
          </div>
          <button className="btn btn-success" onClick={() => setOpenShiftModalOpen(true)}>
            بدء الشيفت الآن
          </button>
        </div>
      )}

      {/* Gaming Floor Header & Filter Chips */}
      <div className="gaming-floor-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 900 }}>{t('gamingFloor')}</h2>
            <button
              className="btn btn-icon btn-secondary"
              onClick={fetchDevices}
              title="تحديث البيانات"
              style={{ width: 32, height: 32 }}
            >
              <RefreshCw size={14} />
            </button>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
            مراقبة وتشغيل أجهزة الصالة بالوقت الحقيقي ({availableCount} متاح / {runningCount} مشغول من إجمالي {totalCount} جهاز)
          </p>
        </div>

        {/* Filter Chips */}
        <div className="filter-bar">
          <button
            className={`filter-chip ${filterStatus === 'all' ? 'active' : ''}`}
            onClick={() => setFilterStatus('all')}
          >
            الكل ({totalCount})
          </button>
          <button
            className={`filter-chip ${filterStatus === 'available' ? 'active' : ''}`}
            onClick={() => setFilterStatus('available')}
          >
            🟢 المتاح ({availableCount})
          </button>
          <button
            className={`filter-chip ${filterStatus === 'running' ? 'active' : ''}`}
            onClick={() => setFilterStatus('running')}
          >
            🔴 قيد التشغيل ({runningCount})
          </button>
          <button
            className={`filter-chip ${filterStatus === 'vip' ? 'active' : ''}`}
            onClick={() => setFilterStatus('vip')}
          >
            ✨ غرف VIP
          </button>
          <button
            className={`filter-chip ${filterStatus === 'ps5' ? 'active' : ''}`}
            onClick={() => setFilterStatus('ps5')}
          >
            PS5
          </button>
          <button
            className={`filter-chip ${filterStatus === 'ps4' ? 'active' : ''}`}
            onClick={() => setFilterStatus('ps4')}
          >
            PS4
          </button>
        </div>
      </div>

      {/* Devices Grid */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)' }}>
          جاري تحميل بيانات أجهزة الصالة...
        </div>
      ) : filteredDevices.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)' }}>
          لا توجد أجهزة مطابقة للفلتر المحدد
        </div>
      ) : (
        <div className="devices-grid">
          {filteredDevices.map(dev => (
            <DeviceCard
              key={dev.id}
              device={dev}
              onStartSession={handleOpenStart}
              onOpenInSessionModal={handleOpenInSession}
              onCheckoutSession={handleOpenCheckout}
              onPauseResume={handlePauseResume}
              onReceiveMaintenance={handleReceiveMaintenance}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <StartSessionModal
        isOpen={startModalOpen}
        onClose={() => setStartModalOpen(false)}
        device={selectedDevice}
        onSessionStarted={() => fetchDevices()}
      />

      <InSessionModal
        isOpen={inSessionModalOpen}
        onClose={() => setInSessionModalOpen(false)}
        device={selectedDevice}
        initialTab={inSessionInitialTab}
        onActionSuccess={() => fetchDevices()}
      />

      <CheckoutModal
        isOpen={checkoutModalOpen}
        onClose={() => setCheckoutModalOpen(false)}
        device={selectedDevice}
        onCheckoutComplete={() => fetchDevices()}
      />

      <OpenShiftModal
        isOpen={openShiftModalOpen}
        onClose={() => setOpenShiftModalOpen(false)}
        onShiftOpened={() => {
          checkActiveShift();
          fetchDevices();
        }}
      />
    </div>
  );
}
