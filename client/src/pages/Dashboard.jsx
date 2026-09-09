import React, { useState, useEffect } from 'react';
import {
  Monitor, Play, Clock, DollarSign, ShoppingBag, Calendar,
  TrendingUp, TrendingDown, Users, Gamepad2, Sparkles, AlertTriangle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function Dashboard({ onNavigateFloor }) {
  const { t, lang } = useLanguage();
  const { authFetch } = useAuth();

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const res = await authFetch('/api/reports/dashboard');
      const data = await res.json();
      if (data.success) {
        setSummary(data.summary);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const timer = setInterval(fetchDashboardData, 10000); // 10s auto refresh
    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)' }}>جاري تحميل لوحة التحكم...</div>;
  }

  const d = summary?.devices || {};
  const s = summary?.todaySales || {};
  const shift = summary?.currentShift;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Header */}
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 900 }}>لوحة الإحصائيات العامة (Dashboard)</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
          متابعة حية وشاملة لمبيعات وأجهزة ومصروفات اليوم في مركز الألعاب
        </p>
      </div>

      {/* Row 1: Devices Live Status KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem' }}>
        {/* Total */}
        <div className="glass-panel" style={{ padding: '1.1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-dim)', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>إجمالي الأجهزة</span>
            <Monitor size={18} style={{ color: '#60a5fa' }} />
          </div>
          <div className="font-digits" style={{ fontSize: '1.75rem', fontWeight: 900 }}>{d.total || 0}</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>أجهزة الصالة والغرف</span>
        </div>

        {/* Available */}
        <div className="glass-panel" style={{ padding: '1.1rem', borderRight: '3px solid #10b981' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#10b981', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>الأجهزة المتاحة</span>
            <span className="pulse-dot available" />
          </div>
          <div className="font-digits" style={{ fontSize: '1.75rem', fontWeight: 900, color: '#10b981' }}>{d.available || 0}</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>جاهزة للاستقبال</span>
        </div>

        {/* Running */}
        <div className="glass-panel" style={{ padding: '1.1rem', borderRight: '3px solid #ef4444' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#ef4444', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>الأجهزة المشغولة</span>
            <span className="pulse-dot running" />
          </div>
          <div className="font-digits" style={{ fontSize: '1.75rem', fontWeight: 900, color: '#ef4444' }}>
            {(d.running || 0) + (d.paused || 0)}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{summary?.activeSessionsCount || 0} جلسة نشطة الآن</span>
        </div>

        {/* Reserved */}
        <div className="glass-panel" style={{ padding: '1.1rem', borderRight: '3px solid #f59e0b' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#f59e0b', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>الأجهزة المحجوزة</span>
            <Calendar size={18} />
          </div>
          <div className="font-digits" style={{ fontSize: '1.75rem', fontWeight: 900, color: '#f59e0b' }}>{d.reserved || 0}</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{summary?.todayBookingsCount || 0} حجز مؤكد لليوم</span>
        </div>

        {/* Maintenance */}
        <div className="glass-panel" style={{ padding: '1.1rem', borderRight: '3px solid #64748b' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-dim)', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>صيانة / متوقفة</span>
            <AlertTriangle size={18} />
          </div>
          <div className="font-digits" style={{ fontSize: '1.75rem', fontWeight: 900, color: '#94a3b8' }}>
            {(d.maintenance || 0) + (d.disabled || 0)}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>تحت المتابعة الفنية</span>
        </div>
      </div>

      {/* Row 2: Today's Financial Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        {/* Total Revenue */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>إجمالي مبيعات اليوم</span>
          <div className="font-digits" style={{ fontSize: '1.9rem', fontWeight: 900, color: '#60a5fa', margin: '0.35rem 0' }}>
            {s.total_sales || 0} <span style={{ fontSize: '1rem', fontWeight: 700 }}>{t('currency')}</span>
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>من عدد {s.invoice_count || 0} فاتورة تم إصدارها</span>
        </div>

        {/* Gaming Revenue */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>مبيعات اللعب (Gaming)</span>
          <div className="font-digits" style={{ fontSize: '1.9rem', fontWeight: 900, color: '#a78bfa', margin: '0.35rem 0' }}>
            {s.gaming_sales || 0} <span style={{ fontSize: '1rem', fontWeight: 700 }}>{t('currency')}</span>
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>إيراد ساعات البلايستيشن</span>
        </div>

        {/* Cafe & Drinks Revenue */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>مبيعات الكافيه والمشروبات</span>
          <div className="font-digits" style={{ fontSize: '1.9rem', fontWeight: 900, color: '#38bdf8', margin: '0.35rem 0' }}>
            {s.products_sales || 0} <span style={{ fontSize: '1rem', fontWeight: 700 }}>{t('currency')}</span>
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>المشروبات والمأكولات والسناكس</span>
        </div>

        {/* Expenses */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>مصروفات اليوم</span>
          <div className="font-digits" style={{ fontSize: '1.9rem', fontWeight: 900, color: '#ef4444', margin: '0.35rem 0' }}>
            {s.expenses || 0} <span style={{ fontSize: '1rem', fontWeight: 700 }}>{t('currency')}</span>
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>نثريات ومشتريات تشغيلية</span>
        </div>

        {/* Net Profit */}
        <div className="glass-panel" style={{ padding: '1.25rem', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), var(--bg-surface-1))', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
          <span style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 800 }}>صافي الإيرادات التقديري</span>
          <div className="font-digits" style={{ fontSize: '1.9rem', fontWeight: 900, color: '#10b981', margin: '0.35rem 0' }}>
            {s.netProfit || 0} <span style={{ fontSize: '1rem', fontWeight: 700 }}>{t('currency')}</span>
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>المبيعات مطروحاً منها المصروفات</span>
        </div>
      </div>

      {/* Row 3: Active Shift Banner */}
      <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 46, height: 46, borderRadius: 'var(--radius-md)', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa' }}>
            <Clock size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>حالة الشيفت الحالي:</h3>
              <span className="badge badge-available">
                {shift ? 'مفتوح ونشط' : 'لا يوجد شيفت مفتوح'}
              </span>
            </div>
            {shift ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                الكاشير: <strong style={{ color: '#fff' }}>{shift.cashier_name}</strong> • بدأ الساعة: {shift.start_time?.slice(11, 16)} • الكاش المتوقع بالدرج: <strong style={{ color: '#fbbf24' }}>{shift.expected_cash} ج.م</strong>
              </p>
            ) : (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                يرجى فتح شيفت جديد لتسجيل المبيعات في درج النقدية
              </p>
            )}
          </div>
        </div>

        <button className="btn btn-primary" onClick={onNavigateFloor}>
          <Gamepad2 size={16} />
          الانتقال إلى صالة الألعاب (Gaming Floor)
        </button>
      </div>
    </div>
  );
}
