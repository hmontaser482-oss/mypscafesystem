import React, { useState, useEffect } from 'react';
import {
  Wrench, Plus, CheckCircle2, AlertTriangle, Clock, DollarSign
} from 'lucide-react';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function Maintenance() {
  const { t } = useLanguage();
  const { authFetch } = useAuth();

  const [maintenanceList, setMaintenanceList] = useState([]);
  const [devices, setDevices] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [deviceId, setDeviceId] = useState('');
  const [problem, setProblem] = useState('');
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState(100);
  const [technician, setTechnician] = useState('فني الصيانة محمود');
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = async () => {
    try {
      const [mRes, dRes] = await Promise.all([
        authFetch('/api/maintenance'),
        authFetch('/api/devices')
      ]);
      const [mData, dData] = await Promise.all([mRes.json(), dRes.json()]);
      if (mData.success) setMaintenanceList(mData.maintenance);
      if (dData.success) {
        setDevices(dData.devices);
        if (dData.devices.length > 0 && !deviceId) setDeviceId(dData.devices[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateMaintenance = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const res = await authFetch('/api/maintenance', {
        method: 'POST',
        body: JSON.stringify({
          deviceId,
          problem,
          description,
          cost: Number(cost),
          technician
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);

      setModalOpen(false);
      setProblem('');
      setDescription('');
      loadData();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleResolve = async (recordId) => {
    if (!confirm('هل تم الانتهاء من صيانة الجهاز وتريد إعادته لحالة Available والتشغيل الآن؟')) return;
    try {
      const res = await authFetch(`/api/maintenance/${recordId}/resolve`, {
        method: 'PUT',
        body: JSON.stringify({ notes: 'تم استلام الجهاز سليم وجاهز للتشغيل' })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.message || 'فشل استلام الجهاز من الصيانة');
        return;
      }
      loadData();
      alert('تم استلام الجهاز بنجاح وإعادته لحالة متاح (Available) في الصالة!');
    } catch (err) {
      console.error(err);
      alert('فشل الاتصال بالخادم');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900 }}>صيانة وإصلاح الأجهزة (Maintenance)</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
            أوامر الصيانة وتصليح دراعات التحكم والشاشات مع حجب الجهاز تلقائياً من الصالة أثناء الصيانة
          </p>
        </div>

        <button className="btn btn-danger" onClick={() => setModalOpen(true)}>
          <Wrench size={16} />
          إرسال جهاز للصيانة
        </button>
      </div>

      <div className="glass-panel" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
              <th style={{ padding: '0.75rem 1rem' }}>الجهاز</th>
              <th style={{ padding: '0.75rem 1rem' }}>المشكلة والعطل</th>
              <th style={{ padding: '0.75rem 1rem' }}>الفني المسؤول</th>
              <th style={{ padding: '0.75rem 1rem' }}>التكلفة التقديرية</th>
              <th style={{ padding: '0.75rem 1rem' }}>تاريخ البدء</th>
              <th style={{ padding: '0.75rem 1rem' }}>الحالة</th>
              <th style={{ padding: '0.75rem 1rem' }}>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {maintenanceList.map(m => {
              const isResolved = m.status === 'completed';
              return (
                <tr key={m.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', fontSize: '0.88rem' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 800 }}>{m.device_name}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ fontWeight: 700 }}>{m.problem}</div>
                    {m.description && <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>{m.description}</div>}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>{m.technician || '-'}</td>
                  <td style={{ padding: '0.75rem 1rem' }} className="font-digits">{m.cost} ج</td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-dim)' }}>{m.start_date?.slice(0, 16)}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span className={`badge ${isResolved ? 'badge-available' : 'badge-maintenance'}`}>
                      {isResolved ? 'تمت الصيانة بنجاح' : 'جاري الفحص والإصلاح'}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    {!isResolved && (
                      <button
                        className="btn btn-success"
                        style={{ fontSize: '0.8rem', padding: '0.35rem 0.65rem' }}
                        onClick={() => handleResolve(m.id)}
                      >
                        <CheckCircle2 size={13} />
                        استلام وتشغيل
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="فتح أمر صيانة جديد لجهاز"
        maxWidth="520px"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>إلغاء</button>
            <button className="btn btn-danger" onClick={handleCreateMaintenance}>تأكيد إدخال الصيانة</button>
          </>
        }
      >
        <form onSubmit={handleCreateMaintenance}>
          {errorMsg && <div style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.85rem' }}>{errorMsg}</div>}
          <div className="form-group">
            <label className="form-label">اختر الجهاز:</label>
            <select className="form-control" value={deviceId} onChange={(e) => setDeviceId(e.target.value)} required>
              {devices.map(d => (
                <option key={d.id} value={d.id} disabled={d.status === 'running'}>
                  {d.name} (#{d.device_number}) {d.status === 'running' ? '(مشغول حالياً)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">المشكلة / العطل:</label>
            <input type="text" className="form-control" placeholder="عطل دراع 2، تعليق زر L2، حرارة..." value={problem} onChange={(e) => setProblem(e.target.value)} required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <label className="form-label">اسم الفني أو مركز الصيانة:</label>
              <input type="text" className="form-control" value={technician} onChange={(e) => setTechnician(e.target.value)} />
            </div>
            <div>
              <label className="form-label">التكلفة التقديرية (ج.م):</label>
              <input type="number" step="10" className="form-control" value={cost} onChange={(e) => setCost(e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">تفاصيل إضافية:</label>
            <input type="text" className="form-control" placeholder="تاريخ متوقع للاستلام..." value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </form>
      </Modal>
    </div>
  );
}
