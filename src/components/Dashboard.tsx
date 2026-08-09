/**
 * لوحة التحكم الرئيسية — تعرض ملخصات اليوم: الإيرادات (نقد/شبكة/تحويل)،
 * المصروفات، عمولات الموظفين، وصافي الدخل، مع تفصيل أداء كل موظف.
 * تدعم التنقل للشاشات الأخرى، فتح نافذة الإدخال السريع، وحذف معاملة بعد تأكيد.
 * @component
 * @param {Object} props
 * @param {FinancialEntry[]} props.entries - سجل المعاملات
 * @param {Expense[]} props.expenses - سجل المصروفات
 * @param {Employee[]} props.employees - قائمة الموظفين لحساب العمولات
 * @param {OfficeSettings} props.settings - اللغة والعملة
 * @param {boolean} props.isTodayClosed - هل أُغلق اليوم الحالي
 * @param {Function} props.onNavigate - التنقل إلى شاشة أخرى
 * @param {Function} props.onOpenFastEntry - فتح نافذة الإدخال السريع
 * @param {Function} props.onDeleteEntry - حذف معاملة
 */
import React, { useState } from 'react';
import {
  Receipt,
  Wallet,
  PlusCircle,
  Lock,
  Printer,
  ChevronLeft,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import {
  FinancialEntry,
  Expense,
  Employee,
  OfficeSettings,
  ViewMode,
} from '../types';
import {
  formatCurrency,
  getTodayDateString,
  getPaymentMethodLabel,
  formatTimeArabic,
} from '../lib/formatters';
import { makeT } from '../lib/i18n';
import { commissionTotalForEntries } from '../lib/settlement';
import { ConfirmModal } from './ConfirmModal';

interface DashboardProps {
  entries: FinancialEntry[];
  expenses: Expense[];
  employees: Employee[];
  settings: OfficeSettings;
  isTodayClosed: boolean;
  onNavigate: (view: ViewMode) => void;
  onOpenFastEntry: () => void;
  onDeleteEntry: (id: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  entries,
  expenses,
  employees,
  settings,
  isTodayClosed,
  onNavigate,
  onOpenFastEntry,
  onDeleteEntry,
}) => {
  const [deletingEntry, setDeletingEntry] = useState<{ id: string; name: string } | null>(null);
  const today = getTodayDateString();
  const t = makeT(settings.language);
  const lang = settings.language ?? 'ar';

  // Filter today entries & expenses
  const todayEntries = entries.filter((e) => e.date === today);
  const todayExpenses = expenses.filter((ex) => ex.date === today);

  // Totals calculations
  const totalRevenue = todayEntries.reduce((sum, e) => sum + e.amount, 0);
  const totalCash = todayEntries
    .filter((e) => e.paymentMethod === 'cash')
    .reduce((sum, e) => sum + e.amount, 0);
  const totalCard = todayEntries
    .filter((e) => e.paymentMethod === 'card')
    .reduce((sum, e) => sum + e.amount, 0);
  const totalTransfer = todayEntries
    .filter((e) => e.paymentMethod === 'transfer')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalExpenseAmount = todayExpenses.reduce((sum, ex) => sum + ex.amount, 0);
  const employeeCommission = commissionTotalForEntries(todayEntries, employees);
  const netIncome = totalRevenue - totalExpenseAmount - employeeCommission;

  // Employee breakdown calculation
  const employeeStats = employees
    .filter((emp) => emp.isActive)
    .map((emp) => {
      const empEntries = todayEntries.filter((e) => e.employeeId === emp.id);
      const amount = empEntries.reduce((sum, e) => sum + e.amount, 0);
      const count = empEntries.length;
      return {
        ...emp,
        amount,
        count,
        percentage: totalRevenue > 0 ? Math.round((amount / totalRevenue) * 100) : 0,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  return (
    <div className="space-y-6">
      {/* Top Banner: Welcome & Quick Action Bar */}
      <div className="bg-white rounded-3xl p-6 text-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600">
            <Sparkles className="w-4 h-4" />
            <span>{t('dashSummaryTitle')}</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {t('todayRevenueTitle')} —{' '}
            {new Date().toLocaleDateString(lang === 'en' ? 'en-US' : 'ar-SA', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </h2>
          <p className="text-sm text-slate-400 font-medium">
            {t('dashSubtitle')}
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={onOpenFastEntry}
            className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-full text-xs font-bold shadow-md shadow-blue-100 flex items-center gap-2 transition-all cursor-pointer active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{t('newEntryF2')}</span>
          </button>

          <button
            onClick={() => onNavigate('expenses')}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-full text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
          >
            <Wallet className="w-4 h-4 text-rose-500" />
            <span>{t('addExpenseBtn')}</span>
          </button>

          <button
            onClick={() => onNavigate('day_closing')}
            className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-full text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs"
          >
            <Lock className="w-4 h-4 text-emerald-400" />
            <span>{t('closeDailyBtn')}</span>
          </button>

          <button
            onClick={() => onNavigate('reports')}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-full text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4 text-blue-600" />
            <span>{t('printReport')}</span>
          </button>
        </div>
      </div>

      {/* Primary Financial Metric Cards (6 Cards Grid as in Design Spec) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Card 1: Total Today Revenue */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-xs text-slate-500 mb-1 font-medium">{t('totalTodayIncome')}</p>
          <p className="text-2xl font-extrabold text-blue-600 tracking-tight dir-ltr text-right">
            {formatCurrency(totalRevenue, settings.currency, lang)}
          </p>
          <div className="mt-2 text-xs text-slate-400 flex items-center font-bold gap-0.5">
            <ArrowUpRight className="w-3 h-3 text-slate-400" />
            <span>{t('txCount', { count: todayEntries.length })}</span>
          </div>
        </div>

        {/* Card 2: Cash Revenue */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-xs text-slate-500 mb-1 font-medium">{t('cash')}</p>
          <p className="text-2xl font-extrabold text-blue-600 tracking-tight dir-ltr text-right">
            {formatCurrency(totalCash, settings.currency, lang)}
          </p>
          <p className="mt-2 text-xs text-slate-400">
            {t('percentageOfRevenue', { pct: totalRevenue > 0 ? Math.round((totalCash / totalRevenue) * 100) : 0 })}
          </p>
        </div>

        {/* Card 3: Card / POS Revenue */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-xs text-slate-500 mb-1 font-medium">{t('card')}</p>
          <p className="text-2xl font-extrabold text-blue-600 tracking-tight dir-ltr text-right">
            {formatCurrency(totalCard, settings.currency, lang)}
          </p>
          <p className="mt-2 text-xs text-slate-400">
            {t('percentageOfRevenue', { pct: totalRevenue > 0 ? Math.round((totalCard / totalRevenue) * 100) : 0 })}
          </p>
        </div>

        {/* Card 4: Bank Transfer Revenue */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-xs text-slate-500 mb-1 font-medium">{t('transfer')}</p>
          <p className="text-2xl font-extrabold text-slate-600 tracking-tight dir-ltr text-right">
            {formatCurrency(totalTransfer, settings.currency, lang)}
          </p>
          <p className="mt-2 text-xs text-slate-400">
            {t('percentageOfRevenue', { pct: totalRevenue > 0 ? Math.round((totalTransfer / totalRevenue) * 100) : 0 })}
          </p>
        </div>

        {/* Card 5: Expenses */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-xs text-slate-500 mb-1 font-medium">{t('totalExpenses')}</p>
          <p className="text-2xl font-extrabold text-rose-500 tracking-tight dir-ltr text-right">
            {formatCurrency(totalExpenseAmount, settings.currency, lang)}
          </p>
          <p className="mt-2 text-xs text-rose-400 font-bold">
            {t('todayExpensesCount', { count: todayExpenses.length })}
          </p>
        </div>

        {/* Card 6: Highlight Net Income Card */}
        <div className="bg-blue-50 p-4 rounded-2xl border border-blue-200 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-xs text-blue-800 mb-1 font-medium">{t('netProfitFinal')}</p>
            <p className="text-2xl font-extrabold text-blue-700 tracking-tight dir-ltr text-right">
              {formatCurrency(netIncome, settings.currency, lang)}
            </p>
          </div>
          <div className="mt-2 text-xs text-blue-700 font-medium">
            {t('netFormulaHint')}
          </div>
          {employeeCommission > 0 && (
            <div className="mt-1 text-xs text-rose-600 font-bold flex items-center gap-1">
              <span className="dir-ltr">- {formatCurrency(employeeCommission, settings.currency, lang)}</span>
              <span>{t('commissionDeducted')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Grid (Transactions Table + Productivity Widget) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Transactions Table (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm flex flex-col overflow-hidden min-h-[420px]">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-base">{t('latestTxToday')}</h3>
            <button
              onClick={() => onNavigate('transactions')}
              className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>{t('viewFullTodayLog')}</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          {todayEntries.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-3">
              <Receipt className="w-10 h-10 text-slate-300" />
              <p className="text-xs font-medium">{t('noEntriesToday')}</p>
              <button
                onClick={onOpenFastEntry}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-full cursor-pointer hover:bg-blue-100 transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{t('recordFirstEntry')}</span>
              </button>
            </div>
          ) : (
            <div className="flex-1 overflow-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-50 text-xs text-slate-400">
                  <tr>
                    <th className="px-6 py-3 font-medium">{t('employee')}</th>
                    <th className="px-6 py-3 font-medium">{t('service')}</th>
                    <th className="px-6 py-3 font-medium">{t('paymentMethod')}</th>
                    <th className="px-6 py-3 font-medium">{t('amount')}</th>
                    <th className="px-6 py-3 font-medium">{t('time')}</th>
                    <th className="px-4 py-3 font-medium text-center">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs">
                  {todayEntries.slice(0, 7).map((entry) => (
                    <tr key={entry.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-6 py-3.5 flex items-center gap-2.5 font-bold text-slate-800">
                        <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></div>
                        <span>{entry.employeeName}</span>
                      </td>
                      <td className="px-6 py-3.5 text-slate-700">{entry.serviceName}</td>
                      <td className="px-6 py-3.5 font-medium">
                        <span
                          className={`px-2.5 py-0.5 rounded-full inline-block text-xs font-bold ${
                            entry.paymentMethod === 'cash'
                              ? 'bg-emerald-50 text-emerald-700'
                              : entry.paymentMethod === 'card'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {getPaymentMethodLabel(entry.paymentMethod, lang)}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 font-black text-slate-900 dir-ltr text-right">
                        {formatCurrency(entry.amount, settings.currency, lang)}
                      </td>
                      <td className="px-6 py-3.5 text-slate-400 text-xs">
                        {formatTimeArabic(entry.time, lang)}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <button
                          onClick={() => setDeletingEntry({ id: entry.id, name: entry.serviceName })}
                          className="text-rose-500 hover:text-rose-700 font-bold px-2 py-1 rounded hover:bg-rose-50 cursor-pointer transition-colors"
                        >
                          {t('delete')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          <ConfirmModal
            isOpen={!!deletingEntry}
            title={t('confirmDeleteEntryTitle')}
            message={t('confirmDeleteEntryMessage', { name: deletingEntry?.name ?? '' })}
            language={lang}
            onConfirm={() => {
              if (deletingEntry) {
                onDeleteEntry(deletingEntry.id);
              }
            }}
            onClose={() => setDeletingEntry(null)}
          />
        </div>

        {/* Productivity & Overview Widgets (1 Col) */}
        <div className="space-y-6">
          {/* Employee Productivity Widget */}
          <div className="bg-white p-5 rounded-3xl shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-50 pb-3">
              <h3 className="font-bold text-slate-700 text-xs">{t('employeePerfToday')}</h3>
              <button
                onClick={() => onNavigate('employees')}
                className="text-xs font-bold text-blue-600 hover:underline"
              >
                {t('details')}
              </button>
            </div>

            <div className="space-y-3.5">
              {employeeStats.map((emp) => (
                <div key={emp.id} className="space-y-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-slate-700 flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full inline-block"
                        style={{ backgroundColor: emp.color }}
                      ></span>
                      {emp.name}
                    </span>
                    <span className="font-bold text-slate-900 dir-ltr">
                      {formatCurrency(emp.amount, settings.currency, lang)}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${emp.percentage}%`,
                        backgroundColor: emp.color || 'var(--oc-blue-600)',
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dark Accent Summary Card */}
          <div className="bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 p-6 rounded-3xl shadow-xl text-white relative overflow-hidden">
            <div className="relative z-10 space-y-3">
              <h3 className="text-xs opacity-80 font-medium">{t('totalTodayActivity')}</h3>
              <p className="text-4xl font-extrabold tracking-tight">{todayEntries.length}</p>
              <div className="flex gap-2 pt-2">
                <div className="px-3 py-1 bg-white/10 rounded-lg text-xs font-bold border border-white/10">
                  {t('completedCount', { count: todayEntries.length })}
                </div>
                <div className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-lg text-xs font-bold border border-emerald-500/30">
                  {isTodayClosed ? t('todayClosed') : t('liveNow')}
                </div>
              </div>
            </div>
            {/* Decorative Background Elements */}
            <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>
          </div>
        </div>
      </div>
    </div>
  );
};