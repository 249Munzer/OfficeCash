import React, { useState } from 'react';
import {
  Settings,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  Sun,
  Moon,
  Globe,
  Palette,
  Copy,
} from 'lucide-react';
import { OfficeSettings } from '../types';
import { exportBackupJSON, importBackupJSON } from '../lib/electron-storage';
import { makeT, validationMessage } from '../lib/i18n';
import { validateOfficeName, validatePhone } from '../lib/validation';
import { ConfirmModal } from './ConfirmModal';
import { useToast } from './Toast';

interface SettingsManagerProps {
  settings: OfficeSettings;
  onUpdateSettings: (settings: OfficeSettings) => void;
  onResetDemoData: () => void;
  onClearData: () => void;
}

export const SettingsManager: React.FC<SettingsManagerProps> = ({
  settings,
  onUpdateSettings,
  onResetDemoData,
  onClearData,
}) => {
  const t = makeT(settings.language);
  const lang = settings.language ?? 'ar';

  const [formData, setFormData] = useState<OfficeSettings>(settings);
  const [adminPinInput, setAdminPinInput] = useState<string>('');
  const [copiedSyncCode, setCopiedSyncCode] = useState<boolean>(false);
  const { showSuccess, showError } = useToast();
  const [confirmModalState, setConfirmModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => void | Promise<void>;
    isDanger?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: () => {},
  });

  const handleCopySyncCode = () => {
    const code = formData.networkSyncCode || '';
    navigator.clipboard.writeText(code);
    setCopiedSyncCode(true);
    showSuccess(t('syncCodeCopied'), 2000);
    setTimeout(() => setCopiedSyncCode(false), 2500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const officeNameResult = validateOfficeName(formData.officeName);
    if (!officeNameResult.isValid) {
      showError(validationMessage(officeNameResult.code, t));
      return;
    }
    const phoneResult = validatePhone(formData.phone || '');
    if (!phoneResult.isValid) {
      showError(validationMessage(phoneResult.code, t));
      return;
    }
    // عند إدخال PIN جديد فقط نستبدل القديم، وإلا نُبقي ما هو محفوظ (مشفّر)
    const finalData = { ...formData };
    if (adminPinInput.trim()) {
      finalData.adminPasswordPin = adminPinInput.trim();
    }
    onUpdateSettings(finalData);
    setAdminPinInput('');
    showSuccess(t('savedSuccessfully'));
  };

  const handleExportBackup = async () => {
    const jsonStr = await exportBackupJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `OfficeCash_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setConfirmModalState({
          isOpen: true,
          title: t('confirmRestoreTitle'),
          message: t('confirmRestoreMessage'),
          isDanger: true,
          action: async () => {
            const success = await importBackupJSON(content);
            if (success) {
              window.location.reload();
            } else {
              showError(t('alertRestoreFailed'));
            }
          },
        });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-slate-700" />
            <span>{t('settingsPageTitle')}</span>
          </h2>
          <p className="text-xs text-slate-500">
            {t('settingsPageSubtitle')}
          </p>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Settings Form (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Language & Appearance Preferences */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
              <Palette className="w-4 h-4 text-blue-600" />
              <span>{t('languageAppearance')}</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Theme Selection */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-2">{t('themeLabel')}</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...formData, theme: 'light' as const };
                      setFormData(updated);
                      onUpdateSettings(updated);
                    }}
                    className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold transition-all cursor-pointer ${
                      formData.theme !== 'dark'
                        ? 'bg-amber-500 text-slate-950 border-amber-400 ring-2 ring-amber-400/40 shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Sun className={`w-4 h-4 ${formData.theme !== 'dark' ? 'text-slate-950' : 'text-amber-500'}`} />
                    <span>{t('lightModeFull')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...formData, theme: 'dark' as const };
                      setFormData(updated);
                      onUpdateSettings(updated);
                    }}
                    className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold transition-all cursor-pointer ${
                      formData.theme === 'dark'
                        ? 'bg-blue-600 text-white border-blue-500 ring-2 ring-blue-500/50 shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Moon className={`w-4 h-4 ${formData.theme === 'dark' ? 'text-blue-200' : 'text-blue-400'}`} />
                    <span>{t('darkModeFull')}</span>
                  </button>
                </div>
              </div>

              {/* Language Selection */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-2">{t('interfaceLanguage')}</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...formData, language: 'ar' as const };
                      setFormData(updated);
                      onUpdateSettings(updated);
                    }}
                    className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold transition-all cursor-pointer ${
                      formData.language !== 'en'
                        ? 'bg-blue-600 text-white border-blue-500 ring-2 ring-blue-500/40 shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Globe className="w-4 h-4 text-blue-200" />
                    <span>{t('arabic')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...formData, language: 'en' as const };
                      setFormData(updated);
                      onUpdateSettings(updated);
                    }}
                    className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold transition-all cursor-pointer ${
                      formData.language === 'en'
                        ? 'bg-blue-600 text-white border-blue-500 ring-2 ring-blue-500/40 shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Globe className="w-4 h-4 text-blue-200" />
                    <span>{t('english')}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Office Information Form */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
              {t('officeInfoTitle')}
            </h3>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('officeNameLabel')}</label>
              <input
                type="text"
                required
                value={formData.officeName}
                onChange={(e) => setFormData({ ...formData, officeName: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-bold text-slate-900"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('licenseNumberLabel')}</label>
                <input
                  type="text"
                  value={formData.licenseNumber}
                  onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('taxNumberLabel')}</label>
                <input
                  type="text"
                  value={formData.taxNumber || ''}
                  onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('phoneLabel')}</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 dir-ltr text-right"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('currencyCodeLabel')}</label>
                <input
                  type="text"
                  required
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('addressLabel')}</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('adminPinLabel')}</label>
                <input
                  type="password"
                  autoComplete="off"
                  value={adminPinInput}
                  onChange={(e) => setAdminPinInput(e.target.value)}
                  placeholder={formData.adminPasswordPin ? t('adminPinChangePlaceholder') : t('adminPinNotSetPlaceholder')}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold text-blue-700 dir-ltr text-right"
                />
                <span className="text-xs text-slate-400">{t('adminPinHint')}</span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('syncTokenLabel')}</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold text-slate-800 dir-ltr text-right truncate select-all">
                    {formData.networkSyncCode || '—'}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopySyncCode}
                    disabled={!formData.networkSyncCode}
                    title={t('copySyncCodeBtn')}
                    className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer disabled:opacity-40 ${
                      copiedSyncCode
                        ? 'bg-emerald-100 text-emerald-600'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-xs text-slate-400">{t('syncTokenHint')}</span>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={formData.soundEffects}
                  onChange={(e) => setFormData({ ...formData, soundEffects: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span>{t('soundEffectsLabel')}</span>
              </label>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={formData.autoLockClosedDays}
                  onChange={(e) => setFormData({ ...formData, autoLockClosedDays: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <span>{t('autoLockClosedDaysLabel')}</span>
              </label>
            </div>
            <span className="text-xs text-slate-400 -mt-2">{t('autoLockClosedDaysHint')}</span>

            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              {t('saveSettingsBtn')}
            </button>
          </form>
        </div>
      </div>

        {/* Backup & System Maintenance Panel (1 Col) */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-5">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
            {t('backupDataTitle')}
          </h3>

          <div className="space-y-3">
            <button
              onClick={handleExportBackup}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>{t('exportBackupBtn')}</span>
            </button>

            <label className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border border-slate-200">
              <Upload className="w-4 h-4 text-blue-600" />
              <span>{t('importBackupBtn')}</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
              />
            </label>
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-3">
            <h4 className="text-xs font-bold text-slate-700">{t('resetDataTitle')}</h4>

            <button
              onClick={() => {
                setConfirmModalState({
                  isOpen: true,
                  title: t('confirmResetDemoTitle'),
                  message: t('confirmResetDemoMessage'),
                  action: onResetDemoData,
                });
              }}
              className="w-full bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 text-amber-600" />
              <span>{t('resetDemoBtn')}</span>
            </button>

            <button
              onClick={() => {
                setConfirmModalState({
                  isOpen: true,
                  title: t('confirmClearTitle'),
                  message: t('confirmClearMessage'),
                  isDanger: true,
                  action: onClearData,
                });
              }}
              className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>{t('clearAllBtn')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModalState.isOpen}
        title={confirmModalState.title}
        message={confirmModalState.message}
        isDanger={confirmModalState.isDanger}
        language={lang}
        onConfirm={confirmModalState.action}
        onClose={() => setConfirmModalState((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};