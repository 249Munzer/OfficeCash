import React, { useState } from 'react';
import {
  Building2,
  Users,
  Wifi,
  Lock,
  Radio,
  Sparkles,
  AlertCircle,
  FileCheck,
  RefreshCw,
} from 'lucide-react';
import { Employee, OfficeSettings } from '../types';
import { makeT } from '../lib/i18n';
import type { OfficeRegistrationInput } from '../lib/auth/registration';
import { useToast } from './Toast';
import type { SyncStatus } from '../lib/electron-storage';
import { EmployeeLoginForm } from './auth/EmployeeLoginForm';
import { AdminLoginForm } from './auth/AdminLoginForm';
import { OfficeRegistrationForm } from './auth/OfficeRegistrationForm';

export interface OfficeCreationResult {
  ok: boolean;
  error?: string;
}

interface LandingPageProps {
  settings: OfficeSettings;
  employees: Employee[];
  onLoginAsAdmin: (adminPin: string) => Promise<boolean> | boolean;
  onLoginAsEmployee: (employeeId: string, pin: string) => Promise<boolean> | boolean;
  onCreateNewOffice: (data: OfficeRegistrationInput) => Promise<OfficeCreationResult> | OfficeCreationResult;
  onJoinLAN: (syncCode: string) => Promise<OfficeCreationResult> | OfficeCreationResult;
  syncStatus: SyncStatus | null;
  onRefreshSyncStatus?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  settings,
  employees,
  onLoginAsAdmin,
  onLoginAsEmployee,
  onCreateNewOffice,
  onJoinLAN,
  syncStatus,
  onRefreshSyncStatus,
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'lan_join'>('login');
  const [loginRole, setLoginRole] = useState<'employee' | 'admin'>('employee');

  // LAN Join state
  const [lanCodeInput, setLanCodeInput] = useState<string>('');
  // حالة الاتصال: تتحول للشاشة الكاملة "متصلة بالشبكة" بعد نجاح الاقتران
  const [lanJoined, setLanJoined] = useState<boolean>(() => Boolean(settings.networkSyncCode));

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { showSuccess } = useToast();

  const t = makeT(settings.language);

  const isDesktopApp = typeof window !== 'undefined' && !!window.electronAPI;

  const renderSyncBadge = () => {
    if (!isDesktopApp) {
      return (
        <div className="hidden sm:flex items-center gap-2 bg-slate-100 border border-slate-200 dark:bg-slate-900 dark:border-slate-800 px-3 py-1.5 rounded-full text-xs text-slate-500 dark:text-slate-400">
          <span className="w-2 h-2 rounded-full bg-slate-400"></span>
          <span>{t('lanStatusBrowser')}</span>
        </div>
      );
    }
    if (syncStatus?.serverError && !syncStatus.serverListening) {
      return (
        <div className="hidden sm:flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-600 dark:bg-rose-950/60 dark:border-rose-800/60 dark:text-rose-300 px-3 py-1.5 rounded-full text-xs">
          <span className="w-2 h-2 rounded-full bg-rose-500"></span>
          <span>{t('lanStatusError', { error: syncStatus.serverError })}</span>
        </div>
      );
    }
    if (syncStatus?.connected && syncStatus.peerCount > 0) {
      return (
        <div className="hidden sm:flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-950/60 dark:border-emerald-800/60 dark:text-emerald-300 px-3 py-1.5 rounded-full text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>{t('lanStatusConnected', { count: syncStatus.peerCount })}</span>
        </div>
      );
    }
    if (settings.networkSyncCode) {
      return (
        <div className="hidden sm:flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 dark:bg-amber-950/60 dark:border-amber-800/60 dark:text-amber-300 px-3 py-1.5 rounded-full text-xs">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
          <span>{t('lanStatusSearching')}</span>
        </div>
      );
    }
    return (
      <div className="hidden sm:flex items-center gap-2 bg-slate-100 border border-slate-200 dark:bg-slate-900 dark:border-slate-800 px-3 py-1.5 rounded-full text-xs text-slate-500 dark:text-slate-400">
        <span className="w-2 h-2 rounded-full bg-slate-400"></span>
        <span>{t('lanStatusNoCode')}</span>
      </div>
    );
  };

  // Handle Register New Office
  const handleCreateOffice = async (data: OfficeRegistrationInput) => {
    const result = await onCreateNewOffice(data);
    if (result.ok) {
      showSuccess(t('lpSuccessCreated'), 6000);
    }
    return result;
  };

  // Handle LAN Join
  const handleLANJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!lanCodeInput.trim()) {
      setErrorMsg(t('lpErrLanCode'));
      return;
    }
    const result = await onJoinLAN(lanCodeInput.trim().toUpperCase());
    if (result.ok) {
      setLanCodeInput('');
      setLanJoined(true);
      showSuccess(t('lpSuccessLan'), 6000);
    } else {
      setErrorMsg(result.error || t('lpErrLanJoinFailed'));
    }
  };

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col justify-between relative overflow-x-hidden dir-rtl font-sans">
      {/* Background Ambient Glow (kept subtle, moved away from the hero text) */}
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-blue-500/5 dark:bg-blue-600/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Top Brand Navigation Bar */}
      <header className="border-b border-slate-200 bg-white/80 dark:border-slate-800/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white tracking-wide block">
                {t('lpBrandName')}
              </span>
              <span className="text-xs text-blue-600 dark:text-blue-400 font-bold block">
                {t('lpBrandSubtitle')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {renderSyncBadge()}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        {/* Left Column (Hero Info & Features) */}
        <div className="lg:col-span-6 space-y-6">
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 dark:bg-blue-950/70 dark:border-blue-800/60 dark:text-blue-300 px-3.5 py-1.5 rounded-full text-xs font-bold">
            <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>{t('heroBadge')}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black leading-tight text-slate-900 dark:text-white tracking-tight">
            {t('heroTitle1')}{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-500 dark:from-blue-400 dark:to-blue-300">
              {t('heroTitleHighlight')}
            </span>{' '}
            {t('heroTitle2')}
          </h1>

          <p className="text-slate-500 dark:text-slate-300 text-sm sm:text-base leading-relaxed">
            {t('heroDescription')}
          </p>

          {/* Core Feature Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="bg-white border border-slate-200 shadow-sm dark:bg-slate-900/90 dark:border-slate-800 p-4 rounded-2xl space-y-2">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-xs text-slate-900 dark:text-white">{t('featLocalTitle')}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                {t('featLocalDesc')}
              </p>
            </div>

            <div className="bg-white border border-slate-200 shadow-sm dark:bg-slate-900/90 dark:border-slate-800 p-4 rounded-2xl space-y-2">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-xs text-slate-900 dark:text-white">{t('featPerEmployeeTitle')}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                {t('featPerEmployeeDesc')}
              </p>
            </div>

            <div className="bg-white border border-slate-200 shadow-sm dark:bg-slate-900/90 dark:border-slate-800 p-4 rounded-2xl space-y-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 flex items-center justify-center">
                <Radio className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-xs text-slate-900 dark:text-white">{t('featLanTitle')}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                {t('featLanDesc')}
              </p>
            </div>

            <div className="bg-white border border-slate-200 shadow-sm dark:bg-slate-900/90 dark:border-slate-800 p-4 rounded-2xl space-y-2">
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 flex items-center justify-center">
                <FileCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-xs text-slate-900 dark:text-white">{t('featCloseTitle')}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                {t('featCloseDesc')}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column (Auth Gateway Forms) */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl dark:bg-slate-900/90 dark:border-slate-800 dark:shadow-2xl space-y-6 relative">
          {/* Form Tabs Switcher */}
          <div className="grid grid-cols-3 gap-1 bg-slate-100 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 p-1.5 rounded-2xl">
            <button
              onClick={() => {
                setActiveTab('login');
                setErrorMsg(null);
              }}
              className={`py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === 'login'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {t('tabLogin')}
            </button>

            <button
              onClick={() => {
                setActiveTab('register');
                setErrorMsg(null);
              }}
              className={`py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === 'register'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {t('tabRegister')}
            </button>

            <button
              onClick={() => {
                setActiveTab('lan_join');
                setErrorMsg(null);
              }}
              className={`py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === 'lan_join'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {t('tabLanJoin')}
            </button>
          </div>

          {/* Toast / Error message (LAN Join only) */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 dark:bg-rose-950/80 dark:border-rose-800 dark:text-rose-300 rounded-xl text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* TAB 1: LOGIN */}
          {activeTab === 'login' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('loginTitle')}</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t('currentOfficeLabel', { name: settings.officeName })}
                  </p>
                </div>

                {/* Role Switcher */}
                <div className="flex bg-slate-100 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 p-1 rounded-xl">
                  <button
                    onClick={() => {
                      setLoginRole('employee');
                      setErrorMsg(null);
                    }}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      loginRole === 'employee'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    {t('roleEmployee')}
                  </button>
                  <button
                    onClick={() => {
                      setLoginRole('admin');
                      setErrorMsg(null);
                    }}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      loginRole === 'admin'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    {t('roleAdmin')}
                  </button>
                </div>
              </div>

              {loginRole === 'employee' ? (
                <EmployeeLoginForm
                  employees={employees}
                  onLogin={onLoginAsEmployee}
                  t={t}
                />
              ) : (
                <AdminLoginForm onLogin={onLoginAsAdmin} t={t} />
              )}
            </div>
          )}

          {/* TAB 2: REGISTER NEW OFFICE */}
          {activeTab === 'register' && (
            <OfficeRegistrationForm onCreate={handleCreateOffice} t={t} />
          )}

          {/* TAB 3: LAN JOIN */}
          {activeTab === 'lan_join' && (lanJoined ? (
            <div className="space-y-4 text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 border border-emerald-200 dark:bg-emerald-950/60 dark:border-emerald-800/60 flex items-center justify-center">
                <Wifi className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {t('lanConnectedTitle', { office: settings.officeName || t('lanOfficeDefault') })}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {t('lanConnectedDesc')}
                </p>
              </div>

              {isDesktopApp && syncStatus?.peerCount > 0 ? (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800/60 dark:text-emerald-200 p-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  {t('lanStatusConnected', { count: syncStatus.peerCount })}
                  {syncStatus.peers.map((p) => (
                    <span key={p.id} className="font-mono text-emerald-600 dark:text-emerald-300">· {p.name}</span>
                  ))}
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800/60 dark:text-emerald-200 p-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  {t('lanStatusSearching')}
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setLanJoined(false);
                  setErrorMsg(null);
                }}
                className="inline-flex items-center gap-1.5 mx-auto px-4 py-2 text-xs font-bold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 rounded-xl transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {t('lanChangeCode')}
              </button>
            </div>
          ) : (
            <form onSubmit={handleLANJoinSubmit} className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('lanJoinTitle')}</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('lanJoinSubtitle')}
                </p>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800/60 dark:text-emerald-200 p-4 rounded-2xl text-xs space-y-1">
                <span className="font-extrabold flex items-center gap-1">
                  <Radio className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  {t('lanBroadcastTitle')}
                </span>
                <p className="text-xs text-emerald-600 dark:text-emerald-300">
                  {t('lanBroadcastDesc')}
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-2xl p-3.5 text-xs space-y-1.5">
                <span className="font-bold text-slate-700 dark:text-slate-300 block">{t('lanLiveStatusTitle')}</span>
                {isDesktopApp ? (
                  syncStatus?.connected && syncStatus.peerCount > 0 ? (
                    <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      {t('lanStatusConnected', { count: syncStatus.peerCount })}
                      {syncStatus.peers.map((p) => (
                        <span key={p.id} className="font-mono text-slate-500 dark:text-slate-400">· {p.name}</span>
                      ))}
                    </span>
                  ) : settings.networkSyncCode ? (
                    <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                      {t('lanStatusSearching')}
                    </span>
                  ) : (
                    <span className="text-slate-500 dark:text-slate-400">{t('lanStatusNoCode')}</span>
                  )
                ) : (
                  <span className="text-slate-500 dark:text-slate-400">{t('lanStatusBrowser')}</span>
                )}
              </div>

              <button
                type="button"
                onClick={onRefreshSyncStatus}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 cursor-pointer flex items-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {t('lanRefreshStatus')}
              </button>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {t('lanSyncCodeLabel')}
                </label>
                <input
                  type="text"
                  required
                  dir="ltr"
                  placeholder={t('lanCodePlaceholder')}
                  value={lanCodeInput}
                  onChange={(e) => setLanCodeInput(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-300 text-emerald-600 dark:bg-slate-950 dark:border-slate-800 dark:text-emerald-400 rounded-xl text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <Wifi className="w-4 h-4" />
                <span>{t('lanJoinBtn')}</span>
              </button>
            </form>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white dark:border-slate-900 dark:bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>{t('footerText')}</span>
          <span className="text-xs text-slate-500 dark:text-slate-600">{t('footerOffline')}</span>
        </div>
      </footer>
    </div>
  );
};
