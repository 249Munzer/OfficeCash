import React, { useState } from 'react';
import {
  Download,
  Printer,
  Trash2,
  Edit2,
  Receipt,
  PlusCircle,
  X,
} from 'lucide-react';
import {
  FinancialEntry,
  Employee,
  Service,
  OfficeSettings,
  PaymentMethod,
} from '../types';
import {
  formatCurrency,
  formatTimeArabic,
  getPaymentMethodBadgeClass,
  getPaymentMethodLabel,
  exportToCSV,
  getTodayDateString,
  getDateStringFrom,
} from '../lib/formatters';
import { makeT, translations, validationMessage } from '../lib/i18n';
import { validateAmount } from '../lib/validation';
import { ConfirmModal } from './ConfirmModal';
import { useToast } from './Toast';

interface TransactionsTableProps {
  entries: FinancialEntry[];
  employees: Employee[];
  services: Service[];
  settings: OfficeSettings;
  searchQuery: string;
  onOpenFastEntry: () => void;
  onUpdateEntry: (entry: FinancialEntry) => void;
  onDeleteEntry: (id: string) => void;
  onPrintReport?: () => void;
}

export const TransactionsTable: React.FC<TransactionsTableProps> = ({
  entries,
  employees,
  services,
  settings,
  searchQuery,
  onOpenFastEntry,
  onUpdateEntry,
  onDeleteEntry,
  onPrintReport,
}) => {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('all');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | 'custom'>('today');
  const [customStartDate, setCustomStartDate] = useState<string>(getTodayDateString());
  const [customEndDate, setCustomEndDate] = useState<string>(getTodayDateString());

  // Edit & Delete Modal state
  const [editingEntry, setEditingEntry] = useState<FinancialEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<{ id: string; name: string } | null>(null);

  const t = makeT(settings.language);
  const lang = settings.language ?? 'ar';
  const { showError } = useToast();
  const today = getTodayDateString();
  const dYesterday = new Date();
  dYesterday.setDate(dYesterday.getDate() - 1);
  const yesterday = getDateStringFrom(dYesterday);

  // Filtering Logic
  const filteredEntries = entries.filter((entry) => {    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchEmp = entry.employeeName.toLowerCase().includes(q);
      const matchSrv = entry.serviceName.toLowerCase().includes(q);
      const matchStmt = (entry.statement || '').toLowerCase().includes(q);
      const matchAmount = String(entry.amount).includes(q);
      if (!matchEmp && !matchSrv && !matchStmt && !matchAmount) return false;
    }

    // Employee filter
    if (selectedEmployeeId !== 'all' && entry.employeeId !== selectedEmployeeId) {
      return false;
    }

    // Service filter
    if (selectedServiceId !== 'all' && entry.serviceId !== selectedServiceId) {
      return false;
    }

    // Payment method filter
    if (selectedPaymentMethod !== 'all' && entry.paymentMethod !== selectedPaymentMethod) {
      return false;
    }

    // Date filter
    if (dateFilter === 'today' && entry.date !== today) return false;
    if (dateFilter === 'yesterday' && entry.date !== yesterday) return false;
    if (dateFilter === 'custom') {
      if (entry.date < customStartDate || entry.date > customEndDate) return false;
    }

    return true;
  });

  // Calculate totals for filtered list
  const totalAmount = filteredEntries.reduce((sum, e) => sum + e.amount, 0);
  const totalCash = filteredEntries
    .filter((e) => e.paymentMethod === 'cash')
    .reduce((sum, e) => sum + e.amount, 0);
  const totalCard = filteredEntries
    .filter((e) => e.paymentMethod === 'card')
    .reduce((sum, e) => sum + e.amount, 0);
  const totalTransfer = filteredEntries
    .filter((e) => e.paymentMethod === 'transfer')
    .reduce((sum, e) => sum + e.amount, 0);

  // Handle Export CSV
  const handleExportCSV = () => {
    const headers = translations[lang].csvTxHeaders;
    const rows = filteredEntries.map((e) => [
      e.date,
      e.time,
      e.employeeName,
      e.serviceName,
      e.statement || '',
      e.amount,
      getPaymentMethodLabel(e.paymentMethod, lang),
      e.notes || '',
    ]);
    exportToCSV(`${t('csvTxName')}${dateFilter}_${today}`, headers, rows);
  };

  return (
    <div className="space-y-4">
      {/* Action Header & Filters Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">{t('txPageTitle')}</h2>
            <p className="text-xs text-slate-500">
              {t('txPageSubtitle')}
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={onOpenFastEntry}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-full text-xs font-bold shadow-md shadow-blue-100 flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t('newTransactionBtn')}</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>{t('exportExcel')}</span>
            </button>

            {onPrintReport && (
              <button
                onClick={onPrintReport}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-blue-600" />
                <span>{t('printLog')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Filters Controls Row */}
        <div className="space-y-3 pt-3 border-t border-slate-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Date Filter Pills */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">{t('periodLabel')}</label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800"
              >
                <option value="today">{t('filterToday', { date: today })}</option>
                <option value="yesterday">{t('filterYesterday', { date: yesterday })}</option>
                <option value="all">{t('filterAllHistory')}</option>
                <option value="custom">{t('filterCustom')}</option>
              </select>
            </div>

            {/* Employee Filter */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">{t('employee')}</label>
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800"
              >
                <option value="all">{t('allEmployees')}</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Service Filter */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">{t('service')}</label>
              <select
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800"
              >
                <option value="all">{t('allServices')}</option>
                {services.map((srv) => (
                  <option key={srv.id} value={srv.id}>
                    {srv.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Payment Method Filter */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">{t('paymentMethod')}</label>
              <select
                value={selectedPaymentMethod}
                onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800"
              >
                <option value="all">{t('allMethods')}</option>
                <option value="cash">{t('cashOnly')}</option>
                <option value="card">{t('cardOnly')}</option>
                <option value="transfer">{t('transferOnly')}</option>
              </select>
            </div>
          </div>

          {/* Custom Date Range (full-width sub-row) */}
          {dateFilter === 'custom' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">{t('fromDate')}</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">{t('toDate')}</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary Metrics Bar for Filtered Results */}
      <div className="bg-slate-900 text-white rounded-xl p-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 text-xs font-bold shadow-xs">
        <div className="flex items-center gap-2">
          <span className="bg-emerald-500/20 text-emerald-400 p-1.5 rounded-lg border border-emerald-500/30">
            <Receipt className="w-4 h-4" />
          </span>
          <span>{t('filterResults', { count: filteredEntries.length })}</span>
        </div>

        <div className="flex flex-1 min-w-[280px] items-stretch divide-x divide-slate-700">
          <div className="flex-1 px-3 text-center">
            <span className="text-slate-400 text-xs block">{t('cashShort')}</span>
            <span className="text-emerald-400 dir-ltr">{formatCurrency(totalCash, settings.currency, lang)}</span>
          </div>

          <div className="flex-1 px-3 text-center">
            <span className="text-slate-400 text-xs block">{t('cardShort')}</span>
            <span className="text-blue-400 dir-ltr">{formatCurrency(totalCard, settings.currency, lang)}</span>
          </div>

          <div className="flex-1 px-3 text-center">
            <span className="text-slate-400 text-xs block">{t('transferShort')}</span>
            <span className="text-slate-400 dir-ltr">{formatCurrency(totalTransfer, settings.currency, lang)}</span>
          </div>

          <div className="flex-1 px-3 text-center">
            <span className="text-slate-300 text-xs block">{t('grandTotal')}</span>
            <span className="text-emerald-300 font-extrabold text-sm dir-ltr">
              {formatCurrency(totalAmount, settings.currency, lang)}
            </span>
          </div>
        </div>
      </div>

      {/* Main Entries Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {filteredEntries.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Receipt className="w-12 h-12 mx-auto text-slate-300" />
            <p className="text-xs font-medium">{t('noMatchingEntries')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200/80">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">{t('thDateAndTime')}</th>
                  <th className="px-4 py-3">{t('employee')}</th>
                  <th className="px-4 py-3">{t('service')}</th>
                  <th className="px-4 py-3">{t('statement')}</th>
                  <th className="px-4 py-3">{t('amount')}</th>
                  <th className="px-4 py-3">{t('paymentMethod')}</th>
                  <th className="px-4 py-3 text-center">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEntries.map((entry, index) => (
                  <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 text-slate-400 text-xs font-mono">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-medium">
                      <span className="block font-semibold text-slate-800">{entry.date}</span>
                      <span className="text-xs text-slate-400 font-mono">
                        {formatTimeArabic(entry.time, lang)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-800">
                      {entry.employeeName}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {entry.serviceName}
                    </td>
                    <td className="px-4 py-3 text-slate-500 max-w-xs truncate">
                      {entry.statement || '—'}
                    </td>
                    <td className="px-4 py-3 font-black text-slate-900 dir-ltr text-right">
                      {formatCurrency(entry.amount, settings.currency, lang)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded-full border ${getPaymentMethodBadgeClass(
                          entry.paymentMethod
                        )}`}
                      >
                        {getPaymentMethodLabel(entry.paymentMethod, lang)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setEditingEntry(entry)}
                          className="p-1.5 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
                          title={t('editEntryTooltip')}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingEntry({ id: entry.id, name: entry.serviceName })}
                          className="p-1.5 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer transition-colors"
                          title={t('deleteEntryTooltip')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
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
          title={t('confirmDeleteTxTitle')}
          message={t('confirmDeleteTxMessage', { name: deletingEntry?.name ?? '' })}
          language={lang}
          onConfirm={() => {
            if (deletingEntry) {
              onDeleteEntry(deletingEntry.id);
            }
          }}
          onClose={() => setDeletingEntry(null)}
        />
      </div>

      {/* Edit Entry Modal */}
      {editingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900">{t('editEntryTitle')}</h3>
              <button onClick={() => setEditingEntry(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('employeeDoingService')}</label>
                  <select
                    value={editingEntry.employeeId}
                    onChange={(e) => {
                      const emp = employees.find((x) => x.id === e.target.value);
                      setEditingEntry({
                        ...editingEntry,
                        employeeId: e.target.value,
                        employeeName: emp?.name || editingEntry.employeeName,
                      });
                    }}
                    className="w-full border rounded-xl p-2.5 font-bold"
                  >
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('requiredService')}</label>
                  <select
                    value={editingEntry.serviceId}
                    onChange={(e) => {
                      const srv = services.find((x) => x.id === e.target.value);
                      setEditingEntry({
                        ...editingEntry,
                        serviceId: e.target.value,
                        serviceName: srv?.name || editingEntry.serviceName,
                      });
                    }}
                    className="w-full border rounded-xl p-2.5 font-bold"
                  >
                    {services.map((srv) => (
                      <option key={srv.id} value={srv.id}>{srv.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('dateLabel')}</label>
                  <input
                    type="date"
                    value={editingEntry.date}
                    onChange={(e) => setEditingEntry({ ...editingEntry, date: e.target.value })}
                    className="w-full border rounded-xl p-2.5 font-bold dir-ltr"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('timeLabel')}</label>
                  <input
                    type="time"
                    value={editingEntry.time.slice(0, 5)}
                    onChange={(e) =>
                      setEditingEntry({ ...editingEntry, time: e.target.value ? `${e.target.value}:00` : editingEntry.time })
                    }
                    className="w-full border rounded-xl p-2.5 font-bold dir-ltr"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('amount')}</label>
                <input
                  type="number"
                  min="0"
                  value={editingEntry.amount}
                  onChange={(e) =>
                    setEditingEntry({ ...editingEntry, amount: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full border rounded-xl p-2.5 font-bold dir-ltr text-right"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('paymentMethod')}</label>
                <select
                  value={editingEntry.paymentMethod}
                  onChange={(e) =>
                    setEditingEntry({ ...editingEntry, paymentMethod: e.target.value as PaymentMethod })
                  }
                  className="w-full border rounded-xl p-2.5 font-bold"
                >
                  <option value="cash">{t('cashOption')}</option>
                  <option value="card">{t('cardOption')}</option>
                  <option value="transfer">{t('transferOption')}</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('statementDetailLabel')}</label>
                <input
                  type="text"
                  value={editingEntry.statement || ''}
                  onChange={(e) => setEditingEntry({ ...editingEntry, statement: e.target.value })}
                  className="w-full border rounded-xl p-2.5"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                onClick={() => setEditingEntry(null)}
                className="px-4 py-2 text-xs font-bold border rounded-xl"
              >
                {t('cancel')}
              </button>
              <button
                onClick={() => {
                  const amountResult = validateAmount(editingEntry.amount);
                  if (!amountResult.isValid) {
                    showError(validationMessage(amountResult.code, t));
                    return;
                  }
                  if (!editingEntry.date || !editingEntry.time || !editingEntry.employeeId || !editingEntry.serviceId) {
                    showError(t('feValidation'));
                    return;
                  }
                  onUpdateEntry(editingEntry);
                  setEditingEntry(null);
                }}
                className="px-4 py-2 text-xs font-bold bg-emerald-600 text-white rounded-xl"
              >
                {t('saveChanges')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
