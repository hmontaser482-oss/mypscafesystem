import React, { useState, useEffect } from 'react';
import {
  Clock, DollarSign, ArrowDownCircle, ArrowUpCircle, Plus,
  CheckCircle2, AlertTriangle, Printer, History
} from 'lucide-react';
import Modal from '../components/Modal';
import OpenShiftModal from '../components/OpenShiftModal';
import CloseShiftModal from '../components/CloseShiftModal';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function Shifts() {
  const { t, lang } = useLanguage();
  const { authFetch } = useAuth();

  const [activeShift, setActiveShift] = useState(null);
  const [shiftHistory, setShiftHistory] = useState([]);
  const [cashTransactions, setCashTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Cash Drawer Modal
  const [drawerModalOpen, setDrawerModalOpen] = useState(false);
  const [drawerType, setDrawerType] = useState('cash_in'); // 'cash_in', 'cash_out', 'petty_cash'
  const [drawerAmount, setDrawerAmount] = useState(100);
  const [drawerReason, setDrawerReason] = useState('');
  const [openShiftModalOpen, setOpenShiftModalOpen] = useState(false);
  const [closeShiftModalOpen, setCloseShiftModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = async () => {
    try {
      const [curRes, histRes, txRes] = await Promise.all([
        authFetch('/api/shifts/current'),
        authFetch('/api/shifts/history'),
        authFetch('/api/cash-drawer/transactions')
      ]);
      const [curData, histData, txData] = await Promise.all([curRes.json(), histRes.json(), txRes.json()]);

      if (curData.success) setActiveShift(curData.activeShift);
      if (histData.success) setShiftHistory(histData.shifts);
      if (txData.success) setCashTransactions(txData.transactions);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCashDrawerSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const res = await authFetch('/api/cash-drawer/transaction', {
        method: 'POST',
        body: JSON.stringify({
          type: drawerType,
          amount: Number(drawerAmount),
          reason: drawerReason
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);

      setDrawerModalOpen(false);
      setDrawerReason('');
      loadData();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900 }}>إدارة الشيفتات ودرج النقدية (Shifts & Cash Drawer)</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
            متابعة النقدية بالدرج لحظة بلحظة، إيداعات وسحوبات الدرج، وجرد الشيفتات وتقفيل الحسابات
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {activeShift ? (
            <>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setDrawerType('cash_in');
                  setDrawerAmount(100);
                  setDrawerReason('');
                  setDrawerModalOpen(true);
                }}
              >
                <Plus size={16} style={{ color: '#10b981' }} />
                حركة درج نقدية
              </button>
              <button className="btn btn-danger" onClick={() => setCloseShiftModalOpen(true)}>
                إغلاق وجرد الشيفت
              </button>
            </>
          ) : (
            <button className="btn btn-success" onClick={() => setOpenShiftModalOpen(true)}>
              فتح شيفت جديد الآن
            </button>
          )}
        </div>
      </div>

      {/* Active Shift Financial Card */}
      {activeShift ? (
        <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <span className="pulse-dot available" />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>الشيفت المفتوح حالياً ({activeShift.cashier_name})</h3>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>بدأ في: {activeShift.start_time?.slice(11, 16)}</span>
            </div>
            <span className="badge badge-available">جاري التشغيل</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
            <div style={{ background: 'var(--bg-surface-2)', padding: '0.9rem', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', display: 'block' }}>مبيعات الكاش</span>
              <span className="font-digits" style={{ fontSize: '1.35rem', fontWeight: 800, color: '#10b981' }}>+{activeShift.cash_sales} ج</span>
            </div>

            <div style={{ background: 'var(--bg-surface-2)', padding: '0.9rem', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', display: 'block' }}>مبيعات فيزا ومحافظ</span>
              <span className="font-digits" style={{ fontSize: '1.35rem', fontWeight: 800, color: '#60a5fa' }}>{activeShift.card_sales + activeShift.wallet_sales} ج</span>
            </div>

            <div style={{ background: 'var(--bg-surface-2)', padding: '0.9rem', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', display: 'block' }}>مصروفات من الدرج</span>
              <span className="font-digits" style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ef4444' }}>-{activeShift.total_expenses} ج</span>
            </div>

            <div style={{ background: 'var(--bg-surface-2)', padding: '0.9rem', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', display: 'block' }}>إيداعات إضافية (In)</span>
              <span className="font-digits" style={{ fontSize: '1.35rem', fontWeight: 800, color: '#10b981' }}>+{activeShift.cash_in} ج</span>
            </div>

            <div style={{ background: 'var(--bg-surface-2)', padding: '0.9rem', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', display: 'block' }}>سحوبات نقدية (Out)</span>
              <span className="font-digits" style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ef4444' }}>-{activeShift.cash_out} ج</span>
            </div>

            <div style={{ background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '0.9rem', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontSize: '0.78rem', color: '#60a5fa', fontWeight: 700, display: 'block' }}>النقدية المتوقعة بالدرج</span>
              <span className="font-digits" style={{ fontSize: '1.5rem', fontWeight: 900, color: '#60a5fa' }}>{activeShift.expected_cash} ج.م</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', marginBottom: '1.5rem' }}>
          <Clock size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
          <h3>لا يوجد شيفت مفتوح حالياً</h3>
          <p style={{ color: 'var(--text-dim)', marginTop: '0.25rem', marginBottom: '1rem' }}>
            يجب بدء شيفت بواسطة الكاشير لتسجيل العمليات والمبيعات ومتابعة حركة الدرج.
          </p>
          <button className="btn btn-success" onClick={() => setOpenShiftModalOpen(true)}>
            بدء شيفت جديد
          </button>
        </div>
      )}

      {/* Shifts History Table */}
      <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.75rem' }}>سجل الشيفتات السابقة</h3>
      <div className="glass-panel" style={{ overflowX: 'auto', marginBottom: '2rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: lang === 'ar' ? 'right' : 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
              <th style={{ padding: '0.75rem 1rem' }}>الكاشير</th>
              <th style={{ padding: '0.75rem 1rem' }}>تاريخ وبداية الشيفت</th>
              <th style={{ padding: '0.75rem 1rem' }}>نهاية الشيفت</th>
              <th style={{ padding: '0.75rem 1rem' }}>مبيعات الكاش</th>
              <th style={{ padding: '0.75rem 1rem' }}>المصروفات</th>
              <th style={{ padding: '0.75rem 1rem' }}>الكاش المتوقع</th>
              <th style={{ padding: '0.75rem 1rem' }}>الكاش الفعلي</th>
              <th style={{ padding: '0.75rem 1rem' }}>الفارق (عجز/زيادة)</th>
              <th style={{ padding: '0.75rem 1rem' }}>الحالة</th>
            </tr>
          </thead>
          <tbody>
            {shiftHistory.map(s => {
              const diff = s.cash_difference;
              return (
                <tr key={s.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', fontSize: '0.88rem' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 800 }}>{s.cashier_name}</td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-dim)' }}>{s.start_time?.slice(0, 16)}</td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-dim)' }}>{s.end_time ? s.end_time.slice(11, 16) : '-'}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#10b981' }} className="font-digits">+{s.cash_sales} ج</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#ef4444' }} className="font-digits">-{s.total_expenses} ج</td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 800 }} className="font-digits">{s.expected_cash} ج</td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 800, color: '#60a5fa' }} className="font-digits">
                    {s.actual_cash !== null ? `${s.actual_cash} ج` : '-'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    {diff !== null ? (
                      <span className="font-digits" style={{ fontWeight: 800, color: diff === 0 ? '#10b981' : diff > 0 ? '#60a5fa' : '#ef4444' }}>
                        {diff === 0 ? 'مطابق' : diff > 0 ? `+${diff} ج` : `${diff} ج`}
                      </span>
                    ) : '-'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span className={`badge ${s.status === 'open' ? 'badge-available' : 'badge-secondary'}`}>
                      {s.status === 'open' ? 'مفتوح' : 'مغلق'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Cash Drawer Movement Modal */}
      <Modal
        isOpen={drawerModalOpen}
        onClose={() => setDrawerModalOpen(false)}
        title="حركة نقدية في درج الكاشير"
        maxWidth="480px"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setDrawerModalOpen(false)}>إلغاء</button>
            <button className="btn btn-primary" onClick={handleCashDrawerSubmit}>تأكيد الحركة</button>
          </>
        }
      >
        <form onSubmit={handleCashDrawerSubmit}>
          {errorMsg && <div style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.85rem' }}>{errorMsg}</div>}
          <div className="form-group">
            <label className="form-label">نوع الحركة:</label>
            <select className="form-control" value={drawerType} onChange={(e) => setDrawerType(e.target.value)}>
              <option value="cash_in">💵 إيداع نقدية في الدرج (Cash In)</option>
              <option value="cash_out">💸 سحب نقدية من الدرج (Cash Out)</option>
              <option value="petty_cash">☕ نثريات ومصروف فوري (Petty Cash)</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">المبلغ (ج.م):</label>
            <input type="number" step="10" className="form-control" value={drawerAmount} onChange={(e) => setDrawerAmount(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">سبب الحركة:</label>
            <input type="text" className="form-control" placeholder="مثال: فكة إضافية، سحب للمدير، ضيافة..." value={drawerReason} onChange={(e) => setDrawerReason(e.target.value)} required />
          </div>
        </form>
      </Modal>

      {/* Modals */}
      <OpenShiftModal
        isOpen={openShiftModalOpen}
        onClose={() => setOpenShiftModalOpen(false)}
        onShiftOpened={() => loadData()}
      />

      <CloseShiftModal
        isOpen={closeShiftModalOpen}
        onClose={() => setCloseShiftModalOpen(false)}
        onShiftClosed={() => loadData()}
      />
    </div>
  );
}
