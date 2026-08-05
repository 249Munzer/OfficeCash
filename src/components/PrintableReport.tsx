import React from 'react';
import {
  FinancialEntry,
  Expense,
  OfficeSettings,
} from '../types';
import {
  formatCurrency,
  formatDateArabic,
  getTodayDateString,
  getPaymentMethodLabel,
} from '../lib/formatters';
import { makeT } from '../lib/i18n';

interface PrintableReportProps {
  settings: OfficeSettings;
  title: string;
  entries: FinancialEntry[];
  expenses?: Expense[];
  reportDate?: string;
  onClosePrint: () => void;
}

export const PrintableReport: React.FC<PrintableReportProps> = ({
  settings,
  title,
  entries,
  expenses = [],
  reportDate = getTodayDateString(),
  onClosePrint,
}) => {
  const totalRevenue = entries.reduce((sum, e) => sum + e.amount, 0);
  const totalCash = entries
    .filter((e) => e.paymentMethod === 'cash')
    .reduce((sum, e) => sum + e.amount, 0);
  const totalCard = entries
    .filter((e) => e.paymentMethod === 'card')
    .reduce((sum, e) => sum + e.amount, 0);
  const totalTransfer = entries
    .filter((e) => e.paymentMethod === 'transfer')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalExpenseAmount = expenses.reduce((sum, ex) => sum + ex.amount, 0);
  const netIncome = totalRevenue - totalExpenseAmount;

  const t = makeT(settings.language);
  const lang = settings.language ?? 'ar';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex flex-col items-center justify-start p-4 overflow-y-auto">
      {/* Top Floating Control Bar (Hidden on Print) */}
      <div className="no-print bg-white w-full max-w-4xl p-4 rounded-xl shadow-lg border mb-4 flex items-center justify-between">
        <div className="text-xs font-bold text-slate-800">
          {t('printPreviewHint')}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="bg-emerald-600 text-white font-bold px-4 py-2 rounded-lg text-xs cursor-pointer shadow-xs"
          >
            {t('printNowBtn')}
          </button>
          <button
            onClick={onClosePrint}
            className="bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-lg text-xs cursor-pointer"
          >
            {t('closePreviewBtn')}
          </button>
        </div>
      </div>

      {/* Printable Sheet (Standard A4 dimensions) */}
      <div className="print-paper bg-white text-slate-950 w-full max-w-4xl p-8 rounded-xl shadow-2xl border border-slate-200 print-break-inside-avoid">
        {/* Official Letterhead Header */}
        <div className="border-b-2 border-slate-900 pb-4 mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              {settings.officeName}
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              {t('officeTagline')}
            </p>
            <div className="text-xs text-slate-500 mt-2 space-y-0.5">
              {settings.licenseNumber && <div>{t('licenseColon')} {settings.licenseNumber}</div>}
              {settings.taxNumber && <div>{t('taxColon')} {settings.taxNumber}</div>}
              {settings.phone && <div>{t('phoneColon')} {settings.phone}</div>}
              {settings.address && <div>{t('addressColon')} {settings.address}</div>}
            </div>
          </div>

          <div className="text-left dir-ltr">
            <div className="text-sm font-bold text-slate-800">OfficeCash Financial Report</div>
            <div className="text-xs text-slate-500 mt-1">{t('issueDateLabel')}</div>
            <div className="text-xs font-bold text-slate-900">{formatDateArabic(reportDate, lang)}</div>
          </div>
        </div>

        {/* Report Title */}
        <div className="bg-slate-100 p-3 rounded-lg text-center font-bold text-sm text-slate-900 mb-6 border">
          {title}
        </div>

        {/* KPI Financial Totals Grid */}
        <div className="grid grid-cols-4 gap-3 mb-6 text-xs text-center">
          <div className="p-3 bg-slate-50 border rounded-lg">
            <span className="block text-slate-500 font-bold mb-1">{t('totalRevenue')}</span>
            <strong className="text-sm dir-ltr">{formatCurrency(totalRevenue, settings.currency, lang)}</strong>
          </div>
          <div className="p-3 bg-slate-50 border rounded-lg">
            <span className="block text-slate-500 font-bold mb-1">{t('cashCollections')}</span>
            <strong className="text-sm dir-ltr">{formatCurrency(totalCash, settings.currency, lang)}</strong>
          </div>
          <div className="p-3 bg-slate-50 border rounded-lg">
            <span className="block text-slate-500 font-bold mb-1">{t('cardAndTransfer')}</span>
            <strong className="text-sm dir-ltr">{formatCurrency(totalCard + totalTransfer, settings.currency, lang)}</strong>
          </div>
          <div className="p-3 bg-slate-50 border rounded-lg">
            <span className="block text-slate-500 font-bold mb-1">{t('netPeriod')}</span>
            <strong className="text-sm dir-ltr">{formatCurrency(netIncome, settings.currency, lang)}</strong>
          </div>
        </div>

        {/* Entries Table */}
        <div className="mb-6">
          <h2 className="text-xs font-bold text-slate-800 mb-2 border-b pb-1">
            {t('entriesDetailsTitle', { count: String(entries.length) })}
          </h2>
          <table className="w-full text-right text-xs border border-slate-300 border-collapse">
            <thead className="bg-slate-200 text-slate-900 font-bold">
              <tr>
                <th className="p-2 border border-slate-300">#</th>
                <th className="p-2 border border-slate-300">{t('thTime')}</th>
                <th className="p-2 border border-slate-300">{t('employee')}</th>
                <th className="p-2 border border-slate-300">{t('prThService')}</th>
                <th className="p-2 border border-slate-300">{t('statement')}</th>
                <th className="p-2 border border-slate-300">{t('amount')}</th>
                <th className="p-2 border border-slate-300">{t('paymentMethod')}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, index) => (
                <tr key={e.id} className="border-b border-slate-200">
                  <td className="p-2 border border-slate-300 text-slate-500">{index + 1}</td>
                  <td className="p-2 border border-slate-300">{e.time}</td>
                  <td className="p-2 border border-slate-300 font-bold">{e.employeeName}</td>
                  <td className="p-2 border border-slate-300">{e.serviceName}</td>
                  <td className="p-2 border border-slate-300 text-slate-600">{e.statement || '—'}</td>
                  <td className="p-2 border border-slate-300 font-bold dir-ltr">{e.amount} {settings.currency}</td>
                  <td className="p-2 border border-slate-300">{getPaymentMethodLabel(e.paymentMethod, lang)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-900">
              <tr>
                <td colSpan={5} className="p-2 border border-slate-300 text-left">{t('totalLabel')}</td>
                <td className="p-2 border border-slate-300 dir-ltr font-black">{totalRevenue} {settings.currency}</td>
                <td className="p-2 border border-slate-300"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Expenses Section if any */}
        {expenses.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xs font-bold text-slate-800 mb-2 border-b pb-1">
              {t('expensesDetailsTitle', { count: String(expenses.length) })}
            </h2>
            <table className="w-full text-right text-xs border border-slate-300 border-collapse">
              <thead className="bg-slate-200 text-slate-900 font-bold">
                <tr>
                  <th className="p-2 border border-slate-300">{t('categoryLabel')}</th>
                  <th className="p-2 border border-slate-300">{t('statement')}</th>
                  <th className="p-2 border border-slate-300">{t('amount')}</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((ex) => (
                  <tr key={ex.id}>
                    <td className="p-2 border border-slate-300 font-bold">{ex.category}</td>
                    <td className="p-2 border border-slate-300">{ex.statement}</td>
                    <td className="p-2 border border-slate-300 font-bold dir-ltr">{ex.amount} {settings.currency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer & Signature Block */}
        <div className="mt-12 pt-6 border-t border-slate-300 grid grid-cols-2 gap-8 text-xs font-bold text-slate-800 text-center">
          <div>
            <p className="mb-8">{t('accountantSign')}</p>
            <p className="text-slate-400">{t('signatureLabel')}</p>
          </div>

          <div>
            <p className="mb-8">{t('managerApproval')}</p>
            <p className="text-slate-400">{t('signatureStampLabel')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
