# الخطوات الصحيحة لتحويل OfficeCash إلى تطبيق Electron + SQLite

## 📋 ملخص التنفيذ الصحيح

بناءً على تحليل الدليل، إليك الخطوات الصحيحة والمنظمة للتحويل:

---

## ✅ الخطوة 1: المتطلبات الأساسية

### تثبيت Node.js
- الإصدار المطلوب: **18.x أو 20.x أو أحدث**
- تحميل من: https://nodejs.org

### تثبيت أدوات البناء (حسب نظام التشغيل)

**Windows:**
```bash
npm install --global --production windows-build-tools
```
أو تثبيت Visual Studio Community مع "Desktop development with C++"

**macOS:**
```bash
xcode-select --install
```

**Linux:**
```bash
sudo apt-get install build-essential sqlite3 libsqlite3-dev
```

---

## ✅ الخطوة 2: تثبيت الحزم المطلوبة

### أ) تثبيت SQLite:
```bash
npm install better-sqlite3
```

### ب) تثبيت Electron وأدوات البناء:
```bash
npm install -D electron electron-builder wait-on concurrently cross-env @types/better-sqlite3
```

---

## ✅ الخطوة 3: إنشاء هيكل المجلدات

أنشئ المجلد والملفات التالية:

```
OfficeCash/
├── electron/
│   ├── main.js        # النافذة الرئيسية و IPC handlers
│   ├── preload.js     # جسر الأمان
│   └── database.js    # محرك SQLite
├── src/
├── package.json
└── vite.config.ts
```

---

## ✅ الخطوة 4: إنشاء ملف قاعدة البيانات (`electron/database.js`)

### الميزات الرئيسية:
- ✅ إنشاء 6 جداول تلقائياً
- ✅ تفعيل WAL mode للأداء العالي
- ✅ مسار تخزين آمن في `app.getPath('userData')`

### الجداول المطلوبة:
1. **settings** - الإعدادات
2. **employees** - الموظفين
3. **services** - الخدمات
4. **financial_entries** - الحركات المالية
5. **expenses** - المصروفات
6. **day_closings** - إغلاق اليوميات

---

## ✅ الخطوة 5: إنشاء جسر الأمان (`electron/preload.js`)

### الوظائف المعرضة (exposed):
```javascript
window.electronAPI = {
  // قراءة البيانات
  getEntries(),
  getExpenses(),
  getEmployees(),
  getServices(),
  getDayClosings(),
  getSettings(),
  
  // كتابة البيانات
  addEntry(data),
  deleteEntry(id),
  addExpense(data),
  deleteExpense(id),
  saveEmployee(data),
  saveService(data),
  saveDayClosing(data),
  saveSettings(settings),
  
  // طباعة
  printReport()
}
```

### ميزات الأمان:
- ✅ contextIsolation: true
- ✅ nodeIntegration: false
- ✅ يستخدم contextBridge للوصول الآمن

---

## ✅ الخطوة 6: إنشاء النافذة الرئيسية (`electron/main.js`)

### المكونات الأساسية:
1. **BrowserWindow** - النافذة الرئيسية
2. **IPC Handlers** - معالجات الاستعلامات
3. **Database Integration** - ربط بـ SQLite

### إعدادات النافذة:
```javascript
{
  width: 1280,
  height: 800,
  minWidth: 1024,
  minHeight: 700,
  autoHideMenuBar: true,  // إخفاء القائمة العلوية
  webPreferences: {
    preload: path.join(__dirname, 'preload.js'),
    contextIsolation: true,
    nodeIntegration: false
  }
}
```

---

## ✅ الخطوة 7: تحديث `package.json`

### الإضافات المطلوبة:

**الـ Scripts:**
```json
{
  "electron:dev": "concurrently \"cross-env NODE_ENV=development vite\" \"wait-on http://localhost:3000 && electron .\"",
  "electron:build": "npm run build && electron-builder"
}
```

**إعدادات electron-builder:**
```json
{
  "main": "electron/main.js",
  "build": {
    "appId": "com.officecash.app",
    "productName": "OfficeCash",
    "directories": {
      "output": "dist-electron"
    },
    "files": [
      "dist/**/*",
      "electron/**/*"
    ],
    "win": {
      "target": ["nsis", "portable"],
      "icon": "public/pwa-512.png"
    },
    "mac": {
      "target": ["dmg"],
      "icon": "public/pwa-512.png"
    },
    "linux": {
      "target": ["AppImage", "deb"]
    }
  }
}
```

---

## ✅ الخطوة 8: تحديث كود React للاتصال بـ Electron

### التعديل المطلوب في `src/App.tsx`:

```typescript
// إضافة نوع لـ electronAPI
declare global {
  interface Window {
    electronAPI?: {
      getEntries: () => Promise<FinancialEntry[]>;
      addEntry: (data: any) => Promise<boolean>;
      deleteEntry: (id: string) => Promise<boolean>;
      // ... باقي الدوال
    };
  }
}

// في المكون، استبدل دوال localStorage بـ electronAPI
const loadEntries = async (): Promise<FinancialEntry[]> => {
  if (window.electronAPI) {
    return await window.electronAPI.getEntries();
  }
  // fallback إلى localStorage
  return loadEntriesFromLocalStorage();
};
```

---

## ✅ الخطوة 9: التشغيل والبناء

### للتطوير (Development):
```bash
npm run electron:dev
```
سيقوم بـ:
1. تشغيل Vite على port 3000
2. انتظار حتى يكون جاهزاً
3. فتح نافذة Electron

### للبناء النهائي (Production):
```bash
npm run electron:build
```

### الملفات الناتجة:
```
dist-electron/
├── OfficeCash Setup 1.0.0.exe    # مثبت Windows
├── OfficeCash 1.0.0.exe          # نسخة محمولة
├── OfficeCash-1.0.0.dmg          # macOS
└── OfficeCash-1.0.0.AppImage     # Linux
```

---

## ⚠️ تحذيرات هامة

### 1. التوافق مع TypeScript
- ملفات Electron مكتوبة بـ JavaScript
- تحتاج إلى إضافة `@types/better-sqlite3`
- قد تحتاج لتعديل `tsconfig.json` لتجاهل مجلد electron

### 2. مشاكل البناء المحتملة
- **Windows:** قد تحتاج إلى Visual Studio C++ Build Tools
- **macOS:** قد تحتاج إلىcodesign للتوقيع
- **Linux:** قد تحتاج إلى تثبيت مكتبات إضافية

### 3. اختبار التطبيق
- اختبر جميع الوظائف قبل البناء
- تحقق من الطباعة
- تحقق من قاعدة البيانات

---

## 📊 خارطة الطريق الموصى بها

### الأسبوع 1: الأساسيات
- [ ] تثبيت المتطلبات
- [ ] تثبيت الحزم
- [ ] إنشاء مجلد electron
- [ ] إنشاء database.js
- [ ] إنشاء preload.js
- [ ] إنشاء main.js

### الأسبوع 2: التكامل
- [ ] تحديث package.json
- [ ] تعديل App.tsx للاتصال بـ Electron
- [ ] اختبار التطوير
- [ ] إصلاح الأخطاء

### الأسبوع 3: البناء والنشر
- [ ] بناء النسخة النهائية
- [ ] اختبار على أنظمة مختلفة
- [ ] إنشاء مثبت
- [ ] توثيق التثبيت

---

## 🎯 الفوائد المتوقعة بعد التحويل

1. **سرعة فائقة:** لا حاجة لمتصفح
2. **قاعدة بيانات قوية:** SQLite تتحمل ملايين السجلات
3. **أمان عالي:** ملف قاعدة البيانات يمكن نسخه كنسخة احتياطية
4. **طباعة مباشرة:** تكامل كامل مع طابعات النظام
5. **استقلالية كاملة:** يعمل بدون إنترنت

---

## 📝 ملاحظات إضافية

### بدائل لـ better-sqlite3:
- **sql.js** - SQLite في JavaScript (أبطأ لكن لا يحتاج build tools)
- **@journeyapps/sqlcipher** - SQLite مشفر

### تحسينات مستقبلية محتملة:
- إضافة auto-updater
- إضافة crash reporting
- إضافة analytics (اختياري)

---

**الحالة:** ✅ جاهز للتنفيذ  
**الوقت المتوقع:** 2-3 أسابيع  
**الصعوبة:** متوسطة