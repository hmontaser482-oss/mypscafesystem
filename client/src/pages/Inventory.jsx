import React, { useState, useEffect } from 'react';
import {
  Package, Plus, AlertTriangle, ArrowDownRight, ArrowUpRight,
  Search, RefreshCw, DollarSign, TrendingUp, Layers
} from 'lucide-react';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function Inventory() {
  const { t, lang } = useLanguage();
  const { authFetch } = useAuth();

  const [overview, setOverview] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Modals
  const [prodModalOpen, setProdModalOpen] = useState(false);
  const [stockTxModalOpen, setStockTxModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [txType, setTxType] = useState('stock_in'); // 'stock_in', 'stock_out', 'damaged', 'waste', 'adjustment'
  const [txQty, setTxQty] = useState(10);
  const [txCost, setTxCost] = useState('');
  const [txNotes, setTxNotes] = useState('');

  // Product form
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [sellingPrice, setSellingPrice] = useState(25);
  const [costPrice, setCostPrice] = useState(16);
  const [initialStock, setInitialStock] = useState(24);
  const [minStock, setMinStock] = useState(5);
  const [unit, setUnit] = useState('قطعة');
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = async () => {
    try {
      const [oRes, cRes] = await Promise.all([
        authFetch('/api/inventory/overview'),
        authFetch('/api/products/categories')
      ]);
      const [oData, cData] = await Promise.all([oRes.json(), cRes.json()]);
      if (oData.success) setOverview(oData);
      if (cData.success) setCategories(cData.categories);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const res = await authFetch('/api/products', {
        method: 'POST',
        body: JSON.stringify({
          name,
          category_id: categoryId,
          selling_price: Number(sellingPrice),
          cost_price: Number(costPrice),
          stock_quantity: Number(initialStock),
          min_stock_alert: Number(minStock),
          unit
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);

      setProdModalOpen(false);
      setName('');
      loadData();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleStockTransaction = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const res = await authFetch('/api/inventory/transaction', {
        method: 'POST',
        body: JSON.stringify({
          productId: selectedProduct.id,
          type: txType,
          quantity: Number(txQty),
          unitCost: txCost ? Number(txCost) : null,
          notes: txNotes
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);

      setStockTxModalOpen(false);
      loadData();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const stats = overview?.stats || {};
  const products = overview?.allProducts || [];

  const filtered = products.filter(p => {
    if (selectedCategory !== 'all' && p.category_id !== selectedCategory) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!p.name.toLowerCase().includes(q) && !p.sku?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900 }}>إدارة المخزون والمنتجات (Inventory)</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
            متابعة أرصدة المشروبات والمأكولات، توريد بضاعة جديدة، وتسجيل التوالف
          </p>
        </div>

        <button
          className="btn btn-success"
          onClick={() => {
            setCategoryId(categories[0]?.id || '');
            setProdModalOpen(true);
          }}
        >
          <Plus size={16} />
          إضافة منتج جديد
        </button>
      </div>

      {/* Valuation KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '1rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>قيمة المخزون بسعر التكلفة</span>
          <div className="font-digits" style={{ fontSize: '1.5rem', fontWeight: 900, color: '#f59e0b', margin: '0.2rem 0' }}>
            {stats.totalCostValue || 0} ج.م
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>رأس المال المجمد بالبضاعة</span>
        </div>

        <div className="glass-panel" style={{ padding: '1rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>قيمة المخزون بسعر البيع</span>
          <div className="font-digits" style={{ fontSize: '1.5rem', fontWeight: 900, color: '#60a5fa', margin: '0.2rem 0' }}>
            {stats.totalRetailValue || 0} ج.م
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>إجمالي العائد عند البيع بالكامل</span>
        </div>

        <div className="glass-panel" style={{ padding: '1rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>الأرباح المتوقعة من المخزون</span>
          <div className="font-digits" style={{ fontSize: '1.5rem', fontWeight: 900, color: '#10b981', margin: '0.2rem 0' }}>
            +{stats.estimatedProfit || 0} ج.م
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>هامش الربح الإجمالي</span>
        </div>

        <div className="glass-panel" style={{ padding: '1rem', borderRight: '3px solid #ef4444' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>تنبيهات النواقص (Low Stock)</span>
          <div className="font-digits" style={{ fontSize: '1.5rem', fontWeight: 900, color: '#ef4444', margin: '0.2rem 0' }}>
            {(stats.lowStockCount || 0) + (stats.outOfStockCount || 0)} منتج
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>أوشكت على النفاذ بالمخزن</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          className="form-control"
          placeholder="بحث بالاسم أو الباركود..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 280 }}
        />
        <button
          className={`filter-chip ${selectedCategory === 'all' ? 'active' : ''}`}
          onClick={() => setSelectedCategory('all')}
        >
          الكل ({products.length})
        </button>
        {categories.map(c => (
          <button
            key={c.id}
            className={`filter-chip ${selectedCategory === c.id ? 'active' : ''}`}
            onClick={() => setSelectedCategory(c.id)}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Products Table */}
      <div className="glass-panel" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: lang === 'ar' ? 'right' : 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
              <th style={{ padding: '0.75rem 1rem' }}>المنتج</th>
              <th style={{ padding: '0.75rem 1rem' }}>التصنيف</th>
              <th style={{ padding: '0.75rem 1rem' }}>سعر التكلفة</th>
              <th style={{ padding: '0.75rem 1rem' }}>سعر البيع</th>
              <th style={{ padding: '0.75rem 1rem' }}>الربح / قطعة</th>
              <th style={{ padding: '0.75rem 1rem' }}>الرصيد المتوفر</th>
              <th style={{ padding: '0.75rem 1rem' }}>إجراءات المخزون</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => {
              const isLow = p.stock_quantity <= p.min_stock_alert && p.stock_quantity > 0;
              const isOut = p.stock_quantity <= 0;
              const profit = Math.round((p.selling_price - p.cost_price) * 100) / 100;

              return (
                <tr key={p.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', fontSize: '0.9rem' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>
                    {p.name}
                    {isLow && <span className="badge badge-reserved" style={{ marginRight: '0.5rem', fontSize: '0.72rem' }}>أوشك على النفاد</span>}
                    {isOut && <span className="badge" style={{ marginRight: '0.5rem', fontSize: '0.72rem', background: '#ef4444' }}>نفذ من المخزن</span>}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>{p.category_name}</td>
                  <td style={{ padding: '0.75rem 1rem' }} className="font-digits">{p.cost_price} ج</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#60a5fa', fontWeight: 800 }} className="font-digits">{p.selling_price} ج</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#10b981', fontWeight: 700 }} className="font-digits">+{profit} ج</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span className="font-digits" style={{ fontWeight: 800, fontSize: '1.05rem', color: isOut ? '#ef4444' : isLow ? '#f59e0b' : '#fff' }}>
                      {p.stock_quantity}
                    </span> {p.unit}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: '0.8rem', padding: '0.35rem 0.65rem' }}
                      onClick={() => {
                        setSelectedProduct(p);
                        setTxType('stock_in');
                        setTxQty(10);
                        setTxCost(String(p.cost_price));
                        setTxNotes('');
                        setStockTxModalOpen(true);
                      }}
                    >
                      توريد / تسوية
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Stock Transaction Modal */}
      <Modal
        isOpen={stockTxModalOpen}
        onClose={() => setStockTxModalOpen(false)}
        title={`حركة مخزون: ${selectedProduct?.name}`}
        maxWidth="500px"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setStockTxModalOpen(false)}>إلغاء</button>
            <button className="btn btn-primary" onClick={handleStockTransaction}>تأكيد الحركة</button>
          </>
        }
      >
        <form onSubmit={handleStockTransaction}>
          <div className="form-group">
            <label className="form-label">نوع الحركة:</label>
            <select className="form-control" value={txType} onChange={(e) => setTxType(e.target.value)}>
              <option value="stock_in">📦 توريد شحنة جديدة (Stock In)</option>
              <option value="adjustment">⚙️ تسوية وجرد (Adjust to target)</option>
              <option value="damaged">💥 هالك وتالف (Damaged)</option>
              <option value="waste">🗑️ استهلاك ضيافة / بوفيه (Waste)</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <label className="form-label">الكمية:</label>
              <input type="number" min="1" className="form-control" value={txQty} onChange={(e) => setTxQty(Number(e.target.value))} required />
            </div>
            {txType === 'stock_in' && (
              <div>
                <label className="form-label">سعر تكلفة الشراء للقطعة:</label>
                <input type="number" step="0.5" className="form-control" value={txCost} onChange={(e) => setTxCost(e.target.value)} />
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">ملاحظات الحركة:</label>
            <input type="text" className="form-control" placeholder="فاتورة مورد، سبب التلف..." value={txNotes} onChange={(e) => setTxNotes(e.target.value)} />
          </div>
        </form>
      </Modal>

      {/* New Product Modal */}
      <Modal
        isOpen={prodModalOpen}
        onClose={() => setProdModalOpen(false)}
        title="إضافة منتج جديد للمخزن"
        maxWidth="540px"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setProdModalOpen(false)}>إلغاء</button>
            <button className="btn btn-success" onClick={handleSaveProduct}>حفظ المنتج</button>
          </>
        }
      >
        <form onSubmit={handleSaveProduct}>
          <div className="form-group">
            <label className="form-label">اسم المنتج:</label>
            <input type="text" className="form-control" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <label className="form-label">التصنيف:</label>
              <select className="form-control" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">الوحدة:</label>
              <input type="text" className="form-control" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="كانز، علبة، كوب..." />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <label className="form-label">سعر البيع للجمهور (ج.م):</label>
              <input type="number" step="0.5" className="form-control" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} required />
            </div>
            <div>
              <label className="form-label">سعر التكلفة (ج.م):</label>
              <input type="number" step="0.5" className="form-control" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} required />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <label className="form-label">الكمية الافتتاحية:</label>
              <input type="number" className="form-control" value={initialStock} onChange={(e) => setInitialStock(e.target.value)} />
            </div>
            <div>
              <label className="form-label">حد تنبيه النواقص (Min Alert):</label>
              <input type="number" className="form-control" value={minStock} onChange={(e) => setMinStock(e.target.value)} />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
