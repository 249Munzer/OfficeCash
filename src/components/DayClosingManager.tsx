/**
 * إغلاق ومطابقة اليوم — يحسب إجماليات الإيرادات والمصروفات وصافي الدخل،
 * يقارن النقد المادي الفعلي، يحفظ إغلاق اليوم، ويسجل التسويات، ويعرض سجل الأيام المغلقة.
 * @component
 * @param {Object} props
 * @param {FinancialEntry[]} props.entries - سجل المعاملات
 * @param {Expense[]} props.expenses - سجل المصروفات
 * @param {DayClosing[]} props.dayClosings - سجل الأيام المغلقة
 * @param {Employee[]} props.employees - قائمة الموظفين لحساب العمولات
 * @param {Settlement[]} props.settlements - التسويات المعلقة
 * @param {OfficeSettings} props.settings - اللغة والعملة
 * @param {Function} props.onSaveDayClosing - حفظ إغلاق اليوم
 * @param {Function} props.onAddSettlement - إضافة تسوية
 * @param {Function} props.onPrintClosingReport - طباعة تقرير الإغلاق (اختياري)
 */
import React, { useState } from 'react';
import {
  Lock,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Clock,
  History,
} from 'lucide-react';
import {
  FinancialEntry,
  Expense,
  DayClosing,
  OfficeSettings,
  Employee,
  Settlement,
} from '../types';
import {
  formatCurrency,
  formatDateArabic,
  getTodayDateString,
  getCurrentTimeString,
} from '../lib/formatters';
import { makeT } from '../lib/i18n';
import { buildDayCloseSettlements, commissionTotalForEntries, computeNetIncome } from '../lib/settlement';
import { ConfirmModal } from './ConfirmModal';
import { useToast } from './Toast';

interface DayClosingManagerProps {
  entries: FinancialEntry[];
  expenses: Expense[];
  dayClosings: DayClosing[];
  employees: Employee[];
  settlements: Settlement[];
  settings: OfficeSettings;
  onSaveDayClosing: (closing: DayClosing) => void;
  onAddSettlement: (settlement: Settlement) => void;
  onPrintClosingReport?: (closing: DayClosing) => void;
}

export const DayClosingManager: React.FC<DayClosingManagerProps> = ({
  entries,
  expenses,
  dayClosings,
  employees,
  settlements,
  settings,
  onSaveDayClosing,
  onAddSettlement,
  onPrintClosingReport,
}) => {
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
  const netIncome = computeNetIncome(totalRevenue, totalExpenseAmount, employeeCommission);

  // Physical Cash Counter Input
  const [physicalCash, setPhysicalCash] = useState<string>(String(totalCash));
  const [closedBy, setClosedBy] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [showCloseConfirmModal, setShowCloseConfirmModal] = useState<boolean>(false);
  const { showSuccess, showInfo } = useToast();

  const numPhysicalCash = parseFloat(physicalCash) || 0;
  const cashDifference = numPhysicalCash - totalCash;

  // Check if today is already closed
  const existingTodayClosing = dayClosings.find((c) => c.date === today);

  const executeDayClosing = () => {
    if (existingTodayClosing) {
      showInfo(t('toastAlreadyClosed'));
      return;
    }

    const newClosing: DayClosing = {
      id: `close-${Date.now()}`,
      date: today,
      closingTimestamp: `${today}T${getCurrentTimeString()}`,
      totalRevenue,
      totalCash,
      totalCard,
      totalTransfer,
      totalExpenses: totalExpenseAmount,
      employeeCommission,
      netIncome,
      entriesCount: todayEntries.length,
      physicalCashDrawer: numPhysicalCash,
      cashDifference,
      closedBy: closedBy.trim(),
      notes: notes.trim(),
    };

    onSaveDayClosing(newClosing);

    // إنشاء تصفيات اليوم تلقائياً لكل موظف مؤهَّل لديه معاملات اليوم
    // (تُنشأ بحالة pending ولا تُخصم حتى تأكيد الصرف)
    const autoSettlements = buildDayCloseSettlements({
      entries: todayEntries,
      employees,
      settlements,
      date: today,
      now: new Date().toISOString(),
    });
    autoSettlements.forEach((s) => onAddSettlement(s));

    showSuccess(t('toastClosedSuccess'), 4000);
    if (autoSettlements.length > 0) {
      showInfo(t('dayCloseSettlementsToast', { count: autoSettlements.length }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Lock className="w-5 h-5 text-blue-600" />
            <span>{t('dayClosingPageTitle')}</span>
          </h2>
          <p className="text-xs text-slate-500">
            {t('dayClosingSubtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {existingTodayClosing ? (
            <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{t('closedTodayBadge', { date: today })}</span>
            </span>
          ) : (
            <span className="bg-amber-100 text-amber-800 border border-amber-300 text-xs px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>{t('openTodayBadge')}</span>
            </span>
          )}
        </div>
      </div>

      {/* Main Closure Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Step 1 & 2: Calculated Totals & Reconciliation Form (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-6">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
            {t('calculatedSummaryTitle', { date: formatDateArabic(today, lang) })}
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <span className="text-xs text-slate-500 font-bold block">{t('totalRevenue')}</span>
              <span className="text-base font-black text-slate-900 dir-ltr">
                {formatCurrency(totalRevenue, settings.currency, lang)}
              </span>
            </div>

            <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-100">
              <span className="text-xs text-emerald-800 font-bold block">{t('calculatedCash')}</span>
              <span className="text-base font-black text-emerald-900 dir-ltr">
                {formatCurrency(totalCash, settings.currency, lang)}
              </span>
            </div>

            <div className="bg-blue-50 p-3.5 rounded-xl border border-blue-100">
              <span className="text-xs text-blue-800 font-bold block">{t('totalCardMada')}</span>
              <span className="text-base font-black text-blue-900 dir-ltr">
                {formatCurrency(totalCard, settings.currency, lang)}
              </span>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <span className="text-xs text-slate-700 font-bold block">{t('bankTransfer')}</span>
              <span className="text-base font-black text-slate-900 dir-ltr">
                {formatCurrency(totalTransfer, settings.currency, lang)}
              </span>
            </div>

            <div className="bg-rose-50 p-3.5 rounded-xl border border-rose-100">
              <span className="text-xs text-rose-700 font-bold block">{t('dailyExpenses')}</span>
              <span className="text-base font-black text-rose-900 dir-ltr">
                {formatCurrency(totalExpenseAmount, settings.currency, lang)}
              </span>
            </div>

            {employeeCommission > 0 && (
              <div className="bg-orange-50 p-3.5 rounded-xl border border-orange-200">
                <span className="text-xs text-orange-700 font-bold block">{t('employeeCommission')}</span>
                <span className="text-base font-black text-orange-800 dir-ltr">
                  {formatCurrency(employeeCommission, settings.currency, lang)}
                </span>
              </div>
            )}

            <div className="bg-blue-100 p-3.5 rounded-xl border border-blue-200">
              <span className="text-xs text-blue-800 font-bold block">{t('netFinalProfit')}</span>
              <span className="text-base font-black text-blue-700 dir-ltr">
                {formatCurrency(netIncome, settings.currency, lang)}
              </span>
            </div>
          </div>

          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 pt-2">
            {t('cashReconcileTitle')}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('physicalCashLabel')}
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  value={physicalCash}
                  onChange={(e) => setPhysicalCash(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-base font-bold text-slate-900 focus:bg-white dir-ltr text-right"
                />
                <span className="absolute left-3 top-3 text-xs font-bold text-slate-400">
                  {settings.currency}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('reconcileResultLabel')}
              </label>
              <div
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 h-[42px] ${
                  cashDifference === 0
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : cashDifference > 0
                    ? 'bg-blue-50 text-blue-800 border-blue-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}
              >
                {cashDifference === 0 ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{t('matchedExact', { currency: settings.currency })}</span>
                  </>
                ) : cashDifference > 0 ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-blue-600" />
                    <span>{t('cashSurplus', { amount: cashDifference, currency: settings.currency })}</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>{t('cashDeficit', { amount: cashDifference, currency: settings.currency })}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{t('accountantLabel')}</label>
              <input
                type="text"
                value={closedBy}
                onChange={(e) => setClosedBy(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{t('closingNotesLabel')}</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('closingNotesPlaceholder')}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
              />
            </div>
          </div>

          {!existingTodayClosing ? (
            <button
              onClick={() => setShowCloseConfirmModal(true)}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl text-xs shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>{t('approveCloseToday')}</span>
            </button>
          ) : (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-900 flex items-center justify-between">
              <span>{t('alreadyApprovedBanner')}</span>
              {onPrintClosingReport && (
                <button
                  onClick={() => onPrintClosingReport(existingTodayClosing)}
                  className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{t('printClosingReport')}</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Column 3: Closed Days History Panel */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <History className="w-4 h-4 text-blue-600" />
              <span>{t('closedDaysHistory')}</span>
            </h3>
            <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full text-slate-600 font-bold">
              {t('daysCount', { count: dayClosings.length })}
            </span>
          </div>

          {dayClosings.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">
              {t('noClosedDays')}
            </p>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {dayClosings.map((c) => (
                <div
                  key={c.id}
                  className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between font-bold text-slate-900">
                    <span>{formatDateArabic(c.date, lang)}</span>
                    <span className="text-emerald-700 dir-ltr">
                      {formatCurrency(c.totalRevenue, settings.currency, lang)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1 text-xs text-slate-500 pt-1 border-t border-slate-200/60">
                    <span>{t('historyCash', { value: c.totalCash })}</span>
                    <span>{t('historyCard', { value: c.totalCard })}</span>
                    <span>{t('historyExpenses', { value: c.totalExpenses })}</span>
                    <span>{t('historyNet', { value: c.netIncome })}</span>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-xs text-slate-400">{t('byLabel', { name: c.closedBy })}</span>
                    {onPrintClosingReport && (
                      <button
                        onClick={() => onPrintClosingReport(c)}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                      >
                        <Printer className="w-3 h-3" />
                        <span>{t('print')}</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Confirm Day Closing Modal */}
      <ConfirmModal
        isOpen={showCloseConfirmModal}
        title={t('confirmCloseTitle')}
        message={t('confirmCloseMessage')}
        confirmText={t('confirmCloseBtn')}
        isDanger={false}
        language={lang}
        onConfirm={executeDayClosing}
        onClose={() => setShowCloseConfirmModal(false)}
      />
    </div>
  );
};
