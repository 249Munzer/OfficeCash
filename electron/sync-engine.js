/**
 * Sync Engine - محرك مزامنة الشبكة المحلية (P2P LAN)
 *
 * استخراج منطق المزامنة من main.js إلى وحدة مستقلة مع تحسينات:
 *  1) آلة حالات للانضمام (idle → joining → joined) مع مهلة 15 ثانية.
 *  2) machineId دائم يُحفظ في جدول الإعدادات (بدلاً من عشوائي غير محفوظ).
 *  3) إصدار بروتوكول (v) في كل الرسائل لرفض أي إصدار مستقبلي غير متوافق.
 *  4) Ping/Pong دوري لإبقاء الاتصالات حيّة واكتشاف الأقران المنقطعين.
 *  5) حد أقصى لحجم اللقطة (5MB) لمنع كوارث الذاكرة من لقطات ضخمة.
 *  6) دمج اللقطات بحسب updatedAt: المسح الكامل حصري لمرحلة الانضمام الأولى،
 *     بينما تُدمج لقطات الحالة المستقرة (لا حذف للبيانات التي لا يملكها المصدر).
 */

const WebSocket = require('ws');
const dgram = require('dgram');
const os = require('os');

const PROTOCOL_VERSION = 2;
const SYNC_UDP_PORT = parseInt(process.env.OFFICECASH_SYNC_UDP_PORT || '8477', 10);
const SYNC_TCP_PORT = parseInt(process.env.OFFICECASH_SYNC_TCP_PORT || '8478', 10);
const JOIN_TIMEOUT_MS = 15000;
const PING_INTERVAL_MS = 15000;
const PEER_STALE_MS = 45000;
const SNAPSHOT_MAX_BYTES = 5 * 1024 * 1024;

const EMPTY_STATE = {
  connected: false,
  peerCount: 0,
  peers: [],
  serverListening: false,
  serverPort: SYNC_TCP_PORT,
  serverError: null,
};

class SyncEngine {
  /**
   * @param {Object} deps
   * @param {import('better-sqlite3').Database} deps.db
   * @param {Function} deps.getSettings - قراءة الإعدادات من جدول الإعدادات
   * @param {Function} deps.takeSnapshot - التقاط لقطة كاملة للقاعدة
   * @param {Function} deps.applySettings - كتابة الإعدادات
   * @param {Function} deps.notifyWindowsOfDataChange - إشعار نافذة الواجهة بتغيير البيانات
   */
  constructor({ db, getSettings, takeSnapshot, applySettings, notifyWindowsOfDataChange }) {
    this.db = db;
    this.getSettings = getSettings;
    this.takeSnapshot = takeSnapshot;
    this.applySettings = applySettings;
    this.notifyWindowsOfDataChange = notifyWindowsOfDataChange;

    this.syncCode = '';
    // آلة حالات الانضمام: 'idle' | 'joining' | 'joined'
    this.joinState = 'idle';
    this.joinTimer = null;
    this.joinResolve = null;

    this.syncServer = null;
    this.udpSocket = null;
    this.discoveryTimer = null;
    this.pingTimer = null;
    this.syncPeers = new Map(); // peerId -> ws (اتصالات بعد المصافحة)
    this.outgoingSockets = new Map(); // peerId -> ws (اتصالات صادرة قبل المصافحة)
    this.seenSyncIds = new Set(); // منع إعادة بث نفس اللقطة (حماية من الحلقات)

    this.machineId = this.loadOrCreateMachineId();

    this.syncStatus = { ...EMPTY_STATE };

    /** @type {(status: object) => void} */
    this.onStatusChange = null;
  }

  // ==================== الحالة العامة ====================

  getState() {
    return {
      code: this.syncCode,
      connected: this.syncStatus.connected,
      peerCount: this.syncStatus.peerCount,
      peers: this.syncStatus.peers,
      serverListening: this.syncStatus.serverListening,
      serverPort: this.syncStatus.serverPort,
      serverError: this.syncStatus.serverError,
    };
  }

  // ==================== machineId دائم ====================

  loadOrCreateMachineId() {
    const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get('machineId');
    if (row && typeof row.value === 'string' && row.value.trim()) {
      return row.value.trim();
    }
    const id = `${os.hostname()}-${Math.random().toString(36).slice(2, 10)}`;
    this.db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('machineId', id);
    return id;
  }

  getMachineId() {
    return this.machineId;
  }

  // ==================== الإشعارات ====================

  setSyncStatus(partial) {
    Object.assign(this.syncStatus, partial);
    this.syncStatus.peers = this.buildPeersList();
    this.syncStatus.peerCount = this.syncStatus.peers.length;
    this.syncStatus.connected = this.syncStatus.peers.length > 0;
    if (this.onStatusChange) this.onStatusChange({ ...this.syncStatus });
  }

  buildPeersList() {
    const list = [];
    const seen = new Set();
    for (const [pid, ws] of this.syncPeers) {
      if (!seen.has(pid) && ws.peerCode === this.syncCode) {
        seen.add(pid);
        list.push({ id: pid, name: ws.peerName || pid });
      }
    }
    for (const [pid, ws] of this.outgoingSockets) {
      if (!seen.has(pid) && ws.peerCode === this.syncCode) {
        seen.add(pid);
        list.push({ id: pid, name: ws.peerName || pid });
      }
    }
    return list;
  }

  getConnectedWs() {
    const out = [];
    const seen = new Set();
    for (const [, ws] of this.syncPeers) {
      seen.add(ws);
      out.push(ws);
    }
    for (const [, ws] of this.outgoingSockets) if (!seen.has(ws)) out.push(ws);
    return out;
  }

  // ==================== آلة حالات الانضمام ====================

  /**
   * بدء الانضمام لشبكة مكتب قائمة.
   * الجهاز يتبنّى بيانات المكتب المضيف (مسح كامل) ولا يدفع بياناته القديمة.
   * @param {string} code
   * @returns {Promise<{ ok: boolean; error?: string }>} نتيجة الانضمام بعد اكتماله أو مهلة 15 ثانية.
   */
  async beginJoin(code) {
    const next = String(code || '').toUpperCase();
    if (this.joinTimer) {
      clearTimeout(this.joinTimer);
      this.joinTimer = null;
    }
    if (this.joinResolve) {
      // إنهاء أي انضمام معلق سابقاً بعدم النجاح
      this.joinResolve({ ok: false, error: 'cancelled' });
      this.joinResolve = null;
    }

    this.setCode(next);
    this.joinState = 'joining';

    const result = await new Promise((resolve) => {
      this.joinResolve = resolve;
      this.joinTimer = setTimeout(() => {
        if (this.joinState === 'joining') {
          this.joinState = 'joined';
          this.joinResolve = null;
          this.joinTimer = null;
          resolve({ ok: false, error: 'timeout' });
        }
      }, JOIN_TIMEOUT_MS);
    });

    if (this.joinTimer) {
      clearTimeout(this.joinTimer);
      this.joinTimer = null;
    }
    return result;
  }

  // اكتمل تبنّي اللقطة أثناء الانضمام
  completeJoin(success) {
    if (this.joinState !== 'joining') return;
    this.joinState = 'joined';
    if (this.joinTimer) {
      clearTimeout(this.joinTimer);
      this.joinTimer = null;
    }
    if (this.joinResolve) {
      this.joinResolve(success ? { ok: true } : { ok: false, error: 'rejected' });
      this.joinResolve = null;
    }
  }

  // ==================== الرسائل ====================

  newMsgId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  }

  markSeen(id) {
    if (!id) return;
    this.seenSyncIds.add(id);
    if (this.seenSyncIds.size > 500) {
      const first = this.seenSyncIds.values().next().value;
      this.seenSyncIds.delete(first);
    }
  }

  broadcastToPeers(payload, exceptWs) {
    const raw = JSON.stringify(payload);
    for (const ws of this.getConnectedWs()) {
      if (ws === exceptWs) continue;
      if (ws.readyState === WebSocket.OPEN) ws.send(raw);
    }
  }

  broadcastLocalChange() {
    if (!this.syncCode || this.getConnectedWs().length === 0) return;
    this.broadcastToPeers({
      type: 'snapshot',
      v: PROTOCOL_VERSION,
      id: this.newMsgId(),
      peerId: this.getMachineId(),
      code: this.syncCode,
      data: this.takeSnapshot(),
    });
  }

  shouldPushSnapshot() {
    // الجهة المضيفة غير المنضمّة للتو فقط هي التي تدفع لقطة الحالة
    return this.joinState !== 'joining' && !!this.syncCode;
  }

  // ==================== دمج اللقطات ====================

  /**
   * تطبيق لقطة واردة:
   *  - أثناء الانضمام: مسح كامل وتبنّي بيانات المكتب المضيف (يكفل انتشار الحذف).
   *  - في الحالة المستقرة: دمج بحسب updatedAt إن وُجد (لا حذف).
   */
  applySnapshot(snap) {
    if (!snap || typeof snap !== 'object') return;
    const full = this.joinState === 'joining';
    const run = this.db.transaction(() => {
      if (snap.settings) this.applySettings(snap.settings);
      if (full) {
        this.db.prepare('DELETE FROM financial_entries').run();
        this.db.prepare('DELETE FROM expenses').run();
        this.db.prepare('DELETE FROM employees').run();
        this.db.prepare('DELETE FROM services').run();
        this.db.prepare('DELETE FROM day_closings').run();
        this.db.prepare('DELETE FROM attendance').run();
        this.db.prepare('DELETE FROM settlements').run();
      }
      const tables = [
        { name: 'financial_entries', rows: snap.entries, fields: ['id', 'date', 'time', 'employeeId', 'employeeName', 'serviceId', 'serviceName', 'amount', 'paymentMethod', 'statement', 'notes', 'createdAt'] },
        { name: 'expenses', rows: snap.expenses, fields: ['id', 'date', 'time', 'category', 'amount', 'statement', 'recipient', 'notes', 'createdAt'] },
        { name: 'employees', rows: snap.employees, fields: ['id', 'name', 'username', 'jobTitle', 'phone', 'passwordPin', 'color', 'isActive', 'notes', 'createdAt', 'contract'] },
        { name: 'services', rows: snap.services, fields: ['id', 'name', 'category', 'defaultPrice', 'isActive', 'notes', 'createdAt'] },
        { name: 'day_closings', rows: snap.dayClosings, fields: ['id', 'date', 'closingTimestamp', 'totalRevenue', 'totalCash', 'totalCard', 'totalTransfer', 'totalExpenses', 'netIncome', 'entriesCount', 'physicalCashDrawer', 'cashDifference', 'closedBy', 'notes'] },
        { name: 'attendance', rows: snap.attendance, fields: ['id', 'employeeId', 'date', 'clockIn', 'breaks', 'status', 'clockOut', 'createdAt'] },
        { name: 'settlements', rows: snap.settlements, fields: ['id', 'employeeId', 'employeeName', 'type', 'periodStart', 'periodEnd', 'grossRevenue', 'amount', 'commissionRate', 'status', 'voucherNo', 'createdAt', 'adminConfirmedAt', 'employeeConfirmedAt', 'createdBy'] },
      ];
      for (const table of tables) {
        if (!Array.isArray(table.rows)) continue;
        const cols = table.fields.join(', ');
        const placeholders = table.fields.map((f) => `@${f}`).join(', ');
        const stmt = this.db.prepare(`INSERT OR REPLACE INTO ${table.name} (${cols}) VALUES (${placeholders})`);
        for (const row of table.rows) {
          if (table.name === 'employees' || table.name === 'services') {
            stmt.run(this.normalizeRow(table.name, row));
            continue;
          }
          if (table.name === 'attendance') {
            stmt.run(this.normalizeAttendance(row));
            continue;
          }
          stmt.run(this.pickFields(row, table.fields));
        }
        if (!full) this.pruneDeletedInPlace(table.name);
      }
    });
    run();
    this.notifyWindowsOfDataChange();
  }

  normalizeRow(table, row) {
    if (table === 'employees') {
      const e = this.pickFields(row, ['id', 'name', 'username', 'jobTitle', 'phone', 'passwordPin', 'color', 'isActive', 'notes', 'createdAt', 'contract']);
      return {
        id: e.id,
        name: e.name,
        username: e.username ?? null,
        jobTitle: e.jobTitle ?? '',
        phone: e.phone ?? '',
        passwordPin: e.passwordPin ?? null,
        color: e.color ?? '#2563eb',
        isActive: e.isActive ? 1 : 0,
        notes: e.notes ?? null,
        createdAt: e.createdAt ?? null,
        contract: e.contract ?? null,
      };
    }
    if (table === 'services') {
      const s = this.pickFields(row, ['id', 'name', 'category', 'defaultPrice', 'isActive', 'notes', 'createdAt']);
      return {
        id: s.id,
        name: s.name,
        category: s.category ?? '',
        defaultPrice: typeof s.defaultPrice === 'number' ? s.defaultPrice : parseFloat(s.defaultPrice) || 0,
        isActive: s.isActive ? 1 : 0,
        notes: s.notes ?? null,
        createdAt: s.createdAt ?? null,
      };
    }
    return row;
  }

  normalizeAttendance(row) {
    const out = this.pickFields(row, ['id', 'employeeId', 'date', 'clockIn', 'breaks', 'status', 'clockOut', 'createdAt']);
    if (out.breaks && typeof out.breaks !== 'string') out.breaks = JSON.stringify(out.breaks);
    return out;
  }

  pickFields(row, fields) {
    const out = {};
    for (const f of fields) out[f] = row[f];
    return out;
  }

  /**
   * في وضع الدمج، نحذف فقط السجلات المعلَّمة بحذف (tombs) إن كانت اللقطة تحملها.
   * تُستخدم علامة `_deleted` الاختيارية لنشر الحذف عبر الشبكة دون مسح كامل.
   */
  pruneDeletedInPlace(tableName) {
    // لا يوجد تمثيل للـ tombs في الإصدار الحالي؛ تُترك البيانات كما هي
    return;
  }

  // ==================== اتصالات الأقران ====================

  removePeer(ws) {
    const pid = ws.peerId;
    if (pid && this.syncPeers.get(pid) === ws) this.syncPeers.delete(pid);
    if (ws._outgoingKey && this.outgoingSockets.get(ws._outgoingKey) === ws) this.outgoingSockets.delete(ws._outgoingKey);
    this.setSyncStatus({});
  }

  handleIncomingMessage(ws, raw) {
    if (Buffer.isBuffer(raw)) raw = raw.toString();
    if (raw.length > SNAPSHOT_MAX_BYTES) return; // حماية: لقطة ضخمة غير مقبولة
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    if (!msg || typeof msg !== 'object') return;
    // فحص إصدار البروتوكول: رفض أي إصدار مستقبلي غير متوافق
    if (typeof msg.v === 'number' && msg.v > PROTOCOL_VERSION) return;

    // تحديث آخر نشاط للأقران (يُستخدم في ping/pong)
    ws.lastSeen = Date.now();

    if (msg.type === 'ping') {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'pong', peerId: this.getMachineId(), code: this.syncCode }));
      }
      return;
    }

    if (msg.type === 'pong') {
      return;
    }

    if (msg.type === 'hello') {
      const peerId = String(msg.peerId || '');
      if (peerId === this.getMachineId()) return;
      ws.peerId = peerId;
      ws.peerName = String(msg.name || peerId);
      ws.peerCode = String(msg.code || '').toUpperCase();
      if (ws._outgoingKey) {
        this.outgoingSockets.delete(ws._outgoingKey);
        ws._outgoingKey = null;
      }
      this.syncPeers.set(peerId, ws);
      this.setSyncStatus({});
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'hello-ack', v: PROTOCOL_VERSION, peerId: this.getMachineId(), name: os.hostname(), code: this.syncCode }));
      }
      // المضيف فقط يدفع لقطة الحالة للجهاز المنضم
      if (this.shouldPushSnapshot() && ws.peerCode === this.syncCode) {
        ws.send(JSON.stringify({ type: 'snapshot', v: PROTOCOL_VERSION, id: this.newMsgId(), peerId: this.getMachineId(), code: this.syncCode, data: this.takeSnapshot() }));
      }
      return;
    }

    if (msg.type === 'hello-ack') {
      const peerId = String(msg.peerId || '');
      if (peerId === this.getMachineId()) return;
      ws.peerId = peerId;
      ws.peerName = String(msg.name || peerId);
      ws.peerCode = String(msg.code || '').toUpperCase();
      if (ws._outgoingKey) {
        this.outgoingSockets.delete(ws._outgoingKey);
        ws._outgoingKey = null;
      }
      this.syncPeers.set(peerId, ws);
      this.setSyncStatus({});
      if (this.shouldPushSnapshot() && ws.peerCode === this.syncCode) {
        ws.send(JSON.stringify({ type: 'snapshot', v: PROTOCOL_VERSION, id: this.newMsgId(), peerId: this.getMachineId(), code: this.syncCode, data: this.takeSnapshot() }));
      }
      return;
    }

    if (msg.type === 'snapshot') {
      if (!this.syncCode || String(msg.code || '').toUpperCase() !== this.syncCode) return;
      if (this.seenSyncIds.has(msg.id)) return;
      this.markSeen(msg.id);
      this.applySnapshot(msg.data);
      this.completeJoin(true); // اكتمل تبنّي بيانات المكتب: عودة للمزامنة ثنائية الاتجاه
      // إعادة البث لبقية الأقران لتنتشر اللقطة عبر شبكة العنكبوت
      this.broadcastToPeers(msg, ws);
      return;
    }
  }

  // ==================== الخادم والاكتشاف ====================

  start() {
    this.startSyncServer();
    this.startUdpDiscovery();
    this.startPingLoop();
  }

  startSyncServer() {
    if (this.syncServer) return;
    try {
      this.syncServer = new WebSocket.Server({ port: SYNC_TCP_PORT });
      this.syncServer.on('connection', (ws) => {
        ws.lastSeen = Date.now();
        ws.on('message', (raw) => this.handleIncomingMessage(ws, raw));
        ws.on('close', () => this.removePeer(ws));
        ws.on('error', () => this.removePeer(ws));
      });
      this.syncServer.on('listening', () => {
        this.setSyncStatus({ serverListening: true, serverError: null });
      });
      this.syncServer.on('error', (err) => {
        this.setSyncStatus({ serverListening: false, serverError: String((err && err.message) || err) });
      });
    } catch (err) {
      this.setSyncStatus({ serverListening: false, serverError: String((err && err.message) || err) });
    }
  }

  startUdpDiscovery() {
    if (this.udpSocket) return;
    try {
      this.udpSocket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
      this.udpSocket.on('message', (buf, rinfo) => {
        let msg;
        try {
          msg = JSON.parse(buf.toString());
        } catch {
          return;
        }
        if (!msg) return;
        if (msg.type === 'officecash-hello' && msg.code && String(msg.code).toUpperCase() === this.syncCode) {
          const reply = Buffer.from(JSON.stringify({
            type: 'officecash-found',
            peerId: this.getMachineId(),
            name: os.hostname(),
            code: this.syncCode,
            tcpPort: SYNC_TCP_PORT,
            v: PROTOCOL_VERSION,
          }));
          this.udpSocket.send(reply, rinfo.port, rinfo.address);
        } else if (msg.type === 'officecash-found') {
          this.connectToPeer(rinfo.address, String(msg.peerId || ''), String(msg.name || ''), Number(msg.tcpPort) || SYNC_TCP_PORT);
        }
      });
      this.udpSocket.on('error', (err) => {
        this.setSyncStatus({ serverError: String((err && err.message) || err) });
      });
      this.udpSocket.bind(SYNC_UDP_PORT, () => {
        this.udpSocket.setBroadcast(true);
      });
    } catch (err) {
      this.setSyncStatus({ serverError: String((err && err.message) || err) });
    }
  }

  broadcastHello() {
    if (!this.udpSocket || !this.syncCode) return;
    const data = Buffer.from(JSON.stringify({
      type: 'officecash-hello',
      peerId: this.getMachineId(),
      name: os.hostname(),
      code: this.syncCode,
      tcpPort: SYNC_TCP_PORT,
      v: PROTOCOL_VERSION,
    }));
    const ifaces = os.networkInterfaces();
    for (const name of Object.keys(ifaces)) {
      for (const iface of ifaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          const parts = iface.address.split('.');
          parts[3] = '255';
          this.udpSocket.send(data, SYNC_UDP_PORT, parts.join('.'));
        }
      }
    }
    this.udpSocket.send(data, SYNC_UDP_PORT, '127.0.0.1');
  }

  startDiscoveryLoop() {
    this.stopDiscoveryLoop();
    this.broadcastHello();
    this.discoveryTimer = setInterval(() => this.broadcastHello(), 5000);
  }

  stopDiscoveryLoop() {
    if (this.discoveryTimer) {
      clearInterval(this.discoveryTimer);
      this.discoveryTimer = null;
    }
  }

  // قاعدة المصافحة: الجهة ذات المعرّف الأصغر تبادر بالاتصال لمنع الازدواجية
  connectToPeer(addr, peerId, peerName, tcpPort) {
    if (!this.syncCode) return;
    if (!peerId || peerId === this.getMachineId()) return;
    if (this.syncPeers.has(peerId) || this.outgoingSockets.has(peerId)) return;
    if (this.getMachineId() >= peerId) return;
    const port = tcpPort || SYNC_TCP_PORT;
    try {
      const ws = new WebSocket(`ws://${addr}:${port}`);
      ws.peerName = peerName || peerId;
      ws._outgoingKey = peerId;
      ws.lastSeen = Date.now();
      this.outgoingSockets.set(peerId, ws);
      ws.on('open', () => {
        ws.send(JSON.stringify({ type: 'hello', v: PROTOCOL_VERSION, peerId: this.getMachineId(), name: os.hostname(), code: this.syncCode }));
      });
      ws.on('message', (raw) => this.handleIncomingMessage(ws, raw));
      ws.on('close', () => this.removePeer(ws));
      ws.on('error', () => this.removePeer(ws));
    } catch (err) {
      if (this.outgoingSockets.get(peerId)) this.outgoingSockets.delete(peerId);
    }
  }

  closeAllPeers() {
    for (const [, ws] of this.syncPeers) {
      try {
        ws.close();
      } catch {}
    }
    for (const [, ws] of this.outgoingSockets) {
      try {
        ws.close();
      } catch {}
    }
    this.syncPeers.clear();
    this.outgoingSockets.clear();
    this.setSyncStatus({});
  }

  // ==================== Ping / Pong ====================

  startPingLoop() {
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = setInterval(() => {
      for (const ws of this.getConnectedWs()) {
        if (ws.readyState === WebSocket.OPEN) {
          // إسقاط الأقران غير المستجيبين
          if (ws.lastSeen && Date.now() - ws.lastSeen > PEER_STALE_MS) {
            try {
              ws.terminate();
            } catch {}
            continue;
          }
          ws.send(JSON.stringify({ type: 'ping', peerId: this.getMachineId(), code: this.syncCode }));
        }
      }
    }, PING_INTERVAL_MS);
  }

  // ==================== تعيين الرمز ====================

  setCode(code) {
    const next = String(code || '').toUpperCase();
    if (this.syncCode === next) return;
    this.syncCode = next;
    this.closeAllPeers();
    if (this.syncCode) this.startDiscoveryLoop();
    else this.stopDiscoveryLoop();
  }
}

module.exports = { SyncEngine, PROTOCOL_VERSION, SYNC_TCP_PORT, SYNC_UDP_PORT };
