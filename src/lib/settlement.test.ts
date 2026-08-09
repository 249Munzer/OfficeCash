import { describe, it, expect } from 'vitest';
import {
  computeCommission,
  voucherNoFor,
  nextVoucherNo,
  isEligibleForDailyCommission,
  commissionRateForEmployee,
  buildDailySettlement,
  hasPendingDailySettlement,
  employeeWallet,
  buildDayCloseSettlements,
  commissionTotalForEntries,
  round2,
  computeNetIncome,
} from './settlement';
import { Employee, FinancialEntry, Settlement } from '../types';

const emp = (over: Partial<Employee> = {}): Employee => ({
  id: 'emp-1',
  name: 'أحمد',
  username: 'ahmed',
  passwordPin: 'x',
  color: '#2563eb',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...over,
});

const entry = (amount: number): FinancialEntry => ({
  id: `e-${amount}`,
  date: '2026-08-06',
  time: '10:00:00',
  employeeId: 'emp-1',
  employeeName: 'أحمد',
  serviceId: 's1',
  serviceName: 'خدمة',
  amount,
  paymentMethod: 'cash',
  createdAt: '2026-08-06T10:00:00.000Z',
});

const settlement = (over: Partial<Settlement> = {}): Settlement => ({
  id: 's1',
  employeeId: 'emp-1',
  employeeName: 'أحمد',
  type: 'daily_commission',
  periodStart: '2026-08-06',
  periodEnd: '2026-08-06',
  grossRevenue: 1000,
  amount: 250,
  commissionRate: 0.25,
  status: 'pending',
  voucherNo: 'SF-20260806-001',
  createdAt: '2026-08-06T17:00:00.000Z',
  createdBy: 'emp-1',
  ...over,
});

describe('computeCommission', () => {
  it('يحسب 25% من إجمالي المعاملات', () => {
    expect(computeCommission([entry(1000), entry(500)], 0.25)).toBe(375);
  });
  it('يحسب 40% و50%', () => {
    expect(computeCommission([entry(1000)], 0.4)).toBe(400);
    expect(computeCommission([entry(1000)], 0.5)).toBe(500);
  });
  it('يحسب نسبة مخصصة (custom)', () => {
    expect(computeCommission([entry(900)], 0.15)).toBe(135);
  });
  it('يعيد صفراً عند غياب المعاملات أو نسبة صفرية', () => {
    expect(computeCommission([], 0.25)).toBe(0);
    expect(computeCommission([entry(100)], 0)).toBe(0);
  });
  it('يدوّر إلى خانتين عشريتين', () => {
    expect(round2(10.005)).toBe(10.01);
  });
});

describe('voucherNoFor / nextVoucherNo', () => {
  it('يولّد رقماً بصيغة SF-YYYYMMDD-NNN', () => {
    expect(voucherNoFor('2026-08-06', 0)).toBe('SF-20260806-001');
    expect(voucherNoFor('2026-08-06', 4)).toBe('SF-20260806-005');
  });
  it('يستمر التسلسل من عدد تصفيات اليوم الموجودة', () => {
    const list = [settlement(), settlement({ id: 's2', voucherNo: 'SF-20260806-002' })];
    expect(nextVoucherNo('2026-08-06', list)).toBe('SF-20260806-003');
  });
});

describe('isEligibleForDailyCommission / commissionRateForEmployee', () => {
  it('يؤهل النسبة فقط والنسبة+راتب، ولا يؤهل الراتب فقط', () => {
    expect(isEligibleForDailyCommission(emp({ contract: { mode: 'percentage' } }))).toBe(true);
    expect(isEligibleForDailyCommission(emp({ contract: { mode: 'percentage_and_salary' } }))).toBe(true);
    expect(isEligibleForDailyCommission(emp({ contract: { mode: 'salary' } }))).toBe(false);
    expect(isEligibleForDailyCommission(emp({}))).toBe(true); // افتراضياً نسبة
  });
  it('يقرأ النسبة من العقد مع حد أقصى/أدنى', () => {
    expect(commissionRateForEmployee(emp({ contract: { mode: 'percentage', commissionRate: 0.5 } }))).toBe(0.5);
    expect(commissionRateForEmployee(emp({}))).toBe(0.25);
    expect(commissionRateForEmployee(emp({ contract: { mode: 'percentage', commissionRate: 2 } }))).toBe(1);
    expect(commissionRateForEmployee(emp({ contract: { mode: 'percentage', commissionRate: -1 } }))).toBe(0);
  });
});

describe('buildDailySettlement', () => {
  it('يبني تصفية pending بالقيم الصحيحة', () => {
    const s = buildDailySettlement({
      employee: emp({ contract: { mode: 'percentage', commissionRate: 0.4 } }),
      entries: [entry(500), entry(250)],
      date: '2026-08-06',
      voucherNo: 'SF-20260806-001',
      createdAt: '2026-08-06T17:00:00.000Z',
    });
    expect(s.status).toBe('pending');
    expect(s.type).toBe('daily_commission');
    expect(s.grossRevenue).toBe(750);
    expect(s.amount).toBe(300);
    expect(s.commissionRate).toBe(0.4);
    expect(s.voucherNo).toBe('SF-20260806-001');
    expect(s.periodStart).toBe('2026-08-06');
    expect(s.periodEnd).toBe('2026-08-06');
  });
});

describe('hasPendingDailySettlement', () => {
  it('يكتشف تصفية قائمة غير مدفوعة', () => {
    const list = [settlement()];
    expect(hasPendingDailySettlement(list, 'emp-1', '2026-08-06')).toBe(true);
    expect(hasPendingDailySettlement([settlement({ status: 'paid' })], 'emp-1', '2026-08-06')).toBe(false);
    expect(hasPendingDailySettlement([], 'emp-1', '2026-08-06')).toBe(false);
  });
});

describe('commissionTotalForEntries', () => {
  const ahmed = emp({ id: 'emp-1', name: 'أحمد' });
  const sara = emp({
    id: 'emp-2',
    name: 'سارة',
    contract: { mode: 'percentage', commissionRate: 0.5 },
  });
  const salaried = emp({ id: 'emp-3', name: 'خالد', contract: { mode: 'salary' } });
  const inactive = emp({ id: 'emp-4', name: 'غير نشط', isActive: false });

  const entryFor = (employeeId: string, amount: number): FinancialEntry => ({
    ...entry(amount),
    id: `e-${employeeId}-${amount}`,
    employeeId,
    employeeName: employeeId,
  });

  it('يجمع عمولات الموظفين المؤهلين فقط (نسبة افتراضية 25%، و50% مخصصة)', () => {
    const total = commissionTotalForEntries(
      [entryFor('emp-1', 1000), entryFor('emp-2', 800)],
      [ahmed, sara, salaried, inactive]
    );
    expect(total).toBe(250 + 400); // 1000×25% + 800×50%
  });

  it('يتجاهل الراتب فقط وغير النشطين والمعاملات بدون موظف مؤهل', () => {
    expect(commissionTotalForEntries([entryFor('emp-3', 1000)], [salaried])).toBe(0);
    expect(commissionTotalForEntries([entryFor('emp-4', 1000)], [inactive])).toBe(0);
  });

  it('يعيد صفراً عند غياب المعاملات', () => {
    expect(commissionTotalForEntries([], [ahmed])).toBe(0);
  });

  it('يخصم المستحقات فقط للموظف الذي له معاملات فعلية', () => {
    const total = commissionTotalForEntries([entryFor('emp-1', 200)], [ahmed, sara]);
    expect(total).toBe(50); // 200×25% فقط لأحمد
  });
});

describe('employeeWallet', () => {
  it('يجمع المحفظة (مستحق/معلق/مؤكد/مدفوع)', () => {
    const list = [
      settlement({ id: 'a', amount: 100, status: 'pending' }),
      settlement({ id: 'b', amount: 200, status: 'confirmed' }),
      settlement({ id: 'c', amount: 300, status: 'paid' }),
      settlement({ id: 'd', employeeId: 'emp-2', amount: 500 }),
    ];
    const w = employeeWallet(list, 'emp-1');
    expect(w.earnedTotal).toBe(600);
    expect(w.pendingTotal).toBe(100);
    expect(w.confirmedTotal).toBe(200);
    expect(w.paidTotal).toBe(300);
    expect(w.pendingCount).toBe(1);
  });
});

describe('buildDayCloseSettlements', () => {
  const ahmed = emp({ id: 'emp-1', name: 'أحمد' });
  const sara = emp({
    id: 'emp-2',
    name: 'سارة',
    contract: { mode: 'percentage', commissionRate: 0.5 },
  });
  const salaried = emp({ id: 'emp-3', name: 'خالد', contract: { mode: 'salary' } });
  const inactive = emp({ id: 'emp-4', name: 'غير نشط', isActive: false });

  const entryFor = (employeeId: string, amount: number): FinancialEntry => ({
    ...entry(amount),
    id: `e-${employeeId}-${amount}`,
    employeeId,
    employeeName: employeeId,
  });

  it('ينشئ تصفية pending لكل موظف مؤهَّل لديه معاملات اليوم', () => {
    const result = buildDayCloseSettlements({
      entries: [entryFor('emp-1', 1000), entryFor('emp-2', 800)],
      employees: [ahmed, sara, salaried, inactive],
      settlements: [],
      date: '2026-08-06',
      now: '2026-08-06T17:00:00.000Z',
    });

    expect(result.length).toBe(2);
    const s1 = result.find((s) => s.employeeId === 'emp-1');
    const s2 = result.find((s) => s.employeeId === 'emp-2');
    expect(s1?.grossRevenue).toBe(1000);
    expect(s1?.amount).toBe(250); // 25% افتراضية
    expect(s1?.status).toBe('pending');
    expect(s2?.amount).toBe(400); // 50%
    expect(result.some((s) => s.employeeId === 'emp-3')).toBe(false); // راتب فقط
    expect(result.some((s) => s.employeeId === 'emp-4')).toBe(false); // غير نشط
  });

  it('يتخطى من لديه تصفية يومية قائمة لنفس اليوم (يمنع التكرار)', () => {
    const result = buildDayCloseSettlements({
      entries: [entryFor('emp-1', 1000)],
      employees: [ahmed],
      settlements: [settlement({ employeeId: 'emp-1' })],
      date: '2026-08-06',
      now: '2026-08-06T17:00:00.000Z',
    });
    expect(result.length).toBe(0);
  });

  it('لا ينشئ شيئاً بلا معاملات أو بمستحقات صفرية', () => {
    expect(
      buildDayCloseSettlements({
        entries: [],
        employees: [ahmed, sara],
        settlements: [],
        date: '2026-08-06',
        now: '2026-08-06T17:00:00.000Z',
      }).length
    ).toBe(0);
  });

  it('يستمر تسلسل أرقام التوثيق بعد تصفيات اليوم الموجودة', () => {
    const result = buildDayCloseSettlements({
      entries: [entryFor('emp-1', 1000)],
      employees: [ahmed, sara],
      settlements: [settlement({ employeeId: 'emp-2', voucherNo: 'SF-20260806-001' })],
      date: '2026-08-06',
      now: '2026-08-06T17:00:00.000Z',
    });
    // emp-1 فقط يُنشأ له تصفية جديدة برقم توثيق تالٍ، وemp-2 لا يتكرر
    expect(result.length).toBe(1);
    expect(result[0].employeeId).toBe('emp-1');
    expect(result[0].voucherNo).toBe('SF-20260806-002');
  });
});


// ==== computeNetIncome ====
describe('computeNetIncome', () => {
  it('calculates net income by subtracting expenses and commission from revenue', () => {
    expect(computeNetIncome(1000, 200, 100)).toBe(700);
  });

  it('handles zero expenses and commission', () => {
    expect(computeNetIncome(500, 0, 0)).toBe(500);
  });

  it('handles all costs exceeding revenue (negative net)', () => {
    expect(computeNetIncome(300, 200, 200)).toBe(-100);
  });

  it('rounds to 2 decimal places', () => {
    expect(computeNetIncome(100.555, 10.001, 5.002)).toBe(85.55);
  });
});
