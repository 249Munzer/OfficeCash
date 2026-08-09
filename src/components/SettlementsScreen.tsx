/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * شاشة المستحقات والتصفية — لإدارة المكتب:
 * تعرض المستحقات المعلّقة (قيد الانتظار / مؤكَّدة الاستلام) والمصروفة،
 * مع زر «تأكيد الصرف / الخصم» لكل تصفية غير مدفوعة ورقم توثيقي لكل منها.
 * التصفية غير المؤكَّدة لا تُخصم من الحسابات إطلاقاً.
 * @component
 * @param {Object} props
 * @param {Settlement[]} props.settlements - كل التصفيات
 * @param {Employee[]} props.employees - لأسماء الموظفين
 * @param {OfficeSettings} props.settings - لغة/عملة
 * @param {Function} props.onUpdateSettlement - تحديث تصفية (تأكيد الصرف)
 */
import React, { useMemo, useState } from 'react';
import {
  Wallet,
  CheckCircle2,
  Clock,
  Receipt,
  Banknote,
  Search,
} from 'lucide-react';
import { Settlement, Employee, OfficeSettings, SettlementStatus } from '../types';
import { formatCurrency, formatShortDate } from '../lib/formatters';
import { makeT } from '../lib/i18n';
import { useToast } from './Toast';
import { ConfirmModal } from './ConfirmModal';

interface SettlementsScreenProps {
  settlements: Settlement[];
  employees: Employee[];
  settings: OfficeSettings;
  onUpdateSettlement: (settlement: Settlement) => void;
}

const statusBadgeClass: Record<SettlementStatus, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export const SettlementsScreen: React.FC<SettlementsScreenProps> = ({
  settlements,
  employees,
  settings,
  onUpdateSettlement,
}) => {
  const t = makeT(settings.language);
  const lang = settings.language ?? 'ar';
  const { showSuccess } = useToast();

  const [search, setSearch] = useState<string>('');
  const [payingSettlement, setPayingSettlement] = useState<Settlement | null>(null);

  const empName = (id: string) => employees.find((e) => e.id === id)?.name ?? id;

  const unpaid = useMemo(
    () =>
      settlements
        .filter((s) => s.status !== 'paid')
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [settlements]
  );

  const paid = useMemo(
    () =>
      settlements
        .filter((s) => s.status === 'paid')
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [settlements]
  );

  const filteredUnpaid = unpaid.filter(
    (s) =>
      empName(s.employeeId).toLowerCase().includes(search.toLowerCase()) ||
      s.voucherNo.toLowerCase().includes(search.toLowerCase())
  );

  const totalUnpaid = unpaid.reduce((sum, s) => sum + s.amount, 0);

  const handleConfirmPay = () => {
    if (!payingSettlement) return;
    onUpdateSettlement({
      ...payingSettlement,
      status: 'paid',
      adminConfirmedAt: new Date().toISOString(),
    });
    showSuccess(t('disbursementConfirmedToast', { voucher: payingSettlement.voucherNo }));
    setPayingSettlement(null);
  };

  const renderRow = (s: Settlement, withPayAction: boolean) => (
    <div
      key={s.id}
      className="p-4 bg-white rounded-2xl border border-slate-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
    >
      <div className="space-y-1.5 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-extrabold text-sm shrink-0"
            style={{ backgroundColor: employees.find((e) => e.id === s.employeeId)?.color || '#2563eb' }}
          >
            {empName(s.employeeId).charAt(0)}
          </span>
          <div>
            <div className="text-sm font-bold text-slate-900">{empName(s.employeeId)}</div>
            <div className="text-xs text-slate-400 flex items-center gap-1.5 flex-wrap">
              <span className="font-mono">{s.voucherNo}</span>
              <span>·</span>
              <span>{t('settlementTypeDaily')}</span>
              <span>·</span>
              <span>{formatShortDate(s.periodEnd)}</span>
              <span>·</span>
              <span dir="ltr">{Math.round(s.commissionRate * 100)}%</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
          <span className="flex items-center gap-1">
            <Receipt className="w-3.5 h-3.5 text-slate-400" />
            {t('grossRevenueColon')}
            <strong className="text-slate-700 dir-ltr">
              {formatCurrency(s.grossRevenue, settings.currency, lang)}
            </strong>
          </span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-bold border ${statusBadgeClass[s.status]}`}
          >
            {s.status === 'pending'
              ? t('settlementStatusPending')
              : s.status === 'confirmed'
              ? t('settlementStatusConfirmed')
              : t('settlementStatusPaid')}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
        <div className="text-left">
          <span className="block text-xs text-slate-400 font-medium">{t('dueAmountColon')}</span>
          <span className="text-lg font-black text-slate-900 dir-ltr">
            {formatCurrency(s.amount, settings.currency, lang)}
          </span>
        </div>
        {withPayAction && (
          <button
            onClick={() => setPayingSettlement(s)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-md shadow-emerald-100"
          >
            <Banknote className="w-3.5 h-3.5" />
            <span>{t('confirmDisbursementBtn')}</span>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-l from-blue-700 to-blue-800 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center">
              <Wallet className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-black">{t('settlements')}</h2>
              <p className="text-xs text-blue-100/80 mt-1">{t('settlementsSubtitle')}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-white/15 border border-white/20 px-4 py-2 rounded-2xl text-right">
              <span className="block text-xs text-blue-100/80 font-medium">{t('notificationPendingDues', { count: unpaid.length })}</span>
              <span className="text-xl font-black dir-ltr">
                {formatCurrency(totalUnpaid, settings.currency, lang)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Pending / Unpaid Settlements */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <span>{t('notificationPendingDues', { count: unpaid.length })}</span>
          </h3>
          <div className="relative w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {filteredUnpaid.length === 0 ? (
          <div className="text-center py-12 text-slate-400 space-y-2 border border-dashed border-slate-200 rounded-2xl bg-white">
            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400" />
            <p className="text-sm font-bold">{t('noPendingSettlements')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredUnpaid.map((s) => renderRow(s, true))}
          </div>
        )}
      </div>

      {/* Settlement History */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Receipt className="w-4 h-4 text-blue-500" />
          <span>{t('settlementHistoryTitle')}</span>
          <span className="text-xs text-slate-400 font-medium">({paid.length})</span>
        </h3>
        {paid.length === 0 ? (
          <div className="text-center py-8 text-slate-400 space-y-2 border border-dashed border-slate-200 rounded-2xl bg-white">
            <Receipt className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-xs font-medium">{t('noSettlementsYet')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {paid.map((s) => renderRow(s, false))}
          </div>
        )}
      </div>

      {/* Confirm Disbursement Modal */}
      <ConfirmModal
        isOpen={!!payingSettlement}
        title={t('confirmDisbursementBtn')}
        message={
          payingSettlement
            ? `${empName(payingSettlement.employeeId)} — ${payingSettlement.voucherNo} — ${formatCurrency(
                payingSettlement.amount,
                settings.currency,
                lang
              )}`
            : ''
        }
        language={lang}
        confirmText={t('markPaidBtn')}
        isDanger={false}
        onConfirm={handleConfirmPay}
        onClose={() => setPayingSettlement(null)}
      />
    </div>
  );
};
