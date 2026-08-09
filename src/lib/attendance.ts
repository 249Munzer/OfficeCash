/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * دوال اليوم الموثّق — تسجيل دخول (توقيع دخول)، استراحات، وإنهاء الدوام.
 * تعمل على `AttendanceRecord` كدوال نقية قابلة للاختبار.
 * @module lib/attendance
 */
import { AttendanceRecord, BreakInterval } from '../types';
import { getCurrentTimeString } from './formatters';

export function attendanceForDay(
  records: AttendanceRecord[],
  employeeId: string,
  date: string
): AttendanceRecord | null {
  return records.find((r) => r.employeeId === employeeId && r.date === date) || null;
}

export function isWorkdayActive(record: AttendanceRecord | null): boolean {
  return !!record && (record.status === 'working' || record.status === 'break');
}

/**
 * تسجيل دخول: إنشاء سجل حضور جديد بحالة `working` (توقيع دخول).
 * يمنع الإنشاء إن وُجد سجل غير منتهٍ لنفس اليوم.
 */
export function clockInFor(employeeId: string, date: string, time?: string): AttendanceRecord {
  return {
    id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    employeeId,
    date,
    clockIn: time ?? getCurrentTimeString(),
    breaks: [],
    status: 'working',
    createdAt: new Date().toISOString(),
  };
}

/** بدء استراحة: يفتح فاصل زمني جديد ويغيّر الحالة إلى `break`. */
export function startBreak(record: AttendanceRecord, time?: string): AttendanceRecord {
  if (record.status !== 'working') return record;
  const breaks: BreakInterval[] = [...record.breaks, { start: time ?? getCurrentTimeString() }];
  return { ...record, breaks, status: 'break' };
}

/** إنهاء استراحة: يغلق آخر فاصل مفتوح ويعيد الحالة إلى `working`. */
export function endBreak(record: AttendanceRecord, time?: string): AttendanceRecord {
  if (record.status !== 'break') return record;
  const closes: BreakInterval[] = record.breaks.map((b, i) =>
    i === record.breaks.length - 1 && !b.end ? { ...b, end: time ?? getCurrentTimeString() } : b
  );
  return { ...record, breaks: closes, status: 'working' };
}

/**
 * إنهاء الدوام: إغلاق أي استراحة مفتوحة، تسجيل `clockOut`، وضبط الحالة على `done`.
 */
export function finishDay(record: AttendanceRecord, time?: string): AttendanceRecord {
  if (record.status === 'done') return record;
  const breaks: BreakInterval[] =
    record.status === 'break'
      ? record.breaks.map((b, i) =>
          i === record.breaks.length - 1 && !b.end ? { ...b, end: time ?? getCurrentTimeString() } : b
        )
      : record.breaks;
  return { ...record, breaks, status: 'done', clockOut: time ?? getCurrentTimeString() };
}

function toMinutes(t: string): number {
  const parts = t.split(':');
  const h = parseInt(parts[0] ?? '0', 10);
  const m = parseInt(parts[1] ?? '0', 10);
  return (h || 0) * 60 + (m || 0);
}

/** وقت العمل الصافي بالدقائق: من الدخول إلى الخروج (أو الآن) مطروحاً منه الاستراحات. */
export function workedMinutes(record: AttendanceRecord | null, now?: Date): number {
  if (!record) return 0;
  const nowTime = now
    ? `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(
        now.getSeconds()
      ).padStart(2, '0')}`
    : getCurrentTimeString();
  const end = toMinutes(record.clockOut ?? nowTime);
  const start = toMinutes(record.clockIn);
  let total = Math.max(0, end - start);
  for (const b of record.breaks) {
    const bEnd = b.end ? toMinutes(b.end) : end;
    total -= Math.max(0, bEnd - toMinutes(b.start));
  }
  return Math.max(0, total);
}

export function formatWorkedDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h <= 0) return `${m} د`;
  return `${h}س ${m}د`;
}
