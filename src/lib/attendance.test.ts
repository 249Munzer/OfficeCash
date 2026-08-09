import { describe, it, expect } from 'vitest';
import {
  attendanceForDay,
  isWorkdayActive,
  clockInFor,
  startBreak,
  endBreak,
  finishDay,
  workedMinutes,
  formatWorkedDuration,
} from './attendance';
import { AttendanceRecord } from '../types';

const record = (over: Partial<AttendanceRecord> = {}): AttendanceRecord => ({
  id: 'att-1',
  employeeId: 'emp-1',
  date: '2026-08-06',
  clockIn: '08:00:00',
  breaks: [],
  status: 'working',
  createdAt: '2026-08-06T08:00:00.000Z',
  ...over,
});

describe('attendanceForDay / isWorkdayActive', () => {
  it('يجد سجل اليوم للموظف', () => {
    const list = [record(), record({ employeeId: 'emp-2', id: 'att-2' })];
    expect(attendanceForDay(list, 'emp-1', '2026-08-06')?.id).toBe('att-1');
    expect(attendanceForDay(list, 'emp-1', '2026-08-07')).toBeNull();
  });
  it('يعتبر اليوم نشطاً أثناء العمل أو الاستراحة', () => {
    expect(isWorkdayActive(record())).toBe(true);
    expect(isWorkdayActive(record({ status: 'break' }))).toBe(true);
    expect(isWorkdayActive(record({ status: 'done' }))).toBe(false);
    expect(isWorkdayActive(null)).toBe(false);
  });
});

describe('clockInFor', () => {
  it('ينشئ توقيع دخول بحالة working', () => {
    const r = clockInFor('emp-1', '2026-08-06', '08:00:00');
    expect(r.employeeId).toBe('emp-1');
    expect(r.date).toBe('2026-08-06');
    expect(r.clockIn).toBe('08:00:00');
    expect(r.status).toBe('working');
    expect(r.breaks).toEqual([]);
  });
});

describe('startBreak / endBreak', () => {
  it('يفتح استراحة ويغيّر الحالة', () => {
    const r = startBreak(record(), '12:00:00');
    expect(r.status).toBe('break');
    expect(r.breaks).toEqual([{ start: '12:00:00' }]);
  });
  it('يغلق الاستراحة ويعيد الحالة للعمل', () => {
    const r = endBreak(record({ status: 'break', breaks: [{ start: '12:00:00' }] }), '12:30:00');
    expect(r.status).toBe('working');
    expect(r.breaks).toEqual([{ start: '12:00:00', end: '12:30:00' }]);
  });
  it('لا يؤثر بدء الاستراحة على يوم منتهٍ', () => {
    const r = startBreak(record({ status: 'done' }), '12:00:00');
    expect(r.status).toBe('done');
  });
});

describe('finishDay', () => {
  it('يغلق اليوم ويسجل وقت الخروج', () => {
    const r = finishDay(record(), '17:00:00');
    expect(r.status).toBe('done');
    expect(r.clockOut).toBe('17:00:00');
  });
  it('يغلق أي استراحة مفتوحة عند إنهاء اليوم', () => {
    const r = finishDay(record({ status: 'break', breaks: [{ start: '12:00:00' }] }), '17:00:00');
    expect(r.status).toBe('done');
    expect(r.breaks).toEqual([{ start: '12:00:00', end: '17:00:00' }]);
    expect(r.clockOut).toBe('17:00:00');
  });
  it('لا يغلق يوماً منتهياً مرتين', () => {
    const r = finishDay(record({ status: 'done', clockOut: '16:00:00' }), '17:00:00');
    expect(r.clockOut).toBe('16:00:00');
  });
});

describe('workedMinutes', () => {
  it('يحسب وقت العمل الصافي بعد خصم الاستراحات', () => {
    const r = record({ breaks: [{ start: '12:00:00', end: '12:30:00' }], clockOut: '17:00:00' });
    expect(workedMinutes(r)).toBe(9 * 60 - 30);
  });
  it('يخصم استراحة مفتوحة حتى الآن', () => {
    const r = record({ breaks: [{ start: '12:00:00' }], clockOut: '13:00:00' });
    expect(workedMinutes(r)).toBe(5 * 60 - 60);
  });
});

describe('formatWorkedDuration', () => {
  it('يصفّ المدة بالعربية', () => {
    expect(formatWorkedDuration(45)).toBe('45 د');
    expect(formatWorkedDuration(510)).toBe('8س 30د');
  });
});
