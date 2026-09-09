import React, { useState, useEffect } from 'react';
import {
  ShoppingBag, Search, Plus, Minus, Trash2, Printer, CheckCircle2,
  DollarSign, Coffee, Gamepad2, ArrowRight
} from 'lucide-react';
import Modal from '../components/Modal';
import ThermalReceipt from '../components/ThermalReceipt';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function POS() {
  const { t, lang } = useLanguage();
  const { authFetch } = useAuth();

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [targetDestination, setTargetDestination] = useState('standalone'); // 'standalone' or sessionId
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [completedInvoice, setCompletedInvoice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [successNotice, setSuccessNotice] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = async () => {
    try {
      const catRes = await authFetch('/api/products/categories');
      const catData = await catRes.json();
      if (catData.success) setCategories(catData.categories);

      const prodRes = await authFetch('/api/products?activeOnly=true');
      const prodData = await prodRes.json();
      if (prodData.success) setProducts(prodData.products);

      // Load active sessions on floor to allow attaching drinks directly to a console!
      const devRes = await authFetch('/api/devices');
      const devData = await devRes.json();
      if (devData.success) {
        const running = devData.devices
          .filter(d => d.activeSession)
          .map(d => ({
            deviceId: d.id,
            deviceName: d.name,
            sessionId: d.activeSession.id,
            customerName: d.activeSession.customerName
          }));
        setActiveSessions(running);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Add item to cart
  const addToCart = (product) => {
    if (product.stock_quantity <= 0) return;
    setCart(prev => {
      const exists = prev.find(item => item.productId === product.id);
      if (exists) {
        if (exists.quantity >= product.stock_quantity) return prev;
        return prev.map(item => item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      } else {
        return [...prev, {
          productId: product.id,
          name: product.name,
          price: product.selling_price,
          quantity: 1,
          maxStock: product.stock_quantity
        }];
      }
    });
  };

  const updateQuantity = (productId, delta) => {
    setCart(prev => prev.map(item => {
      if (item.productId === productId) {
        const newQty = item.quantity + delta;
        if (newQty <= 0) return null;
        if (newQty > item.maxStock) return item;
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(Boolean));
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(i => i.productId !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setPaidAmount('');
    setDiscountAmount(0);
    setErrorMsg('');
  };

  // Calculations
  const subtotal = cart.reduce((acc, curr) => acc + curr.price * curr.quantity, 0);
  const discount = Number(discountAmount) || 0;
  const grandTotal = Math.max(0, subtotal - discount);
  const numPaid = Number(paidAmount) || grandTotal;
  const changeDue = Math.max(0, Math.round((numPaid - grandTotal) * 100) / 100);

  // Submit Order
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setLoading(true);
    setErrorMsg('');
    setSuccessNotice('');

    try {
      if (targetDestination === 'standalone') {
        // Standalone POS sale
        const res = await authFetch('/api/invoices/standalone', {
          method: 'POST',
          body: JSON.stringify({
            items: cart.map(i => ({ productId: i.productId, quantity: i.quantity })),
            paymentMethod,
            paidAmount: numPaid,
            discountAmount: discount
          })
        });

        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'فشل إتمام العملية');

        setCompletedInvoice(data.invoice);
        clearCart();
        loadData();
      } else {
        // Attach to active PlayStation console session!
        for (const item of cart) {
          const res = await authFetch(`/api/sessions/${targetDestination}/orders`, {
            method: 'POST',
            body: JSON.stringify({ productId: item.productId, quantity: item.quantity })
          });
          const d = await res.json();
          if (!d.success) throw new Error(d.message);
        }

        const devTarget = activeSessions.find(s => s.sessionId === targetDestination);
        setSuccessNotice(`تمت إضافة جميع الطلبات لحساب جهاز ${devTarget?.deviceName} (${devTarget?.customerName}) بنجاح!`);
        clearCart();
        loadData();
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p => {
    if (selectedCategory !== 'all' && p.category_id !== selectedCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchBarcode = p.barcode?.toLowerCase().includes(q);
      const matchSku = p.sku?.toLowerCase().includes(q);
      if (!matchName && !matchBarcode && !matchSku) return false;
    }
    return true;
  });

  return (
    <div>
      <div className="pos-layout">
        {/* Left: Products Catalog & Categories */}
        <div className="pos-catalog">
          {/* Categories bar */}
          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.65rem', marginBottom: '0.75rem' }}>
            <button
              className={`filter-chip ${selectedCategory === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('all')}
            >
              جميع المنتجات ({products.length})
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

          {/* Search bar */}
          <div style={{ position: 'relative', marginBottom: '1rem' }}>
            <Search size={16} className="global-search-icon" />
            <input
              type="text"
              className="global-search-input"
              placeholder="بحث بالاسم أو الباركود..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          {/* Products Grid */}
          <div className="products-grid">
            {filteredProducts.map(p => {
              const isOut = p.stock_quantity <= 0;
              return (
                <div
                  key={p.id}
                  className="product-card"
                  style={{ opacity: isOut ? 0.5 : 1, cursor: isOut ? 'not-allowed' : 'pointer' }}
                  onClick={() => addToCart(p)}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '0.35rem' }}>
                      <span>{p.category_name}</span>
                      <span className={isOut ? 'font-digits' : ''} style={{ color: isOut ? '#ef4444' : '#10b981' }}>
                        {isOut ? 'نفذت' : `${p.stock_quantity} ${p.unit}`}
                      </span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', lineHeight: 1.3 }}>{p.name}</div>
                  </div>
                  <div className="product-price">
                    {p.selling_price} <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{t('currency')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Cart & Checkout Drawer */}
        <div className="pos-cart">
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800 }}>
              <ShoppingBag size={20} style={{ color: '#3b82f6' }} />
              <span>سلة الطلبات ({cart.length})</span>
            </div>
            {cart.length > 0 && (
              <button
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                onClick={clearCart}
              >
                تفريغ السلة
              </button>
            )}
          </div>

          {successNotice && (
            <div style={{ margin: '0.75rem', padding: '0.65rem', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(16, 185, 129, 0.3)', fontSize: '0.85rem' }}>
              {successNotice}
            </div>
          )}
          {errorMsg && (
            <div style={{ margin: '0.75rem', padding: '0.65rem', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(239, 68, 68, 0.3)', fontSize: '0.85rem' }}>
              {errorMsg}
            </div>
          )}

          {/* Cart Items List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>
            {cart.length === 0 ? (
              <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-dim)' }}>
                <Coffee size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
                <p>السلة فارغة. اضغط على أي منتج من القائمة لإضافته هنا.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {cart.map(item => (
                  <div
                    key={item.productId}
                    style={{
                      background: 'var(--bg-surface-2)',
                      padding: '0.65rem 0.75rem',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      border: '1px solid var(--border-subtle)'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{item.name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                        {item.price} ج × {item.quantity} = <span style={{ color: '#60a5fa', fontWeight: 700 }}>{item.price * item.quantity} ج</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <button
                        className="btn btn-icon btn-secondary"
                        style={{ width: 26, height: 26 }}
                        onClick={() => updateQuantity(item.productId, -1)}
                      >
                        <Minus size={12} />
                      </button>
                      <span className="font-digits" style={{ fontWeight: 800, minWidth: 20, textAlign: 'center' }}>
                        {item.quantity}
                      </span>
                      <button
                        className="btn btn-icon btn-secondary"
                        style={{ width: 26, height: 26 }}
                        onClick={() => updateQuantity(item.productId, 1)}
                      >
                        <Plus size={12} />
                      </button>
                      <button
                        className="btn btn-icon btn-secondary"
                        style={{ width: 26, height: 26, marginLeft: '0.35rem' }}
                        onClick={() => removeFromCart(item.productId)}
                      >
                        <Trash2 size={12} style={{ color: '#ef4444' }} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cart Checkout Footer */}
          <div style={{ padding: '1rem', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-surface-2)' }}>
            {/* Target Destination: Standalone sale vs Attach to Console */}
            <div style={{ marginBottom: '0.75rem' }}>
              <label className="form-label" style={{ fontSize: '0.78rem' }}>وجهة الطلب (Destination):</label>
              <select
                className="form-control"
                value={targetDestination}
                onChange={(e) => setTargetDestination(e.target.value)}
                style={{ fontSize: '0.85rem' }}
              >
                <option value="standalone">🧾 بيع مباشر بالكافيه (فاتورة فورية)</option>
                {activeSessions.map(s => (
                  <option key={s.sessionId} value={s.sessionId}>
                    🎮 إضافة لحساب: {s.deviceName} ({s.customerName})
                  </option>
                ))}
              </select>
            </div>

            {/* Totals */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>المجموع:</span>
              <span className="font-digits" style={{ fontWeight: 700 }}>{subtotal} {t('currency')}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.65rem', fontSize: '1.25rem', fontWeight: 900 }}>
              <span>الإجمالي:</span>
              <span className="font-digits" style={{ color: '#fbbf24' }}>{grandTotal} {t('currency')}</span>
            </div>

            {targetDestination === 'standalone' && (
              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="المدفوع نقداً..."
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    style={{ fontSize: '1rem', fontWeight: 700 }}
                  />
                  <div
                    style={{
                      background: 'rgba(16, 185, 129, 0.15)',
                      padding: '0 0.75rem',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      alignItems: 'center',
                      color: '#10b981',
                      fontWeight: 800,
                      fontSize: '0.9rem',
                      minWidth: 100,
                      justifyContent: 'center'
                    }}
                  >
                    باقي: {changeDue}
                  </div>
                </div>
              </div>
            )}

            <button
              className="btn btn-success"
              style={{ width: '100%', padding: '0.75rem' }}
              onClick={handleCheckout}
              disabled={cart.length === 0 || loading}
            >
              <CheckCircle2 size={18} />
              {targetDestination === 'standalone' ? 'إصدار الفاتورة والمحاسبة' : 'إضافة الطلبات للجهاز'}
            </button>
          </div>
        </div>
      </div>

      {/* Printable Receipt Modal for Completed POS Sale */}
      {completedInvoice && (
        <Modal
          isOpen={true}
          onClose={() => setCompletedInvoice(null)}
          title={`فاتورة مبيعات: ${completedInvoice.invoice_number}`}
          maxWidth="460px"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setCompletedInvoice(null)}>
                إغلاق
              </button>
              <button className="btn btn-primary" onClick={() => window.print()}>
                <Printer size={16} />
                طباعة إيصال 80mm
              </button>
            </>
          }
        >
          <ThermalReceipt invoice={completedInvoice} />
        </Modal>
      )}
    </div>
  );
}
