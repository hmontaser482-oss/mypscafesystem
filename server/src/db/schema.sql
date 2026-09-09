-- Schema for PlayStation Gaming Center Management System (PS Lounge Manager)
PRAGMA foreign_keys = ON;

-- 1. System Settings
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    store_name TEXT NOT NULL DEFAULT 'PS Lounge Gaming Center',
    store_name_en TEXT NOT NULL DEFAULT 'PS Lounge Gaming Center',
    logo_url TEXT,
    phone TEXT DEFAULT '01000000000',
    address TEXT DEFAULT 'Cairo, Egypt',
    tax_number TEXT,
    commercial_reg TEXT,
    currency TEXT DEFAULT 'EGP',
    currency_symbol TEXT DEFAULT 'ج.م',
    round_method TEXT DEFAULT 'minute', -- 'minute', '15m', '30m', 'hour'
    min_charge_minutes INTEGER DEFAULT 15,
    peak_hours_enabled INTEGER DEFAULT 0,
    peak_start_time TEXT DEFAULT '18:00',
    peak_end_time TEXT DEFAULT '02:00',
    peak_surcharge_percent REAL DEFAULT 20,
    thermal_width INTEGER DEFAULT 80, -- 80 or 57
    show_logo_on_receipt INTEGER DEFAULT 1,
    show_customer_on_receipt INTEGER DEFAULT 1,
    show_cashier_on_receipt INTEGER DEFAULT 1,
    invoice_footer_msg TEXT DEFAULT 'شكراً لزيارتكم! نتمنى لكم يوماً رائعاً ونتشرف بحضوركم دائماً',
    language TEXT DEFAULT 'ar',
    theme TEXT DEFAULT 'dark',
    auto_refresh_interval INTEGER DEFAULT 5000,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime'))
);

-- 2. Users & Authentication
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'cashier', -- 'admin', 'manager', 'cashier', 'staff'
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime'))
);

-- 3. Roles & Permissions Matrix
CREATE TABLE IF NOT EXISTS roles_permissions (
    role TEXT NOT NULL,
    permission TEXT NOT NULL,
    PRIMARY KEY (role, permission)
);

-- 4. Device Groups
CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_en TEXT,
    description TEXT,
    device_type TEXT NOT NULL DEFAULT 'PS5', -- 'PS5', 'PS4', 'PS5 Pro'
    default_single_price REAL NOT NULL DEFAULT 80.0,
    default_multi_price REAL NOT NULL DEFAULT 120.0,
    fixed_price_1h_single REAL,
    fixed_price_1h_multi REAL,
    status TEXT DEFAULT 'active', -- 'active', 'inactive'
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

-- 5. Rooms
CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_en TEXT,
    description TEXT,
    capacity INTEGER DEFAULT 4,
    single_price REAL, -- If set, overrides group single price
    multi_price REAL,  -- If set, overrides group multi price
    is_vip INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

-- 6. Devices
CREATE TABLE IF NOT EXISTS devices (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    device_number TEXT NOT NULL,
    device_type TEXT NOT NULL DEFAULT 'PS5',
    serial_number TEXT,
    group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE RESTRICT,
    room_id TEXT REFERENCES rooms(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'available', -- 'available', 'running', 'reserved', 'maintenance', 'disabled'
    current_session_id TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

-- 7. Customers
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT UNIQUE,
    nickname TEXT,
    notes TEXT,
    total_visits INTEGER DEFAULT 0,
    total_spending REAL DEFAULT 0.0,
    last_visit TEXT,
    favorite_device_id TEXT REFERENCES devices(id) ON DELETE SET NULL,
    favorite_game TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

-- 8. Games Catalog
CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    platform TEXT NOT NULL DEFAULT 'PS5',
    category TEXT DEFAULT 'Sports',
    multiplayer_support INTEGER DEFAULT 1,
    max_players INTEGER DEFAULT 4,
    cover_url TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

-- 9. Product Categories
CREATE TABLE IF NOT EXISTS product_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_en TEXT,
    icon TEXT,
    sort_order INTEGER DEFAULT 0
);

-- 10. Products & Inventory Items
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_en TEXT,
    category_id TEXT NOT NULL REFERENCES product_categories(id) ON DELETE RESTRICT,
    sku TEXT,
    barcode TEXT UNIQUE,
    selling_price REAL NOT NULL DEFAULT 0.0,
    cost_price REAL NOT NULL DEFAULT 0.0,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    min_stock_alert INTEGER DEFAULT 5,
    unit TEXT DEFAULT 'piece',
    tax_percent REAL DEFAULT 0.0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

-- 11. Shifts
CREATE TABLE IF NOT EXISTS shifts (
    id TEXT PRIMARY KEY,
    cashier_id TEXT NOT NULL REFERENCES users(id),
    cashier_name TEXT NOT NULL,
    start_time TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    end_time TEXT,
    opening_cash REAL NOT NULL DEFAULT 0.0,
    cash_sales REAL DEFAULT 0.0,
    card_sales REAL DEFAULT 0.0,
    wallet_sales REAL DEFAULT 0.0,
    total_sales REAL DEFAULT 0.0,
    total_expenses REAL DEFAULT 0.0,
    cash_in REAL DEFAULT 0.0,
    cash_out REAL DEFAULT 0.0,
    expected_cash REAL DEFAULT 0.0,
    actual_cash REAL,
    cash_difference REAL,
    status TEXT DEFAULT 'open', -- 'open', 'closed'
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

-- 12. Sessions
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    device_id TEXT NOT NULL REFERENCES devices(id),
    customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL DEFAULT 'Walk-in / زائر',
    session_type TEXT NOT NULL DEFAULT 'single', -- 'single', 'multi'
    time_mode TEXT NOT NULL DEFAULT 'open', -- 'open', 'fixed'
    target_duration_minutes INTEGER, -- For fixed mode
    game_id TEXT REFERENCES games(id) ON DELETE SET NULL,
    start_time TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    end_time TEXT,
    expected_end_time TEXT,
    status TEXT NOT NULL DEFAULT 'running', -- 'running', 'paused', 'time_expired', 'completed', 'cancelled'
    base_hourly_rate REAL NOT NULL DEFAULT 80.0,
    total_played_seconds INTEGER DEFAULT 0,
    total_paused_seconds INTEGER DEFAULT 0,
    gaming_amount REAL DEFAULT 0.0,
    products_amount REAL DEFAULT 0.0,
    discount_amount REAL DEFAULT 0.0,
    discount_reason TEXT,
    total_amount REAL DEFAULT 0.0,
    cashier_id TEXT REFERENCES users(id),
    shift_id TEXT REFERENCES shifts(id),
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime'))
);

-- 13. Session Intervals (Tracks Single/Multi player changes)
CREATE TABLE IF NOT EXISTS session_intervals (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    session_type TEXT NOT NULL DEFAULT 'single',
    hourly_rate REAL NOT NULL,
    start_time TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    end_time TEXT,
    duration_seconds INTEGER DEFAULT 0,
    amount REAL DEFAULT 0.0
);

-- 14. Session Pauses
CREATE TABLE IF NOT EXISTS session_pauses (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    pause_start TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    resume_time TEXT,
    pause_duration_seconds INTEGER DEFAULT 0,
    reason TEXT,
    created_by TEXT REFERENCES users(id)
);

-- 15. Session Transfers (Device Transfer History)
CREATE TABLE IF NOT EXISTS session_transfers (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    from_device_id TEXT NOT NULL REFERENCES devices(id),
    to_device_id TEXT NOT NULL REFERENCES devices(id),
    transfer_time TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    reason TEXT,
    cashier_id TEXT REFERENCES users(id)
);

-- 16. Session Orders (Products added to an active session)
CREATE TABLE IF NOT EXISTS session_orders (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id),
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price REAL NOT NULL,
    total_price REAL NOT NULL,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    created_by TEXT REFERENCES users(id)
);

-- 17. Invoices
CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    invoice_number TEXT UNIQUE NOT NULL,
    session_id TEXT REFERENCES sessions(id) ON DELETE SET NULL,
    customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL DEFAULT 'Walk-in / زائر',
    cashier_id TEXT REFERENCES users(id),
    cashier_name TEXT,
    shift_id TEXT REFERENCES shifts(id),
    device_name TEXT,
    room_name TEXT,
    session_start TEXT,
    session_end TEXT,
    session_duration TEXT,
    session_type TEXT,
    gaming_subtotal REAL DEFAULT 0.0,
    products_subtotal REAL DEFAULT 0.0,
    subtotal REAL DEFAULT 0.0,
    discount_amount REAL DEFAULT 0.0,
    discount_type TEXT DEFAULT 'fixed',
    discount_reason TEXT,
    tax_amount REAL DEFAULT 0.0,
    grand_total REAL DEFAULT 0.0,
    paid_amount REAL DEFAULT 0.0,
    change_amount REAL DEFAULT 0.0,
    remaining_amount REAL DEFAULT 0.0,
    payment_method TEXT DEFAULT 'cash', -- 'cash', 'card', 'wallet', 'split', 'credit'
    payment_status TEXT DEFAULT 'paid', -- 'paid', 'partial', 'unpaid', 'refunded'
    split_details TEXT, -- JSON if split
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

-- 18. Invoice Items
CREATE TABLE IF NOT EXISTS invoice_items (
    id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL, -- 'gaming', 'product'
    product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
    item_name TEXT NOT NULL,
    quantity REAL NOT NULL DEFAULT 1,
    unit_price REAL NOT NULL,
    total_price REAL NOT NULL
);

-- 19. Payments Record
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    amount REAL NOT NULL,
    payment_method TEXT NOT NULL, -- 'cash', 'card', 'wallet', 'other'
    transaction_reference TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

-- 20. Inventory Transactions
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES products(id),
    type TEXT NOT NULL, -- 'stock_in', 'stock_out', 'session_sale', 'pos_sale', 'adjustment', 'damaged', 'waste', 'refund'
    quantity INTEGER NOT NULL,
    unit_cost REAL,
    unit_price REAL,
    reference_id TEXT,
    notes TEXT,
    created_by TEXT REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

-- 21. Cash Drawer Transactions
CREATE TABLE IF NOT EXISTS cash_transactions (
    id TEXT PRIMARY KEY,
    shift_id TEXT NOT NULL REFERENCES shifts(id),
    type TEXT NOT NULL, -- 'cash_in', 'cash_out', 'petty_cash', 'refund', 'expense'
    amount REAL NOT NULL,
    reason TEXT NOT NULL,
    user_id TEXT REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

-- 22. Expenses
CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    shift_id TEXT REFERENCES shifts(id) ON DELETE SET NULL,
    category TEXT NOT NULL, -- 'electricity', 'maintenance', 'purchases', 'salaries', 'cleaning', 'internet', 'rent', 'supplies', 'other'
    amount REAL NOT NULL,
    description TEXT NOT NULL,
    payment_method TEXT DEFAULT 'cash',
    user_id TEXT REFERENCES users(id),
    date TEXT NOT NULL DEFAULT (date('now', 'localtime')),
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

-- 23. Bookings
CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    device_id TEXT NOT NULL REFERENCES devices(id),
    booking_date TEXT NOT NULL, -- YYYY-MM-DD
    start_time TEXT NOT NULL, -- HH:MM
    end_time TEXT NOT NULL, -- HH:MM
    session_type TEXT DEFAULT 'single',
    deposit_amount REAL DEFAULT 0.0,
    status TEXT DEFAULT 'confirmed', -- 'confirmed', 'pending', 'completed', 'cancelled', 'no_show'
    notes TEXT,
    created_by TEXT REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

-- 24. Device Maintenance
CREATE TABLE IF NOT EXISTS device_maintenance (
    id TEXT PRIMARY KEY,
    device_id TEXT NOT NULL REFERENCES devices(id),
    problem TEXT NOT NULL,
    description TEXT,
    cost REAL DEFAULT 0.0,
    technician TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed'
    start_date TEXT DEFAULT (datetime('now', 'localtime')),
    resolved_date TEXT,
    notes TEXT,
    created_by TEXT REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

-- 25. Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL, -- 'session_expired', 'session_warning', 'booking_upcoming', 'low_stock', 'shift_unclosed', 'unpaid_invoice'
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    reference_id TEXT,
    is_read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

-- 26. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    user_name TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    previous_value TEXT,
    new_value TEXT,
    ip_address TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
CREATE INDEX IF NOT EXISTS idx_devices_group ON devices(group_id);
CREATE INDEX IF NOT EXISTS idx_devices_room ON devices(room_id);
CREATE INDEX IF NOT EXISTS idx_sessions_device ON sessions(device_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_shift ON sessions(shift_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date_device ON bookings(booking_date, device_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created ON invoices(created_at);
CREATE INDEX IF NOT EXISTS idx_invoices_shift ON invoices(shift_id);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_tx_prod ON inventory_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
