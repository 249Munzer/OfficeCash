const fs = require('fs');
const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

// تحديد مسار حفظ قاعدة البيانات في مجلد بيانات التطبيق المحتفظ به تلقائياً
// ملاحظة: بعد إضافة productName أعلى package.json تغيّر اسم مجلد بيانات التطبيق
// من %APPDATA%\office-cash-desktop إلى %APPDATA%\OfficeCash، لذا نرحّل أي بيانات
// قائمة من المسار القديم قبل فتح القاعدة لمنع فقدان بيانات المستخدم عند الترقية.
const currentUserData = app.getPath('userData');
const legacyUserData = path.join(app.getPath('appData'), 'office-cash-desktop');
const dbPath = path.join(currentUserData, 'office_cash.db');

function migrateLegacyUserData() {
  if (currentUserData === legacyUserData) return;
  const legacyDb = path.join(legacyUserData, 'office_cash.db');
  if (!fs.existsSync(legacyDb) || fs.existsSync(dbPath)) return;
  try {
    fs.mkdirSync(currentUserData, { recursive: true });
    for (const entry of fs.readdirSync(legacyUserData)) {
      const src = path.join(legacyUserData, entry);
      const dest = path.join(currentUserData, entry);
      fs.cpSync(src, dest, { recursive: true, force: true });
    }
    console.log('تم ترحيل بيانات المستخدم من المسار القديم إلى:', currentUserData);
  } catch (err) {
    console.error('فشل ترحيل بيانات المستخدم القديمة:', err);
  }
}

migrateLegacyUserData();
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
      createdAt TEXT,
      contract TEXT
    );
  `);

  // ترقية قواعد البيانات القديمة: ضمان وجود كل الأعمدة المتوقعة في الجداول
  // (قواعد البيانات من إصدارات قديمة قد تفتقد أعمدة مثل username/passwordPin/isActive
  //  أو تستخدم اسم active بدلاً من isActive — ALTER TABLE لا يمكن تكراره لذا نتحقق أولاً)
  function ensureColumns(tableName, columns) {
    const existing = db.prepare(`PRAGMA table_info(${tableName})`).all().map((c) => c.name);
    if (existing.includes('active') && !existing.includes('isActive')) {
      db.exec(`ALTER TABLE ${tableName} RENAME COLUMN active TO isActive`);
      existing[existing.indexOf('active')] = 'isActive';
    }
    for (const [col, def] of Object.entries(columns)) {
      if (!existing.includes(col)) {
        db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${col} ${def}`);
      }
    }
  }

  ensureColumns('employees', {
    username: 'TEXT',
    jobTitle: 'TEXT',
    phone: 'TEXT',
    passwordPin: 'TEXT',
    isActive: 'INTEGER DEFAULT 1',
    notes: 'TEXT',
    contract: 'TEXT',
  });
  ensureColumns('services', {
    isActive: 'INTEGER DEFAULT 1',
    notes: 'TEXT',
  });
  ensureColumns('expenses', {
    time: 'TEXT',
    notes: 'TEXT',
  });
  ensureColumns('day_closings', {
    employeeCommission: 'REAL',
  });
  ensureColumns('financial_entries', {
    dayClosed: 'INTEGER DEFAULT 0',
  });

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
      employeeCommission REAL,
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

  // 7. جدول سجلات الحضور (اليوم الموثّق)
  db.exec(`
    CREATE TABLE IF NOT EXISTS attendance (
      id TEXT PRIMARY KEY,
      employeeId TEXT NOT NULL,
      date TEXT NOT NULL,
      clockIn TEXT NOT NULL,
      breaks TEXT,
      status TEXT NOT NULL,
      clockOut TEXT,
      createdAt TEXT
    );
  `);
  db.exec('CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance(employeeId, date)');

  // 8. جدول التصفية والمستحقات (Settlements)
  db.exec(`
    CREATE TABLE IF NOT EXISTS settlements (
      id TEXT PRIMARY KEY,
      employeeId TEXT NOT NULL,
      employeeName TEXT NOT NULL,
      type TEXT NOT NULL,
      periodStart TEXT NOT NULL,
      periodEnd TEXT NOT NULL,
      grossRevenue REAL,
      amount REAL NOT NULL,
      commissionRate REAL,
      status TEXT NOT NULL,
      voucherNo TEXT NOT NULL,
      createdAt TEXT,
      adminConfirmedAt TEXT,
      employeeConfirmedAt TEXT,
      createdBy TEXT
    );
  `);
  db.exec('CREATE INDEX IF NOT EXISTS idx_settlements_employee ON settlements(employeeId)');

  console.log('✅ تم تجهيز قاعدة بيانات SQLite المحليه بنجاح في المسار:', dbPath);
}

module.exports = {
  db,
  initDatabase,
};