const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { db, initDatabase } = require('./database');
const { SyncEngine } = require('./sync-engine');

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
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

// ======================= بيانات وإعدادات =======================

function normalizeEmployee(e) {
  return { ...e, isActive: e.isActive ? 1 : 0 };
}

function normalizeService(s) {
  return { ...s, isActive: s.isActive ? 1 : 0 };
}

function readSettings() {
  const rows = db.prepare('SELECT * FROM settings WHERE key != ? AND key != ?').all('authSession', 'machineId');
  const settings = {};
  rows.forEach((r) => {
    try { settings[r.key] = JSON.parse(r.value); } catch { settings[r.key] = r.value; }
  });
  return settings;
}

function applySettings(settingsObj) {
  if (!settingsObj || typeof settingsObj !== 'object') return;
  db.prepare('DELETE FROM settings WHERE key != ? AND key != ?').run('authSession', 'machineId');
  const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  for (const [k, v] of Object.entries(settingsObj)) {
    if (k === 'authSession' || k === 'machineId') continue;
    stmt.run(k, JSON.stringify(v));
  }
}

function takeSnapshot() {
  return {
    entries: db.prepare('SELECT * FROM financial_entries ORDER BY createdAt DESC').all(),
    expenses: db.prepare('SELECT * FROM expenses ORDER BY createdAt DESC').all(),
    employees: db.prepare('SELECT * FROM employees ORDER BY createdAt DESC').all(),
    services: db.prepare('SELECT * FROM services ORDER BY createdAt DESC').all(),
    dayClosings: db.prepare('SELECT * FROM day_closings ORDER BY date DESC').all(),
    settings: readSettings(),
  };
}

function notifyWindowsOfDataChange() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('p2p:state-updated');
  }
}

// ======================= محرك مزامنة الشبكة المحلية =======================
const syncEngine = new SyncEngine({
  db,
  getSettings: readSettings,
  takeSnapshot,
  applySettings,
  notifyWindowsOfDataChange,
});
syncEngine.onStatusChange = (status) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('sync:status', status);
  }
};

app.whenReady().then(() => {
  initDatabase();
  setupIpcHandlers();
  // تشغيل محرك مزامنة الشبكة المحلية مع إصدار البروتوكول الحالي
  syncEngine.start();
  syncEngine.setCode(readSettings().networkSyncCode || '');
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// معالجة الأخطاء العامة
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// إعداد معالجات الاستعلامات والعمليات على قاعدة بيانات SQLite
function setupIpcHandlers() {
  // المعاملات المالية
  ipcMain.handle('db:getEntries', () => {
    return db.prepare('SELECT * FROM financial_entries ORDER BY createdAt DESC').all();
  });

  ipcMain.handle('db:addEntry', (_, entry) => {
    const stmt = db.prepare(`
      INSERT INTO financial_entries (id, date, time, employeeId, employeeName, serviceId, serviceName, amount, paymentMethod, statement, notes, createdAt)
      VALUES (@id, @date, @time, @employeeId, @employeeName, @serviceId, @serviceName, @amount, @paymentMethod, @statement, @notes, @createdAt)
    `);
    stmt.run(entry);
    syncEngine.broadcastLocalChange();
    return true;
  });

  ipcMain.handle('db:updateEntry', (_, entry) => {
    const stmt = db.prepare(`
      UPDATE financial_entries 
      SET date = @date, time = @time, employeeId = @employeeId, employeeName = @employeeName,
          serviceId = @serviceId, serviceName = @serviceName, amount = @amount,
          paymentMethod = @paymentMethod, statement = @statement, notes = @notes
      WHERE id = @id
    `);
    stmt.run(entry);
    syncEngine.broadcastLocalChange();
    return true;
  });

  ipcMain.handle('db:deleteEntry', (_, id) => {
    if (id === '__all__') {
      db.prepare('DELETE FROM financial_entries').run();
    } else {
      db.prepare('DELETE FROM financial_entries WHERE id = ?').run(id);
    }
    syncEngine.broadcastLocalChange();
    return true;
  });

  ipcMain.handle('db:replaceEntries', (_, entries) => {
    const replace = db.transaction((list) => {
      db.prepare('DELETE FROM financial_entries').run();
      const stmt = db.prepare(`
        INSERT INTO financial_entries (id, date, time, employeeId, employeeName, serviceId, serviceName, amount, paymentMethod, statement, notes, createdAt)
        VALUES (@id, @date, @time, @employeeId, @employeeName, @serviceId, @serviceName, @amount, @paymentMethod, @statement, @notes, @createdAt)
      `);
      for (const entry of list) stmt.run(entry);
    });
    replace(entries);
    syncEngine.broadcastLocalChange();
    return true;
  });

  // المصروفات
  ipcMain.handle('db:getExpenses', () => {
    return db.prepare('SELECT * FROM expenses ORDER BY createdAt DESC').all();
  });

  ipcMain.handle('db:addExpense', (_, exp) => {
    const stmt = db.prepare(`
      INSERT INTO expenses (id, date, time, category, amount, statement, recipient, notes, createdAt)
      VALUES (@id, @date, @time, @category, @amount, @statement, @recipient, @notes, @createdAt)
    `);
    stmt.run(exp);
    syncEngine.broadcastLocalChange();
    return true;
  });

  ipcMain.handle('db:deleteExpense', (_, id) => {
    if (id === '__all__') {
      db.prepare('DELETE FROM expenses').run();
    } else {
      db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
    }
    syncEngine.broadcastLocalChange();
    return true;
  });

  ipcMain.handle('db:replaceExpenses', (_, expenses) => {
    const replace = db.transaction((list) => {
      db.prepare('DELETE FROM expenses').run();
      const stmt = db.prepare(`
        INSERT INTO expenses (id, date, time, category, amount, statement, recipient, notes, createdAt)
        VALUES (@id, @date, @time, @category, @amount, @statement, @recipient, @notes, @createdAt)
      `);
      for (const exp of list) stmt.run(exp);
    });
    replace(expenses);
    syncEngine.broadcastLocalChange();
    return true;
  });

  // الموظفين
  ipcMain.handle('db:getEmployees', () => {
    return db.prepare('SELECT * FROM employees').all();
  });

  ipcMain.handle('db:saveEmployee', (_, emp) => {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO employees (id, name, username, jobTitle, phone, passwordPin, color, isActive, notes, createdAt)
      VALUES (@id, @name, @username, @jobTitle, @phone, @passwordPin, @color, @isActive, @notes, @createdAt)
    `);
    stmt.run(normalizeEmployee(emp));
    syncEngine.broadcastLocalChange();
    return true;
  });

  ipcMain.handle('db:deleteEmployee', (_, id) => {
    if (id === '__all__') {
      db.prepare('DELETE FROM employees').run();
    } else {
      db.prepare('DELETE FROM employees WHERE id = ?').run(id);
    }
    syncEngine.broadcastLocalChange();
    return true;
  });

  ipcMain.handle('db:replaceEmployees', (_, employees) => {
    const replace = db.transaction((list) => {
      db.prepare('DELETE FROM employees').run();
      const stmt = db.prepare(`
        INSERT INTO employees (id, name, username, jobTitle, phone, passwordPin, color, isActive, notes, createdAt)
        VALUES (@id, @name, @username, @jobTitle, @phone, @passwordPin, @color, @isActive, @notes, @createdAt)
      `);
      for (const emp of list) stmt.run(normalizeEmployee(emp));
    });
    replace(employees);
    syncEngine.broadcastLocalChange();
    return true;
  });

  // الخدمات
  ipcMain.handle('db:getServices', () => {
    return db.prepare('SELECT * FROM services').all();
  });

  ipcMain.handle('db:saveService', (_, srv) => {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO services (id, name, category, defaultPrice, isActive, notes, createdAt)
      VALUES (@id, @name, @category, @defaultPrice, @isActive, @notes, @createdAt)
    `);
    stmt.run(normalizeService(srv));
    syncEngine.broadcastLocalChange();
    return true;
  });

  ipcMain.handle('db:deleteService', (_, id) => {
    if (id === '__all__') {
      db.prepare('DELETE FROM services').run();
    } else {
      db.prepare('DELETE FROM services WHERE id = ?').run(id);
    }
    syncEngine.broadcastLocalChange();
    return true;
  });

  ipcMain.handle('db:replaceServices', (_, services) => {
    const replace = db.transaction((list) => {
      db.prepare('DELETE FROM services').run();
      const stmt = db.prepare(`
        INSERT INTO services (id, name, category, defaultPrice, isActive, notes, createdAt)
        VALUES (@id, @name, @category, @defaultPrice, @isActive, @notes, @createdAt)
      `);
      for (const srv of list) stmt.run(normalizeService(srv));
    });
    replace(services);
    syncEngine.broadcastLocalChange();
    return true;
  });

  // إغلاق اليوميات
  ipcMain.handle('db:getDayClosings', () => {
    return db.prepare('SELECT * FROM day_closings ORDER BY date DESC').all();
  });

  ipcMain.handle('db:saveDayClosing', (_, closing) => {
    // حفظ ذرّي: حذف أي إغلاق سابق لنفس التاريخ ثم إدراج الجديد لمنع الإغلاق المزدوج
    const save = db.transaction((c) => {
      db.prepare('DELETE FROM day_closings WHERE date = ?').run(c.date);
      const stmt = db.prepare(`
        INSERT INTO day_closings (id, date, closingTimestamp, totalRevenue, totalCash, totalCard, totalTransfer, totalExpenses, netIncome, entriesCount, physicalCashDrawer, cashDifference, closedBy, notes)
        VALUES (@id, @date, @closingTimestamp, @totalRevenue, @totalCash, @totalCard, @totalTransfer, @totalExpenses, @netIncome, @entriesCount, @physicalCashDrawer, @cashDifference, @closedBy, @notes)
      `);
      stmt.run(c);
    });
    save(closing);
    syncEngine.broadcastLocalChange();
    return true;
  });

  ipcMain.handle('db:replaceDayClosings', (_, closings) => {
    const replace = db.transaction((list) => {
      db.prepare('DELETE FROM day_closings').run();
      const stmt = db.prepare(`
        INSERT INTO day_closings (id, date, closingTimestamp, totalRevenue, totalCash, totalCard, totalTransfer, totalExpenses, netIncome, entriesCount, physicalCashDrawer, cashDifference, closedBy, notes)
        VALUES (@id, @date, @closingTimestamp, @totalRevenue, @totalCash, @totalCard, @totalTransfer, @totalExpenses, @netIncome, @entriesCount, @physicalCashDrawer, @cashDifference, @closedBy, @notes)
      `);
      for (const closing of list) stmt.run(closing);
    });
    replace(closings);
    syncEngine.broadcastLocalChange();
    return true;
  });

  ipcMain.handle('db:deleteDayClosing', (_, id) => {
    if (id === '__all__') {
      db.prepare('DELETE FROM day_closings').run();
    } else {
      db.prepare('DELETE FROM day_closings WHERE id = ?').run(id);
    }
    syncEngine.broadcastLocalChange();
    return true;
  });

  // الإعدادات
  ipcMain.handle('db:getSettings', () => {
    return readSettings();
  });

  ipcMain.handle('db:saveSettings', (_, settingsObj) => {
    // حذف جميع مفاتيح الإعدادات القديمة مع الإبقاء على جلسة المصادقة ومعرّف الجهاز
    // لضمان عدم انتقال أي إعدادات من مكتب سابق إلى المكتب الجديد
    db.prepare('DELETE FROM settings WHERE key != ? AND key != ?').run('authSession', 'machineId');
    const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    for (const [k, v] of Object.entries(settingsObj)) {
      if (k === 'machineId') continue;
      stmt.run(k, JSON.stringify(v));
    }
    // تفعيل أو تحديث مزامنة الشبكة المحلية عند تغيّر كود المزامنة
    syncEngine.setCode(settingsObj.networkSyncCode);
    syncEngine.broadcastLocalChange();
    return true;
  });

  // جلسة المصادقة
  ipcMain.handle('db:loadAuthSession', () => {
    const data = db.prepare('SELECT * FROM settings WHERE key = ?').get('authSession');
    if (!data) return null;
    try {
      return JSON.parse(data.value);
    } catch {
      return null;
    }
  });

  ipcMain.handle('db:saveAuthSession', (_, session) => {
    if (session === null) {
      db.prepare('DELETE FROM settings WHERE key = ?').run('authSession');
    } else {
      const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
      stmt.run('authSession', JSON.stringify(session));
    }
    return true;
  });

  // إعادة تعيين ومسح البيانات
  ipcMain.handle('db:resetToDemoData', async () => {
    // مسح كامل للبيانات التشغيلية مع الإبقاء على جلسة المصادقة ومعرّف الجهاز
    db.prepare('DELETE FROM financial_entries').run();
    db.prepare('DELETE FROM expenses').run();
    db.prepare('DELETE FROM day_closings').run();
    db.prepare('DELETE FROM employees').run();
    db.prepare('DELETE FROM services').run();
    db.prepare('DELETE FROM settings WHERE key != ? AND key != ?').run('authSession', 'machineId');
    syncEngine.setCode('');
    syncEngine.broadcastLocalChange();
    return true;
  });

  ipcMain.handle('db:clearData', async () => {
    // حذف جميع البيانات التشغيلية
    db.prepare('DELETE FROM financial_entries').run();
    db.prepare('DELETE FROM expenses').run();
    db.prepare('DELETE FROM day_closings').run();
    db.prepare('DELETE FROM employees').run();
    db.prepare('DELETE FROM services').run();
    syncEngine.broadcastLocalChange();
    return true;
  });

  // حالة مزامنة الشبكة المحلية
  ipcMain.handle('db:syncGetState', () => {
    return syncEngine.getState();
  });

  // الانضمام لشبكة مكتب قائمة: آلة حالات بمهلة 15 ثانية
  // يتبنّى الجهاز بيانات المكتب المضيف ولا يدفع بياناته الخاصة أثناء الانضمام
  ipcMain.handle('db:syncSetState', async (_, code) => {
    const join = await syncEngine.beginJoin(code);
    return { ...syncEngine.getState(), join };
  });

  // أمر الطباعة
  ipcMain.on('app:print', (event) => {
    event.sender.print({ silent: false, printBackground: true });
  });
}
