import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReportsScreen } from './ReportsScreen';
import { getTodayDateString, getDateStringFrom, formatCurrency } from '../lib/formatters';
import { translations } from '../lib/i18n';
import { FinancialEntry, Expense, Employee, Service, OfficeSettings } from '../types';

const ar = translations.ar;

const settings: OfficeSettings = {
  officeName: 'مكتب الأمل',
  licenseNumber: '12345678',
  phone: '',
  address: '',
  currency: 'ر.س',
  autoLockClosedDays: true,
  soundEffects: true,
  language: 'ar',
};

function buildFixtures() {
  const today = getTodayDateString();
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const prev = new Date();
  prev.setDate(1);
  prev.setMonth(prev.getMonth() - 1);
  const prevMonth = getDateStringFrom(prev);

  const todayEntry: FinancialEntry = {
    id: 'today-cash',
    date: today,
    time: '09:00:00',
    employeeId: 'e1',
    employeeName: 'أحمد',
    serviceId: 's1',
    serviceName: 'خدمة 1',
    amount: 100,
    paymentMethod: 'cash',
    createdAt: today,
  };
  const monthEntry: FinancialEntry = {
    id: 'month-card',
    date: monthStart,
    time: '10:00:00',
    employeeId: 'e1',
    employeeName: 'أحمد',
    serviceId: 's1',
    serviceName: 'خدمة 1',
    amount: 50,
    paymentMethod: 'card',
    createdAt: monthStart,
  };
  const prevMonthEntry: FinancialEntry = {
    id: 'prev-cash',
    date: prevMonth,
    time: '08:00:00',
    employeeId: 'e1',
    employeeName: 'أحمد',
    serviceId: 's1',
    serviceName: 'خدمة 1',
    amount: 999,
    paymentMethod: 'cash',
    createdAt: prevMonth,
  };

  const expenses: Expense[] = [
    { id: 'x1', date: today, time: '10:00', category: 'فواتير', statement: 'كهرباء', amount: 10, createdAt: today },
    { id: 'x2', date: monthStart, time: '09:00', category: 'أخرى', statement: 'صيانة', amount: 20, createdAt: monthStart },
  ];

  return { today, monthStart, prevMonth, todayEntry, monthEntry, prevMonthEntry, expenses };
}

function renderReports(entries: FinancialEntry[], expenses: Expense[], onPrintReport = vi.fn()) {
  const employees: Employee[] = [
    { id: 'e1', name: 'أحمد', username: 'ahmad1', passwordPin: 'x', color: '#f59e0b', isActive: true, createdAt: '2026-01-01' },
  ];
  const services: Service[] = [
    { id: 's1', name: 'خدمة 1', defaultPrice: 50, category: 'قسم', isActive: true, createdAt: '2026-01-01' },
  ];
  render(
    <ReportsScreen
      entries={entries}
      expenses={expenses}
      employees={employees}
      services={services}
      settings={settings}
      onPrintReport={onPrintReport}
    />
  );
  return onPrintReport;
}

describe('ReportsScreen', () => {
  it('renders the default summary tab', () => {
    const { todayEntry, expenses } = buildFixtures();
    renderReports([todayEntry], expenses);
    expect(screen.getByText(ar.reportsPageTitle)).toBeInTheDocument();
  });

  it('monthly tab always sums the full current calendar month regardless of date filter', () => {
    const { todayEntry, monthEntry, prevMonthEntry, expenses } = buildFixtures();
    renderReports([todayEntry, monthEntry, prevMonthEntry], expenses);

    fireEvent.click(screen.getByText(ar.tabSettlement));

    const monthRevenue = todayEntry.amount + monthEntry.amount;
    const monthCash = todayEntry.amount;
    const monthCard = monthEntry.amount;
    const monthExpenses = 30;
    const monthCommission = (monthRevenue) * 0.25; // أحمد بنسبة افتراضية 25%
    const net = monthRevenue - monthExpenses - monthCommission;

    expect(screen.getAllByText(formatCurrency(monthRevenue, 'ر.س', 'ar')).length).toBeGreaterThan(0);
    expect(screen.getAllByText(formatCurrency(monthCash, 'ر.س', 'ar')).length).toBeGreaterThan(0);
    expect(screen.getByText(formatCurrency(monthCard, 'ر.س', 'ar'))).toBeInTheDocument();
    expect(screen.getByText((content: string) => content.includes(formatCurrency(monthExpenses, 'ر.س', 'ar')))).toBeInTheDocument();
    expect(screen.getByText((content: string) => content.includes(formatCurrency(monthCommission, 'ر.س', 'ar')))).toBeInTheDocument();
    expect(screen.getByText(formatCurrency(net, 'ر.س', 'ar'))).toBeInTheDocument();

    expect(screen.queryByText(formatCurrency(prevMonthEntry.amount, 'ر.س', 'ar'))).not.toBeInTheDocument();
  });

  it('summary KPI cards respect the selected date filter while monthly does not', () => {
    const { todayEntry, monthEntry, prevMonthEntry, expenses, monthStart, today } = buildFixtures();
    renderReports([todayEntry, monthEntry, prevMonthEntry], expenses);

    const summaryRevenue = todayEntry.amount;
    expect(screen.getAllByText(formatCurrency(summaryRevenue, 'ر.س', 'ar')).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByText(ar.tabSettlement));
    const monthlyRevenue = todayEntry.amount + monthEntry.amount;
    expect(screen.getAllByText(formatCurrency(monthlyRevenue, 'ر.س', 'ar')).length).toBeGreaterThan(0);
    expect(screen.getByText(`${monthStart} → ${today}`)).toBeInTheDocument();
  });

  it('print handler receives month-scoped entries when on monthly tab', () => {
    const { todayEntry, monthEntry, prevMonthEntry, expenses } = buildFixtures();
    const onPrintReport = renderReports([todayEntry, monthEntry, prevMonthEntry], expenses);

    fireEvent.click(screen.getByText(ar.tabSettlement));
    fireEvent.click(screen.getByText(ar.printReport));

    expect(onPrintReport).toHaveBeenCalledTimes(1);
    const [reportType, printEntries] = onPrintReport.mock.calls[0];
    expect(reportType).toBe('monthly');
    const ids = printEntries.map((e: FinancialEntry) => e.id);
    expect(ids).toContain('today-cash');
    expect(ids).toContain('month-card');
    expect(ids).not.toContain('prev-cash');
  });
});
