const db = require('./database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

function seedDatabase() {
  console.log('Seeding database with realistic PlayStation Lounge data...');

  // Check if users already exist
  const existingUsers = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (existingUsers.count > 0) {
    console.log('Database already seeded. Skipping initial seed.');
    return;
  }

  const runTransaction = db.transaction(() => {
    // 1. Settings
    db.prepare(`
      INSERT OR REPLACE INTO settings (
        id, store_name, store_name_en, phone, address, currency, currency_symbol,
        round_method, min_charge_minutes, peak_hours_enabled, peak_start_time, peak_end_time,
        peak_surcharge_percent, thermal_width, invoice_footer_msg, language, theme
      ) VALUES (
        1, 'PS Lounge Gaming Center', 'PS Lounge Gaming Center', '01012345678', 'شارع النصر - المعادي - القاهرة',
        'EGP', 'ج.م', 'minute', 15, 0, '18:00', '02:00', 20.0, 80,
        'شكراً لزيارتكم لـ PS Lounge Gaming Center! نرجو لكم وقتاً ممتعاً دائماً.', 'ar', 'dark'
      )
    `).run();

    // 2. Users (Passwords: admin123, manager123, cashier123)
    const salt = bcrypt.genSaltSync(10);
    const adminPass = bcrypt.hashSync('admin123', salt);
    const managerPass = bcrypt.hashSync('manager123', salt);
    const cashierPass = bcrypt.hashSync('cashier123', salt);

    const adminId = 'usr_admin_01';
    const managerId = 'usr_manager_01';
    const cashierId = 'usr_cashier_01';

    const insertUser = db.prepare(`
      INSERT INTO users (id, username, password_hash, full_name, phone, role, is_active)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `);

    insertUser.run(adminId, 'admin', adminPass, 'المدير العام (Admin)', '01000000001', 'admin');
    insertUser.run(managerId, 'manager', managerPass, 'مدير الفرع (Manager)', '01000000002', 'manager');
    insertUser.run(cashierId, 'cashier', cashierPass, 'الكاشير أحمد (Cashier)', '01000000003', 'cashier');

    // 3. Roles & Permissions
    const insertPerm = db.prepare('INSERT OR IGNORE INTO roles_permissions (role, permission) VALUES (?, ?)');
    const allPerms = [
      'gaming:start', 'gaming:stop', 'gaming:pause', 'gaming:transfer', 'gaming:extend',
      'pos:order', 'invoices:create', 'invoices:discount', 'invoices:refund', 'invoices:delete',
      'shifts:open', 'shifts:close', 'cash:drawer', 'expenses:create', 'expenses:manage',
      'customers:manage', 'bookings:manage', 'inventory:manage', 'devices:manage',
      'reports:view', 'reports:export', 'users:manage', 'settings:manage', 'audit:view'
    ];

    allPerms.forEach(p => insertPerm.run('admin', p));
    [
      'gaming:start', 'gaming:stop', 'gaming:pause', 'gaming:transfer', 'gaming:extend',
      'pos:order', 'invoices:create', 'invoices:discount',
      'shifts:open', 'shifts:close', 'cash:drawer', 'expenses:create',
      'customers:manage', 'bookings:manage', 'inventory:manage', 'devices:manage',
      'reports:view', 'reports:export'
    ].forEach(p => insertPerm.run('manager', p));

    [
      'gaming:start', 'gaming:stop', 'gaming:pause', 'gaming:transfer', 'gaming:extend',
      'pos:order', 'invoices:create',
      'shifts:open', 'shifts:close', 'cash:drawer',
      'customers:manage', 'bookings:manage'
    ].forEach(p => insertPerm.run('cashier', p));

    // 4. Groups
    const insertGroup = db.prepare(`
      INSERT INTO groups (id, name, name_en, description, device_type, default_single_price, default_multi_price, fixed_price_1h_single, fixed_price_1h_multi)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertGroup.run('grp_ps5_std', 'PlayStation 5 عادي', 'PS5 Standard', 'أجهزة بلايستيشن 5 شاشات 55 بوصة 4K', 'PS5', 80.0, 120.0, 80.0, 120.0);
    insertGroup.run('grp_ps4_std', 'PlayStation 4 اقتصادي', 'PS4 Standard', 'أجهزة بلايستيشن 4 شاشات 43 بوصة Full HD', 'PS4', 50.0, 80.0, 50.0, 80.0);
    insertGroup.run('grp_ps5_vip', 'VIP PlayStation Lounge', 'VIP Lounge', 'غرف خاصة شاشات 65 بوصة OLED + كنب مريح وساوند سيستم', 'PS5', 150.0, 200.0, 150.0, 200.0);

    // 5. Rooms
    const insertRoom = db.prepare(`
      INSERT INTO rooms (id, name, name_en, description, capacity, single_price, multi_price, is_vip, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `);

    insertRoom.run('room_main', 'الصالة الرئيسية', 'Main Hall', 'الصالة العامة المفتوحة', 30, null, null, 0);
    insertRoom.run('room_vip_1', 'غرفة VIP 1 (Black Edition)', 'VIP Room 1', 'غرفة VIP خاصة مجهزة بـ 2 شاشة 65 بوصة وكراسي ليزي بوي', 6, 150.0, 200.0, 1);
    insertRoom.run('room_vip_2', 'غرفة VIP 2 (Royal Suite)', 'VIP Room 2', 'جناح ملكي خاص لعشاق التنافس والبطولات', 8, 180.0, 240.0, 1);

    // 6. Devices
    const insertDevice = db.prepare(`
      INSERT INTO devices (id, name, device_number, device_type, serial_number, group_id, room_id, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertDevice.run('dev_01', 'PS5 #01', '01', 'PS5', 'CFI-1216A-01', 'grp_ps5_std', 'room_main', 'available', 'جهاز رئيسي بالصالة');
    insertDevice.run('dev_02', 'PS5 #02', '02', 'PS5', 'CFI-1216A-02', 'grp_ps5_std', 'room_main', 'available', 'شاشة سامسونج 55');
    insertDevice.run('dev_03', 'PS5 #03', '03', 'PS5', 'CFI-1216A-03', 'grp_ps5_std', 'room_main', 'available', 'دراعين لاسلكي أصليين');
    insertDevice.run('dev_04', 'PS5 #04', '04', 'PS5', 'CFI-1216A-04', 'grp_ps5_std', 'room_main', 'available', 'دراع إضافي متوفر');
    insertDevice.run('dev_05', 'PS5 #05', '05', 'PS5', 'CFI-1216A-05', 'grp_ps5_std', 'room_main', 'available', 'بجوار البار');
    insertDevice.run('dev_vip1', 'PS5 VIP #01', 'V1', 'PS5', 'CFI-1216A-V1', 'grp_ps5_vip', 'room_vip_1', 'available', 'غرفة VIP 1 شاشة OLED 65');
    insertDevice.run('dev_vip2', 'PS5 VIP #02', 'V2', 'PS5', 'CFI-1216A-V2', 'grp_ps5_vip', 'room_vip_2', 'available', 'غرفة VIP 2 رويال');
    insertDevice.run('dev_06', 'PS4 #01', '06', 'PS4', 'CUH-7216B-01', 'grp_ps4_std', 'room_main', 'available', 'بلايستيشن 4 برو');
    insertDevice.run('dev_07', 'PS4 #02', '07', 'PS4', 'CUH-7216B-02', 'grp_ps4_std', 'room_main', 'available', 'شاشة 43 بوصة');
    insertDevice.run('dev_08', 'PS4 #03', '08', 'PS4', 'CUH-7216B-03', 'grp_ps4_std', 'room_main', 'available', 'بلايستيشن 4');

    // 7. Games Catalog
    const insertGame = db.prepare(`
      INSERT INTO games (id, name, platform, category, multiplayer_support, max_players, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertGame.run('gm_01', 'EA SPORTS FC 25', 'PS5', 'رياضة / كرة قدم', 1, 4, 'اللعبة الأكثر طلباً بالصالة');
    insertGame.run('gm_02', 'Tekken 8', 'PS5', 'قتال / Fighting', 1, 2, 'أحدث جزء قتالي بدقة 4K 60FPS');
    insertGame.run('gm_03', 'Mortal Kombat 1', 'PS5', 'قتال / Fighting', 1, 2, 'مفضلة لدى التحديات الثنائية');
    insertGame.run('gm_04', 'GTA V', 'PS5', 'أكشن / عالم مفتوح', 0, 1, 'طور القصة والأونلاين');
    insertGame.run('gm_05', 'Call of Duty: MW III', 'PS5', 'تصويب / شوتر', 1, 2, 'Split-Screen مع ميزة أونلاين');
    insertGame.run('gm_06', 'WWE 2K24', 'PS5', 'رياضة / مصارعة', 1, 4, 'أطوار متعددة وسريعة');

    // 8. Product Categories
    const insertCategory = db.prepare(`
      INSERT INTO product_categories (id, name, name_en, icon, sort_order)
      VALUES (?, ?, ?, ?, ?)
    `);

    insertCategory.run('cat_soft_drinks', 'مشروبات غازية', 'Soft Drinks', 'Coffee', 1);
    insertCategory.run('cat_water_juice', 'مياه وعصائر', 'Water & Juices', 'GlassWater', 2);
    insertCategory.run('cat_energy', 'مشروبات طاقة', 'Energy Drinks', 'Zap', 3);
    insertCategory.run('cat_hot_drinks', 'مشروبات ساخنة', 'Hot Drinks', 'Flame', 4);
    insertCategory.run('cat_snacks', 'سناكس ومقرمشات', 'Snacks & Chips', 'Cookie', 5);
    insertCategory.run('cat_food', 'وجبات خفيفة ونودلز', 'Quick Bites', 'Utensils', 6);

    // 9. Products
    const insertProduct = db.prepare(`
      INSERT INTO products (id, name, name_en, category_id, sku, barcode, selling_price, cost_price, stock_quantity, min_stock_alert, unit)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertProduct.run('prod_coca', 'كوكاكولا كانز 330 مل', 'Coca Cola Can', 'cat_soft_drinks', 'CAN-COCA', '5449000000996', 25.0, 16.0, 50, 12, 'كانز');
    insertProduct.run('prod_pepsi', 'بيبسي كانز 330 مل', 'Pepsi Can', 'cat_soft_drinks', 'CAN-PEPSI', '012000000133', 25.0, 16.0, 50, 12, 'كانز');
    insertProduct.run('prod_seven', 'سفن أب كانز 330 مل', '7Up Can', 'cat_soft_drinks', 'CAN-7UP', '012000000155', 25.0, 16.0, 50, 10, 'كانز');
    insertProduct.run('prod_water', 'مياه معدنية 600 مل', 'Mineral Water', 'cat_water_juice', 'WAT-600', '622111111111', 12.0, 6.0, 60, 20, 'زجاجة');
    insertProduct.run('prod_redbull', 'ريد بول مشروب طاقة 250 مل', 'Red Bull 250ml', 'cat_energy', 'ENG-REDBULL', '9002490100070', 60.0, 42.0, 30, 6, 'كانز');
    insertProduct.run('prod_espresso', 'إسبريسو سينجل', 'Single Espresso', 'cat_hot_drinks', 'HOT-ESP', 'HOT-001', 30.0, 10.0, 100, 15, 'كوب');
    insertProduct.run('prod_turk_coffee', 'قهوة تركي مخصوص', 'Turkish Coffee', 'cat_hot_drinks', 'HOT-TURK', 'HOT-002', 25.0, 8.0, 100, 15, 'فنجان');
    insertProduct.run('prod_tea', 'شاي أحمر / أخضر', 'Hot Tea', 'cat_hot_drinks', 'HOT-TEA', 'HOT-003', 15.0, 4.0, 150, 20, 'كوب');
    insertProduct.run('prod_doritos', 'دوريتوس جبنة ناتشو / حار', 'Doritos Chips', 'cat_snacks', 'SNK-DORITOS', '622123456789', 20.0, 13.0, 40, 8, 'كيس');
    insertProduct.run('prod_chipsy', 'شيبسي ملح وخل كبير', 'Chipsy Salt & Vinegar', 'cat_snacks', 'SNK-CHIPSY', '622987654321', 15.0, 9.5, 40, 8, 'كيس');
    insertProduct.run('prod_indomie', 'إندومي كاب خضار / فراخ', 'Indomie Cup', 'cat_food', 'FOD-INDOMIE', '089686010001', 25.0, 15.0, 40, 10, 'علبة');
    insertProduct.run('prod_burger', 'ساندوتش برجر لحم / فراخ', 'Beef Burger Sandwich', 'cat_food', 'FOD-BURGER', 'FOD-001', 65.0, 40.0, 20, 5, 'ساندوتش');

    // 10. Audit Log
    db.prepare(`
      INSERT INTO audit_logs (id, user_id, user_name, action, entity_type, entity_id, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('aud_01', adminId, 'المدير العام', 'SYSTEM_INITIALIZE', 'system', '1', 'تهيئة النظام والبيانات الافتراضية بنجاح');
  });

  runTransaction();
  console.log('Database seeded cleanly without dummy transactions!');
}

if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
