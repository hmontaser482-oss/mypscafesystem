import React, { useState, useEffect } from 'react';
import {
  Receipt, DollarSign, Printer, CreditCard, Wallet, Users,
  CheckCircle2, AlertCircle, Sparkles, Percent
} from 'lucide-react';
import Modal from './Modal';
import ThermalReceipt from './ThermalReceipt';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

export default function CheckoutModal({ isOpen, onClose, device, onCheckoutComplete }) {
  const { t, lang } = useLanguage();
  const { authFetch } = useAuth();

  const [calculation, setCalculation] = useState(null);
  const [sessionData, setSessionData] = useState(null);
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash', 'card', 'wallet', 'split', 'credit'
  const [splitCount, setSplitCount] = useState(2);
  const [discountType, setDiscountType] = useState('fixed'); // 'fixed', 'percent'
  const [discountValue, setDiscountValue] = useState(0);
  const [discountReason, setDiscountReason] = useState('');
  const [completedInvoice, setCompletedInvoice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const sId = device?.active_session_id || device?.activeSession?.id;

  // Fetch authoritative calculation from backend when modal opens
  useEffect(() => {
    if (isOpen && sId && sId !== 'undefined') {
      setErrorMsg('');
      setCompletedInvoice(null);
      setPaidAmount('');
      setDiscountValue(0);

      authFetch(`/api/sessions/${sId}`)
        .then(res => res.json())
        .then(d => {
          if (d.success) {
            setSessionData(d.session);
          }
        });

      authFetch(`/api/sessions/${sId}/calculate`, { method: 'POST' })
        .then(res => res.json())
        .then(d => {
          if (d.success) {
            setCalculation(d.calculation);
            setPaidAmount(String(d.calculation.grandTotal));
          }
        });
    }
  }, [isOpen, sId]);

  if (!device || !isOpen) return null;

  const gamingCost = calculation?.gamingCost || 0;
  const productsCost = calculation?.productsCost || 0;
  const subtotal = gamingCost + productsCost;

  let computedDiscount = Number(discountValue) || 0;
  if (discountType === 'percent') {
    computedDiscount = Math.round((subtotal * (computedDiscount / 100)) * 100) / 100;
  }
  const grandTotal = Math.max(0, Math.round((subtotal - computedDiscount) * 100) / 100);

  const numPaid = Number(paidAmount) || 0;
  const changeDue = Math.max(0, Math.round((numPaid - grandTotal) * 100) / 100);
  const remainingDue = Math.max(0, Math.round((grandTotal - numPaid) * 100) / 100);

  // Split bill per person
  const perPersonCost = Math.round((grandTotal / Math.max(1, splitCount)) * 100) / 100;

  // Format Duration string
  const totalSec = calculation?.totalPlayedSeconds || 0;
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);

  const handleFinishCheckout = async () => {
    setLoading(true);
    setErrorMsg('');

    try {
      // Fix: Round both values to 2 decimal places before comparison to avoid floating point errors
      const roundedPaid = Math.round(numPaid * 100) / 100;
      const roundedTotal = Math.round(grandTotal * 100) / 100;
      
      if (roundedPaid < roundedTotal && paymentMethod !== 'credit') {
        throw new Error(`المبلغ المدفوع (${roundedPaid} ج.م) أقل من المطلوب (${roundedTotal} ج.م). يرجى سداد المبلغ كاملاً أو اختيار الدفع الآجل.`);
      }

      const res = await authFetch(`/api/sessions/${sId}/checkout`, {
        method: 'POST',
        body: JSON.stringify({
          paidAmount: roundedPaid,
          paymentMethod,
          discountAmount: computedDiscount,
          discountType,
          discountReason,
          splitDetails: paymentMethod === 'split' ? { splitCount, perPersonCost } : null
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'فشل إنهاء الجلسة');
      }

      setCompletedInvoice(data.invoice);
      if (onCheckoutComplete) onCheckoutComplete(data.invoice);
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
      title={completedInvoice ? `فاتورة رقم: ${completedInvoice.invoice_number}` : `إنهاء ومحاسبة: ${device.name}`}
      maxWidth={completedInvoice ? '480px' : '720px'}
      footer={
        completedInvoice ? (
          <>
            <button className="btn btn-secondary" onClick={onClose}>
              إغلاق
            </button>
            <button
              className="btn btn-primary"
              onClick={() => window.print()}
            >
              <Printer size={16} />
              طباعة إيصال 80mm
            </button>
          </>
        ) : (
          <>
            <button className="btn btn-secondary" onClick={onClose} disabled={loading}>
              {t('cancel')}
            </button>
            <button className="btn btn-danger" onClick={handleFinishCheckout} disabled={loading}>
              <CheckCircle2 size={16} />
              {loading ? 'جاري المحاسبة...' : t('confirmCheckout')}
            </button>
          </>
        )
      }
    >
      {completedInvoice ? (
        <div style={{ textAlign: 'center' }}>
          <div style={{ padding: '0.75rem', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', fontWeight: 800 }}>
            🎉 تم إنهاء الجلسة وإصدار الفاتورة بنجاح، وأصبح الجهاز متاحاً (Available) الآن!
          </div>
          <ThermalReceipt invoice={completedInvoice} />
        </div>
      ) : (
        <div>
          {errorMsg && (
            <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', border: '1px solid rgba(239, 68, 68, 0.3)', fontSize: '0.88rem' }}>
              {errorMsg}
            </div>
          )}

          {/* Customer & Console Header Summary */}
          <div style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--bg-surface-2)', padding: '0.85rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.88rem' }}>
            <div>
              <span style={{ color: 'var(--text-dim)' }}>العميل: </span>
              <span style={{ fontWeight: 800 }}>{sessionData?.customer_name || 'زائر عادي'}</span>
            </div>
            <div>
              <span style={{ color: 'var(--text-dim)' }}>الجهاز: </span>
              <span style={{ fontWeight: 800 }}>{device.name} ({device.group_name})</span>
            </div>
            <div>
              <span style={{ color: 'var(--text-dim)' }}>مدة اللعب: </span>
              <span className="font-digits" style={{ fontWeight: 800, color: '#60a5fa' }}>{hours} س و {minutes} د</span>
            </div>
          </div>

          {/* Cost Breakdown Box */}
          <div style={{ background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1.25rem', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.92rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>حساب وقت اللعب:</span>
              <span className="font-digits" style={{ fontWeight: 800 }}>{gamingCost} {t('currency')}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.92rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>حساب الطلبات والكافيه ({sessionData?.orders?.length || 0} طلب):</span>
              <span className="font-digits" style={{ fontWeight: 800 }}>{productsCost} {t('currency')}</span>
            </div>

            {/* Orders preview pill list */}
            {sessionData?.orders?.length > 0 && (
              <div style={{ margin: '0.45rem 0', padding: '0.5rem', background: 'var(--bg-surface-3)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                {sessionData.orders.map(o => `${o.quantity}× ${o.product_name}`).join(' • ')}
              </div>
            )}

            {/* Discount Row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0.75rem 0', paddingTop: '0.5rem', borderTop: '1px dashed var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>الخصم:</span>
                <select
                  className="form-control"
                  style={{ width: 85, padding: '0.3rem 0.5rem', fontSize: '0.82rem' }}
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value)}
                >
                  <option value="fixed">مبلغ (ج)</option>
                  <option value="percent">نسبة (%)</option>
                </select>
                <input
                  type="number"
                  min="0"
                  className="form-control"
                  style={{ width: 80, padding: '0.3rem 0.5rem', fontSize: '0.82rem' }}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(Number(e.target.value))}
                />
              </div>
              <input
                type="text"
                className="form-control"
                style={{ width: 160, padding: '0.3rem 0.5rem', fontSize: '0.82rem' }}
                placeholder="سبب الخصم (اختياري)..."
                value={discountReason}
                onChange={(e) => setDiscountReason(e.target.value)}
              />
            </div>

            {/* Grand Total */}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '2px solid var(--border-subtle)', fontSize: '1.25rem', fontWeight: 900 }}>
              <span>{t('grandTotal')}:</span>
              <span className="font-digits" style={{ color: '#fbbf24' }}>{grandTotal} {t('currency')}</span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="form-group">
            <label className="form-label">{t('paymentMethod')}</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <button
                type="button"
                className={`btn ${paymentMethod === 'cash' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.82rem', padding: '0.5rem' }}
                onClick={() => setPaymentMethod('cash')}
              >
                <DollarSign size={15} />
                {t('cash')}
              </button>
              <button
                type="button"
                className={`btn ${paymentMethod === 'card' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.82rem', padding: '0.5rem' }}
                onClick={() => setPaymentMethod('card')}
              >
                <CreditCard size={15} />
                {t('card')}
              </button>
              <button
                type="button"
                className={`btn ${paymentMethod === 'wallet' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.82rem', padding: '0.5rem' }}
                onClick={() => setPaymentMethod('wallet')}
              >
                <Wallet size={15} />
                محفظة / إنستاباي
              </button>
              <button
                type="button"
                className={`btn ${paymentMethod === 'split' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.82rem', padding: '0.5rem' }}
                onClick={() => setPaymentMethod('split')}
              >
                <Users size={15} />
                {t('splitPayment')}
              </button>
            </div>

            {/* Split Bill controls */}
            {paymentMethod === 'split' && (
              <div style={{ padding: '0.75rem', background: 'rgba(139, 92, 246, 0.12)', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: 'var(--radius-sm)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem' }}>تقسيم على عدد أفراد:</span>
                  <input
                    type="number"
                    min="2"
                    max="10"
                    className="form-control"
                    style={{ width: 70, padding: '0.3rem' }}
                    value={splitCount}
                    onChange={(e) => setSplitCount(Math.max(2, Number(e.target.value)))}
                  />
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#c084fc' }}>
                  حصة الفرد: <span className="font-digits">{perPersonCost}</span> {t('currency')}
                </div>
              </div>
            )}
          </div>

          {/* Paid Amount and Change Calculation */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'var(--bg-surface-2)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div>
              <label className="form-label" style={{ fontWeight: 800 }}>المبلغ المدفوع (Paid):</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  step="5"
                  className="form-control"
                  style={{ fontSize: '1.25rem', fontWeight: 800, color: '#60a5fa' }}
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="form-label" style={{ fontWeight: 800 }}>
                {remainingDue > 0 ? 'المتبقي على العميل (آجل):' : 'الباقي للعميل (Change):'}
              </label>
              <div
                style={{
                  height: 48,
                  borderRadius: 'var(--radius-md)',
                  background: remainingDue > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                  border: `1px solid ${remainingDue > 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 1rem',
                  fontSize: '1.35rem',
                  fontWeight: 900,
                  fontFamily: 'var(--font-digits)',
                  color: remainingDue > 0 ? '#ef4444' : '#10b981'
                }}
              >
                {remainingDue > 0 ? `${remainingDue} ${t('currency')}` : `${changeDue} ${t('currency')}`}
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
