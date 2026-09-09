import React, { useState, useEffect } from 'react';
import {
  Monitor, Plus, Edit, Trash2, Sparkles, Check, Wrench, ShieldAlert
} from 'lucide-react';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function DevicesManagement() {
  const { t, lang } = useLanguage();
  const { authFetch } = useAuth();

  const [activeTab, setActiveTab] = useState('devices'); // 'devices', 'groups', 'rooms'
  const [devices, setDevices] = useState([]);
  const [groups, setGroups] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [deviceModalOpen, setDeviceModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Device form
  const [devName, setDevName] = useState('');
  const [devNumber, setDevNumber] = useState('');
  const [devType, setDevType] = useState('PS5');
  const [devSerial, setDevSerial] = useState('');
  const [devGroupId, setDevGroupId] = useState('');
  const [devRoomId, setDevRoomId] = useState('');
  const [devNotes, setDevNotes] = useState('');

  // Group form
  const [grpName, setGrpName] = useState('');
  const [grpType, setGrpType] = useState('PS5');
  const [grpSingle, setGrpSingle] = useState(80);
  const [grpMulti, setGrpMulti] = useState(120);

  // Room form
  const [rmName, setRmName] = useState('');
  const [rmCapacity, setRmCapacity] = useState(6);
  const [rmSingle, setRmSingle] = useState('');
  const [rmMulti, setRmMulti] = useState('');
  const [rmIsVip, setRmIsVip] = useState(false);

  const loadData = async () => {
    try {
      const [dRes, gRes, rRes] = await Promise.all([
        authFetch('/api/devices'),
        authFetch('/api/groups'),
        authFetch('/api/rooms')
      ]);
      const [dData, gData, rData] = await Promise.all([dRes.json(), gRes.json(), rRes.json()]);
      if (dData.success) setDevices(dData.devices);
      if (gData.success) setGroups(gData.groups);
      if (rData.success) setRooms(rData.rooms);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Save Device
  const handleSaveDevice = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const payload = {
        name: devName,
        device_number: devNumber,
        device_type: devType,
        serial_number: devSerial,
        group_id: devGroupId,
        room_id: devRoomId || null,
        notes: devNotes
      };

      const url = editingDevice ? `/api/devices/${editingDevice.id}` : '/api/devices';
      const method = editingDevice ? 'PUT' : 'POST';

      const res = await authFetch(url, {
        method,
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);

      setDeviceModalOpen(false);
      loadData();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // Delete Device
  const handleDeleteDevice = async (id) => {
    if (!confirm('هل تريد حذف/تعطيل هذا الجهاز؟')) return;
    try {
      const res = await authFetch(`/api/devices/${id}`, { method: 'DELETE' });
      const d = await res.json();
      if (!d.success) alert(d.message);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // Save Group
  const handleSaveGroup = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const payload = {
        name: grpName,
        device_type: grpType,
        default_single_price: Number(grpSingle),
        default_multi_price: Number(grpMulti)
      };

      const url = editingGroup ? `/api/groups/${editingGroup.id}` : '/api/groups';
      const method = editingGroup ? 'PUT' : 'POST';

      const res = await authFetch(url, { method, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);

      setGroupModalOpen(false);
      loadData();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // Save Room
  const handleSaveRoom = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const payload = {
        name: rmName,
        capacity: Number(rmCapacity),
        single_price: rmSingle ? Number(rmSingle) : null,
        multi_price: rmMulti ? Number(rmMulti) : null,
        is_vip: rmIsVip
      };

      const url = editingRoom ? `/api/rooms/${editingRoom.id}` : '/api/rooms';
      const method = editingRoom ? 'PUT' : 'POST';

      const res = await authFetch(url, { method, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);

      setRoomModalOpen(false);
      loadData();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900 }}>إدارة الأجهزة والمجموعات والرومات</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
            تخصيص أسعار اللعب وإعداد الأجهزة والغرف وإمكانية تجاوز أسعار المجموعات
          </p>
        </div>

        {/* Tab Buttons */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className={`btn ${activeTab === 'devices' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('devices')}
          >
            الأجهزة ({devices.length})
          </button>
          <button
            className={`btn ${activeTab === 'groups' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('groups')}
          >
            المجموعات ({groups.length})
          </button>
          <button
            className={`btn ${activeTab === 'rooms' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('rooms')}
          >
            الغرف والرومات ({rooms.length})
          </button>
        </div>
      </div>

      {/* TAB 1: DEVICES */}
      {activeTab === 'devices' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <button
              className="btn btn-success"
              onClick={() => {
                setEditingDevice(null);
                setDevName('');
                setDevNumber('');
                setDevType('PS5');
                setDevSerial('');
                setDevGroupId(groups[0]?.id || '');
                setDevRoomId('');
                setDevNotes('');
                setDeviceModalOpen(true);
              }}
            >
              <Plus size={16} />
              إضافة جهاز جديد
            </button>
          </div>

          <div className="glass-panel" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: lang === 'ar' ? 'right' : 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>الجهاز</th>
                  <th style={{ padding: '0.75rem 1rem' }}>النوع</th>
                  <th style={{ padding: '0.75rem 1rem' }}>المجموعة</th>
                  <th style={{ padding: '0.75rem 1rem' }}>الغرفة / القاعة</th>
                  <th style={{ padding: '0.75rem 1rem' }}>الأسعار المطبقة</th>
                  <th style={{ padding: '0.75rem 1rem' }}>الحالة</th>
                  <th style={{ padding: '0.75rem 1rem' }}>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {devices.map(dev => (
                  <tr key={dev.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', fontSize: '0.9rem' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 800 }}>
                      {dev.name} <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>(#{dev.device_number})</span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span className="badge" style={{ background: 'var(--bg-surface-3)' }}>{dev.device_type}</span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>{dev.group_name}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      {dev.room_name ? (
                        <span style={{ color: dev.room_is_vip ? '#fbbf24' : undefined, fontWeight: dev.room_is_vip ? 700 : 400 }}>
                          {dev.room_is_vip && '✨ '}{dev.room_name}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-dim)' }}>الصالة العامة</span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }} className="font-digits">
                      {dev.effectiveSinglePrice} ج (س) / {dev.effectiveMultiPrice} ج (م)
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span className={`badge badge-${dev.status}`}>
                        {dev.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          className="btn btn-icon btn-secondary"
                          style={{ width: 30, height: 30 }}
                          onClick={() => {
                            setEditingDevice(dev);
                            setDevName(dev.name);
                            setDevNumber(dev.device_number);
                            setDevType(dev.device_type);
                            setDevSerial(dev.serial_number || '');
                            setDevGroupId(dev.group_id);
                            setDevRoomId(dev.room_id || '');
                            setDevNotes(dev.notes || '');
                            setDeviceModalOpen(true);
                          }}
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          className="btn btn-icon btn-secondary"
                          style={{ width: 30, height: 30 }}
                          onClick={() => handleDeleteDevice(dev.id)}
                        >
                          <Trash2 size={14} style={{ color: '#ef4444' }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: GROUPS */}
      {activeTab === 'groups' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <button
              className="btn btn-success"
              onClick={() => {
                setEditingGroup(null);
                setGrpName('');
                setGrpType('PS5');
                setGrpSingle(80);
                setGrpMulti(120);
                setGroupModalOpen(true);
              }}
            >
              <Plus size={16} />
              إضافة مجموعة جديدة
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
            {groups.map(g => (
              <div key={g.id} className="glass-panel" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                  <h4 style={{ fontSize: '1.15rem', fontWeight: 800 }}>{g.name}</h4>
                  <span className="badge" style={{ background: 'var(--bg-surface-3)' }}>{g.device_type}</span>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)', marginBottom: '1rem' }}>
                  {g.description || 'مجموعة أجهزة بلايستيشن'}
                </p>

                <div style={{ background: 'var(--bg-surface-2)', padding: '0.85rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', display: 'block' }}>سعر Single</span>
                    <span className="font-digits" style={{ fontWeight: 800, fontSize: '1.2rem', color: '#60a5fa' }}>{g.default_single_price} ج/س</span>
                  </div>
                  <div style={{ borderLeft: '1px solid var(--border-subtle)' }} />
                  <div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', display: 'block' }}>سعر Multi</span>
                    <span className="font-digits" style={{ fontWeight: 800, fontSize: '1.2rem', color: '#fbbf24' }}>{g.default_multi_price} ج/س</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>{g.devices_count || 0} جهاز مسجل</span>
                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem' }}
                    onClick={() => {
                      setEditingGroup(g);
                      setGrpName(g.name);
                      setGrpType(g.device_type);
                      setGrpSingle(g.default_single_price);
                      setGrpMulti(g.default_multi_price);
                      setGroupModalOpen(true);
                    }}
                  >
                    تعديل الأسعار
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: ROOMS */}
      {activeTab === 'rooms' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <button
              className="btn btn-success"
              onClick={() => {
                setEditingRoom(null);
                setRmName('');
                setRmCapacity(6);
                setRmSingle('');
                setRmMulti('');
                setRmIsVip(false);
                setRoomModalOpen(true);
              }}
            >
              <Plus size={16} />
              إضافة غرفة جديدة
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
            {rooms.map(r => (
              <div key={r.id} className="glass-panel" style={{ padding: '1.25rem', border: r.is_vip ? '1px solid rgba(251, 191, 36, 0.4)' : undefined }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                  <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: r.is_vip ? '#fbbf24' : undefined }}>
                    {r.is_vip && '✨ '}{r.name}
                  </h4>
                  {r.is_vip ? (
                    <span className="badge" style={{ background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24' }}>VIP Room</span>
                  ) : (
                    <span className="badge badge-secondary">قاعة عامة</span>
                  )}
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)', marginBottom: '1rem' }}>
                  {r.description || 'غرفة خاصة للألعاب والبطولات'} (السعة: {r.capacity} أفراد)
                </p>

                <div style={{ background: 'var(--bg-surface-2)', padding: '0.85rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', display: 'block' }}>سعر الغرفة Single</span>
                    <span className="font-digits" style={{ fontWeight: 800, fontSize: '1.1rem', color: '#60a5fa' }}>
                      {r.single_price ? `${r.single_price} ج/س` : 'حسب الجروب'}
                    </span>
                  </div>
                  <div style={{ borderLeft: '1px solid var(--border-subtle)' }} />
                  <div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', display: 'block' }}>سعر الغرفة Multi</span>
                    <span className="font-digits" style={{ fontWeight: 800, fontSize: '1.1rem', color: '#fbbf24' }}>
                      {r.multi_price ? `${r.multi_price} ج/س` : 'حسب الجروب'}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>{r.devices_count || 0} أجهزة بداخلها</span>
                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem' }}
                    onClick={() => {
                      setEditingRoom(r);
                      setRmName(r.name);
                      setRmCapacity(r.capacity);
                      setRmSingle(r.single_price || '');
                      setRmMulti(r.multi_price || '');
                      setRmIsVip(!!r.is_vip);
                      setRoomModalOpen(true);
                    }}
                  >
                    تعديل الغرفة
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Device Form Modal */}
      <Modal
        isOpen={deviceModalOpen}
        onClose={() => setDeviceModalOpen(false)}
        title={editingDevice ? 'تعديل بيانات الجهاز' : 'إضافة جهاز جديد'}
        maxWidth="540px"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setDeviceModalOpen(false)}>إلغاء</button>
            <button className="btn btn-success" onClick={handleSaveDevice}>حفظ الجهاز</button>
          </>
        }
      >
        <form onSubmit={handleSaveDevice}>
          {errorMsg && <div style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.85rem' }}>{errorMsg}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <label className="form-label">اسم الجهاز (مثال: PS5 #05):</label>
              <input type="text" className="form-control" value={devName} onChange={(e) => setDevName(e.target.value)} required />
            </div>
            <div>
              <label className="form-label">رقم الجهاز:</label>
              <input type="text" className="form-control" value={devNumber} onChange={(e) => setDevNumber(e.target.value)} required />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <label className="form-label">المجموعة (Group):</label>
              <select className="form-control" value={devGroupId} onChange={(e) => setDevGroupId(e.target.value)} required>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name} ({g.default_single_price}/{g.default_multi_price} ج)</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">الغرفة / الروم (اختياري):</label>
              <select className="form-control" value={devRoomId} onChange={(e) => setDevRoomId(e.target.value)}>
                <option value="">الصالة العامة (بدون روم)</option>
                {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">ملاحظات عن الجهاز:</label>
            <input type="text" className="form-control" value={devNotes} onChange={(e) => setDevNotes(e.target.value)} />
          </div>
        </form>
      </Modal>

      {/* Group Form Modal */}
      <Modal
        isOpen={groupModalOpen}
        onClose={() => setGroupModalOpen(false)}
        title={editingGroup ? 'تعديل المجموعة وأسعارها' : 'إضافة مجموعة أجهزة جديدة'}
        maxWidth="500px"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setGroupModalOpen(false)}>إلغاء</button>
            <button className="btn btn-success" onClick={handleSaveGroup}>حفظ المجموعة</button>
          </>
        }
      >
        <form onSubmit={handleSaveGroup}>
          <div className="form-group">
            <label className="form-label">اسم المجموعة:</label>
            <input type="text" className="form-control" value={grpName} onChange={(e) => setGrpName(e.target.value)} required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <label className="form-label">سعر ساعة Single (ج.م):</label>
              <input type="number" className="form-control" value={grpSingle} onChange={(e) => setGrpSingle(e.target.value)} required />
            </div>
            <div>
              <label className="form-label">سعر ساعة Multiplayer (ج.م):</label>
              <input type="number" className="form-control" value={grpMulti} onChange={(e) => setGrpMulti(e.target.value)} required />
            </div>
          </div>
        </form>
      </Modal>

      {/* Room Form Modal */}
      <Modal
        isOpen={roomModalOpen}
        onClose={() => setRoomModalOpen(false)}
        title={editingRoom ? 'تعديل بيانات الغرفة' : 'إضافة غرفة / روم جديدة'}
        maxWidth="500px"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setRoomModalOpen(false)}>إلغاء</button>
            <button className="btn btn-success" onClick={handleSaveRoom}>حفظ الغرفة</button>
          </>
        }
      >
        <form onSubmit={handleSaveRoom}>
          <div className="form-group">
            <label className="form-label">اسم الغرفة:</label>
            <input type="text" className="form-control" value={rmName} onChange={(e) => setRmName(e.target.value)} required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <label className="form-label">سعر Single الخاص بالغرفة (Override):</label>
              <input type="number" className="form-control" placeholder="اختياري" value={rmSingle} onChange={(e) => setRmSingle(e.target.value)} />
            </div>
            <div>
              <label className="form-label">سعر Multi الخاص بالغرفة (Override):</label>
              <input type="number" className="form-control" placeholder="اختياري" value={rmMulti} onChange={(e) => setRmMulti(e.target.value)} />
            </div>
          </div>
          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input type="checkbox" id="is_vip_check" checked={rmIsVip} onChange={(e) => setRmIsVip(e.target.checked)} />
            <label htmlFor="is_vip_check" style={{ cursor: 'pointer', fontWeight: 700 }}>غرفة VIP خاصة متميزة</label>
          </div>
        </form>
      </Modal>
    </div>
  );
}
