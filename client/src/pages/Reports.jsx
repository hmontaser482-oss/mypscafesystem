import React, { useState, useEffect } from 'react';
import {
  BarChart3, Download, Calendar, DollarSign, Gamepad2, ShoppingBag,
  Clock, TrendingUp, Filter, RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function Reports() {
  const { t, lang } = useLanguage();
  const { authFetch } = useAuth();

  const [activeTab, setActiveTab] = useState('sales'); // 'sales', 'gaming', 'products', 'peak'
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

  const [salesData, setSalesData] = useState(null);
  const [gamingData, setGamingData] = useState(null);
  const [productsData, setProductsData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadReport = async () => {
    setLoading(true);
    try {
      if (activeTab === 'sales') {
        const res = await authFetch(`/api/reports/sales?startDate=${startDate}&endDate=${endDate}`);
        const d = await res.json();
        if (d.success) setSalesData(d);
      } else if (activeTab === 'gaming' || activeTab === 'peak') {
        const res = await authFetch(`/api/reports/gaming?startDate=${startDate}&endDate=${endDate}`);
        const d = await res.json();
        if (d.success) setGamingData(d);
      } else if (activeTab === 'products') {
        const res = await authFetch(`/api/reports/products?startDate=${startDate}&endDate=${endDate}`);
        const d = await res.json();
        if (d.success) setProductsData(d);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [activeTab, startDate, endDate]);

  const handleExportCSV = (type) => {
    window.open(`/api/reports/export-csv?type=${type}&startDate=${startDate}&endDate=${endDate}`, '_blank');
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900 }}>التقارير التحليلية والإحصائيات (Reports & Analytics)</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
            تحليل الإيرادات، ساعات تشغيل الأجهزة، المنتجات الأكثر ربحية، وساعات الذروة
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button className="btn btn-secondary" onClick={() => handleExportCSV('invoices')}>
            <Download size={15} />
            تصدير فواتير Excel/CSV
          </button>
          <button className="btn btn-secondary" onClick={() => handleExportCSV('gaming')}>
            <Download size={15} />
            تصدير ساعات اللعب
          </button>
        </div>
      </div>

      {/* Date Range & Tab Selector */}
      <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className={`btn ${activeTab === 'sales' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('sales')}
          >
            تقرير المبيعات اليومي
          </button>
          <button
            className={`btn ${activeTab === 'gaming' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('gaming')}
          >
            إيراد الأجهزة والرومات
          </button>
          <button
            className={`btn ${activeTab === 'products' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('products')}
          >
            المنتجات والأرباح
          </button>
          <button
            className={`btn ${activeTab === 'peak' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('peak')}
          >
            ساعات الذروة (Peak Hours)
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>الفترة من:</span>
          <input
            type="date"
            className="form-control"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{ width: 145 }}
          />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>إلى:</span>
          <input
            type="date"
            className="form-control"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{ width: 145 }}
          />
          <button className="btn btn-icon btn-secondary" onClick={loadReport} title="تحديث">
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* TAB 1: SALES BREAKDOWN */}
      {activeTab === 'sales' && (
        <div className="glass-panel" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: lang === 'ar' ? 'right' : 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                <th style={{ padding: '0.75rem 1rem' }}>التاريخ</th>
                <th style={{ padding: '0.75rem 1rem' }}>عدد الفواتير</th>
                <th style={{ padding: '0.75rem 1rem' }}>إيراد اللعب</th>
                <th style={{ padding: '0.75rem 1rem' }}>إيراد الكافيه</th>
                <th style={{ padding: '0.75rem 1rem' }}>الخصومات</th>
                <th style={{ padding: '0.75rem 1rem' }}>صافي الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {salesData?.dailyBreakdown?.length > 0 ? (
                salesData.dailyBreakdown.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', fontSize: '0.88rem' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>{row.report_date}</td>
                    <td style={{ padding: '0.75rem 1rem' }} className="font-digits">{row.invoices_count}</td>
                    <td style={{ padding: '0.75rem 1rem', color: '#60a5fa' }} className="font-digits">{row.gaming_revenue} ج</td>
                    <td style={{ padding: '0.75rem 1rem', color: '#38bdf8' }} className="font-digits">{row.products_revenue} ج</td>
                    <td style={{ padding: '0.75rem 1rem', color: '#ef4444' }} className="font-digits">-{row.discounts} ج</td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 800, color: '#fbbf24' }} className="font-digits">{row.grand_total} ج</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)' }}>
                    لا توجد بيانات مبيعات في هذه الفترة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: GAMING REVENUE */}
      {activeTab === 'gaming' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '0.75rem' }}>الإيرادات وساعات التشغيل لكل جهاز</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: lang === 'ar' ? 'right' : 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-dim)', fontSize: '0.82rem' }}>
                  <th style={{ padding: '0.5rem' }}>الجهاز</th>
                  <th style={{ padding: '0.5rem' }}>ساعات اللعب</th>
                  <th style={{ padding: '0.5rem' }}>الإيراد</th>
                </tr>
              </thead>
              <tbody>
                {gamingData?.perDevice?.map(d => (
                  <tr key={d.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', fontSize: '0.85rem' }}>
                    <td style={{ padding: '0.65rem 0.5rem', fontWeight: 700 }}>{d.name}</td>
                    <td style={{ padding: '0.65rem 0.5rem' }} className="font-digits">{Math.round(d.hours_played * 10) / 10} س</td>
                    <td style={{ padding: '0.65rem 0.5rem', color: '#10b981', fontWeight: 800 }} className="font-digits">{d.revenue} ج</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '0.75rem' }}>الإيرادات بحسب المجموعات والرومات</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: lang === 'ar' ? 'right' : 'left', marginBottom: '1.5rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-dim)', fontSize: '0.82rem' }}>
                  <th style={{ padding: '0.5rem' }}>المجموعة</th>
                  <th style={{ padding: '0.5rem' }}>الجلسات</th>
                  <th style={{ padding: '0.5rem' }}>الإيراد</th>
                </tr>
              </thead>
              <tbody>
                {gamingData?.perGroup?.map((g, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', fontSize: '0.85rem' }}>
                    <td style={{ padding: '0.65rem 0.5rem', fontWeight: 700 }}>{g.group_name}</td>
                    <td style={{ padding: '0.65rem 0.5rem' }} className="font-digits">{g.sessions_count}</td>
                    <td style={{ padding: '0.65rem 0.5rem', color: '#60a5fa', fontWeight: 800 }} className="font-digits">{g.revenue} ج</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h4 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '0.5rem' }}>Single مقابل Multiplayer:</h4>
            <div style={{ display: 'flex', gap: '1rem' }}>
              {gamingData?.singleVsMulti?.map((m, i) => (
                <div key={i} style={{ flex: 1, background: 'var(--bg-surface-2)', padding: '0.85rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', display: 'block' }}>
                    {m.session_type === 'multi' ? 'Multiplayer (جماعي)' : 'Single (فردي)'}
                  </span>
                  <span className="font-digits" style={{ fontSize: '1.35rem', fontWeight: 900, color: '#fbbf24' }}>
                    {m.revenue} ج
                  </span>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                    {m.count} جلسة ({Math.round(m.hours)} ساعة)
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PRODUCTS & PROFITS */}
      {activeTab === 'products' && (
        <div className="glass-panel" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: lang === 'ar' ? 'right' : 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                <th style={{ padding: '0.75rem 1rem' }}>المنتج</th>
                <th style={{ padding: '0.75rem 1rem' }}>التصنيف</th>
                <th style={{ padding: '0.75rem 1rem' }}>الكمية المباعة</th>
                <th style={{ padding: '0.75rem 1rem' }}>إجمالي المبيعات</th>
                <th style={{ padding: '0.75rem 1rem' }}>إجمالي التكلفة</th>
                <th style={{ padding: '0.75rem 1rem' }}>صافي الأرباح</th>
                <th style={{ padding: '0.75rem 1rem' }}>الرصيد الحالي</th>
              </tr>
            </thead>
            <tbody>
              {productsData?.topSelling?.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', fontSize: '0.88rem' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>{p.name}</td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-dim)' }}>{p.category_name}</td>
                  <td style={{ padding: '0.75rem 1rem' }} className="font-digits">{p.total_sold} {p.unit}</td>
                  <td style={{ padding: '0.75rem 1rem' }} className="font-digits">{p.total_revenue} ج</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#ef4444' }} className="font-digits">{p.total_cost} ج</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#10b981', fontWeight: 800 }} className="font-digits">+{p.total_profit} ج</td>
                  <td style={{ padding: '0.75rem 1rem' }} className="font-digits">{p.stock_quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 4: PEAK HOURS ANALYSIS */}
      {activeTab === 'peak' && (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.5rem' }}>تحليل ساعات الذروة والازدحام (Peak Hours Histogram)</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '1.5rem' }}>
            مخطط يوضح أكثر أوقات اليوم نشاطاً وإقبالاً من الزبائن لتنظيم طاقم العمل وتفعيل قواعد تسعير الذروة
          </p>

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', height: 200, paddingTop: '2rem' }}>
            {Array.from({ length: 24 }).map((_, hour) => {
              const hourStr = String(hour).padStart(2, '0') + ':00';
              const match = gamingData?.peakHours?.find(x => x.hour === hourStr);
              const count = match ? match.sessions_count : 0;
              const maxCount = Math.max(...(gamingData?.peakHours?.map(x => x.sessions_count) || [1]), 5);
              const heightPercent = Math.max(8, (count / maxCount) * 100);

              return (
                <div key={hour} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                  {count > 0 && (
                    <span className="font-digits" style={{ fontSize: '0.72rem', color: '#60a5fa', marginBottom: '0.25rem', fontWeight: 800 }}>
                      {count}
                    </span>
                  )}
                  <div
                    style={{
                      width: '80%',
                      height: `${heightPercent}%`,
                      background: count > 3 ? 'linear-gradient(180deg, #ef4444, #f59e0b)' : 'linear-gradient(180deg, #3b82f6, rgba(59, 130, 246, 0.3))',
                      borderRadius: '3px 3px 0 0',
                      transition: 'height 0.3s'
                    }}
                    title={`${hourStr}: ${count} جلسة`}
                  />
                  <span className="font-digits" style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '0.35rem' }}>
                    {hour}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
