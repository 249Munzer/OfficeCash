export type PaymentMethod = 'cash' | 'card' | 'transfer';

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
  date: string; // YYYY-MM-DD
  time: string; // HH:mm:ss
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
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  category: string;
  statement: string;
  amount: number;
  notes?: string;
  createdAt: string;
}

export interface DayClosing {
  id: string;
  date: string; // YYYY-MM-DD
  closingTimestamp: string;
  totalRevenue: number;
  totalCash: number;
  totalCard: number;
  totalTransfer: number;
  totalExpenses: number;
  netIncome: number;
  entriesCount: number;
  physicalCashDrawer?: number;
  cashDifference?: number;
  closedBy: string;
  notes?: string;
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
  | 'employee_portal';

export interface DateRangeFilter {
  type: 'today' | 'yesterday' | 'week' | 'month' | 'custom';
  startDate: string;
  endDate: string;
}
