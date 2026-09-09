import React, { useState, useEffect } from 'react';
import { Disc3, Plus, Trash2, Edit, Users, Gamepad2 } from 'lucide-react';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function Games() {
  const { t } = useLanguage();
  const { authFetch } = useAuth();

  const [games, setGames] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGame, setEditingGame] = useState(null);
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState('PS5');
  const [category, setCategory] = useState('رياضة / كرة قدم');
  const [multiplayerSupport, setMultiplayerSupport] = useState(true);
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const loadGames = async () => {
    try {
      const res = await authFetch('/api/games');
      const data = await res.json();
      if (data.success) setGames(data.games);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadGames();
  }, []);

  const handleSaveGame = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const payload = {
        name,
        platform,
        category,
        multiplayer_support: multiplayerSupport,
        max_players: Number(maxPlayers),
        notes
      };

      const url = editingGame ? `/api/games/${editingGame.id}` : '/api/games';
      const method = editingGame ? 'PUT' : 'POST';

      const res = await authFetch(url, { method, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);

      setModalOpen(false);
      setName('');
      loadGames();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('هل تريد حذف هذه اللعبة من الدليل؟')) return;
    try {
      await authFetch(`/api/games/${id}`, { method: 'DELETE' });
      loadGames();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900 }}>دليل ألعاب البلايستيشن (Games Catalog)</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
            قائمة الألعاب المحملة على أجهزة الصالة مع دعم أنماط اللعب الفردي والجماعي
          </p>
        </div>

        <button
          className="btn btn-success"
          onClick={() => {
            setEditingGame(null);
            setName('');
            setPlatform('PS5');
            setCategory('رياضة / كرة قدم');
            setMultiplayerSupport(true);
            setMaxPlayers(4);
            setNotes('');
            setModalOpen(true);
          }}
        >
          <Plus size={16} />
          إضافة لعبة جديدة
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
        {games.map(g => (
          <div key={g.id} className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <h4 style={{ fontSize: '1.15rem', fontWeight: 800 }}>{g.name}</h4>
                <span className="badge" style={{ background: 'var(--bg-surface-3)' }}>{g.platform}</span>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)', marginBottom: '0.75rem' }}>{g.category}</p>

              <div style={{ background: 'var(--bg-surface-2)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem', display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span>دعم Multiplayer:</span>
                <span style={{ color: g.multiplayer_support ? '#10b981' : '#64748b', fontWeight: 700 }}>
                  {g.multiplayer_support ? `نعم (حتى ${g.max_players} لاعبين)` : 'Single Player فقط'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
              <button
                className="btn btn-icon btn-secondary"
                style={{ width: 30, height: 30 }}
                onClick={() => {
                  setEditingGame(g);
                  setName(g.name);
                  setPlatform(g.platform);
                  setCategory(g.category);
                  setMultiplayerSupport(!!g.multiplayer_support);
                  setMaxPlayers(g.max_players);
                  setNotes(g.notes || '');
                  setModalOpen(true);
                }}
              >
                <Edit size={13} />
              </button>
              <button
                className="btn btn-icon btn-secondary"
                style={{ width: 30, height: 30 }}
                onClick={() => handleDelete(g.id)}
              >
                <Trash2 size={13} style={{ color: '#ef4444' }} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingGame ? 'تعديل بيانات اللعبة' : 'إضافة لعبة جديدة'}
        maxWidth="500px"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>إلغاء</button>
            <button className="btn btn-success" onClick={handleSaveGame}>حفظ اللعبة</button>
          </>
        }
      >
        <form onSubmit={handleSaveGame}>
          <div className="form-group">
            <label className="form-label">اسم اللعبة:</label>
            <input type="text" className="form-control" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <label className="form-label">المنصة (Platform):</label>
              <select className="form-control" value={platform} onChange={(e) => setPlatform(e.target.value)}>
                <option value="PS5">PlayStation 5</option>
                <option value="PS4">PlayStation 4</option>
                <option value="Cross-Gen">Cross-Gen (PS4 & PS5)</option>
              </select>
            </div>
            <div>
              <label className="form-label">التصنيف:</label>
              <input type="text" className="form-control" value={category} onChange={(e) => setCategory(e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <label className="form-label">أقصى عدد لاعبين:</label>
              <input type="number" min="1" max="4" className="form-control" value={maxPlayers} onChange={(e) => setMaxPlayers(Number(e.target.value))} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.75rem' }}>
              <input type="checkbox" id="mp_support" checked={multiplayerSupport} onChange={(e) => setMultiplayerSupport(e.target.checked)} />
              <label htmlFor="mp_support" style={{ cursor: 'pointer', fontWeight: 700 }}>تدعم Multiplayer</label>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
