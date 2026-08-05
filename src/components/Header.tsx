import React, { useState, useEffect } from 'react';
import {
  Building2,
  Clock,
  PlusCircle,
  Search,
  CheckCircle2,
} from 'lucide-react';
import { OfficeSettings, ViewMode } from '../types';
import { formatCurrency } from '../lib/formatters';
import { makeT } from '../lib/i18n';

interface HeaderProps {
  settings: OfficeSettings;
  currentView: ViewMode;
  onNavigate: (view: ViewMode) => void;
  onOpenFastEntry: () => void;
  todayRevenue: number;
  todayEntriesCount: number;
  isTodayClosed: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  currentView,
  onNavigate,
  onOpenFastEntry,
  todayRevenue,
  todayEntriesCount,
  isTodayClosed,
  searchQuery,
  onSearchChange,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const t = makeT(settings.language);
  const lang = settings.language ?? 'ar';

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'ar-SA-u-ca-gregory', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        }).format(now)
      );
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, [lang]);

  const getViewTitle = (view: ViewMode): string => {
    switch (view) {
      case 'dashboard':
        return t('dashboard');
      case 'fast_entry':
        return t('fastEntry');
      case 'transactions':
        return t('transactions');
      case 'expenses':
        return t('expenses');
      case 'employees':
        return t('employees');
      case 'services':
        return t('services');
      case 'day_closing':
        return t('dayClosing');
      case 'reports':
        return t('reports');
      case 'settings':
        return t('settings');
      case 'employee_portal':
        return t('employeePortal');
      default:
        return '';
    }
  };

  return (
    <header className="no-print bg-white border-b border-slate-200 text-slate-800 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-6 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Right Section: Office Branding & Page Title */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold shadow-md shadow-blue-200 shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-extrabold text-blue-600 dark:text-white tracking-tight">
                  {settings.officeName}
                </h1>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                {getViewTitle(currentView)}
              </p>
            </div>
          </div>

          {/* Center Section: Search Bar */}
          <div className="relative flex-1 max-w-md mx-2">
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                onSearchChange(e.target.value);
                if (currentView !== 'transactions' && e.target.value.trim() !== '') {
                  onNavigate('transactions');
                }
              }}
              placeholder={t('searchPlaceholder')}
              className="w-full pl-4 pr-10 py-2 bg-slate-100 border-none rounded-full text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 hover:text-slate-700 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Left Section: Live Stats, Today Status & Fast Entry Button */}
          <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
            {/* Today Status Pill */}
            <div className="hidden lg:flex items-center gap-2 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-full text-xs">
              {isTodayClosed ? (
                <div className="flex items-center gap-1.5 text-amber-600 font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{t('todayClosed')}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-emerald-600 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>{t('todayOpen')}</span>
                </div>
              )}
              <div className="h-3 w-px bg-slate-200 mx-1"></div>
              <div className="text-slate-800 font-extrabold dir-ltr">
                {formatCurrency(todayRevenue, settings.currency, lang)}
              </div>
              <span className="text-slate-400">
                {t('headerEntriesCount', { count: todayEntriesCount })}
              </span>
            </div>

            {/* Live Clock */}
            <div className="hidden sm:flex items-center gap-1.5 text-slate-500 text-xs font-mono bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200/80">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{timeStr}</span>
            </div>

            {/* Primary Fast Entry Action */}
            <button
              onClick={onOpenFastEntry}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-full text-xs font-bold shadow-md shadow-blue-100 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
              title={t('fastEntryTooltip')}
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t('newTransactionBtn')}</span>
              <kbd className="hidden sm:inline-block text-xs bg-blue-700 text-blue-100 px-1.5 py-0.5 rounded-full font-mono">
                F2
              </kbd>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
