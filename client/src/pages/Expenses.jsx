import React, { useState, useEffect } from 'react';
import {
  Wallet, Plus, Trash2, Calendar, DollarSign, Tag, Search
} from 'lucide-react';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function Expenses() {
  const { t, lang } = useLanguage();
  const { authFetch } = useAuth();

  const [expenses, setExpenses] = useState([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [category, setCategory] = useState('electricity');
  const [amount, setAmount] = useState(150);
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [errorMsg, setErrorMsg] = useState('');

  const categories = [
    { id: 'electricity', name: 'كهرباء وإنارة' },
    { id: 'maintenance', name: 'صيانة وتصليحات' },
    { id: 'purchases', name: 'مشتريات وبضاعة كافيه' },
    { id: 'salaries', name: 'رواتب وسلف عاملين' },
    { id: 'cleaning', name: 'نظافة ومعقمات' },
    { id: 'internet', name: 'إنترنت واشتراكات' },
    { id: 'rent', name: 'إيجار المحل' },
    { id: 'supplies', name: 'أدوات ومستلزمات' },
    { id: 'other', name: 'مصروفات أخرى' }
  ];

  const loadExpenses = async () => {
    try {
      let query = '/api/expenses?limit=100';
      if (categoryFilter) query += `&category=${categoryFilter}`;
      if (startDate) query += `&startDate=${startDate}`;
      if (endDate) query += `&endDate=${endDate}`;

      const res = await authFetch(query);
      const data = await res.json();
      if (data.success) {
        setExpenses(data.expenses);
        setTotalExpenses(data.totalExpenses);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, [categoryFilter, startDate, endDate]);

  const handleSaveExpense = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const res = await authFetch('/api/expenses', {
        method: 'POST',
        body: JSON.stringify({
          category,
          amount: Number(amount),
          description,
          payment_method: paymentMethod,
          date
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);

      setModalOpen(false);
      setDescription('');
      loadExpenses();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('هل أنت متأكد من حذف هذا المصروف؟')) return;
    try {
      await authFetch(`/api/expenses/${id}`, { method: 'DELETE' });
      loadExpenses();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900 }}>سجل المصروفات (Expenses)</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
            تسجيل وتصنيف كافة المصروفات التشغيلية والنثرية وخصمها من أرباح المركز
          </p>
        </div>

        <button className="btn btn-success" onClick={() => setModalOpen(true)}>
          <Plus size={16} />
          تسجيل مصروف جديد
        </button>
      </div>

      {/* Summary KPI Banner */}
      <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
            <Wallet size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>إجمالي المصروفات في الفترة المحددة</span>
            <div className="font-digits" style={{ fontSize: '1.65rem', fontWeight: 900, color: '#ef4444' }}>
              {totalExpenses} ج.م
            </div>
          </div>
        </div>

        {/* Filter controls */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            className="form-control"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{ width: 170 }}
          >
            <option value="">جميع التصنيفات</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input
            type="date"
            className="form-control"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{ width: 145 }}
          />
          <input
            type="date"
            className="form-control"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{ width: 145 }}
          />
        </div>
      </div>

      {/* Expenses Table */}
      <div className="glass-panel" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: lang === 'ar' ? 'right' : 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
              <th style={{ padding: '0.75rem 1rem' }}>التاريخ</th>
              <th style={{ padding: '0.75rem 1rem' }}>التصنيف</th>
              <th style={{ padding: '0.75rem 1rem' }}>المبلغ</th>
              <th style={{ padding: '0.75rem 1rem' }}>الوصف والبيان</th>
              <th style={{ padding: '0.75rem 1rem' }}>طريقة الدفع</th>
              <th style={{ padding: '0.75rem 1rem' }}>المستخدم</th>
              <th style={{ padding: '0.75rem 1rem' }}>حذف</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map(exp => (
              <tr key={exp.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', fontSize: '0.88rem' }}>
                <td style={{ padding: '0.75rem 1rem', color: 'var(--text-dim)' }}>{exp.date}</td>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>
                  <span className="badge" style={{ background: 'var(--bg-surface-3)' }}>
                    {categories.find(c => c.id === exp.category)?.name || exp.category}
                  </span>
                </td>
                <td style={{ padding: '0.75rem 1rem', color: '#ef4444', fontWeight: 800 }} className="font-digits">
                  {exp.amount} ج.م
                </td>
                <td style={{ padding: '0.75rem 1rem' }}>{exp.description}</td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  {exp.payment_method === 'cash' ? 'نقدياً من الدرج' : 'تحويل / بنكي'}
                </td>
                <td style={{ padding: '0.75rem 1rem', color: 'var(--text-dim)' }}>{exp.user_name || 'الكاشير'}</td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <button
                    className="btn btn-icon btn-secondary"
                    style={{ width: 28, height: 28 }}
                    onClick={() => handleDelete(exp.id)}
                  >
                    <Trash2 size={13} style={{ color: '#ef4444' }} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* New Expense Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="تسجيل مصروف جديد"
        maxWidth="500px"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>إلغاء</button>
            <button className="btn btn-success" onClick={handleSaveExpense}>حفظ المصروف</button>
          </>
        }
      >
        <form onSubmit={handleSaveExpense}>
          {errorMsg && <div style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.85rem' }}>{errorMsg}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <label className="form-label">التصنيف:</label>
              <select className="form-control" value={category} onChange={(e) => setCategory(e.target.value)}>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">المبلغ (ج.م):</label>
              <input type="number" step="5" className="form-control" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <label className="form-label">طريقة الدفع:</label>
              <select className="form-control" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="cash">نقداً من الدرج (يخصم من الشيفت)</option>
                <option value="bank_transfer">تحويل / من خارج الدرج</option>
              </select>
            </div>
            <div>
              <label className="form-label">التاريخ:</label>
              <input type="date" className="form-control" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">بيان ووصف المصروف:</label>
            <input type="text" className="form-control" placeholder="فاتورة كهرباء، شراء منظفات، إلخ..." value={description} onChange={(e) => setDescription(e.target.value)} required />
          </div>
        </form>
      </Modal>
    </div>
  );
}
