import React, { useState } from 'react';
import {
  BarChart3,
  Printer,
  Users,
  Briefcase,
  Receipt,
  TrendingUp,
  FileSpreadsheet,
} from 'lucide-react';
import {
  FinancialEntry,
  Expense,
  Employee,
  Service,
  OfficeSettings,
} from '../types';
import {
  formatCurrency,
  exportToCSV,
  getTodayDateString,
  getDateStringFrom,
  getPaymentMethodLabel,
} from '../lib/formatters';
import { makeT, translations } from '../lib/i18n';

interface ReportsScreenProps {
  entries: FinancialEntry[];
  expenses: Expense[];
  employees: Employee[];
  services: Service[];
  settings: OfficeSettings;
  onPrintReport?: (reportType: string, filteredEntries: FinancialEntry[], filteredExpenses: Expense[], title: string) => void;
}

export const ReportsScreen: React.FC<ReportsScreenProps> = ({
  entries,
  expenses,
  employees,
  services,
  settings,
  onPrintReport,
}) => {
  const today = getTodayDateString();
  const t = makeT(settings.language);
  const lang = settings.language ?? 'ar';

  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'week' | 'month' | 'custom'>('today');
  const [customStart, setCustomStart] = useState<string>(today);
  const [customEnd, setCustomEnd] = useState<string>(today);
  const [activeTab, setActiveTab] = useState<'summary' | 'employees' | 'services' | 'monthly'>('summary');

  // Compute start & end dates based on filter
  const getFilterRange = () => {
    const now = new Date();
    if (dateFilter === 'today') {
      return { start: today, end: today, label: t('rangeToday') };
    }
    if (dateFilter === 'yesterday') {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      const y = getDateStringFrom(d);
      return { start: y, end: y, label: t('rangeYesterday') };
    }
    if (dateFilter === 'week') {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      const w = getDateStringFrom(d);
      return { start: w, end: today, label: t('rangeWeek') };
    }
    if (dateFilter === 'month') {
      const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      return { start: startOfMonth, end: today, label: t('rangeMonth') };
    }
    return { start: customStart, end: customEnd, label: t('rangeCustom', { start: customStart, end: customEnd }) };
  };

  const range = getFilterRange();

  // Filter entries and expenses for selected date range
  const filteredEntries = entries.filter(
    (e) => e.date >= range.start && e.date <= range.end
  );
  const filteredExpenses = expenses.filter(
    (ex) => ex.date >= range.start && ex.date <= range.end
  );

  // The monthly/settlement tab ALWAYS uses the current calendar month,
  // independent of the selected dateFilter (per completion plan P1.4)
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const monthEntries = entries.filter((e) => e.date >= monthStart && e.date <= today);
  const monthExpenses = expenses.filter((ex) => ex.date >= monthStart && ex.date <= today);
  const monthlyRevenue = monthEntries.reduce((sum, e) => sum + e.amount, 0);
  const monthlyCash = monthEntries
    .filter((e) => e.paymentMethod === 'cash')
    .reduce((sum, e) => sum + e.amount, 0);
  const monthlyCard = monthEntries
    .filter((e) => e.paymentMethod === 'card')
    .reduce((sum, e) => sum + e.amount, 0);
  const monthlyTransfer = monthEntries
    .filter((e) => e.paymentMethod === 'transfer')
    .reduce((sum, e) => sum + e.amount, 0);
  const monthlyTotalExpenses = monthExpenses.reduce((sum, ex) => sum + ex.amount, 0);
  const monthlyNetIncome = monthlyRevenue - monthlyTotalExpenses;

  // Financial totals
  const totalRevenue = filteredEntries.reduce((sum, e) => sum + e.amount, 0);
  const totalCash = filteredEntries
    .filter((e) => e.paymentMethod === 'cash')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalExpenses = filteredExpenses.reduce((sum, ex) => sum + ex.amount, 0);
  const netIncome = totalRevenue - totalExpenses;

  // Employee breakdown
  const employeeReport = employees.map((emp) => {
    const empEntries = filteredEntries.filter((e) => e.employeeId === emp.id);
    const revenue = empEntries.reduce((sum, e) => sum + e.amount, 0);
    const cash = empEntries
      .filter((e) => e.paymentMethod === 'cash')
      .reduce((sum, e) => sum + e.amount, 0);
    const card = empEntries
      .filter((e) => e.paymentMethod === 'card')
      .reduce((sum, e) => sum + e.amount, 0);
    const transfer = empEntries
      .filter((e) => e.paymentMethod === 'transfer')
      .reduce((sum, e) => sum + e.amount, 0);

    return {
      ...emp,
      entriesCount: empEntries.length,
      revenue,
      cash,
      card,
      transfer,
      sharePercentage: totalRevenue > 0 ? Math.round((revenue / totalRevenue) * 100) : 0,
    };
  }).sort((a, b) => b.revenue - a.revenue);

  // Service breakdown
  const serviceReport = services.map((srv) => {
    const srvEntries = filteredEntries.filter((e) => e.serviceId === srv.id);
    const revenue = srvEntries.reduce((sum, e) => sum + e.amount, 0);
    return {
      ...srv,
      count: srvEntries.length,
      revenue,
    };
  }).sort((a, b) => b.count - a.count);

  // Export Excel CSV
  const handleExportExcel = () => {
    if (activeTab === 'summary' || activeTab === 'monthly') {
      const headers = translations[lang].csvSummaryHeaders;
      const exportEntries = activeTab === 'monthly' ? monthEntries : filteredEntries;
      const rows = exportEntries.map((e) => [
        e.date,
        e.time,
        e.employeeName,
        e.serviceName,
        e.statement || '',
        e.amount,
        getPaymentMethodLabel(e.paymentMethod, lang),
      ]);
      exportToCSV(`${t('csvReportName')}_${activeTab === 'monthly' ? 'month' : dateFilter}_${today}`, headers, rows);
    } else if (activeTab === 'employees') {
      const headers = translations[lang].csvEmployeesHeaders;
      const rows = employeeReport.map((emp) => [
        emp.name,
        emp.entriesCount,
        emp.revenue,
        emp.cash,
        emp.card,
        emp.transfer,
        `${emp.sharePercentage}%`,
      ]);
      exportToCSV(`${t('csvEmployeesName')}_${today}`, headers, rows);
    } else if (activeTab === 'services') {
      const headers = translations[lang].csvServicesHeaders;
      const rows = serviceReport.map((srv) => [
        srv.name,
        srv.category,
        srv.count,
        srv.defaultPrice,
        srv.revenue,
      ]);
      exportToCSV(`${t('csvServicesName')}_${today}`, headers, rows);
    }
  };

  const handlePrint = () => {
    if (onPrintReport) {
      if (activeTab === 'monthly') {
        onPrintReport(activeTab, monthEntries, monthExpenses, `${range.label} · ${monthStart} → ${today}`);
      } else {
        onPrintReport(activeTab, filteredEntries, filteredExpenses, range.label);
      }
    } else {
      window.print();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Date Range Selection Bar */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <span>{t('reportsPageTitle')}</span>
            </h2>
            <p className="text-xs text-slate-500">
              {t('reportsPageSubtitle')}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>{t('exportExcel')}</span>
            </button>

            <button
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>{t('printReport')}</span>
            </button>
          </div>
        </div>

        {/* Date Filter Buttons Row */}
        <div className="flex items-center flex-wrap gap-2 pt-3 border-t border-slate-100">
          <button
            onClick={() => setDateFilter('today')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
              dateFilter === 'today'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {t('reportToday')}
          </button>

          <button
            onClick={() => setDateFilter('yesterday')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
              dateFilter === 'yesterday'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {t('reportYesterday')}
          </button>

          <button
            onClick={() => setDateFilter('week')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
              dateFilter === 'week'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {t('last7Days')}
          </button>

          <button
            onClick={() => setDateFilter('month')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
              dateFilter === 'month'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {t('monthlySettlementBtn')}
          </button>

          <button
            onClick={() => setDateFilter('custom')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
              dateFilter === 'custom'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {t('customPeriod')}
          </button>

          {dateFilter === 'custom' && (
            <div className="flex items-center gap-2 mr-auto bg-slate-50 p-1 rounded-xl border">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="text-xs p-1 rounded"
              />
              <span className="text-xs text-slate-400">{t('toWord')}</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="text-xs p-1 rounded"
              />
            </div>
          )}
        </div>
      </div>

      {/* Primary KPI Summary Cards for Selected Filter Range */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <span className="text-xs font-bold text-slate-500 block mb-1">{t('totalRevenue')}</span>
          <span className="text-xl font-black text-slate-900 dir-ltr block">
            {formatCurrency(totalRevenue, settings.currency, lang)}
          </span>
          <span className="text-xs text-slate-400">{t('entriesCountLabel', { count: filteredEntries.length })}</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-emerald-200 shadow-xs">
          <span className="text-xs font-bold text-emerald-800 block mb-1">{t('totalCashCollections')}</span>
          <span className="text-xl font-black text-emerald-900 dir-ltr block">
            {formatCurrency(totalCash, settings.currency, lang)}
          </span>
          <span className="text-xs text-emerald-700">
            {t('percentageOfPeriod', { pct: totalRevenue > 0 ? Math.round((totalCash / totalRevenue) * 100) : 0 })}
          </span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-rose-200 shadow-xs">
          <span className="text-xs font-bold text-rose-600 block mb-1">{t('totalExpenses')}</span>
          <span className="text-xl font-black text-rose-500 dir-ltr block">
            {formatCurrency(totalExpenses, settings.currency, lang)}
          </span>
          <span className="text-xs text-rose-500">{t('expensesCountLabel', { count: filteredExpenses.length })}</span>
        </div>

        <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200 shadow-sm">
          <span className="text-xs font-bold text-blue-800 block mb-1">{t('netIncomeCard')}</span>
          <span className="text-xl font-black text-blue-700 dir-ltr block">
            {formatCurrency(netIncome, settings.currency, lang)}
          </span>
          <span className="text-xs text-blue-700 font-medium">{t('netIncomeHint')}</span>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="flex border-b border-slate-200 bg-slate-50 overflow-x-auto">
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-5 py-3 text-xs font-bold flex items-center gap-2 border-b-2 whitespace-nowrap cursor-pointer transition-all ${
              activeTab === 'summary'
                ? 'border-blue-600 text-blue-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>{t('tabSummary')}</span>
          </button>

          <button
            onClick={() => setActiveTab('employees')}
            className={`px-5 py-3 text-xs font-bold flex items-center gap-2 border-b-2 whitespace-nowrap cursor-pointer transition-all ${
              activeTab === 'employees'
                ? 'border-blue-600 text-blue-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{t('tabEmployees')}</span>
          </button>

          <button
            onClick={() => setActiveTab('services')}
            className={`px-5 py-3 text-xs font-bold flex items-center gap-2 border-b-2 whitespace-nowrap cursor-pointer transition-all ${
              activeTab === 'services'
                ? 'border-blue-600 text-blue-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>{t('tabServices')}</span>
          </button>

          <button
            onClick={() => setActiveTab('monthly')}
            className={`px-5 py-3 text-xs font-bold flex items-center gap-2 border-b-2 whitespace-nowrap cursor-pointer transition-all ${
              activeTab === 'monthly'
                ? 'border-blue-600 text-blue-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>{t('tabSettlement')}</span>
          </button>
        </div>

        <div className="p-6">
          {/* TAB 1: Financial Summary */}
          {activeTab === 'summary' && (
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-slate-900">
                {t('entriesTableForRange', { label: range.label })}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">{t('date')}</th>
                      <th className="px-4 py-3">{t('employee')}</th>
                      <th className="px-4 py-3">{t('service')}</th>
                      <th className="px-4 py-3">{t('statement')}</th>
                      <th className="px-4 py-3">{t('amount')}</th>
                      <th className="px-4 py-3">{t('paymentMethod')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredEntries.map((e) => (
                      <tr key={e.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-medium">{e.date}</td>
                        <td className="px-4 py-2.5 font-bold">{e.employeeName}</td>
                        <td className="px-4 py-2.5">{e.serviceName}</td>
                        <td className="px-4 py-2.5 text-slate-500">{e.statement || '—'}</td>
                        <td className="px-4 py-2.5 font-black dir-ltr text-right">
                          {formatCurrency(e.amount, settings.currency, lang)}
                        </td>
                        <td className="px-4 py-2.5 font-bold">{getPaymentMethodLabel(e.paymentMethod, lang)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: Employee Breakdown */}
          {activeTab === 'employees' && (
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-slate-900">
                {t('employeeBreakdownTitle')}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">{t('thEmployeeName')}</th>
                      <th className="px-4 py-3">{t('thEntriesCount')}</th>
                      <th className="px-4 py-3">{t('thTotalRevenue')}</th>
                      <th className="px-4 py-3">{t('cash')}</th>
                      <th className="px-4 py-3">{t('card')}</th>
                      <th className="px-4 py-3">{t('transfer')}</th>
                      <th className="px-4 py-3">{t('thContribution')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {employeeReport.map((emp) => (
                      <tr key={emp.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-bold flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: emp.color }}
                          ></span>
                          <span>{emp.name}</span>
                        </td>
                        <td className="px-4 py-3 font-semibold">{t('entriesCountUnit', { count: emp.entriesCount })}</td>
                        <td className="px-4 py-3 font-black text-slate-900 dir-ltr text-right">
                          {formatCurrency(emp.revenue, settings.currency, lang)}
                        </td>
                        <td className="px-4 py-3 text-emerald-700 font-bold dir-ltr text-right">
                          {formatCurrency(emp.cash, settings.currency, lang)}
                        </td>
                        <td className="px-4 py-3 text-blue-700 font-bold dir-ltr text-right">
                          {formatCurrency(emp.card, settings.currency, lang)}
                        </td>
                        <td className="px-4 py-3 text-slate-700 font-bold dir-ltr text-right">
                          {formatCurrency(emp.transfer, settings.currency, lang)}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-700">
                          {emp.sharePercentage}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: Services Breakdown */}
          {activeTab === 'services' && (
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-slate-900">
                {t('servicesBreakdownTitle')}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">{t('thServiceName')}</th>
                      <th className="px-4 py-3">{t('thDepartment')}</th>
                      <th className="px-4 py-3">{t('thDefaultPrice')}</th>
                      <th className="px-4 py-3">{t('thUsageCount')}</th>
                      <th className="px-4 py-3">{t('thServiceIncome')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {serviceReport.map((srv) => (
                      <tr key={srv.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-bold">{srv.name}</td>
                        <td className="px-4 py-3 text-slate-500">{srv.category}</td>
                        <td className="px-4 py-3 dir-ltr text-right">
                          {formatCurrency(srv.defaultPrice, settings.currency, lang)}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-800">{t('timesUnit', { count: srv.count })}</td>
                        <td className="px-4 py-3 font-black text-emerald-800 dir-ltr text-right">
                          {formatCurrency(srv.revenue, settings.currency, lang)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: Settlement Table */}
          {activeTab === 'monthly' && (
            <div className="space-y-6">
              <div className="p-4 bg-slate-900 text-white rounded-xl space-y-2">
                <h4 className="font-bold text-sm text-emerald-400">{t('settlementTableTitle')}</h4>
                <p className="text-xs text-slate-300">
                  {t('settlementSubtitle')}
                </p>
                <p className="text-xs text-emerald-300 font-bold dir-ltr">{monthStart} → {today}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-50 p-4 rounded-xl border space-y-3 text-xs">
                  <h5 className="font-bold text-slate-800 border-b pb-2">{t('collectionsByMethod')}</h5>
                  <div className="flex justify-between py-1 border-b">
                    <span>{t('totalCashLabel')}</span>
                    <strong className="text-emerald-700 dir-ltr">{formatCurrency(monthlyCash, settings.currency, lang)}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b">
                    <span>{t('totalCardMadaLabel')}</span>
                    <strong className="text-blue-700 dir-ltr">{formatCurrency(monthlyCard, settings.currency, lang)}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b">
                    <span>{t('totalBankTransferLabel')}</span>
                    <strong className="text-slate-700 dir-ltr">{formatCurrency(monthlyTransfer, settings.currency, lang)}</strong>
                  </div>
                  <div className="flex justify-between py-2 font-black text-sm text-slate-900">
                    <span>{t('totalPeriodIncome')}</span>
                    <strong className="dir-ltr">{formatCurrency(monthlyRevenue, settings.currency, lang)}</strong>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border space-y-3 text-xs">
                  <h5 className="font-bold text-slate-800 border-b pb-2">{t('finalSettlementTitle')}</h5>
                  <div className="flex justify-between py-1 border-b">
                    <span>{t('totalRevenueColon')}</span>
                    <strong className="text-slate-800 dir-ltr">{formatCurrency(monthlyRevenue, settings.currency, lang)}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b text-rose-800">
                    <span>{t('deductExpenses')}</span>
                    <strong className="dir-ltr">- {formatCurrency(monthlyTotalExpenses, settings.currency, lang)}</strong>
                  </div>
                  <div className="flex justify-between py-2 font-black text-sm text-emerald-800 bg-emerald-100 p-2 rounded-lg">
                    <span>{t('netProfitSettlement')}</span>
                    <strong className="dir-ltr">{formatCurrency(monthlyNetIncome, settings.currency, lang)}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
