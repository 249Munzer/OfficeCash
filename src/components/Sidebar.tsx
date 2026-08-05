import React from 'react';
import {
  LayoutDashboard,
  PlusCircle,
  Receipt,
  Wallet,
  Users,
  Briefcase,
  Lock,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  UserCheck,
} from 'lucide-react';
import { ViewMode } from '../types';
import { makeT } from '../lib/i18n';

interface SidebarProps {
  currentView: ViewMode;
  onNavigate: (view: ViewMode) => void;
  todayEntriesCount: number;
  todayExpensesCount: number;
  language?: 'ar' | 'en';
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  todayEntriesCount,
  todayExpensesCount,
  language = 'ar',
}) => {
  const t = makeT(language);
  const isEn = language === 'en';

  const menuItems: {
    id: ViewMode;
    label: string;
    icon: React.ReactNode;
    badge?: number;
    badgeColor?: string;
    hotkey?: string;
  }[] = [
    {
      id: 'dashboard',
      label: t('navDashboard'),
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'fast_entry',
      label: t('navFastEntry'),
      icon: <PlusCircle className="w-4 h-4 text-emerald-600" />,
      hotkey: 'F2',
      badgeColor: 'bg-emerald-100 text-emerald-800',
    },
    {
      id: 'employee_portal',
      label: t('navEmployeePortal'),
      icon: <UserCheck className="w-4 h-4 text-blue-600" />,
      badgeColor: 'bg-blue-100 text-blue-800',
    },
    {
      id: 'transactions',
      label: t('navTransactions'),
      icon: <Receipt className="w-4 h-4" />,
      badge: todayEntriesCount,
      badgeColor: 'bg-emerald-100 text-emerald-800',
    },
    {
      id: 'expenses',
      label: t('navExpenses'),
      icon: <Wallet className="w-4 h-4" />,
      badge: todayExpensesCount,
      badgeColor: 'bg-rose-100 text-rose-800',
    },
    {
      id: 'day_closing',
      label: t('navDayClosing'),
      icon: <Lock className="w-4 h-4 text-blue-600" />,
    },
    {
      id: 'employees',
      label: t('navEmployees'),
      icon: <Users className="w-4 h-4" />,
    },
    {
      id: 'services',
      label: t('navServices'),
      icon: <Briefcase className="w-4 h-4" />,
    },
    {
      id: 'reports',
      label: t('navReports'),
      icon: <BarChart3 className="w-4 h-4 text-blue-600" />,
    },
    {
      id: 'settings',
      label: t('navSettings'),
      icon: <Settings className="w-4 h-4" />,
    },
  ];

  const ChevronIcon = isEn ? ChevronRight : ChevronLeft;

  return (
    <aside className="no-print w-64 bg-white border-x border-slate-200 h-full flex flex-col shrink-0">
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2">
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-bold'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={isActive ? 'text-blue-600' : 'text-slate-400'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {item.hotkey && (
                    <kbd className="text-xs font-extrabold font-mono bg-amber-400 dark:bg-amber-400 text-amber-950 dark:text-slate-950 px-2 py-0.5 rounded-md border border-amber-500/80 shadow-xs">
                      {item.hotkey}
                    </kbd>
                  )}
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                        item.badgeColor || 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                  {isActive && <ChevronIcon className="w-3.5 h-3.5 text-blue-600" />}
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Quick Day Closing Action Button & Footer Info */}
      <div className="shrink-0 p-4 border-t border-slate-100 space-y-3">
        <button
          onClick={() => onNavigate('day_closing')}
          className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <Lock className="w-4 h-4 text-emerald-400" />
          <span>{t('closeDailyAccounts')}</span>
        </button>

        <div className="pt-2 text-xs text-slate-400 flex items-center justify-between">
          <span>{t('statusLocalConnected')}</span>
          <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
            {t('offlineSafe')}
          </span>
        </div>
      </div>
    </aside>
  );
};
