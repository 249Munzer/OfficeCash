const { contextBridge, ipcRenderer } = require('electron');

// معالجة الأخطاء في preload
try {
  contextBridge.exposeInMainWorld('electronAPI', {
    // أجهزة الاستعلام عن البيانات
    getEntries: () => ipcRenderer.invoke('db:getEntries'),
    addEntry: (data) => ipcRenderer.invoke('db:addEntry', data),
    updateEntry: (data) => ipcRenderer.invoke('db:updateEntry', data),
    deleteEntry: (id) => ipcRenderer.invoke('db:deleteEntry', id),
    replaceEntries: (entries) => ipcRenderer.invoke('db:replaceEntries', entries),

    getExpenses: () => ipcRenderer.invoke('db:getExpenses'),
    addExpense: (data) => ipcRenderer.invoke('db:addExpense', data),
    deleteExpense: (id) => ipcRenderer.invoke('db:deleteExpense', id),
    replaceExpenses: (expenses) => ipcRenderer.invoke('db:replaceExpenses', expenses),

    getEmployees: () => ipcRenderer.invoke('db:getEmployees'),
    saveEmployee: (data) => ipcRenderer.invoke('db:saveEmployee', data),
    deleteEmployee: (id) => ipcRenderer.invoke('db:deleteEmployee', id),
    replaceEmployees: (employees) => ipcRenderer.invoke('db:replaceEmployees', employees),

    getServices: () => ipcRenderer.invoke('db:getServices'),
    saveService: (data) => ipcRenderer.invoke('db:saveService', data),
    deleteService: (id) => ipcRenderer.invoke('db:deleteService', id),
    replaceServices: (services) => ipcRenderer.invoke('db:replaceServices', services),

    getDayClosings: () => ipcRenderer.invoke('db:getDayClosings'),
    saveDayClosing: (data) => ipcRenderer.invoke('db:saveDayClosing', data),
    replaceDayClosings: (closings) => ipcRenderer.invoke('db:replaceDayClosings', closings),

    getAttendance: () => ipcRenderer.invoke('db:getAttendance'),
    replaceAttendance: (records) => ipcRenderer.invoke('db:replaceAttendance', records),

    getSettlements: () => ipcRenderer.invoke('db:getSettlements'),
    replaceSettlements: (settlements) => ipcRenderer.invoke('db:replaceSettlements', settlements),

    getSettings: () => ipcRenderer.invoke('db:getSettings'),
    saveSettings: (settings) => ipcRenderer.invoke('db:saveSettings', settings),

    loadAuthSession: () => ipcRenderer.invoke('db:loadAuthSession'),
    saveAuthSession: (session) => ipcRenderer.invoke('db:saveAuthSession', session),

    resetToDemoData: () => ipcRenderer.invoke('db:resetToDemoData'),
    clearData: () => ipcRenderer.invoke('db:clearData'),
    deleteOffice: () => ipcRenderer.invoke('db:deleteOffice'),

    // مزامنة الشبكة المحلية
    syncGetState: () => ipcRenderer.invoke('db:syncGetState'),
    syncJoin: (code) => ipcRenderer.invoke('db:syncSetState', code),
    onSyncStatus: (callback) => {
      ipcRenderer.on('sync:status', (_event, status) => callback(status));
      return () => ipcRenderer.removeListener('sync:status', callback);
    },
    onP2PSync: (callback) => {
      ipcRenderer.on('p2p:state-updated', () => callback());
      return () => ipcRenderer.removeListener('p2p:state-updated', callback);
    },

    // طباعة سريعة وفتح النوافذ
    printReport: () => ipcRenderer.send('app:print'),
  });
  
  console.log('✅ Preload: electronAPI exposed successfully');
} catch (error) {
  console.error('❌ Preload Error:', error);
}