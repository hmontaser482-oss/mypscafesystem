# 🚀 نشر PS Lounge على Railway

## الخطوات السريعة

### 1️⃣ رفع على GitHub

```bash
# أنشئ repo جديد على GitHub باسم: ps-lounge-demo

# في Terminal:
cd "/Users/hazemmontaser/Downloads/PS cafe"

# ربط الـ repo
git remote add origin https://github.com/YOUR_USERNAME/ps-lounge-demo.git

# رفع الكود
git push -u origin main
```

### 2️⃣ النشر على Railway

1. اذهب إلى: https://railway.app
2. سجل دخول أو أنشئ حساب (مجاني)
3. اضغط **"New Project"**
4. اختر **"Deploy from GitHub repo"**
5. اختر repo: **ps-lounge-demo**
6. **Railway هيكتشف المشروع تلقائياً!**

### 3️⃣ إعدادات المشروع

في Railway Dashboard:

1. اضغط على **Settings**
2. **Build Command:** `npm install && cd server && npm install`
3. **Start Command:** `npm start`
4. **Port:** Railway هيخصص Port تلقائياً

### 4️⃣ متغيرات البيئة (Environment Variables)

في **Variables** Tab أضف:

```env
NODE_ENV=production
PORT=${{RAILWAY_PUBLIC_PORT}}
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production_12345
CORS_ORIGIN=*
```

### 5️⃣ Deploy! 🎉

اضغط **Deploy** وانتظر دقيقتين

Railway هيديك رابط مثل:
```
https://ps-lounge-production.up.railway.app
```

---

## 🔑 بعد النشر

### تسجيل الدخول:

افتح الرابط واستخدم:

**Admin:**
- Username: `admin`
- Password: `admin123`

**Cashier:**
- Username: `cashier`
- Password: `cashier123`

---

## ⚙️ إعدادات إضافية

### Custom Domain (اختياري)

1. في Railway → **Settings** → **Domains**
2. أضف domain خاص بك
3. اعمل DNS settings

### Database Persistence

Railway هيحفظ الـ SQLite database تلقائياً في Volume.

للتأكد:
1. **Settings** → **Volumes**
2. Mount Path: `/app/server/data`

---

## 🐛 استكشاف الأخطاء

### المشروع مش شغال؟

1. **Check Logs:**
   - في Railway Dashboard → **Deployments** → اختر آخر deployment → **View Logs**

2. **Port مش موجود:**
   - تأكد إن `PORT=${{RAILWAY_PUBLIC_PORT}}` موجود في Variables

3. **Database errors:**
   - تأكد إن فولدر `server/data` موجود
   - أو شغل: `npm run seed` لتهيئة قاعدة البيانات

### إعادة Deploy

```bash
# عمل تعديلات محلية
git add .
git commit -m "Your changes"
git push origin main

# Railway هيعمل deploy تلقائياً!
```

---

## 📊 مراقبة الأداء

في Railway Dashboard:

- **Metrics:** CPU, Memory, Network usage
- **Logs:** Real-time application logs
- **Deployments:** تاريخ الـ deploys

---

## 💰 التكلفة

**Railway Free Tier:**
- $5 مجانية شهرياً
- كافية لـ demo ومشاريع صغيرة
- بعدها $0.000231/GB-hour

**للاستخدام الحقيقي:**
- Starter Plan: $5/شهر
- Pro Plan: $20/شهر

---

## 🎯 نصائح للإنتاج

1. **غيّر JWT_SECRET** لقيمة عشوائية قوية
2. **غيّر كلمات المرور الافتراضية**
3. **فعّل HTTPS** (Railway يوفرها مجاناً)
4. **اعمل نسخ احتياطية** للـ database
5. **راقب الـ logs** بشكل دوري

---

## 📞 الدعم

لو واجهت أي مشكلة:

📱 **WhatsApp:** 01275984405
📷 **Instagram:** @zo__tech

---

**جاهز للنشر! 🚀**
