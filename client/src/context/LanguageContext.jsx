import React, { createContext, useContext, useState, useEffect } from 'react';

const translations = {
  ar: {
    appName: 'PS Lounge Manager',
    gamingFloor: 'صالة الألعاب (Gaming Floor)',
    dashboard: 'لوحة التحكم',
    pos: 'نقاط البيع والكافيه (POS)',
    bookings: 'الحجوزات والتقويم',
    devices: 'الأجهزة والمجموعات',
    inventory: 'المخزون والمنتجات',
    invoices: 'الفواتير والعمليات',
    shifts: 'الشيفتات والدرج',
    expenses: 'المصروفات',
    customers: 'العملاء',
    games: 'ألعاب البلايستيشن',
    maintenance: 'صيانة الأجهزة',
    reports: 'التقارير والإحصائيات',
    users: 'المستخدمين والصلاحيات',
    auditLogs: 'سجل العمليات',
    settings: 'الإعدادات',

    // Statuses
    available: 'متاح',
    running: 'قيد التشغيل',
    paused: 'متوقف مؤقتاً',
    reserved: 'محجوز',
    maintenance_status: 'تحت الصيانة',
    disabled: 'معطل',
    time_expired: 'انتهى الوقت',

    // Modes & Types
    single: 'سينجل (فردي)',
    multi: 'مالتي (زوجي/جماعي)',
    open_time: 'وقت مفتوح',
    fixed_time: 'وقت محدد',

    // Gaming floor
    startSession: 'بدء جلسة',
    viewDetails: 'تفاصيل',
    addOrders: 'إضافة طلبات',
    pause: 'إيقاف مؤقت',
    resume: 'استئناف',
    extendTime: 'تمديد الوقت',
    transferSession: 'نقل الجهاز',
    changeMode: 'تغيير سينجل/مالتي',
    stopSession: 'إنهاء ومحاسبة',
    quickBill: 'طباعة الفاتورة',
    duration: 'المدة:',
    currentCost: 'الحساب الحالي:',
    timeRemaining: 'المتبقي:',

    // Session Modal
    chooseCustomer: 'اختيار العميل',
    walkInCustomer: 'زائر عادي (Walk-in)',
    newCustomer: 'عميل جديد',
    registeredCustomer: 'عميل مسجل',
    customerName: 'اسم العميل',
    customerPhone: 'رقم الهاتف',
    selectGame: 'اللعبة (اختياري)',
    hourlyRate: 'سعر الساعة',

    // Checkout
    checkoutTitle: 'إنهاء الجلسة والمحاسبة',
    gamingSubtotal: 'حساب وقت اللعب',
    productsSubtotal: 'حساب الطلبات والكافيه',
    discount: 'الخصم',
    discountReason: 'سبب الخصم',
    grandTotal: 'المبلغ الإجمالي المطلوب',
    paidAmount: 'المبلغ المدفوع من العميل',
    changeDue: 'المتبقي للعميل (الباقي)',
    remainingDue: 'المتبقي على العميل (آجل)',
    paymentMethod: 'طريقة الدفع',
    cash: 'نقدي (كاش)',
    card: 'بطاقة بنكية (فيزا / ماستر)',
    wallet: 'محفظة إلكترونية (فودافون كاش / إنستاباي)',
    splitPayment: 'تقسيم الدفع',
    printThermalReceipt: 'طباعة فاتورة 80mm',
    confirmCheckout: 'تأكيد السداد وإغلاق الجلسة',

    // Shifts
    currentShift: 'الشيفت الحالي',
    openShift: 'فتح شيفت جديد',
    closeShift: 'إغلاق الشيفت',
    openingCash: 'الرصيد الافتتاحي',
    cashSales: 'مبيعات الكاش',
    cardSales: 'مبيعات الفيزا',
    totalExpenses: 'إجمالي المصروفات',
    expectedCash: 'النقدية المتوقعة في الدرج',
    actualCash: 'النقدية الفعلية بعد الجرد',
    cashDifference: 'الفارق (عجز / زيادة)',
    cashier: 'الكاشير',

    // General
    search: 'بحث سريع...',
    save: 'حفظ',
    cancel: 'إلغاء',
    delete: 'حذف',
    edit: 'تعديل',
    confirm: 'تأكيد',
    currency: 'ج.م',
    egp: 'جنيه',
    hourShort: 'ساعة',
    minuteShort: 'دقيقة'
  },
  en: {
    appName: 'PS Lounge Manager',
    gamingFloor: 'Gaming Floor',
    dashboard: 'Dashboard',
    pos: 'Point of Sale (POS)',
    bookings: 'Bookings Calendar',
    devices: 'Devices & Groups',
    inventory: 'Inventory & Stock',
    invoices: 'Invoices & Sales',
    shifts: 'Shifts & Drawer',
    expenses: 'Expenses',
    customers: 'Customers',
    games: 'Games Catalog',
    maintenance: 'Maintenance',
    reports: 'Reports & Analytics',
    users: 'Users & Roles',
    auditLogs: 'Audit Logs',
    settings: 'Settings',

    // Statuses
    available: 'Available',
    running: 'Running',
    paused: 'Paused',
    reserved: 'Reserved',
    maintenance_status: 'Maintenance',
    disabled: 'Disabled',
    time_expired: 'Time Expired',

    // Modes & Types
    single: 'Single Player',
    multi: 'Multiplayer',
    open_time: 'Open Time',
    fixed_time: 'Fixed Time',

    // Gaming floor
    startSession: 'Start Session',
    viewDetails: 'Details',
    addOrders: 'Add Orders',
    pause: 'Pause',
    resume: 'Resume',
    extendTime: 'Extend Time',
    transferSession: 'Transfer Console',
    changeMode: 'Toggle Mode',
    stopSession: 'End & Checkout',
    quickBill: 'Print Receipt',
    duration: 'Duration:',
    currentCost: 'Current Price:',
    timeRemaining: 'Remaining:',

    // Session Modal
    chooseCustomer: 'Customer Selection',
    walkInCustomer: 'Walk-in Customer',
    newCustomer: 'New Customer',
    registeredCustomer: 'Registered Customer',
    customerName: 'Customer Name',
    customerPhone: 'Phone Number',
    selectGame: 'Game (Optional)',
    hourlyRate: 'Hourly Rate',

    // Checkout
    checkoutTitle: 'Checkout & Settlement',
    gamingSubtotal: 'Gaming Time Charge',
    productsSubtotal: 'Orders & Cafe Charge',
    discount: 'Discount',
    discountReason: 'Discount Reason',
    grandTotal: 'Grand Total Due',
    paidAmount: 'Amount Paid',
    changeDue: 'Change Due to Customer',
    remainingDue: 'Remaining Unpaid',
    paymentMethod: 'Payment Method',
    cash: 'Cash',
    card: 'Credit/Debit Card',
    wallet: 'Digital Wallet / InstaPay',
    splitPayment: 'Split Payment',
    printThermalReceipt: 'Print 80mm Receipt',
    confirmCheckout: 'Confirm & Close Session',

    // Shifts
    currentShift: 'Active Shift',
    openShift: 'Open New Shift',
    closeShift: 'Close Shift',
    openingCash: 'Opening Cash',
    cashSales: 'Cash Sales',
    cardSales: 'Card Sales',
    totalExpenses: 'Shift Expenses',
    expectedCash: 'Expected Cash in Drawer',
    actualCash: 'Counted Cash',
    cashDifference: 'Difference',
    cashier: 'Cashier',

    // General
    search: 'Quick search...',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    confirm: 'Confirm',
    currency: 'EGP',
    egp: 'EGP',
    hourShort: 'h',
    minuteShort: 'm'
  }
};

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('ps_lang') || 'ar');

  useEffect(() => {
    localStorage.setItem('ps_lang', lang);
    const dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', lang);
  }, [lang]);

  const toggleLanguage = () => {
    setLang(prev => (prev === 'ar' ? 'en' : 'ar'));
  };

  const t = (key) => {
    return translations[lang]?.[key] || translations['ar']?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
