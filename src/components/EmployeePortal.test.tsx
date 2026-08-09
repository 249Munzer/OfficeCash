import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmployeePortal } from './EmployeePortal';
import { ToastProvider } from './Toast/ToastProvider';
import { ToastContainer } from './Toast/ToastContainer';
import { translations } from '../lib/i18n';
import {
  Employee,
  Service,
  FinancialEntry,
  OfficeSettings,
  AttendanceRecord,
  Settlement,
  PaymentMethod,
} from '../types';
import { getTodayDateString } from '../lib/formatters';

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

const sara: Employee = {
  id: 'emp-2',
  name: 'سارة',
  username: 'sara',
  passwordPin: '2222',
  color: '#db2777',
  isActive: true,
  createdAt: '2026-01-01',
};

const service: Service = {
  id: 'svc-1',
  name: 'حلاقة',
  defaultPrice: 100,
  category: 'خدمات',
  isActive: true,
  createdAt: '2026-01-01',
};

const entry = (
  id: string,
  empId: string,
  empName: string,
  amount: number,
  method: PaymentMethod,
  serviceName: string
): FinancialEntry => ({
  id,
  date: today,
  time: '10:00:00',
  employeeId: empId,
  employeeName: empName,
  serviceId: 'svc-1',
  serviceName,
  amount,
  paymentMethod: method,
  statement: '',
  createdAt: new Date().toISOString(),
});

// today's entries: أحمد (100 كاش + 50 شبكة) and سارة (200 كاش)
const entries: FinancialEntry[] = [
  entry('e1', 'emp-1', 'أحمد', 100, 'cash', 'حلاقة'),
  entry('e2', 'emp-1', 'أحمد', 50, 'card', 'تنظيف'),
  entry('e3', 'emp-2', 'سارة', 200, 'cash', 'خدمة سارة'),
];

const noProps = {
  services: [service],
  attendance: [] as AttendanceRecord[],
  settlements: [] as Settlement[],
  isTodayClosed: false,
  currentRole: 'employee' as const,
  onSelectEmployee: vi.fn(),
  onVerifyEmployeePin: vi.fn(),
  onAddEntry: vi.fn(),
  onAddAttendance: vi.fn(),
  onUpdateAttendance: vi.fn(),
  onAddSettlement: vi.fn(),
  onUpdateSettlement: vi.fn(),
  onSwitchToAdmin: vi.fn(),
  onLogout: vi.fn(),
};

const cardAmount = (label: string): number => {
  const labelEl = screen.getByText(label);
  const card = labelEl.closest('.space-y-1') as HTMLElement;
  const valueEl = card.querySelector('.text-xl') as HTMLElement;
  const txt = valueEl.textContent || '';
  // تحويل الأرقام العربية-الهندية (١٥٠) إلى غربية (150) لمقارنة المبالغ
  const western = txt.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
  const m = western.match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : NaN;
};

function renderPortal(activeEmployee: Employee | null, employeeList: Employee[]) {
  render(
    <ToastProvider>
      <EmployeePortal
        activeEmployee={activeEmployee}
        employees={employeeList}
        entries={entries}
        settings={settings}
        {...noProps}
      />
      <ToastContainer />
    </ToastProvider>
  );
}

describe('EmployeePortal personal totals', () => {
  it('totals ONLY the active employee entries in all three cards', () => {
    renderPortal(ahmed, [ahmed, sara]);

    // أحمد: 100 كاش + 50 شبكة = 150 مبيعات اليوم
    expect(cardAmount(ar.mySalesToday)).toBe(150);
    expect(cardAmount(ar.cashWithMe)).toBe(100);
    expect(cardAmount(ar.cardTransfersCollected)).toBe(50);

    // سجل معاملاتي يعرض معاملات أحمد فقط ولا يعرض معاملة سارة
    expect(screen.getByText('تنظيف')).toBeInTheDocument();
    expect(screen.queryByText('خدمة سارة')).not.toBeInTheDocument();
  });

  it('switches totals when another employee opens the screen', () => {
    renderPortal(sara, [ahmed, sara]);

    // سارة: 200 كاش فقط
    expect(cardAmount(ar.mySalesToday)).toBe(200);
    expect(cardAmount(ar.cashWithMe)).toBe(200);
    expect(cardAmount(ar.cardTransfersCollected)).toBe(0);

    expect(screen.getByText('خدمة سارة')).toBeInTheDocument();
    expect(screen.queryByText('تنظيف')).not.toBeInTheDocument();
  });

  it('shows zero totals when no employee is active', () => {
    renderPortal(null, [ahmed, sara]);

    expect(cardAmount(ar.mySalesToday)).toBe(0);
    expect(cardAmount(ar.cashWithMe)).toBe(0);
    expect(cardAmount(ar.cardTransfersCollected)).toBe(0);
  });
});
