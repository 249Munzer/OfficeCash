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

  // 2. جدول الموظفين - مُحدّث ليتطابق مع types.ts
  db.exec(`
    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      username TEXT,
      jobTitle TEXT,
      phone TEXT,
      passwordPin TEXT,
      color TEXT,
      isActive INTEGER DEFAULT 1,
      notes TEXT,
      createdAt TEXT
    );
  `);

  // 3. جدول الخدمات - مُحدّث ليتطابق مع types.ts
  db.exec(`
    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT,
      defaultPrice REAL,
      isActive INTEGER DEFAULT 1,
      notes TEXT,
      createdAt TEXT
    );
  `);

  // 4. جدول المعاملات المالية اليومية - مُحدّث ليتطابق مع types.ts
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
      dayClosed INTEGER DEFAULT 0,
      createdAt TEXT
    );
  `);

  // 5. جدول المصروفات - مُحدّث ليتطابق مع types.ts
  db.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      statement TEXT,
      recipient TEXT,
      notes TEXT,
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

  // ضمان عدم تكرار إغلاق اليوم الواحد أكثر من مرة (منع الإغلاق المزدوج)
  db.exec(`
    DELETE FROM day_closings
    WHERE id NOT IN (SELECT MAX(id) FROM day_closings GROUP BY date)
  `);
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_day_closings_date ON day_closings(date)');

  console.log('✅ تم تجهيز قاعدة بيانات SQLite المحليه بنجاح في المسار:', dbPath);
}

module.exports = {
  db,
  initDatabase,
};