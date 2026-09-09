import React, { useState, useEffect } from 'react';
import {
  Coffee, Clock, ArrowRightLeft, Pause, Play, Plus, Trash2,
  Users, User, Check, ShieldAlert, Sparkles
} from 'lucide-react';
import Modal from './Modal';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

export default function InSessionModal({ isOpen, onClose, device, initialTab = 'orders', onActionSuccess }) {
  const { t, lang } = useLanguage();
  const { authFetch } = useAuth();

  const [activeTab, setActiveTab] = useState(initialTab);
  const [sessionDetails, setSessionDetails] = useState(null);
  const [productsList, setProductsList] = useState([]);
  const [availableDevices, setAvailableDevices] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [extraMinutes, setExtraMinutes] = useState(30);
  const [targetDeviceId, setTargetDeviceId] = useState('');
  const [transferReason, setTransferReason] = useState('طلب العميل');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const loadSessionData = async () => {
    const sId = device?.active_session_id || device?.activeSession?.id;
    if (!sId || sId === 'undefined') return;

    try {
      const res = await authFetch(`/api/sessions/${sId}`);
      const data = await res.json();
      if (data.success) {
        setSessionDetails(data.session);
      }

      // Load products catalog
      const prodRes = await authFetch('/api/products?activeOnly=true');
      const prodData = await prodRes.json();
      if (prodData.success) {
        setProductsList(prodData.products);
      }

      // Load available devices for transfer
      const devRes = await authFetch('/api/devices');
      const devData = await devRes.json();
      if (devData.success) {
        setAvailableDevices(devData.devices.filter(d => d.status === 'available' && d.id !== device.id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setSuccessMsg('');
      loadSessionData();
    }
  }, [isOpen, device]);

  if (!device) return null;
  const sId = device.active_session_id || device.activeSession?.id;

  // 1. Add product order
  const handleAddOrder = async (e) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await authFetch(`/api/sessions/${sId}/orders`, {
        method: 'POST',
        body: JSON.stringify({ productId: selectedProduct, quantity: orderQuantity })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setSuccessMsg('تمت إضافة الطلب للجلسة بنجاح');
      setSelectedProduct('');
      setOrderQuantity(1);
      await loadSessionData();
      if (onActionSuccess) onActionSuccess();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. Remove product order
  const handleRemoveOrder = async (orderId) => {
    if (!confirm('هل تريد حذف هذا الطلب وإعادة الكمية للمخزون؟')) return;
    setLoading(true);
    try {
      const res = await authFetch(`/api/sessions/${sId}/orders/${orderId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      await loadSessionData();
      if (onActionSuccess) onActionSuccess();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. Toggle Mode (Single <-> Multi)
  const handleToggleMode = async (newType) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await authFetch(`/api/sessions/${sId}/change-type`, {
        method: 'POST',
        body: JSON.stringify({ newType })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setSuccessMsg(data.message);
      await loadSessionData();
      if (onActionSuccess) onActionSuccess();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 4. Extend Time
  const handleExtend = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await authFetch(`/api/sessions/${sId}/extend`, {
        method: 'POST',
        body: JSON.stringify({ extraMinutes })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setSuccessMsg(data.message);
      await loadSessionData();
      if (onActionSuccess) onActionSuccess();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 5. Transfer Device
  const handleTransfer = async () => {
    if (!targetDeviceId) {
      setErrorMsg('يرجى اختيار الجهاز الجديد');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await authFetch(`/api/sessions/${sId}/transfer`, {
        method: 'POST',
        body: JSON.stringify({ targetDeviceId, reason: transferReason })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setSuccessMsg(data.message);
      if (onActionSuccess) onActionSuccess();
      setTimeout(() => onClose(), 1200);
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
      title={`التحكم بالجلسة: ${device.name} (${sessionDetails?.customer_name || 'العميل'})`}
      maxWidth="720px"
    >
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.4rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem', marginBottom: '1.25rem', overflowX: 'auto' }}>
        <button
          className={`btn ${activeTab === 'orders' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.85rem' }}
          onClick={() => setActiveTab('orders')}
        >
          <Coffee size={16} />
          الطلبات والمشروبات ({sessionDetails?.orders?.length || 0})
        </button>
        <button
          className={`btn ${activeTab === 'controls' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.85rem' }}
          onClick={() => setActiveTab('controls')}
        >
          <Clock size={16} />
          الوقت والنمط
        </button>
        <button
          className={`btn ${activeTab === 'transfer' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.85rem' }}
          onClick={() => setActiveTab('transfer')}
        >
          <ArrowRightLeft size={16} />
          نقل الجهاز
        </button>
        <button
          className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.85rem' }}
          onClick={() => setActiveTab('history')}
        >
          الفترات والتوقفات
        </button>
      </div>

      {errorMsg && (
        <div style={{ padding: '0.65rem', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', border: '1px solid rgba(239, 68, 68, 0.3)', fontSize: '0.85rem' }}>
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div style={{ padding: '0.65rem', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', border: '1px solid rgba(16, 185, 129, 0.3)', fontSize: '0.85rem' }}>
          {successMsg}
        </div>
      )}

      {/* TAB 1: ORDERS & DRINKS */}
      {activeTab === 'orders' && (
        <div>
          {/* Quick Add Form */}
          <form onSubmit={handleAddOrder} style={{ display: 'flex', gap: '0.65rem', marginBottom: '1.25rem' }}>
            <select
              className="form-control"
              style={{ flex: 2 }}
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
            >
              <option value="">-- اختر مشروب أو سناك لإضافته --</option>
              {productsList.map(p => (
                <option key={p.id} value={p.id} disabled={p.stock_quantity <= 0}>
                  {p.name} ({p.selling_price} ج.م) - المتوفر: {p.stock_quantity}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="1"
              max="20"
              className="form-control"
              style={{ width: 80 }}
              value={orderQuantity}
              onChange={(e) => setOrderQuantity(Number(e.target.value))}
            />
            <button type="submit" className="btn btn-success" disabled={loading || !selectedProduct}>
              <Plus size={16} />
              إضافة
            </button>
          </form>

          {/* Orders Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: lang === 'ar' ? 'right' : 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-dim)', fontSize: '0.82rem' }}>
                <th style={{ padding: '0.5rem' }}>المنتج</th>
                <th style={{ padding: '0.5rem' }}>الكمية</th>
                <th style={{ padding: '0.5rem' }}>السعر</th>
                <th style={{ padding: '0.5rem' }}>الإجمالي</th>
                <th style={{ padding: '0.5rem' }}>حذف</th>
              </tr>
            </thead>
            <tbody>
              {sessionDetails?.orders?.length > 0 ? (
                sessionDetails.orders.map(o => (
                  <tr key={o.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', fontSize: '0.88rem' }}>
                    <td style={{ padding: '0.65rem 0.5rem', fontWeight: 600 }}>{o.product_name}</td>
                    <td style={{ padding: '0.65rem 0.5rem' }} className="font-digits">{o.quantity}</td>
                    <td style={{ padding: '0.65rem 0.5rem' }} className="font-digits">{o.unit_price} ج</td>
                    <td style={{ padding: '0.65rem 0.5rem', color: '#60a5fa', fontWeight: 700 }} className="font-digits">{o.total_price} ج</td>
                    <td style={{ padding: '0.65rem 0.5rem' }}>
                      <button
                        className="btn btn-icon btn-secondary"
                        style={{ width: 28, height: 28 }}
                        onClick={() => handleRemoveOrder(o.id)}
                        title="إلغاء الطلب"
                      >
                        <Trash2 size={13} style={{ color: '#ef4444' }} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-dim)' }}>
                    لم يتم إضافة أي طلبات أو مشروبات لهذه الجلسة حتى الآن
                  </td>
                </tr>
              )}
            </tbody>
            {sessionDetails?.orders?.length > 0 && (
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--border-subtle)', fontWeight: 800 }}>
                  <td colSpan="3" style={{ padding: '0.75rem 0.5rem' }}>إجمالي حساب الطلبات:</td>
                  <td style={{ padding: '0.75rem 0.5rem', color: '#fbbf24' }} className="font-digits">
                    {sessionDetails.orders.reduce((acc, curr) => acc + curr.total_price, 0)} {t('currency')}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {/* TAB 2: TIME & MODE CONTROLS */}
      {activeTab === 'controls' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Toggle Single / Multi */}
          <div style={{ background: 'var(--bg-surface-2)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <label className="form-label" style={{ fontWeight: 800 }}>تبديل نمط اللعب (Single / Multiplayer)</label>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)', marginBottom: '0.75rem' }}>
              الوضع الحالي: <span style={{ color: '#60a5fa', fontWeight: 800 }}>{sessionDetails?.session_type === 'multi' ? 'Multiplayer' : 'Single'}</span>. التبديل سيحسب الفترة السابقة بسعرها ويبدأ فترة جديدة بالسعر الجديد بدقة.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                className={`btn ${sessionDetails?.session_type === 'single' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1 }}
                disabled={sessionDetails?.session_type === 'single' || loading}
                onClick={() => handleToggleMode('single')}
              >
                <User size={16} />
                تحويل إلى Single
              </button>
              <button
                className={`btn ${sessionDetails?.session_type === 'multi' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1 }}
                disabled={sessionDetails?.session_type === 'multi' || loading}
                onClick={() => handleToggleMode('multi')}
              >
                <Users size={16} />
                تحويل إلى Multiplayer
              </button>
            </div>
          </div>

          {/* Extend Time */}
          <div style={{ background: 'var(--bg-surface-2)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <label className="form-label" style={{ fontWeight: 800 }}>تمديد وقت الجلسة (Extend Time)</label>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
              {[15, 30, 60, 120].map(m => (
                <button
                  key={m}
                  type="button"
                  className={`btn ${extraMinutes === m ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.85rem' }}
                  onClick={() => setExtraMinutes(m)}
                >
                  +{m} دقيقة
                </button>
              ))}
            </div>
            <button className="btn btn-success" onClick={handleExtend} disabled={loading}>
              <Plus size={16} />
              تمديد الوقت بمقدار {extraMinutes} دقيقة إضافية
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: TRANSFER CONSOLE */}
      {activeTab === 'transfer' && (
        <div style={{ background: 'var(--bg-surface-2)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <label className="form-label" style={{ fontWeight: 800 }}>نقل الجلسة لجهاز آخر متاح</label>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)', marginBottom: '1rem' }}>
            سيتم نقل وقت البداية، والمدة التي لُعبت، وجميع المشروبات والطلبات والعميل إلى الجهاز الجديد، وسيتحول هذا الجهاز إلى Available فوراً.
          </p>

          <div className="form-group">
            <label className="form-label">اختر الجهاز الجديد:</label>
            <select
              className="form-control"
              value={targetDeviceId}
              onChange={(e) => setTargetDeviceId(e.target.value)}
            >
              <option value="">-- اختر جهازاً متاحاً بالصالة --</option>
              {availableDevices.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name} (#{d.device_number}) - {d.group_name} {d.room_name ? `(${d.room_name})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">سبب النقل:</label>
            <input
              type="text"
              className="form-control"
              value={transferReason}
              onChange={(e) => setTransferReason(e.target.value)}
              placeholder="مثال: عطل في الشاشة، رغبة العميل في الجلوس مع أصدقائه..."
            />
          </div>

          <button className="btn btn-primary" onClick={handleTransfer} disabled={loading || !targetDeviceId}>
            <ArrowRightLeft size={16} />
            تأكيد نقل الجلسة الآن
          </button>
        </div>
      )}

      {/* TAB 4: INTERVALS & PAUSES */}
      {activeTab === 'history' && (
        <div>
          <h4 style={{ fontSize: '0.92rem', fontWeight: 800, marginBottom: '0.5rem', color: '#60a5fa' }}>فترات اللعب (Single / Multi Intervals):</h4>
          <div style={{ marginBottom: '1.25rem' }}>
            {sessionDetails?.intervals?.map((inv, idx) => (
              <div key={inv.id || idx} style={{ padding: '0.5rem 0.75rem', background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-sm)', marginBottom: '0.35rem', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between' }}>
                <span>{inv.session_type === 'multi' ? '👥 Multiplayer' : '👤 Single'} ({inv.hourly_rate} ج/س)</span>
                <span className="font-digits" style={{ color: 'var(--text-dim)' }}>
                  من: {inv.start_time?.slice(11, 19)} {inv.end_time ? `إلى: ${inv.end_time?.slice(11, 19)}` : '(نشط حالياً)'}
                </span>
              </div>
            ))}
          </div>

          <h4 style={{ fontSize: '0.92rem', fontWeight: 800, marginBottom: '0.5rem', color: '#f59e0b' }}>فترات الإيقاف المؤقت (Pauses):</h4>
          <div>
            {sessionDetails?.pauses?.length > 0 ? (
              sessionDetails.pauses.map((p, idx) => (
                <div key={p.id || idx} style={{ padding: '0.5rem 0.75rem', background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-sm)', marginBottom: '0.35rem', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>⏸️ {p.reason || 'إيقاف مؤقت'}</span>
                  <span className="font-digits" style={{ color: 'var(--text-dim)' }}>
                    المدة: {Math.floor((p.pause_duration_seconds || 0) / 60)} دقيقة
                  </span>
                </div>
              ))
            ) : (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>لم يتم إيقاف هذه الجلسة مؤقتاً.</p>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
