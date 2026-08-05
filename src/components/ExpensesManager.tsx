import React, { useState } from 'react';
import {
  Wallet,
  Download,
} from 'lucide-react';
import { Expense, OfficeSettings } from '../types';
import {
  formatCurrency,
  getTodayDateString,
  getCurrentTimeString,
  exportToCSV,
} from '../lib/formatters';
import { makeT, translations, validationMessage } from '../lib/i18n';
import { validateAmount, validateStatement } from '../lib/validation';
import { ConfirmModal } from './ConfirmModal';
import { useToast } from './Toast';

interface ExpensesManagerProps {
  expenses: Expense[];
  settings: OfficeSettings;
  onAddExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => void;
  onDeleteExpense: (id: string) => void;
}

export const ExpensesManager: React.FC<ExpensesManagerProps> = ({
  expenses,
  settings,
  onAddExpense,
  onDeleteExpense,
}) => {
  const [deletingExpense, setDeletingExpense] = useState<{ id: string; statement: string } | null>(null);
  const [statement, setStatement] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [date, setDate] = useState<string>(getTodayDateString());
  const t = makeT(settings.language);
  const lang = settings.language ?? 'ar';
  const { showSuccess, showError } = useToast();

  const categories = [
    'ضيافة',
    'أدوات مكتبية',
    'صيانة وطباعة',
    'فواتير ومرافق',
    'إيجار وتراخيص',
    'رسوم حكومية',
    'أخرى',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    const trimmedStatement = statement.trim();
    const stmtResult = validateStatement(trimmedStatement);
    const amountResult = validateAmount(amount);
    if (!stmtResult.isValid) {
      showError(validationMessage(stmtResult.code, t) || t('expenseValidation'));
      return;
    }
    if (!amountResult.isValid) {
      showError(validationMessage(amountResult.code, t) || t('expenseValidation'));
      return;
    }

    onAddExpense({
      date,
      time: getCurrentTimeString().slice(0, 5),
      category,
      statement: trimmedStatement,
      amount: numAmount,
      notes: notes.trim() || undefined,
    });

    setStatement('');
    setAmount('');
    setNotes('');
    showSuccess(t('expenseSaved', { statement: trimmedStatement, amount: formatCurrency(numAmount, settings.currency, lang) }));
  };

  const totalExpenseAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

  const handleExportCSV = () => {
    const headers = translations[lang].csvExpenseHeaders;
    const rows = expenses.map((e) => [
      e.date,
      e.time,
      e.category,
      e.statement,
      e.amount,
      e.notes || '',
    ]);
    exportToCSV(`${t('csvExpenseName')}_${getTodayDateString()}`, headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Stats */}
      <div className="bg-white rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-rose-500" />
            <span>{t('expensesPageTitle')}</span>
          </h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            {t('expensesPageSubtitle')}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-white border border-slate-100 rounded-2xl px-5 py-2.5 text-right">
            <span className="text-xs text-rose-600 font-bold block">{t('totalRecordedExpenses')}</span>
            <span className="text-lg font-black text-rose-700 dir-ltr">
              {formatCurrency(totalExpenseAmount, settings.currency, lang)}
            </span>
          </div>

          <button
            onClick={handleExportCSV}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-full text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>{t('exportExcel')}</span>
          </button>
        </div>
      </div>

      {/* Add Expense Form Card */}
      <div className="bg-white rounded-3xl p-6 shadow-sm space-y-4">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2">
          {t('newExpenseTitle')}
        </h3>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">{t('expenseDateLabel')}</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">{t('categoryLabel')}</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t('statementRequiredLabel')} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder={t('statementPlaceholder')}
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t('amountCurrencyLabel', { currency: settings.currency })} <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="any"
                min="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dir-ltr text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="bg-slate-800 hover:bg-slate-900 text-white px-5 py-2 rounded-full text-xs font-bold shadow-xs whitespace-nowrap cursor-pointer transition-all active:scale-95"
              >
                {t('addBtn')}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
        {expenses.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Wallet className="w-12 h-12 mx-auto text-slate-300" />
            <p className="text-xs font-medium">{t('noExpensesYet')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-400 font-medium border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3.5">{t('thDateAndTime')}</th>
                  <th className="px-5 py-3.5">{t('categoryLabel')}</th>
                  <th className="px-5 py-3.5">{t('statement')}</th>
                  <th className="px-5 py-3.5">{t('amount')}</th>
                  <th className="px-5 py-3.5 text-center">{t('thActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-blue-50/20 transition-colors">
                    <td className="px-5 py-3.5 text-slate-600 font-medium">
                      <span className="block font-bold text-slate-800">{exp.date}</span>
                      <span className="text-xs text-slate-400 font-mono">{exp.time}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="bg-rose-50 text-rose-700 border border-rose-200/60 px-3 py-0.5 rounded-full text-xs font-bold">
                        {exp.category}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-900">{exp.statement}</td>
                    <td className="px-5 py-3.5 font-black text-rose-600 dir-ltr text-right">
                      {formatCurrency(exp.amount, settings.currency, lang)}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <button
                        onClick={() => setDeletingExpense({ id: exp.id, statement: exp.statement })}
                        className="text-rose-500 hover:text-rose-700 text-xs font-bold px-2 py-1 rounded hover:bg-rose-50 cursor-pointer transition-colors"
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
          isOpen={!!deletingExpense}
          title={t('confirmDeleteExpenseTitle')}
          message={t('confirmDeleteExpenseMessage', { statement: deletingExpense?.statement ?? '' })}
          language={lang}
          onConfirm={() => {
            if (deletingExpense) {
              onDeleteExpense(deletingExpense.id);
              showSuccess(t('expenseDeleted', { statement: deletingExpense.statement }));
            }
          }}
          onClose={() => setDeletingExpense(null)}
        />
      </div>
    </div>
  );
};