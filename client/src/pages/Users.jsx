import React, { useState, useEffect } from 'react';
import { UserCheck, Plus, Trash2, Edit, Shield, Phone, Lock } from 'lucide-react';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function Users() {
  const { t } = useLanguage();
  const { authFetch } = useAuth();

  const [users, setUsers] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('cashier'); // 'admin', 'manager', 'cashier', 'staff'
  const [errorMsg, setErrorMsg] = useState('');

  const loadUsers = async () => {
    try {
      const res = await authFetch('/api/users');
      const data = await res.json();
      if (data.success) setUsers(data.users);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleSaveUser = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const payload = {
        username,
        password: password || undefined,
        full_name: fullName,
        phone,
        role
      };

      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
      const method = editingUser ? 'PUT' : 'POST';

      const res = await authFetch(url, { method, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);

      setModalOpen(false);
      setUsername('');
      setPassword('');
      setFullName('');
      loadUsers();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('هل تريد حذف أو تعطيل حساب هذا المستخدم؟')) return;
    try {
      const res = await authFetch(`/api/users/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) alert(data.message);
      loadUsers();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900 }}>المستخدمين والصلاحيات (Users & RBAC)</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
            إدارة حسابات الكاشير والمديرين وتحديد الصلاحيات للتحكم بالعمليات الحساسة
          </p>
        </div>

        <button
          className="btn btn-success"
          onClick={() => {
            setEditingUser(null);
            setUsername('');
            setPassword('');
            setFullName('');
            setPhone('');
            setRole('cashier');
            setModalOpen(true);
          }}
        >
          <Plus size={16} />
          إضافة مستخدم جديد
        </button>
      </div>

      <div className="glass-panel" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
              <th style={{ padding: '0.75rem 1rem' }}>الاسم بالكامل</th>
              <th style={{ padding: '0.75rem 1rem' }}>اسم المستخدم</th>
              <th style={{ padding: '0.75rem 1rem' }}>الدور والصلاحية</th>
              <th style={{ padding: '0.75rem 1rem' }}>الهاتف</th>
              <th style={{ padding: '0.75rem 1rem' }}>الحالة</th>
              <th style={{ padding: '0.75rem 1rem' }}>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', fontSize: '0.88rem' }}>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 800 }}>{u.full_name}</td>
                <td style={{ padding: '0.75rem 1rem', color: 'var(--text-dim)' }}>@{u.username}</td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <span className={`badge ${u.role === 'admin' ? 'badge-running' : u.role === 'manager' ? 'badge-reserved' : 'badge-available'}`}>
                    {u.role === 'admin' ? 'مدير عام (Admin)' : u.role === 'manager' ? 'مدير فرع (Manager)' : 'كاشير (Cashier)'}
                  </span>
                </td>
                <td style={{ padding: '0.75rem 1rem' }} className="font-digits">{u.phone || '-'}</td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <span className={`badge ${u.is_active ? 'badge-available' : 'badge-maintenance'}`}>
                    {u.is_active ? 'نشط' : 'معطل'}
                  </span>
                </td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      className="btn btn-icon btn-secondary"
                      style={{ width: 30, height: 30 }}
                      onClick={() => {
                        setEditingUser(u);
                        setUsername(u.username);
                        setPassword('');
                        setFullName(u.full_name);
                        setPhone(u.phone || '');
                        setRole(u.role);
                        setModalOpen(true);
                      }}
                    >
                      <Edit size={13} />
                    </button>
                    <button
                      className="btn btn-icon btn-secondary"
                      style={{ width: 30, height: 30 }}
                      onClick={() => handleDelete(u.id)}
                    >
                      <Trash2 size={13} style={{ color: '#ef4444' }} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingUser ? 'تعديل بيانات المستخدم' : 'إنشاء حساب مستخدم جديد'}
        maxWidth="500px"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>إلغاء</button>
            <button className="btn btn-success" onClick={handleSaveUser}>حفظ المستخدم</button>
          </>
        }
      >
        <form onSubmit={handleSaveUser}>
          {errorMsg && <div style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.85rem' }}>{errorMsg}</div>}
          <div className="form-group">
            <label className="form-label">الاسم بالكامل:</label>
            <input type="text" className="form-control" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <label className="form-label">اسم المستخدم (Login):</label>
              <input type="text" className="form-control" value={username} onChange={(e) => setUsername(e.target.value)} disabled={!!editingUser} required />
            </div>
            <div>
              <label className="form-label">كلمة المرور:</label>
              <input type="password" className="form-control" placeholder={editingUser ? 'اتركه فارغاً للإبقاء عليها' : ''} value={password} onChange={(e) => setPassword(e.target.value)} required={!editingUser} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <label className="form-label">الدور والصلاحية:</label>
              <select className="form-control" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="cashier">كاشير (Cashier)</option>
                <option value="manager">مدير فرع (Manager)</option>
                <option value="admin">مدير عام (Admin)</option>
              </select>
            </div>
            <div>
              <label className="form-label">رقم الهاتف:</label>
              <input type="text" className="form-control" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
