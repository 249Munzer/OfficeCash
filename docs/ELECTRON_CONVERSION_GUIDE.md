# دليل تحويل تطبيق "أوفيس كاش" إلى تطبيق سطح مكتب مستقل (Electron + SQLite)

هذا الدليل الشامل يقدم خطوات عملية ومباشرة لتحويل تطبيق **أوفيس كاش (OfficeCash)** من تطبيق ويب إلى تطبيق سطح مكتب حقيقي يعمل بصيغة ملف تنفيذي (`.exe` لنظام ويندوز أو `.dmg`/`.AppImage` للأنظمة الأخرى) مع قاعدة بيانات محليّة فائقة السرعة بواسطة **SQLite**.

---

## 📋 1. المتطلبات الأساسية (Prerequisites)

قبل البدء في عملية التحويل على جهازك الشخصي، تأكد من تثبيت البرامج التالية:

1. **Node.js**: الإصدار 18.x أو 20.x أو أحدث ([تحميل Node.js](https://nodejs.org)).
2. **أدوات البناء المكتبي (C++ Build Tools)** (خيار هام جداً لتجميع مكتبات SQLite الناتجة):
   - **على نظام ويندوز (Windows)**: تشغيل الأمر التالي في موجه الأوامر بصلاحية مسؤول:
     ```bash
     npm install --global --production windows-build-tools
     ```
     *أو تثبيت Visual Studio Community مع اختيار قسم "Desktop development with C++".*
   - **على نظام ماك (macOS)**: تثبيت Xcode Command Line Tools عبر الأمر:
     ```bash
     xcode-select --install
     ```
   - **على نظام لينكس (Linux)**:
     ```bash
     sudo apt-get install build-essential sqlite3 libsqlite3-dev
     ```

---

## 📦 2. تثبيت الحزم والمكتبات المطلوبة (Dependencies)

في مجلد المشروع الرئيسي، قم بتشغيل الأوامر التالية عبر السطر البرمجي (Terminal):

### أ) تثبيت مكتبة قواعد البيانات المحليه (SQLite):
```bash
npm install better-sqlite3
```

### ب) تثبيت Electron وأدوات التجميع والحزم (Dev Dependencies):
```bash
npm install -D electron electron-builder wait-on concurrently cross-env @types/better-sqlite3
```

---

## 📁 3. هيكلية الملفات المضافة للتطبيق المكتبي

سيتم إضافـة 3 ملفات رئيسية في المجلد الرئيسي للمشروع (`/electron`):

```text
OfficeCash/
├── electron/
│   ├── main.js        # الملف الرئيسي لتشغيل نوافذ إلكترون وخادم IPC
│   ├── preload.js     # جسر الأمان بين واجهة الموظف وقاعدة البيانات
│   └── database.js    # محرك قاعدة بيانات SQLite وجداولها
├── src/               # واجهات التطبيق ومكونات React
├── package.json
└── vite.config.ts
```

---

## 💻 4. كود محرك قاعدة البيانات (`electron/database.js`)

أنشئ مجلداً باسم `electron` وضغ بداخلة الملف الأول `database.js`:

```javascript
const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

// تحديد مسار حفظ قاعدة البيانات في مجلد بيانات التطبيق المحتفظ به تلقائياً
const dbPath = path.join(app.getPath('userData'), 'office_cash.db');
const db = new Database(dbPath);

// تفعيل ميزة الأداء والسرعة العالية في SQLite
db.pragma('journal_mode = WAL');

// إنشاء الجداول التلقائية لتطبيق أوفيس كاش
function initDatabase() {
  // 1. جدول الإعدادات
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // 2. جدول الموظفين
  db.exec(`
    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      jobTitle TEXT,
      phone TEXT,
      color TEXT,
      active INTEGER DEFAULT 1,
      createdAt TEXT
    );
  `);

  // 3. جدول الخدمات المعاملات
  db.exec(`
    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT,
      defaultPrice REAL,
      createdAt TEXT
    );
  `);

  // 4. جدول الحركات المالية اليومية
  db.exec(`
    CREATE TABLE IF NOT EXISTS financial_entries (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      employeeId TEXT NOT NULL,
      employeeName TEXT NOT NULL,
      serviceId TEXT NOT NULL,
      serviceName TEXT NOT NULL,
      amount REAL NOT NULL,
      paymentMethod TEXT NOT NULL,
      statement TEXT,
      notes TEXT,
      createdAt TEXT
    );
  `);

  // 5. جدول المصروفات
  db.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      statement TEXT,
      recipient TEXT,
      createdAt TEXT
    );
  `);

  // 6. جدول إغلاق اليوميات (Day Closings)
  db.exec(`
    CREATE TABLE IF NOT EXISTS day_closings (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      closingTimestamp TEXT NOT NULL,
      totalRevenue REAL,
      totalCash REAL,
      totalCard REAL,
      totalTransfer REAL,
      totalExpenses REAL,
      netIncome REAL,
      entriesCount INTEGER,
      physicalCashDrawer REAL,
      cashDifference REAL,
      closedBy TEXT,
      notes TEXT
    );
  `);

  console.log('✅ تم تجهيز قاعدة بيانات SQLite المحليه بنجاح في المسار:', dbPath);
}

module.exports = {
  db,
  initDatabase,
};
```

---

## 🔒 5. كود جسر الأمان (`electron/preload.js`)

أنشئ الملف `electron/preload.js`:

```javascript
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // أجهزة الاستعلام عن البيانات
  getEntries: () => ipcRenderer.invoke('db:getEntries'),
  addEntry: (data) => ipcRenderer.invoke('db:addEntry', data),
  deleteEntry: (id) => ipcRenderer.invoke('db:deleteEntry', id),

  getExpenses: () => ipcRenderer.invoke('db:getExpenses'),
  addExpense: (data) => ipcRenderer.invoke('db:addExpense', data),
  deleteExpense: (id) => ipcRenderer.invoke('db:deleteExpense', id),

  getEmployees: () => ipcRenderer.invoke('db:getEmployees'),
  saveEmployee: (data) => ipcRenderer.invoke('db:saveEmployee', data),

  getServices: () => ipcRenderer.invoke('db:getServices'),
  saveService: (data) => ipcRenderer.invoke('db:saveService', data),

  getDayClosings: () => ipcRenderer.invoke('db:getDayClosings'),
  saveDayClosing: (data) => ipcRenderer.invoke('db:saveDayClosing', data),

  getSettings: () => ipcRenderer.invoke('db:getSettings'),
  saveSettings: (settings) => ipcRenderer.invoke('db:saveSettings', settings),
  
  // طباعة سريعة وفتح النوافذ
  printReport: () => ipcRenderer.send('app:print'),
});
```

---

## 🖥️ 6. كود النافذة الرئيسية للتطبيق (`electron/main.js`)

أنشئ الملف `electron/main.js`:

```javascript
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { db, initDatabase } = require('./database');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    title: 'أوفيس كاش - نظام إدارة الإيرادات اليومية',
    icon: path.join(__dirname, '../public/pwa-512.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    autoHideMenuBar: true, // إخفاء القائمة المنسدلة العلوية للحصول على مظهر تطبيقي أنيق
  });

  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  initDatabase();
  setupIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// إعداد معالجات الاستعلامات والعمليات على قاعدة بيانات SQLite
function setupIpcHandlers() {
  // الحركات المالية
  ipcMain.handle('db:getEntries', () => {
    return db.prepare('SELECT * FROM financial_entries ORDER BY createdAt DESC').all();
  });

  ipcMain.handle('db:addEntry', (_, entry) => {
    const stmt = db.prepare(`
      INSERT INTO financial_entries (id, date, time, employeeId, employeeName, serviceId, serviceName, amount, paymentMethod, statement, notes, createdAt)
      VALUES (@id, @date, @time, @employeeId, @employeeName, @serviceId, @serviceName, @amount, @paymentMethod, @statement, @notes, @createdAt)
    `);
    stmt.run(entry);
    return true;
  });

  ipcMain.handle('db:deleteEntry', (_, id) => {
    db.prepare('DELETE FROM financial_entries WHERE id = ?').run(id);
    return true;
  });

  // المصروفات
  ipcMain.handle('db:getExpenses', () => {
    return db.prepare('SELECT * FROM expenses ORDER BY createdAt DESC').all();
  });

  ipcMain.handle('db:addExpense', (_, exp) => {
    const stmt = db.prepare(`
      INSERT INTO expenses (id, date, category, amount, statement, recipient, createdAt)
      VALUES (@id, @date, @category, @amount, @statement, @recipient, @createdAt)
    `);
    stmt.run(exp);
    return true;
  });

  ipcMain.handle('db:deleteExpense', (_, id) => {
    db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
    return true;
  });

  // الموظفين والخدمات
  ipcMain.handle('db:getEmployees', () => {
    return db.prepare('SELECT * FROM employees').all();
  });

  ipcMain.handle('db:getServices', () => {
    return db.prepare('SELECT * FROM services').all();
  });

  // إغلاق اليوميات
  ipcMain.handle('db:getDayClosings', () => {
    return db.prepare('SELECT * FROM day_closings ORDER BY date DESC').all();
  });

  ipcMain.handle('db:saveDayClosing', (_, closing) => {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO day_closings (id, date, closingTimestamp, totalRevenue, totalCash, totalCard, totalTransfer, totalExpenses, netIncome, entriesCount, physicalCashDrawer, cashDifference, closedBy, notes)
      VALUES (@id, @date, @closingTimestamp, @totalRevenue, @totalCash, @totalCard, @totalTransfer, @totalExpenses, @netIncome, @entriesCount, @physicalCashDrawer, @cashDifference, @closedBy, @notes)
    `);
    stmt.run(closing);
    return true;
  });

  // الإعدادات
  ipcMain.handle('db:getSettings', () => {
    const rows = db.prepare('SELECT * FROM settings').all();
    const settings = {};
    rows.forEach(r => settings[r.key] = JSON.parse(r.value));
    return settings;
  });

  ipcMain.handle('db:saveSettings', (_, settingsObj) => {
    const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    for (const [k, v] of Object.entries(settingsObj)) {
      stmt.run(k, JSON.stringify(v));
    }
    return true;
  });

  // أمر الطباعة
  ipcMain.on('app:print', (event) => {
    event.sender.print({ silent: false, printBackground: true });
  });
}
```

---

## ⚙️ 7. تحديث ملف `package.json`

قم بتعديل ملف `package.json` في مجلد مشروعك ليشمل تعريف Electron وإعدادات الحزم:

```json
{
  "name": "office-cash-desktop",
  "version": "1.0.0",
  "main": "electron/main.js",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "electron:dev": "concurrently \"cross-env NODE_ENV=development vite\" \"wait-on http://localhost:3000 && electron .\"",
    "electron:build": "npm run build && electron-builder"
  },
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

## 🚀 8. كيفية التشغيل والبناء (Run & Build)

### 1️⃣ تجربة التطبيق المكتبي أثناء التطوير:
```bash
npm run electron:dev
```
سيفتح تطبيق Electron نافذة مكتبية حقيقية تتصل تلقائياً مع محرك SQLite.

---

### 2️⃣ بناء الملف التنفيذي المكتبي النهائي (`.exe`):
```bash
npm run electron:build
```

عند انتهاء الأمر، ستجد ملف التثبيت المكتبي جاهزاً في مجلد جديد يسمى `dist-electron/`:
- `OfficeCash Setup 1.0.0.exe` (برنامج تثبيت مباشر لنظام Windows)
- `OfficeCash 1.0.0.exe` (نسخة محمولة Portable تعمل فوراً دون تثبيت من الفلاشة)

---

## ✨ المميزات المتحققة بعد التحويل:
1. **استقلالية سرعة فائقة**: يعمل التطبيق بكفاءة 100% دون الحاجة لمتصفح أو إنترنت.
2. **قواعد بيانات ضخمة**: قاعدة بيانات SQLite تتحمل ملايين السجلات لسنوات طويلة.
3. **أمان عالي ونسخ احتياطي**: ملف `office_cash.db` يمكن نسخه بضغطة زر ونقله لأي جهاز آخر.
4. **تكامل النوافذ والطباعة**: طباعة الفواتير والتقارير المالية تلقائياً عبر طابعات المكتب الموصولة.
