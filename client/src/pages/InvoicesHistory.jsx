import React, { useState, useEffect } from 'react';
import {
  Receipt, Search, Printer, RotateCcw, Eye, Filter, CheckCircle2,
  AlertCircle, DollarSign, Calendar
} from 'lucide-react';
import Modal from '../components/Modal';
import ThermalReceipt from '../components/ThermalReceipt';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function InvoicesHistory() {
  const { t, lang } = useLanguage();
  const { authFetch } = useAuth();

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const loadInvoices = async () => {
    try {
      let query = '/api/invoices?limit=50';
      if (startDate) query += `&startDate=${startDate}`;
      if (endDate) query += `&endDate=${endDate}`;
      if (search) query += `&search=${encodeURIComponent(search)}`;
      if (statusFilter) query += `&paymentStatus=${statusFilter}`;

      const res = await authFetch(query);
      const data = await res.json();
      if (data.success) {
        setInvoices(data.invoices);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [startDate, endDate, statusFilter]);

  const handleViewReceipt = async (inv) => {
    try {
      const res = await authFetch(`/api/invoices/${inv.id}`);
      const data = await res.json();
      if (data.success) {
        setSelectedInvoice(data.invoice);
        setReceiptModalOpen(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleProcessRefund = async (e) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    setErrorMsg('');
    try {
      const res = await authFetch(`/api/invoices/${selectedInvoice.id}/refund`, {
        method: 'POST',
        body: JSON.stringify({
          reason: refundReason,
          refundAmount: Number(refundAmount)
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);

      setRefundModalOpen(false);
      loadInvoices();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900 }}>سجل الفواتير والمبيعات (Invoices)</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
            أرشيف كامل لجميع الفواتير مع إمكانية إعادة الطباعة، الاسترجاع، والبحث التفصيلي
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          className="form-control"
          placeholder="بحث برقم الفاتورة، العميل، أو الجهاز..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && loadInvoices()}
          style={{ maxWidth: 280 }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>من:</span>
          <input
            type="date"
            className="form-control"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{ width: 145 }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>إلى:</span>
          <input
            type="date"
            className="form-control"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{ width: 145 }}
          />
        </div>

        <select
          className="form-control"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ width: 140 }}
        >
          <option value="">جميع الحالات</option>
          <option value="paid">مدفوع بالكامل</option>
          <option value="partial">مدفوع جزئياً (آجل)</option>
          <option value="refunded">مسترجع (Refunded)</option>
        </select>

        <button className="btn btn-primary" onClick={loadInvoices}>
          <Search size={15} />
          بحث
        </button>
      </div>

      {/* Invoices Table */}
      <div className="glass-panel" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: lang === 'ar' ? 'right' : 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
              <th style={{ padding: '0.75rem 1rem' }}>رقم الفاتورة</th>
              <th style={{ padding: '0.75rem 1rem' }}>التاريخ والوقت</th>
              <th style={{ padding: '0.75rem 1rem' }}>العميل</th>
              <th style={{ padding: '0.75rem 1rem' }}>الجهاز / الصالة</th>
              <th style={{ padding: '0.75rem 1rem' }}>حساب اللعب</th>
              <th style={{ padding: '0.75rem 1rem' }}>حساب الكافيه</th>
              <th style={{ padding: '0.75rem 1rem' }}>الإجمالي</th>
              <th style={{ padding: '0.75rem 1rem' }}>طريقة الدفع</th>
              <th style={{ padding: '0.75rem 1rem' }}>الحالة</th>
              <th style={{ padding: '0.75rem 1rem' }}>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map(inv => {
              const isRefunded = inv.payment_status === 'refunded';
              return (
                <tr key={inv.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', fontSize: '0.88rem', opacity: isRefunded ? 0.65 : 1 }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 800 }} className="font-digits">
                    {inv.invoice_number}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-dim)' }}>
                    {inv.created_at?.slice(0, 16)}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>
                    {inv.customer_name}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    {inv.device_name || 'كافيه مباشر'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }} className="font-digits">
                    {inv.gaming_subtotal > 0 ? `${inv.gaming_subtotal} ج` : '-'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }} className="font-digits">
                    {inv.products_subtotal > 0 ? `${inv.products_subtotal} ج` : '-'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 800, color: '#fbbf24' }} className="font-digits">
                    {inv.grand_total} ج
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span className="badge" style={{ background: 'var(--bg-surface-3)' }}>
                      {inv.payment_method === 'cash' ? 'نقدي' : inv.payment_method === 'card' ? 'فيزا' : inv.payment_method === 'split' ? 'مقسم' : 'محفظة'}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span className={`badge ${inv.payment_status === 'paid' ? 'badge-available' : inv.payment_status === 'refunded' ? 'badge-maintenance' : 'badge-reserved'}`}>
                      {inv.payment_status === 'paid' ? 'خالص' : inv.payment_status === 'refunded' ? 'مسترجع' : 'متبقي'}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button
                        className="btn btn-icon btn-secondary"
                        style={{ width: 30, height: 30 }}
                        onClick={() => handleViewReceipt(inv)}
                        title="معاينة وطباعة الفاتورة"
                      >
                        <Printer size={14} />
                      </button>
                      {!isRefunded && (
                        <button
                          className="btn btn-icon btn-secondary"
                          style={{ width: 30, height: 30 }}
                          onClick={() => {
                            setSelectedInvoice(inv);
                            setRefundAmount(String(inv.paid_amount));
                            setRefundReason('');
                            setRefundModalOpen(true);
                          }}
                          title="استرجاع الفاتورة (Refund)"
                        >
                          <RotateCcw size={14} style={{ color: '#ef4444' }} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* View & Print Thermal Receipt Modal */}
      {receiptModalOpen && selectedInvoice && (
        <Modal
          isOpen={true}
          onClose={() => setReceiptModalOpen(false)}
          title={`معاينة الفاتورة: ${selectedInvoice.invoice_number}`}
          maxWidth="460px"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setReceiptModalOpen(false)}>
                إغلاق
              </button>
              <button className="btn btn-primary" onClick={() => window.print()}>
                <Printer size={16} />
                طباعة إيصال 80mm
              </button>
            </>
          }
        >
          <ThermalReceipt invoice={selectedInvoice} />
        </Modal>
      )}

      {/* Refund Modal */}
      {refundModalOpen && selectedInvoice && (
        <Modal
          isOpen={true}
          onClose={() => setRefundModalOpen(false)}
          title={`استرجاع الفاتورة: ${selectedInvoice.invoice_number}`}
          maxWidth="480px"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setRefundModalOpen(false)}>
                إلغاء
              </button>
              <button className="btn btn-danger" onClick={handleProcessRefund}>
                تأكيد الاسترجاع وإعادة النقدية
              </button>
            </>
          }
        >
          <form onSubmit={handleProcessRefund}>
            {errorMsg && <div style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.85rem' }}>{errorMsg}</div>}
            <div className="form-group">
              <label className="form-label">المبلغ المسترجع (ج.م):</label>
              <input
                type="number"
                step="5"
                className="form-control"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">سبب الاسترجاع:</label>
              <input
                type="text"
                className="form-control"
                placeholder="مثال: عطل في دراع اللعب، العميل لم يستكمل وقته..."
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                required
              />
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
              ⚠️ سيتم إعادة خصم هذا المبلغ من كاش الشيفت الحالي، وإعادة المنتجات المباعة في الفاتورة لرصيد المخزن تلقائياً، وتسجيل العملية في سجل الرقابة (Audit Log).
            </p>
          </form>
        </Modal>
      )}
    </div>
  );
}
