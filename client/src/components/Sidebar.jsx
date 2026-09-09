import React from 'react';
import {
  Gamepad2, LayoutDashboard, ShoppingBag, CalendarDays, Monitor,
  Package, Receipt, Clock, Wallet, Users, Disc3, Wrench,
  BarChart3, UserCheck, ShieldAlert, Settings, ChevronRight, ChevronLeft
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ activePage, setActivePage, collapsed, setCollapsed }) {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const role = user?.role || 'cashier';

  const navItems = [
    { id: 'gaming-floor', label: t('gamingFloor'), icon: Gamepad2, highlight: true },
    { id: 'dashboard', label: t('dashboard'), icon: LayoutDashboard },
    { id: 'pos', label: t('pos'), icon: ShoppingBag },
    { id: 'bookings', label: t('bookings'), icon: CalendarDays },
    { id: 'devices', label: t('devices'), icon: Monitor },
    { id: 'inventory', label: t('inventory'), icon: Package },
    { id: 'invoices', label: t('invoices'), icon: Receipt },
    { id: 'shifts', label: t('shifts'), icon: Clock },
    { id: 'expenses', label: t('expenses'), icon: Wallet },
    { id: 'customers', label: t('customers'), icon: Users },
    { id: 'games', label: t('games'), icon: Disc3 },
    { id: 'maintenance', label: t('maintenance'), icon: Wrench },
    { id: 'reports', label: t('reports'), icon: BarChart3 },
    { id: 'users', label: t('users'), icon: UserCheck },
    { id: 'audit-logs', label: t('auditLogs'), icon: ShieldAlert },
    { id: 'settings', label: t('settings'), icon: Settings }
  ];

  // Restrict items based on user role: Cashier sees ONLY gaming floor, POS, bookings, invoices, shifts
  const visibleNavItems = navItems.filter((item) => {
    if (role === 'admin') return true;
    if (role === 'manager') {
      return !['users', 'audit-logs', 'settings'].includes(item.id);
    }
    if (role === 'cashier') {
      return ['gaming-floor', 'pos', 'bookings', 'invoices', 'shifts'].includes(item.id);
    }
    return ['gaming-floor', 'pos', 'invoices'].includes(item.id);
  });

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-brand">
        <div className="brand-icon">
          <Gamepad2 size={24} />
        </div>
        {!collapsed && (
          <div style={{ overflow: 'hidden' }}>
            <h1 className="brand-title">PS LOUNGE</h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 'bold' }}>GAMING CENTER</p>
          </div>
        )}
      </div>

      <nav className="sidebar-nav">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setActivePage(item.id)}
              title={collapsed ? item.label : ''}
              style={{
                width: '100%',
                background: isActive ? undefined : 'transparent',
                textAlign: lang === 'ar' ? 'right' : 'left'
              }}
            >
              <Icon size={20} style={{ minWidth: 20, color: isActive ? '#60a5fa' : undefined }} />
              {!collapsed && <span>{item.label}</span>}
              {!collapsed && item.highlight && (
                <span className="nav-badge" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa' }}>
                  LIVE
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div style={{ padding: '0.75rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'center' }}>
        <button
          className="btn btn-icon btn-secondary"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'توسيع' : 'طي القائمة'}
        >
          {lang === 'ar' ? (
            collapsed ? <ChevronLeft size={18} /> : <ChevronRight size={18} />
          ) : (
            collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />
          )}
        </button>
      </div>
    </aside>
  );
}
