import React, { useState, useEffect } from 'react';
import {
  Users, Search, Plus, Phone, Trophy, History, Star, Clock
} from 'lucide-react';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function Customers() {
  const { t, lang } = useLanguage();
  const { authFetch } = useAuth();

  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Add form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [nickname, setNickname] = useState('');
  const [favoriteGame, setFavoriteGame] = useState('EA SPORTS FC 25');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const loadCustomers = async () => {
    try {
      let query = '/api/customers?limit=100';
      if (search) query += `&search=${encodeURIComponent(search)}`;
      const res = await authFetch(query);
      const data = await res.json();
      if (data.success) setCustomers(data.customers);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [search]);

  const handleOpenProfile = async (cust) => {
    try {
      const res = await authFetch(`/api/customers/${cust.id}`);
      const data = await res.json();
      if (data.success) {
        setSelectedCustomer(data.customer);
        setProfileModalOpen(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const res = await authFetch('/api/customers', {
        method: 'POST',
        body: JSON.stringify({ name, phone, nickname, favorite_game: favoriteGame, notes })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);

      setAddModalOpen(false);
      setName('');
      setPhone('');
      setNickname('');
      setNotes('');
      loadCustomers();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900 }}>سجل العملاء والولاء (Customers)</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
            بيانات العملاء، عدد الزيارات، إجمالي الإنفاق، وتاريخ الجلسات والفواتير
          </p>
        </div>

        <button className="btn btn-success" onClick={() => setAddModalOpen(true)}>
          <Plus size={16} />
          إضافة عميل جديد
        </button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: '1.25rem' }}>
        <input
          type="text"
          className="form-control"
          placeholder="بحث بالاسم أو الهاتف أو اللقب..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 360 }}
        />
      </div>

      {/* Customers Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
        {customers.map(c => (
          <div
            key={c.id}
            className="glass-panel"
            style={{ padding: '1.25rem', cursor: 'pointer', transition: 'transform 0.2s', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
            onClick={() => handleOpenProfile(c)}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.65rem' }}>
                <div>
                  <h4 style={{ fontSize: '1.15rem', fontWeight: 800 }}>{c.name}</h4>
                  {c.nickname && <span style={{ fontSize: '0.8rem', color: '#60a5fa' }}>({c.nickname})</span>}
                </div>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa' }}>
                  <Users size={18} />
                </div>
              </div>

              <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Phone size={13} />
                <span className="font-digits">{c.phone}</span>
              </div>

              <div style={{ background: 'var(--bg-surface-2)', padding: '0.75rem', borderRadius: 'var(--radius-md)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', textAlign: 'center', marginBottom: '0.75rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block' }}>إجمالي الزيارات</span>
                  <span className="font-digits" style={{ fontWeight: 800, fontSize: '1.2rem', color: '#38bdf8' }}>{c.total_visits}</span>
                </div>
                <div style={{ borderLeft: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block' }}>إجمالي الإنفاق</span>
                  <span className="font-digits" style={{ fontWeight: 800, fontSize: '1.2rem', color: '#fbbf24' }}>{c.total_spending} ج</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: 'var(--text-dim)', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.65rem' }}>
              <span>🎮 {c.favorite_game || 'EA SPORTS FC 25'}</span>
              <span style={{ color: '#60a5fa', fontWeight: 700 }}>عرض السجل ➔</span>
            </div>
          </div>
        ))}
      </div>

      {/* Customer Profile & History Modal */}
      {selectedCustomer && (
        <Modal
          isOpen={profileModalOpen}
          onClose={() => setProfileModalOpen(false)}
          title={`ملف وسجل العميل: ${selectedCustomer.name}`}
          maxWidth="720px"
        >
          {/* Quick Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', background: 'var(--bg-surface-2)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', textAlign: 'center' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', display: 'block' }}>الهاتف:</span>
              <span className="font-digits" style={{ fontWeight: 700 }}>{selectedCustomer.phone}</span>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', display: 'block' }}>عدد الزيارات:</span>
              <span className="font-digits" style={{ fontWeight: 800, color: '#60a5fa' }}>{selectedCustomer.total_visits} زيارة</span>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', display: 'block' }}>إجمالي الإنفاق:</span>
              <span className="font-digits" style={{ fontWeight: 800, color: '#fbbf24' }}>{selectedCustomer.total_spending} ج.م</span>
            </div>
          </div>

          <h4 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '0.5rem', color: '#60a5fa' }}>آخر الجلسات المسجلة:</h4>
          <div style={{ marginBottom: '1.25rem' }}>
            {selectedCustomer.sessions?.length > 0 ? (
              selectedCustomer.sessions.map(s => (
                <div key={s.id} style={{ padding: '0.55rem 0.75rem', background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-sm)', marginBottom: '0.35rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span>{s.device_name} ({s.session_type === 'multi' ? 'Multi' : 'Single'})</span>
                  <span className="font-digits" style={{ color: 'var(--text-dim)' }}>{s.start_time?.slice(0, 16)}</span>
                  <span className="font-digits" style={{ fontWeight: 700, color: '#10b981' }}>{s.total_amount} ج</span>
                </div>
              ))
            ) : (
              <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>لا توجد جلسات سابقة.</p>
            )}
          </div>

          <h4 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '0.5rem', color: '#fbbf24' }}>آخر الفواتير:</h4>
          <div>
            {selectedCustomer.invoices?.length > 0 ? (
              selectedCustomer.invoices.map(inv => (
                <div key={inv.id} style={{ padding: '0.55rem 0.75rem', background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-sm)', marginBottom: '0.35rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span className="font-digits" style={{ fontWeight: 700 }}>{inv.invoice_number}</span>
                  <span className="font-digits" style={{ color: 'var(--text-dim)' }}>{inv.created_at?.slice(0, 16)}</span>
                  <span className="font-digits" style={{ fontWeight: 700, color: '#fbbf24' }}>{inv.grand_total} ج</span>
                </div>
              ))
            ) : (
              <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>لا توجد فواتير سابقة.</p>
            )}
          </div>
        </Modal>
      )}

      {/* Add Customer Modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="إضافة عميل جديد"
        maxWidth="500px"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setAddModalOpen(false)}>إلغاء</button>
            <button className="btn btn-success" onClick={handleSaveCustomer}>حفظ العميل</button>
          </>
        }
      >
        <form onSubmit={handleSaveCustomer}>
          {errorMsg && <div style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.85rem' }}>{errorMsg}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <label className="form-label">الاسم بالكامل:</label>
              <input type="text" className="form-control" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label className="form-label">رقم الهاتف:</label>
              <input type="text" className="form-control" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <label className="form-label">اللقب / الشهرة (اختياري):</label>
              <input type="text" className="form-control" value={nickname} onChange={(e) => setNickname(e.target.value)} />
            </div>
            <div>
              <label className="form-label">اللعبة المفضلة:</label>
              <input type="text" className="form-control" value={favoriteGame} onChange={(e) => setFavoriteGame(e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">ملاحظات عن العميل:</label>
            <input type="text" className="form-control" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </form>
      </Modal>
    </div>
  );
}
