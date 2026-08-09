export type PaymentMethod = 'cash' | 'card' | 'transfer';

export type CompensationMode = 'percentage' | 'salary' | 'percentage_and_salary';

export type PayCycle = 'daily' | 'weekly' | 'monthly';

export type AttendanceStatus = 'working' | 'break' | 'done';

export type SettlementStatus = 'pending' | 'confirmed' | 'paid';

export type SettlementType = 'daily_commission' | 'weekly' | 'monthly';

export interface BreakInterval {
  start: string;
  end?: string;
}

export interface EmployeeContract {
  mode: CompensationMode;
  commissionRate?: number;
  salaryAmount?: number;
  salaryCycle?: PayCycle;
  requiresAttendance?: boolean;
}

export interface Employee {
  id: string;
  name: string;
  username: string;
  passwordPin: string;
  color: string;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  lastLogin?: string;
  contract?: EmployeeContract;
}

export interface Service {
  id: string;
  name: string;
  defaultPrice: number;
  category: string;
  isActive: boolean;
  notes?: string;
  createdAt: string;
}

export interface FinancialEntry {
  id: string;
  date: string;
  time: string;
  employeeId: string;
  employeeName: string;
  serviceId: string;
  serviceName: string;
  amount: number;
  paymentMethod: PaymentMethod;
  statement?: string;
  notes?: string;
  createdAt: string;
  dayClosed?: boolean;
}

export interface Expense {
  id: string;
  date: string;
  time: string;
  category: string;
  statement: string;
  amount: number;
  notes?: string;
  createdAt: string;
}

export interface DayClosing {
  id: string;
  date: string;
  closingTimestamp: string;
  totalRevenue: number;
  totalCash: number;
  totalCard: number;
  totalTransfer: number;
  totalExpenses: number;
  employeeCommission?: number;
  netIncome: number;
  entriesCount: number;
  physicalCashDrawer?: number;
  cashDifference?: number;
  closedBy: string;
  notes?: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  clockIn: string;
  breaks: BreakInterval[];
  status: AttendanceStatus;
  clockOut?: string;
  createdAt: string;
}

export interface Settlement {
  id: string;
  employeeId: string;
  employeeName: string;
  type: SettlementType;
  periodStart: string;
  periodEnd: string;
  grossRevenue: number;
  amount: number;
  commissionRate: number;
  status: SettlementStatus;
  voucherNo: string;
  createdAt: string;
  createdBy: string;
  adminConfirmedAt?: string;
  employeeConfirmedAt?: string;
}

export interface SecurityQuestionAnswer {
  questionId: string;
  answerHash: string;
}

export interface OfficeSettings {
  officeName: string;
  licenseNumber: string;
  phone: string;
  address: string;
  currency: string;
  taxNumber?: string;
  autoLockClosedDays: boolean;
  soundEffects: boolean;
  adminPasswordPin?: string;
  networkSyncCode?: string;
  theme?: 'light' | 'dark';
  language?: 'ar' | 'en';
  securityQuestions?: SecurityQuestionAnswer[];
}

export interface AuthSession {
  role: 'admin' | 'employee';
  employeeId?: string;
  employeeName?: string;
  officeName: string;
  loginTime: string;
}

export type ViewMode = 
  | 'dashboard' 
  | 'fast_entry' 
  | 'transactions' 
  | 'expenses' 
  | 'employees' 
  | 'services' 
  | 'day_closing' 
  | 'reports' 
  | 'settings'
  | 'employee_portal'
  | 'settlements';

export interface DateRangeFilter {
  type: 'today' | 'yesterday' | 'week' | 'month' | 'custom';
  startDate: string;
  endDate: string;
}
