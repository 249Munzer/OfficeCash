import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Dashboard } from './Dashboard';
import { translations } from '../lib/i18n';
import { getTodayDateString } from '../lib/formatters';
import { Employee, FinancialEntry, Expense, OfficeSettings } from '../types';

const ar = translations.ar;
const today = getTodayDateString();

const settings: OfficeSettings = {
  officeName: 'مكتب الاختبار',
  licenseNumber: '12345678',
  phone: '0500000000',
  address: 'الرياض',
  currency: 'ر.س',
  autoLockClosedDays: true,
  soundEffects: false,
  language: 'ar',
  theme: 'light',
};

const ahmed: Employee = {
  id: 'emp-1',
  name: 'أحمد',
  username: 'ahmed',
  passwordPin: '1111',
  color: '#2563eb',
  isActive: true,
  createdAt: '2026-01-01',
};

const salaried: Employee = {
  id: 'emp-2',
  name: 'خالد',
  username: 'khaled',
  passwordPin: '2222',
  color: '#db2777',
  isActive: true,
  createdAt: '2026-01-01',
  contract: { mode: 'salary' },
};

const entry = (id: string, employeeId: string, employeeName: string, amount: number): FinancialEntry => ({
  id,
  date: today,
  time: '10:00:00',
  employeeId,
  employeeName,
  serviceId: 'svc-1',
  serviceName: 'حلاقة',
  amount,
  paymentMethod: 'cash',
  createdAt: `${today}T10:00:00.000Z`,
});

const expense: Expense = {
  id: 'x1',
  date: today,
  time: '11:00',
  category: 'فواتير',
  statement: 'كهرباء',
  amount: 100,
  createdAt: `${today}T11:00:00.000Z`,
};

const noProps = {
  isTodayClosed: false,
  onNavigate: vi.fn(),
  onOpenFastEntry: vi.fn(),
  onDeleteEntry: vi.fn(),
};

// تحويل الأرقام العربية-الهندية (١٥٠) إلى غربية (150) وإزالة فاصل الآلاف لمقارنة المبالغ
const toWestern = (txt: string): string =>
  txt.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[^\d.\-]/g, '');

const netCardValue = (): number => {
  const labelEl = screen.getByText(ar.netProfitFinal);
  const card = labelEl.closest('.bg-blue-50') as HTMLElement;
  const valueEl = card.querySelector('.text-2xl') as HTMLElement;
  return parseFloat(toWestern(valueEl.textContent || '')) || 0;
};

const commissionLine = (): HTMLElement | null => {
  const labelEl = screen.getByText(ar.netProfitFinal);
  const card = labelEl.closest('.bg-blue-50') as HTMLElement;
  return card.querySelector('.text-rose-600');
};

function renderDashboard(entries: FinancialEntry[], employees: Employee[]) {
  render(
    <Dashboard
      entries={entries}
      expenses={[expense]}
      employees={employees}
      settings={settings}
      {...noProps}
    />
  );
}

describe('Dashboard net profit after commission', () => {
  it('deducts the commission of percentage-based employees only', () => {
    // أحمد (نسبة افتراضية 25%) بإيراد 1000، وخالد (راتب) بإيراد 500، مصروف 100
    renderDashboard(
      [entry('e1', 'emp-1', 'أحمد', 1000), entry('e2', 'emp-2', 'خالد', 500)],
      [ahmed, salaried]
    );

    // المستحق: 1000×25% = 250 → صافي = 1500 - 100 - 250 = 1150
    expect(netCardValue()).toBe(1150);
    expect(commissionLine()).not.toBeNull();
  });

  it('shows no commission deduction when no eligible employee has revenue', () => {
    renderDashboard([entry('e3', 'emp-2', 'خالد', 500)], [salaried]);

    // لا مستحق (راتب فقط) → صافي = 500 - 100 = 400
    expect(netCardValue()).toBe(400);
    expect(commissionLine()).toBeNull();
  });
});
