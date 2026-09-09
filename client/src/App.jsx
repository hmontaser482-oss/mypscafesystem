import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { useLanguage } from './context/LanguageContext';

import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import LoginScreen from './components/LoginScreen';
import Footer from './components/Footer';
import OpenShiftModal from './components/OpenShiftModal';
import CloseShiftModal from './components/CloseShiftModal';
import KeyboardShortcuts from './components/KeyboardShortcuts';

// Pages
import GamingFloor from './pages/GamingFloor';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Bookings from './pages/Bookings';
import DevicesManagement from './pages/DevicesManagement';
import Inventory from './pages/Inventory';
import InvoicesHistory from './pages/InvoicesHistory';
import Shifts from './pages/Shifts';
import Expenses from './pages/Expenses';
import Customers from './pages/Customers';
import Games from './pages/Games';
import Maintenance from './pages/Maintenance';
import Reports from './pages/Reports';
import Users from './pages/Users';
import AuditLogs from './pages/AuditLogs';
import Settings from './pages/Settings';

export default function App() {
  const { user, loading, refreshMe } = useAuth();
  const [activePage, setActivePage] = useState('gaming-floor');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [openShiftModalOpen, setOpenShiftModalOpen] = useState(false);
  const [closeShiftModalOpen, setCloseShiftModalOpen] = useState(false);

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#080c14', color: '#60a5fa', fontSize: '1.2rem', fontWeight: 800 }}>
        جاري تشغيل نظام PS Lounge Manager...
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  const renderActivePage = () => {
    // Role guard: Cashiers can ONLY access gaming-floor, pos, bookings, invoices, shifts
    const cashierAllowed = ['gaming-floor', 'pos', 'bookings', 'invoices', 'shifts'];
    const currentRole = user?.role || 'cashier';
    if (currentRole === 'cashier' && !cashierAllowed.includes(activePage)) {
      return <GamingFloor globalSearchQuery={globalSearch} />;
    }

    switch (activePage) {
      case 'gaming-floor':
        return <GamingFloor globalSearchQuery={globalSearch} />;
      case 'dashboard':
        return <Dashboard onNavigateFloor={() => setActivePage('gaming-floor')} />;
      case 'pos':
        return <POS />;
      case 'bookings':
        return <Bookings />;
      case 'devices':
        return <DevicesManagement />;
      case 'inventory':
        return <Inventory />;
      case 'invoices':
        return <InvoicesHistory />;
      case 'shifts':
        return <Shifts />;
      case 'expenses':
        return <Expenses />;
      case 'customers':
        return <Customers />;
      case 'games':
        return <Games />;
      case 'maintenance':
        return <Maintenance />;
      case 'reports':
        return <Reports />;
      case 'users':
        return <Users />;
      case 'audit-logs':
        return <AuditLogs />;
      case 'settings':
        return <Settings />;
      default:
        return <GamingFloor globalSearchQuery={globalSearch} />;
    }
  };

  return (
    <div className="app-container">
      {/* Keyboard shortcuts F1-F5 */}
      <KeyboardShortcuts
        onNewSession={() => setActivePage('gaming-floor')}
        onOpenPOS={() => setActivePage('pos')}
        onOpenBookings={() => setActivePage('bookings')}
        onRefresh={() => refreshMe()}
      />

      {/* Sidebar */}
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
      />

      {/* Main Content Area */}
      <div className="main-wrapper">
        <Topbar
          onOpenShiftModal={() => setOpenShiftModalOpen(true)}
          onCloseShiftModal={() => setCloseShiftModalOpen(true)}
          onGlobalSearch={(q) => setGlobalSearch(q)}
        />

        <main className="content-viewport">
          {renderActivePage()}
        </main>

        {/* Fixed Bottom Footer */}
        <Footer />
      </div>

      {/* Global Shift Modals */}
      <OpenShiftModal
        isOpen={openShiftModalOpen}
        onClose={() => setOpenShiftModalOpen(false)}
        onShiftOpened={() => refreshMe()}
      />

      <CloseShiftModal
        isOpen={closeShiftModalOpen}
        onClose={() => setCloseShiftModalOpen(false)}
        onShiftClosed={() => refreshMe()}
      />
    </div>
  );
}
