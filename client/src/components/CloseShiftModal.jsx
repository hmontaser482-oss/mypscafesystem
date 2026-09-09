import React, { useState, useEffect } from 'react';
import { Clock, DollarSign, AlertTriangle, Printer, CheckCircle2 } from 'lucide-react';
import Modal from './Modal';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

export default function CloseShiftModal({ isOpen, onClose, onShiftClosed }) {
  const { t } = useLanguage();
  const { authFetch, activeShift } = useAuth();

  const [currentShiftData, setCurrentShiftData] = useState(null);
  const [actualCash, setActualCash] = useState('');
  const [notes, setNotes] = useState('');
  const [warningMsg, setWarningMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [shiftReport, setShiftReport] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setWarningMsg('');
      setShiftReport(null);
      authFetch('/api/shifts/current')
        .then(res => res.json())
        .then(d => {
          if (d.success && d.activeShift) {
            setCurrentShiftData(d.activeShift);
            setActualCash(String(d.activeShift.expected_cash));
          }
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const expected = currentShiftData?.expected_cash || 0;
  const counted = Number(actualCash) || 0;
  const difference = Math.round((counted - expected) * 100) / 100;

  const handleCloseShift = async () => {
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await authFetch('/api/shifts/close', {
        method: 'POST',
        body: JSON.stringify({
          actualCash: counted,
          notes
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'فشل إغلاق الشيفت');
      }

      setShiftReport(data.shiftReport);
      if (onShiftClosed) onShiftClosed(data.shiftReport);
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
      title={shiftReport ? 'تقرير إغلاق الشيفت (Shift Summary)' : t('closeShift')}
      maxWidth="560px"
      footer={
        shiftReport ? (
          <>
            <button className="btn btn-secondary" onClick={onClose}>
              إغلاق
            </button>
            <button className="btn btn-primary" onClick={() => window.print()}>
              <Printer size={16} />
              طباعة تقرير الشيفت
            </button>
          </>
        ) : (
          <>
            <button className="btn btn-secondary" onClick={onClose} disabled={loading}>
              {t('cancel')}
            </button>
            <button className="btn btn-danger" onClick={() => handleCloseShift(false)} disabled={loading}>
              {loading ? 'جاري الإغلاق...' : 'تأكيد إغلاق الشيفت وجرد الدرج'}
            </button>
          </>
        )
      }
    >
      {shiftReport ? (
        <div style={{ textAlign: 'center' }}>
          <div style={{ padding: '0.75rem', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontWeight: 800 }}>
            تم إغلاق الشيفت بنجاح!
          </div>

          <div className="printable-area thermal-receipt-preview">
            <div className="receipt-header">
              <div className="receipt-title">تقرير إغلاق الشيفت</div>
              <div>الكاشير: {shiftReport.cashier_name}</div>
              <div style={{ fontSize: '11px' }}>من: {shiftReport.start_time?.slice(11, 16)} إلى: {shiftReport.end_time?.slice(11, 16)}</div>
            </div>

            <div className="receipt-row">
              <span>مبيعات الكاش:</span>
              <span>{shiftReport.cash_sales} ج.م</span>
            </div>
            <div className="receipt-row">
              <span>مبيعات الفيزا / إلكتروني:</span>
              <span>{shiftReport.card_sales + shiftReport.wallet_sales} ج.م</span>
            </div>
            <div className="receipt-row">
              <span>المصروفات من الدرج:</span>
              <span>-{shiftReport.total_expenses} ج.م</span>
            </div>

            <div className="receipt-double-divider" />

            <div className="receipt-row bold">
              <span>الكاش المتوقع:</span>
              <span>{shiftReport.expected_cash} ج.م</span>
            </div>
            <div className="receipt-row bold">
              <span>الكاش الفعلي المحسوب:</span>
              <span>{shiftReport.actual_cash} ج.م</span>
            </div>

            <div className="receipt-row bold" style={{ color: shiftReport.cash_difference < 0 ? '#ef4444' : '#10b981', fontSize: '14px', marginTop: '6px' }}>
              <span>الفارق (عجز / زيادة):</span>
              <span>{shiftReport.cash_difference > 0 ? `+${shiftReport.cash_difference}` : shiftReport.cash_difference} ج.م</span>
            </div>
          </div>
        </div>
      ) : (
        <div>
          {currentShiftData?.activeSessionsCount > 0 && (
            <div style={{ padding: '0.75rem 1rem', background: 'rgba(59, 130, 246, 0.12)', color: '#60a5fa', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', border: '1px solid rgba(59, 130, 246, 0.25)', fontSize: '0.85rem' }}>
              💡 <strong>ملاحظة:</strong> يوجد عدد ({currentShiftData.activeSessionsCount}) أجهزة قيد التشغيل حالياً، وستستمر في العمل تلقائياً وترحيلها للشيفت القادم.
            </div>
          )}

          {errorMsg && (
            <div style={{ padding: '0.65rem', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', border: '1px solid rgba(239, 68, 68, 0.3)', fontSize: '0.85rem' }}>
              {errorMsg}
            </div>
          )}

          {/* Shift Financials Summary Box */}
          <div style={{ background: 'var(--bg-surface-2)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', border: '1px solid var(--border-subtle)', fontSize: '0.9rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>الكاشير:</span>
              <span style={{ fontWeight: 800 }}>{currentShiftData?.cashier_name}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>{t('cashSales')}:</span>
              <span className="font-digits" style={{ fontWeight: 800, color: '#10b981' }}>+{currentShiftData?.cash_sales} {t('currency')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>{t('totalExpenses')}:</span>
              <span className="font-digits" style={{ fontWeight: 800, color: '#ef4444' }}>-{currentShiftData?.total_expenses} {t('currency')}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.65rem', borderTop: '1px solid var(--border-subtle)', fontSize: '1.1rem', fontWeight: 800 }}>
              <span>{t('expectedCash')}:</span>
              <span className="font-digits" style={{ color: '#60a5fa' }}>{expected} {t('currency')}</span>
            </div>
          </div>

          {/* Cashier Count Input */}
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 800 }}>
              النقدية الفعلية بعد الجرد في الدرج (Counted Cash):
            </label>
            <input
              type="number"
              className="form-control"
              style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fbbf24' }}
              value={actualCash}
              onChange={(e) => setActualCash(e.target.value)}
              placeholder="0.00"
            />
          </div>

          {/* Difference Indicator */}
          <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: difference === 0 ? 'rgba(16, 185, 129, 0.15)' : difference > 0 ? 'rgba(59, 130, 246, 0.15)' : 'rgba(239, 68, 68, 0.15)', border: `1px solid ${difference === 0 ? 'rgba(16, 185, 129, 0.3)' : difference > 0 ? 'rgba(59, 130, 246, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 800, marginBottom: '1rem' }}>
            <span>الفارق المحسوب:</span>
            <span className="font-digits" style={{ fontSize: '1.2rem', color: difference === 0 ? '#10b981' : difference > 0 ? '#60a5fa' : '#ef4444' }}>
              {difference === 0 ? 'مطابق تماماً (0 ج.م)' : difference > 0 ? `زيادة (+${difference} ج.م)` : `عجز (${difference} ج.م)`}
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">ملاحظات تقفيل الشيفت:</label>
            <input
              type="text"
              className="form-control"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي ملاحظات حول العجز أو العمليات..."
            />
          </div>
        </div>
      )}
    </Modal>
  );
}
