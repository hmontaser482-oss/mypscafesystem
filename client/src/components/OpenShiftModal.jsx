import React, { useState } from 'react';
import { Clock, Play, Check, User } from 'lucide-react';
import Modal from './Modal';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

export default function OpenShiftModal({ isOpen, onClose, onShiftOpened }) {
  const { t } = useLanguage();
  const { authFetch, user } = useAuth();

  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await authFetch('/api/shifts/open', {
        method: 'POST',
        body: JSON.stringify({ notes })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'فشل بدء الشيفت');
      }

      if (onShiftOpened) onShiftOpened(data.shiftId);
      onClose();
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
      title="بدء الشيفت (Start Shift)"
      maxWidth="480px"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
            {t('cancel')}
          </button>
          <button type="button" className="btn btn-success" onClick={handleSubmit} disabled={loading}>
            <Check size={16} />
            {loading ? 'جاري البدء...' : 'بدء الشيفت الآن'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        {errorMsg && (
          <div style={{ padding: '0.65rem', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', border: '1px solid rgba(239, 68, 68, 0.3)', fontSize: '0.88rem' }}>
            {errorMsg}
          </div>
        )}

        {/* Info card */}
        <div style={{ background: 'var(--bg-surface-2)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
              <User size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>الكاشير المسؤول:</div>
              <div style={{ fontWeight: 800, fontSize: '1rem' }}>{user?.full_name || 'الكاشير الحالي'}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa' }}>
              <Clock size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>توقيت بدء الشيفت:</div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem' }} className="font-digits">
                {new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })} - {new Date().toLocaleDateString('ar-EG')}
              </div>
            </div>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">ملاحظات الشيفت (اختياري):</label>
          <input
            type="text"
            className="form-control"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="مثال: شيفت صباحي، استلام الصالة..."
            autoFocus
          />
        </div>

        <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)', marginTop: '0.5rem', lineHeight: 1.5 }}>
          💡 عند تأكيد البدء، سيتم تسجيل جميع عمليات الكاشير ومبيعات البوفيه والجلسات تلقائياً في هذا الشيفت.
        </p>
      </form>
    </Modal>
  );
}
