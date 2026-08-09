/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * محرك الاستحقاقات والتصفية — دوال نقية قابلة للاختبار:
 * حساب عمولة الموظف من معاملاته، إنشار تصفية يومية، توليد رقم توثيقي،
 * ومحفظة الموظف (مستحق / معلّق / مدفوع).
 * @module lib/settlement
 */
import { Employee, FinancialEntry, Settlement } from '../types';

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * حساب الصافي الصحيح بعد الخصم:
 * الصافي = إجمالي الإيرادات - إجمالي المصروفات - مستحقات الموظفين
 * تُستخدم هذه الدالة في جميع المكونات (Dashboard, DayClosingManager, ReportsScreen, PrintableReport)
 * لضمان توحيد حساب الصافي ومنع الارتباك المالي.
 * @param revenue - إجمالي الإيرادات
 * @param expenses - إجمالي المصروفات
 * @param commission - إجمالي مستحقات الموظفين
 * @returns الصافي بعد جميع الخصومات (مُدوّر إلى رقمين عشريين)
 */
export function computeNetIncome(revenue: number, expenses: number, commission: number): number {
  return round2(revenue - expenses - commission);
}

/**
 * حساب استحقاق النسبة: إجمالي معاملات الموظف × نسبة العمولة (عدد عشري).
 */
export function computeCommission(entries: FinancialEntry[], rate: number): number {
  if (!entries || entries.length === 0) return 0;
  if (!rate || rate <= 0) return 0;
  const total = entries.reduce((sum, e) => sum + e.amount, 0);
  return round2(total * rate);
}

/**
 * توليد رقم توثيقي تسلسلي لتصفية بتاريخ محدد: `SF-YYYYMMDD-NNN`.
 */
export function voucherNoFor(date: string, seq: number): string {
  const clean = date.replace(/-/g, '');
  return `SF-${clean}-${String(seq + 1).padStart(3, '0')}`;
}

/**
 * رقم توثيقي تالٍ بحسب عدد تصفيات اليوم الموجود بالفعل (يمنع التكرار).
 */
export function nextVoucherNo(date: string, settlements: Settlement[]): string {
  const todaySettlements = settlements.filter(
    (s) => s.periodEnd === date || (s.createdAt && s.createdAt.slice(0, 10) === date)
  );
  return voucherNoFor(date, todaySettlements.length);
}

/** هل الموظف مؤهل لاستحقاق نسبة من المعاملات؟ */
export function isEligibleForDailyCommission(employee: Employee): boolean {
  const mode = employee.contract?.mode ?? 'percentage';
  return mode === 'percentage' || mode === 'percentage_and_salary';
}

/** نسبة العمولة الفعلية للموظف (افتراضية 25%، ضمن [0,1]). */
export function commissionRateForEmployee(employee: Employee): number {
  const rate = employee.contract?.commissionRate ?? 0.25;
  if (typeof rate !== 'number' || !isFinite(rate)) return 0.25;
  return Math.min(1, Math.max(0, rate));
}

export interface BuildDailySettlementArgs {
  employee: Employee;
  entries: FinancialEntry[];
  date: string;
  voucherNo: string;
  createdAt: string;
}

/**
 * بناء تصفية يومية للنسبة: يُحسب المستحق تلقائياً من معاملات الموظف،
 * وتُعاد بحالة `pending` (لا تُخصم حتى يؤكد الموظف الاستلام).
 */
export function buildDailySettlement(args: BuildDailySettlementArgs): Settlement {
  const rate = commissionRateForEmployee(args.employee);
  const grossRevenue = args.entries.reduce((sum, e) => sum + e.amount, 0);
  const amount = round2(grossRevenue * rate);
  return {
    id: `set-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    employeeId: args.employee.id,
    employeeName: args.employee.name,
    type: 'daily_commission',
    periodStart: args.date,
    periodEnd: args.date,
    grossRevenue,
    amount,
    commissionRate: rate,
    status: 'pending',
    voucherNo: args.voucherNo,
    createdAt: args.createdAt,
    createdBy: args.employee.id,
  };
}

/** هل توجد تصفية يومية قائمة (غير مدفوعة) لنفس الموظف في نفس اليوم؟ */
export function hasPendingDailySettlement(settlements: Settlement[], employeeId: string, date: string): boolean {
  return settlements.some(
    (s) => s.employeeId === employeeId && s.type === 'daily_commission' && s.periodEnd === date && s.status !== 'paid'
  );
}

/**
 * إجمالي مستحقات النسبة للموظفين المؤهلين عن معاملات (فترة/يوم) معيّنة.
 * تُحسب مباشرة من معاملاتهم × نسبة العقد، وتُطابق تماماً صيغة التصفية
 * التي تُنشأ عند إقفال اليوم، فيُخصم منه صافي الربح (الإيرادات - المصروفات).
 */
export function commissionTotalForEntries(entries: FinancialEntry[], employees: Employee[]): number {
  if (!entries || entries.length === 0) return 0;

  const byEmployee = new Map<string, FinancialEntry[]>();
  for (const e of entries) {
    const arr = byEmployee.get(e.employeeId) ?? [];
    arr.push(e);
    byEmployee.set(e.employeeId, arr);
  }

  let total = 0;
  for (const emp of employees) {
    if (!emp.isActive) continue;
    if (!isEligibleForDailyCommission(emp)) continue;
    const empEntries = byEmployee.get(emp.id);
    if (!empEntries || empEntries.length === 0) continue;
    total += computeCommission(empEntries, commissionRateForEmployee(emp));
  }
  return round2(total);
}

export interface BuildDayCloseSettlementsArgs {
  entries: FinancialEntry[];
  employees: Employee[];
  settlements: Settlement[];
  date: string;
  now: string;
}

/**
 * إنشار تصفيات اليوم تلقائياً عند إقفال اليوم من الإدارة:
 * لكل موظف نشط مؤهَّل للنسبة، لديه معاملات اليوم وبمستحقات أكبر من صفر،
 * وليس لديه تصفية يومية قائمة لنفس اليوم — تُنشأ تصفية بحالة `pending`.
 * لا تُنشأ تصفية لمن أنهى دوامه يدوياً مسبقاً (تُمنع التكرار).
 */
export function buildDayCloseSettlements(args: BuildDayCloseSettlementsArgs): Settlement[] {
  const { entries, employees, settlements, date, now } = args;

  // منع التكرار: الموظف الذي لديه تصفية غير مدفوعة لنفس اليوم يُستثنى
  const alreadySettled = new Set(
    settlements
      .filter((s) => s.type === 'daily_commission' && s.periodEnd === date && s.status !== 'paid')
      .map((s) => s.employeeId)
  );

  const byEmployee = new Map<string, FinancialEntry[]>();
  for (const e of entries) {
    if (e.date !== date) continue;
    const arr = byEmployee.get(e.employeeId) ?? [];
    arr.push(e);
    byEmployee.set(e.employeeId, arr);
  }

  const todaySettlementsCount = settlements.filter(
    (s) => s.periodEnd === date || (s.createdAt && s.createdAt.slice(0, 10) === date)
  ).length;
  let seq = todaySettlementsCount;

  const result: Settlement[] = [];
  for (const emp of employees) {
    if (!emp.isActive) continue;
    if (alreadySettled.has(emp.id)) continue;
    if (!isEligibleForDailyCommission(emp)) continue;

    const empEntries = byEmployee.get(emp.id) ?? [];
    if (empEntries.length === 0) continue;
    const grossRevenue = round2(empEntries.reduce((sum, e) => sum + e.amount, 0));
    if (grossRevenue <= 0) continue;

    const rate = commissionRateForEmployee(emp);
    const amount = round2(grossRevenue * rate);
    if (amount <= 0) continue;

    result.push({
      id: `set-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      employeeId: emp.id,
      employeeName: emp.name,
      type: 'daily_commission',
      periodStart: date,
      periodEnd: date,
      grossRevenue,
      amount,
      commissionRate: rate,
      status: 'pending',
      voucherNo: voucherNoFor(date, seq),
      createdAt: now,
      createdBy: 'system',
    });
    seq += 1;
  }
  return result;
}

export interface EmployeeWallet {
  earnedTotal: number;
  pendingTotal: number;
  confirmedTotal: number;
  paidTotal: number;
  pendingCount: number;
}

/**
 * محفظة الاستحقاق: إجمالي مستحق، قيد الانتظار (غير مؤكَّد)، مؤكَّد، ومدفوع.
 */
export function employeeWallet(settlements: Settlement[], employeeId: string): EmployeeWallet {
  const mine = settlements.filter((s) => s.employeeId === employeeId);
  const pendingTotal = mine.filter((s) => s.status === 'pending').reduce((sum, s) => sum + s.amount, 0);
  const confirmedTotal = mine.filter((s) => s.status === 'confirmed').reduce((sum, s) => sum + s.amount, 0);
  const paidTotal = mine.filter((s) => s.status === 'paid').reduce((sum, s) => sum + s.amount, 0);
  return {
    earnedTotal: round2(mine.reduce((sum, s) => sum + s.amount, 0)),
    pendingTotal: round2(pendingTotal),
    confirmedTotal: round2(confirmedTotal),
    paidTotal: round2(paidTotal),
    pendingCount: mine.filter((s) => s.status === 'pending').length,
  };
}
