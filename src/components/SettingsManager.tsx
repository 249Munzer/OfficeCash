/**
 * إعدادات المكتب — معلومات المكتب، تغيير PIN المدير، أسئلة الأمان،
 * النسخ الاحتياطي (تصدير/استيراد)، منطقة الخطر (مسح البيانات/حذف المكتب)، والخروج.
 * @component
 * @param {Object} props
 * @param {OfficeSettings} props.settings - الإعدادات الحالية للمكتب
 * @param {Function} props.onUpdateSettings - تحديث الإعدادات
 * @param {Function} props.onLogout - خروج إلى الصفحة الرئيسية (اختياري)
 * @param {Function} props.onClearData - مسح جميع البيانات
 * @param {Function} props.onDeleteOffice - حذف المكتب نهائياً
 */
import React, { useState } from 'react';
import {
  Settings,
  Download,
  Upload,
  Trash2,
  Sun,
  Moon,
  Globe,
  Palette,
  Copy,
  Building2,
  PencilLine,
  X,
  ShieldAlert,
  FileText,
  Scale,
  LogOut,
  ShieldQuestion,
  Plus,
} from 'lucide-react';
import { OfficeSettings } from '../types';
import { exportBackupJSON, importBackupJSON } from '../lib/electron-storage';
import { makeT, validationMessage } from '../lib/i18n';
import { validateOfficeName, validatePhone } from '../lib/validation';
import {
  SECURITY_QUESTIONS,
  getSecurityQuestion,
  validateSecurityQuestionSet,
  hashAnswer,
  MIN_SECURITY_QUESTIONS,
  MAX_SECURITY_QUESTIONS,
} from '../lib/auth/securityQuestions';
import { ConfirmModal } from './ConfirmModal';
import { DangerZoneModal, DangerZoneMode } from './DangerZoneModal';
import { LegalModal, LegalDocType } from './LegalModal';
import { useToast } from './Toast';

interface SettingsManagerProps {
  settings: OfficeSettings;
  onUpdateSettings: (settings: OfficeSettings) => void;
  onLogout?: () => void;
  onClearData: () => void;
  onDeleteOffice: () => void;
}

export const SettingsManager: React.FC<SettingsManagerProps> = ({
  settings,
  onUpdateSettings,
  onLogout,
  onClearData,
  onDeleteOffice,
}) => {
  const t = makeT(settings.language);
  const lang = settings.language ?? 'ar';

  const [formData, setFormData] = useState<OfficeSettings>(settings);
  const [adminPinInput, setAdminPinInput] = useState<string>('');
  const [copiedSyncCode, setCopiedSyncCode] = useState<boolean>(false);
  const [editingInfo, setEditingInfo] = useState<boolean>(false);
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
  const [dangerModal, setDangerModal] = useState<{
    isOpen: boolean;
    mode: DangerZoneMode;
  }>({
    isOpen: false,
    mode: 'clear-data',
  });
  const [legalModal, setLegalModal] = useState<{
    isOpen: boolean;
    docType: LegalDocType;
  }>({
    isOpen: false,
    docType: 'privacy',
  });

  // أسئلة الأمان — إدارتها من الإعدادات (عرض/تعديل/إضافة/حذف)
  const [editingSecurity, setEditingSecurity] = useState<boolean>(false);
  const [securityRows, setSecurityRows] = useState<Array<{ questionId: string; answer: string }>>(() =>
    (settings.securityQuestions || []).map((sq) => ({ questionId: sq.questionId, answer: '' }))
  );
  const [securityErrors, setSecurityErrors] = useState<Record<string, string>>({});

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
    setEditingInfo(false);
    showSuccess(t('savedSuccessfully'));
  };

  const handleCancelEdit = () => {
    setFormData(settings);
    setAdminPinInput('');
    setEditingInfo(false);
  };

  const savedSecurityQuestions = (settings.securityQuestions || []).map((sq) => {
    const def = getSecurityQuestion(sq.questionId);
    return { questionId: sq.questionId, label: def ? (lang === 'en' ? def.en : def.ar) : sq.questionId };
  });

  const usedSecurityIds = new Set(securityRows.map((row) => row.questionId).filter((id) => id));

  const startSecurityEdit = () => {
    const existing = (settings.securityQuestions || []).map((sq) => ({
      questionId: sq.questionId,
      answer: '',
    }));
    const base =
      existing.length > 0
        ? existing
        : [
            { questionId: '', answer: '' },
            { questionId: '', answer: '' },
          ];
    setSecurityRows(base);
    setSecurityErrors({});
    setEditingSecurity(true);
  };

  const addSecurityRow = () => {
    if (securityRows.length >= MAX_SECURITY_QUESTIONS) return;
    setSecurityRows((prev) => [...prev, { questionId: '', answer: '' }]);
    setSecurityErrors({});
  };

  const removeSecurityRow = (index: number) => {
    if (securityRows.length <= MIN_SECURITY_QUESTIONS) return;
    setSecurityRows((prev) => prev.filter((_, i) => i !== index));
    setSecurityErrors({});
  };

  const securityRowError = (index: number, field: 'questionId' | 'answer'): string | null => {
    const code = securityErrors[`question.${index}.${field}`];
    if (!code) return null;
    if (field === 'questionId') {
      return code === 'taken' ? t('regErrSecurityDuplicate') : t('regErrSecurityQuestionRequired');
    }
    return t('regErrSecurityAnswerRequired');
  };

  const handleSaveSecurityQuestions = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateSecurityQuestionSet(securityRows);
    if (Object.keys(validation).length > 0) {
      setSecurityErrors(validation);
      return;
    }
    setSecurityErrors({});
    try {
      const hashed = await Promise.all(
        securityRows.map(async (row) => ({
          questionId: row.questionId,
          answerHash: await hashAnswer(row.answer),
        }))
      );
      const updated = { ...formData, securityQuestions: hashed };
      setFormData(updated);
      onUpdateSettings(updated);
      setEditingSecurity(false);
      showSuccess(t('savedSuccessfully'));
    } catch {
      showError(t('regErrStorage'));
    }
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

  const identityRows: { label: string; value: string }[] = [
    { label: t('licenseNumberLabel'), value: settings.licenseNumber },
    { label: t('taxNumberLabel'), value: settings.taxNumber || t('notSelected') },
    { label: t('phoneLabel'), value: settings.phone || '—' },
    { label: t('addressLabel'), value: settings.address || '—' },
  ];

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

          {/* Office Identity */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span>{t('officeInfoTitle')}</span>
              </span>

              {!editingInfo && (
                <button
                  type="button"
                  onClick={() => setEditingInfo(true)}
                  className="flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full transition-colors cursor-pointer"
                >
                  <PencilLine className="w-3.5 h-3.5" />
                  {t('editInfoBtn')}
                </button>
              )}
            </h3>

            {!editingInfo ? (
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between gap-3 py-2 px-3 bg-slate-50 rounded-xl">
                  <span className="font-bold text-slate-500">{t('officeNameLabel')}</span>
                  <span className="font-black text-slate-900 text-sm">{settings.officeName}</span>
                </div>
                {identityRows.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between gap-3 py-2 px-3 bg-slate-50 rounded-xl"
                  >
                    <span className="font-bold text-slate-500">{row.label}</span>
                    <span className="font-bold text-slate-800 dir-ltr text-right">{row.value}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between gap-3 py-2 px-3 bg-blue-50 border border-blue-100 rounded-xl">
                  <span className="font-bold text-blue-700">{t('currencyCodeLabel')}</span>
                  <span className="font-black text-blue-800 text-sm dir-ltr">{settings.currency}</span>
                </div>
                <div className="flex items-center justify-between gap-3 py-2 px-3 bg-slate-50 rounded-xl">
                  <span className="font-bold text-slate-500">{t('syncTokenLabel')}</span>
                  <span className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-800 dir-ltr text-right truncate max-w-[180px]">
                      {settings.networkSyncCode || '—'}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopySyncCode}
                      disabled={!settings.networkSyncCode}
                      title={t('copySyncCodeBtn')}
                      className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer disabled:opacity-40 ${
                        copiedSyncCode
                          ? 'bg-emerald-100 text-emerald-600'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                      }`}
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </span>
                </div>
              </div>
            ) : (
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

                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    {t('saveSettingsBtn')}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-5 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <X className="w-4 h-4" />
                    {t('cancel')}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Security Questions */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <ShieldQuestion className="w-4 h-4 text-blue-600" />
                <span>{t('settingsSecurityTitle')}</span>
              </span>

              {!editingSecurity && (
                <button
                  type="button"
                  onClick={startSecurityEdit}
                  className="flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full transition-colors cursor-pointer"
                >
                  <PencilLine className="w-3.5 h-3.5" />
                  {t('settingsSecurityManageBtn')}
                </button>
              )}
            </h3>

            <p className="text-xs text-slate-500">{t('settingsSecurityDesc')}</p>

            {!editingSecurity ? (
              savedSecurityQuestions.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-slate-200 rounded-2xl space-y-1.5">
                  <ShieldQuestion className="w-7 h-7 mx-auto text-slate-300" />
                  <p className="text-xs font-bold text-slate-500">{t('settingsSecurityNone')}</p>
                  <p className="text-[11px] text-slate-400">{t('settingsSecurityNoneHint')}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {savedSecurityQuestions.map((q, i) => (
                    <div key={q.questionId} className="flex items-center gap-3 py-2.5 px-3 bg-slate-50 rounded-xl text-xs">
                      <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-extrabold shrink-0">
                        {i + 1}
                      </span>
                      <span className="font-bold text-slate-800">{q.label}</span>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <form onSubmit={handleSaveSecurityQuestions} className="space-y-4">
                <div className="space-y-3">
                  {securityRows.map((row, index) => (
                    <div key={index} className="space-y-2 bg-slate-50 border border-slate-200 rounded-xl p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-slate-500">
                          {t('regSecurityQuestionLabel', { count: index + 1 })}
                        </span>
                        {securityRows.length > MIN_SECURITY_QUESTIONS && (
                          <button
                            type="button"
                            onClick={() => removeSecurityRow(index)}
                            className="w-6 h-6 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 flex items-center justify-center transition-colors cursor-pointer"
                            title={t('regSecurityRemoveBtn')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <select
                        value={row.questionId}
                        onChange={(e) => {
                          const next = [...securityRows];
                          next[index] = { ...next[index], questionId: e.target.value };
                          setSecurityRows(next);
                          setSecurityErrors({});
                        }}
                        className="w-full bg-white border border-slate-300 text-slate-900 dark:bg-slate-950 dark:border-slate-800 dark:text-white rounded-xl px-3 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      >
                        <option value="">{t('regSecuritySelectPlaceholder')}</option>
                        {SECURITY_QUESTIONS.map((sq) => (
                          <option
                            key={sq.id}
                            value={sq.id}
                            disabled={usedSecurityIds.has(sq.id) && sq.id !== row.questionId}
                          >
                            {lang === 'en' ? sq.en : sq.ar}
                          </option>
                        ))}
                      </select>
                      {securityRowError(index, 'questionId') && (
                        <span className="text-xs text-rose-600 dark:text-rose-400 block mt-1">
                          {securityRowError(index, 'questionId')}
                        </span>
                      )}

                      <input
                        type="text"
                        value={row.answer}
                        onChange={(e) => {
                          const next = [...securityRows];
                          next[index] = { ...next[index], answer: e.target.value };
                          setSecurityRows(next);
                          setSecurityErrors({});
                        }}
                        placeholder={t('settingsSecurityAnswerReenter')}
                        className="w-full bg-white border border-slate-300 text-slate-900 dark:bg-slate-950 dark:border-slate-800 dark:text-white rounded-xl px-3 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {securityRowError(index, 'answer') && (
                        <span className="text-xs text-rose-600 dark:text-rose-400 block mt-1">
                          {securityRowError(index, 'answer')}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {securityErrors.count === 'min' && (
                  <span className="text-xs text-rose-600 dark:text-rose-400 block mt-1">
                    {t('regErrSecurityMin')}
                  </span>
                )}

                {securityRows.length < MAX_SECURITY_QUESTIONS && (
                  <button
                    type="button"
                    onClick={addSecurityRow}
                    className="w-full py-2.5 border border-dashed border-blue-300 text-blue-600 dark:border-blue-700 dark:text-blue-400 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    {t('regSecurityAddBtn')}
                  </button>
                )}

                <p className="text-xs text-slate-400">{t('settingsSecurityReenterHint')}</p>

                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    {t('saveSettingsBtn')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSecurity(false);
                      setSecurityErrors({});
                    }}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-5 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <X className="w-4 h-4" />
                    {t('cancel')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* System Panel (1 Col) */}
        <div className="space-y-6">
          {/* Backup & Maintenance */}
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
          </div>

          {/* Legal Documents */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
              <Scale className="w-4 h-4 text-blue-600" />
              <span>{t('legalTitle')}</span>
            </h3>

            <button
              onClick={() => setLegalModal({ isOpen: true, docType: 'privacy' })}
              className="w-full bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <FileText className="w-4 h-4 text-blue-600" />
              <span>{t('privacyPolicyBtn')}</span>
            </button>

            <button
              onClick={() => setLegalModal({ isOpen: true, docType: 'terms' })}
              className="w-full bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <FileText className="w-4 h-4 text-slate-600" />
              <span>{t('termsOfServiceBtn')}</span>
            </button>
          </div>

          {/* Danger Zone */}
          <div className="oc-danger-zone bg-red-600 rounded-2xl p-6 border border-red-700 shadow-md shadow-red-200/60 space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-white/20 pb-2 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-white" />
              <span>{t('dangerZoneTitle')}</span>
            </h3>

            <button
              onClick={() => setDangerModal({ isOpen: true, mode: 'clear-data' })}
              className="w-full bg-white/15 hover:bg-white/25 text-white border border-white/30 font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Trash2 className="w-4 h-4 text-white" />
              <span>{t('dangerDeleteDataBtn')}</span>
            </button>

            <button
              onClick={() => setDangerModal({ isOpen: true, mode: 'delete-office' })}
              className="w-full bg-red-950/50 hover:bg-red-950/70 text-white border border-white/20 font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
            >
              <Trash2 className="w-4 h-4 text-rose-200" />
              <span>{t('dangerDeleteOfficeBtn')}</span>
            </button>
          </div>

          {/* Logout (Safe Exit — below Danger Zone) */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
              <LogOut className="w-4 h-4 text-blue-600" />
              <span>{t('logoutTitle')}</span>
            </h3>
            <p className="text-xs text-slate-500">{t('logoutDesc')}</p>
            <button
              onClick={onLogout}
              disabled={!onLogout}
              className="w-full bg-slate-900 hover:bg-slate-700 text-white border border-slate-900 font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <LogOut className="w-4 h-4 text-white" />
              <span>{t('logout')}</span>
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

      {/* Danger Zone Modal */}
      <DangerZoneModal
        isOpen={dangerModal.isOpen}
        mode={dangerModal.mode}
        officeName={settings.officeName}
        language={lang}
        onClose={() => setDangerModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={() => {
          if (dangerModal.mode === 'delete-office') {
            onDeleteOffice();
          } else {
            onClearData();
          }
        }}
      />

      {/* Legal Modal */}
      <LegalModal
        isOpen={legalModal.isOpen}
        docType={legalModal.docType}
        language={lang}
        onClose={() => setLegalModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
