import React, { useState, useEffect } from 'react';
import { ShieldAlert, RefreshCw, Search, Clock, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AuditLogs() {
  const { authFetch } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');

  const loadLogs = async () => {
    setLoading(true);
    try {
      let query = '/api/audit-logs?limit=100';
      if (actionFilter) query += `&action=${actionFilter}`;
      const res = await authFetch(query);
      const data = await res.json();
      if (data.success) setLogs(data.logs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [actionFilter]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900 }}>سجل الرقابة والعمليات الحساسة (Audit Logs)</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
            سجل أمني دقيق ومحمي لا يمكن تعديله أو حذفه لتتبع جميع العمليات التي ينفذها الكاشير والمديرون
          </p>
        </div>

        <button className="btn btn-secondary" onClick={loadLogs}>
          <RefreshCw size={15} />
          تحديث السجل
        </button>
      </div>

      <div className="glass-panel" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
              <th style={{ padding: '0.75rem 1rem' }}>الوقت والتاريخ</th>
              <th style={{ padding: '0.75rem 1rem' }}>المستخدم المسؤول</th>
              <th style={{ padding: '0.75rem 1rem' }}>نوع العملية</th>
              <th style={{ padding: '0.75rem 1rem' }}>العنصر</th>
              <th style={{ padding: '0.75rem 1rem' }}>البيان والتفاصيل</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', fontSize: '0.88rem' }}>
                <td style={{ padding: '0.75rem 1rem', color: 'var(--text-dim)' }} className="font-digits">
                  {log.created_at?.slice(0, 19)}
                </td>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>{log.user_name}</td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <span className="badge" style={{ background: 'var(--bg-surface-3)', color: '#60a5fa' }}>
                    {log.action}
                  </span>
                </td>
                <td style={{ padding: '0.75rem 1rem', textTransform: 'capitalize' }}>{log.entity_type}</td>
                <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>
                  {log.notes || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
