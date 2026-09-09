# 🎮 PS Lounge - Gaming Center Management System

نظام إدارة مراكز ألعاب البلايستيشن المتكامل والاحترافي

![PS Lounge](https://img.shields.io/badge/Version-1.0.0-blue)
![Node](https://img.shields.io/badge/Node-18+-green)
![License](https://img.shields.io/badge/License-ISC-yellow)

## ✨ المميزات

- 🎮 **إدارة الأجهزة**: تتبع حالة أجهزة البلايستيشن والجلسات بشكل لحظي
- 💰 **نقطة البيع (POS)**: نظام مبيعات متكامل مع إدارة المخزون
- 📊 **التقارير والإحصائيات**: تقارير مالية تفصيلية وتحليلات أداء
- 👥 **إدارة المستخدمين**: نظام صلاحيات متقدم (Admin / Cashier)
- 🔒 **إدارة الشيفتات**: نظام فتح وإقفال الشيفتات والكاشير
- 📅 **الحجوزات**: إدارة حجوزات الأجهزة والجلسات
- 💳 **الفواتير**: نظام فواتير احترافي مع طباعة حرارية
- 📦 **المخزون**: إدارة المنتجات والمشتريات
- 💸 **المصروفات**: تتبع المصروفات اليومية والدورية
- 🎯 **Real-time**: تحديثات فورية باستخدام Socket.IO
- 🌐 **متعدد اللغات**: دعم العربية والإنجليزية

## 🚀 Deploy to Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/ps-lounge)

## 🔑 بيانات الدخول (Demo)

### مدير النظام (Admin)
- **اسم المستخدم:** `admin`
- **كلمة المرور:** `admin123`

### كاشير (Cashier)
- **اسم المستخدم:** `cashier`
- **كلمة المرور:** `cashier123`

## 🛠️ التقنيات المستخدمة

### Backend
- **Node.js** + **Express.js** - سيرفر API
- **better-sqlite3** - قاعدة بيانات SQLite محلية
- **Socket.IO** - اتصال Real-time
- **JWT** - المصادقة والأمان
- **bcryptjs** - تشفير كلمات المرور

### Frontend
- **React 18** - مكتبة واجهة المستخدم
- **Vite** - أداة البناء السريعة
- **Tailwind CSS** - تنسيق الواجهة
- **Socket.IO Client** - الاتصال اللحظي

## 📦 التثبيت المحلي

### المتطلبات
- Node.js v18 أو أحدث
- npm v9 أو أحدث

### الخطوات

```bash
# 1. Clone المشروع
git clone https://github.com/YOUR_USERNAME/ps-lounge.git
cd ps-lounge

# 2. تثبيت المكتبات
npm install

# 3. تثبيت مكتبات السيرفر
cd server && npm install && cd ..

# 4. تشغيل النظام
npm run dev

# 5. افتح المتصفح
# http://localhost:5173 (Frontend)
# http://localhost:5001 (Backend API)
```

## 🌐 متغيرات البيئة (Environment Variables)

أنشئ ملف `.env` في مجلد `server`:

```env
# Server Configuration
PORT=5001
NODE_ENV=production

# JWT Secret (غيّر هذا في الإنتاج!)
JWT_SECRET=your_super_secret_jwt_key_here_change_in_production

# Database
DATABASE_PATH=./data/lounge.db

# CORS (اتركها فارغة للسماح بكل الأصول)
CORS_ORIGIN=*
```

## 🎯 البنية التحتية للمشروع

```
ps-lounge/
├── client/                 # تطبيق React
│   ├── src/
│   │   ├── components/    # مكونات واجهة المستخدم
│   │   ├── pages/         # صفحات التطبيق
│   │   ├── context/       # Context API (Auth, Socket, Language)
│   │   └── utils/         # أدوات مساعدة
│   ├── public/            # الملفات الثابتة
│   └── package.json
│
├── server/                # سيرفر Node.js
│   ├── src/
│   │   ├── db/           # قاعدة البيانات والـ Schema
│   │   ├── routes/       # مسارات API
│   │   ├── middleware/   # Middleware (Auth, etc)
│   │   ├── sockets/      # Socket.IO handlers
│   │   ├── utils/        # أدوات مساعدة
│   │   └── server.js     # نقطة البداية
│   └── package.json
│
├── package.json          # المشروع الرئيسي
└── README.md
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/login` - تسجيل الدخول
- `POST /api/auth/logout` - تسجيل الخروج
- `GET /api/auth/me` - معلومات المستخدم الحالي

### Devices
- `GET /api/devices` - قائمة الأجهزة
- `POST /api/devices` - إضافة جهاز
- `PUT /api/devices/:id` - تحديث جهاز
- `DELETE /api/devices/:id` - حذف جهاز

### Sessions
- `POST /api/sessions` - بدء جلسة
- `PUT /api/sessions/:id/checkout` - إنهاء جلسة
- `GET /api/sessions/active` - الجلسات النشطة

### Products & POS
- `GET /api/products` - قائمة المنتجات
- `POST /api/invoices` - إنشاء فاتورة
- `GET /api/invoices` - سجل الفواتير

### Reports
- `GET /api/reports/daily` - التقرير اليومي
- `GET /api/reports/shift/:id` - تقرير الشيفت

## 🔒 الأمان

- ✅ JWT Authentication
- ✅ Password Hashing (bcrypt)
- ✅ Role-based Access Control (Admin/Cashier)
- ✅ SQL Injection Protection
- ✅ CORS Configuration
- ✅ Input Validation

## 📱 التطبيقات المدعومة

- ✅ Desktop (Windows, macOS, Linux)
- ✅ Tablet (iPad, Android Tablets)
- ✅ Mobile (Responsive Design)
- ✅ Modern Browsers (Chrome, Firefox, Safari, Edge)

## 🎨 لقطات الشاشة

### Gaming Floor
<img src="https://via.placeholder.com/800x400?text=Gaming+Floor+Screenshot" alt="Gaming Floor" width="800">

### POS System
<img src="https://via.placeholder.com/800x400?text=POS+System+Screenshot" alt="POS" width="800">

### Reports Dashboard
<img src="https://via.placeholder.com/800x400?text=Reports+Dashboard+Screenshot" alt="Reports" width="800">

## 🚀 النشر (Deployment)

### Railway
1. اضغط على زر "Deploy on Railway" أعلاه
2. أو قم بربط المشروع من GitHub
3. تأكد من إضافة متغيرات البيئة
4. Deploy! 🎉

### Vercel / Netlify (Frontend فقط)
```bash
cd client
npm run build
# ارفع محتويات dist/
```

### VPS / Dedicated Server
```bash
# على السيرفر
git clone https://github.com/YOUR_USERNAME/ps-lounge.git
cd ps-lounge
npm install
cd server && npm install && cd ..
npm run build
npm start

# استخدم PM2 للتشغيل الدائم
pm2 start server/src/server.js --name ps-lounge
pm2 save
pm2 startup
```

## 🤝 المساهمة

نرحب بالمساهمات! إذا كنت تريد المساهمة:

1. Fork المشروع
2. أنشئ Branch جديد (`git checkout -b feature/AmazingFeature`)
3. Commit التغييرات (`git commit -m 'Add some AmazingFeature'`)
4. Push إلى الـ Branch (`git push origin feature/AmazingFeature`)
5. افتح Pull Request

## 📝 Changelog

### v1.0.0 (2026-09-06)
- ✨ إصدار أول
- 🎮 نظام إدارة الأجهزة والجلسات
- 💰 نقطة البيع المتكاملة
- 📊 التقارير والإحصائيات
- 🔒 نظام الشيفتات

## 📞 الدعم والتواصل

**طورت بواسطة ZO TECH**

- 📱 WhatsApp: [01275984405](https://wa.me/201275984405)
- 📷 Instagram: [@zo__tech](https://instagram.com/zo__tech)
- 📧 Email: support@zotech.com
- 🌐 Website: www.zotech.com

## 📄 الترخيص

هذا المشروع مرخص تحت [ISC License](LICENSE)

## 🙏 شكر خاص

شكراً لكل من ساهم في تطوير هذا النظام!

---

<div align="center">
  
**صنع بـ ❤️ في مصر**

**Made with ❤️ in Egypt**

</div>
