/**
 * إدارة الكادر — إضافة/تعديل/حذف حسابات الموظفين، تعيين PIN لكل موظف،
 * تحديد طريقة الاستحقاق (نسبة/راتب/كلاهما) والدورة، وعرض عقود الاستحقاق.
 * @component
 * @param {Object} props
 * @param {Employee[]} props.employees - قائمة الموظفين
 * @param {FinancialEntry[]} props.entries - سجل المعاملات لحساب الاستحقاقات
 * @param {OfficeSettings} props.settings - اللغة والعملة
 * @param {Function} props.onAddEmployee - إضافة موظف
 * @param {Function} props.onUpdateEmployee - تعديل موظف
 * @param {Function} props.onDeleteEmployee - حذف موظف
 */
import React, { useState } from 'react';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  X,
  Percent,
  Wallet,
} from 'lucide-react';
import { Employee, FinancialEntry, OfficeSettings, CompensationMode, PayCycle, EmployeeContract } from '../types';
import { formatCurrency, getTodayDateString } from '../lib/formatters';
import { makeT, validationMessage, TranslationKey } from '../lib/i18n';
import { validateName, validateUsername, validatePin } from '../lib/validation';
import { ConfirmModal } from './ConfirmModal';
import { useToast } from './Toast';

type TFn = (key: TranslationKey, vars?: Record<string, string | number>) => string;

interface CompensationFieldsProps {
  t: TFn;
  mode: CompensationMode;
  onMode: (mode: CompensationMode) => void;
  ratePct: string;
  onRatePct: (value: string) => void;
  salaryStr: string;
  onSalaryStr: (value: string) => void;
  cycle: PayCycle;
  onCycle: (cycle: PayCycle) => void;
}

const compModeOptions: { value: CompensationMode; labelKey: TranslationKey }[] = [
  { value: 'percentage', labelKey: 'compModePercentage' },
  { value: 'salary', labelKey: 'compModeSalary' },
  { value: 'percentage_and_salary', labelKey: 'compModeBoth' },
];

function CompensationFields({
  t,
  mode,
  onMode,
  ratePct,
  onRatePct,
  salaryStr,
  onSalaryStr,
  cycle,
  onCycle,
}: CompensationFieldsProps) {
  return (
    <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3 space-y-3 dark:bg-blue-950/80 dark:border-blue-900">
      <div>
        <label className="block font-bold text-slate-700 mb-2 flex items-center gap-1.5">
          <Wallet className="w-3.5 h-3.5 text-blue-600" />
          <span>{t('compensationMethodLabel')}</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {compModeOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onMode(opt.value)}
              className={`px-2 py-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                mode === opt.value
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-blue-50'
              }`}
            >
              {t(opt.labelKey)}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">{t('compMethodHint')}</p>
      </div>

      {mode !== 'salary' && (
        <div>
          <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
            <Percent className="w-3.5 h-3.5 text-blue-600" />
            <span>{t('commissionPercentLabel')}</span>
          </label>
          <input
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={ratePct}
            onChange={(e) => onRatePct(e.target.value)}
            className="w-full border border-slate-200 rounded-xl p-2.5 font-mono font-bold text-blue-700 dir-ltr text-right"
          />
        </div>
      )}

      {mode !== 'percentage' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-bold text-slate-700 mb-1">{t('salaryAmountLabel')}</label>
            <input
              type="number"
              min={0}
              step={0.25}
              value={salaryStr}
              onChange={(e) => onSalaryStr(e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-2.5 font-mono font-bold text-slate-800 dir-ltr text-right"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">{t('salaryCycleLabel')}</label>
            <select
              value={cycle}
              onChange={(e) => onCycle(e.target.value as PayCycle)}
              className="w-full border border-slate-200 rounded-xl p-2.5 font-bold text-slate-800"
            >
              <option value="daily">{t('salaryCycleDaily')}</option>
              <option value="weekly">{t('salaryCycleWeekly')}</option>
              <option value="monthly">{t('salaryCycleMonthly')}</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

interface EmployeesManagerProps {
  employees: Employee[];
  entries: FinancialEntry[];
  settings: OfficeSettings;
  onAddEmployee: (employee: Omit<Employee, 'id' | 'createdAt'>) => void;
  onUpdateEmployee: (employee: Employee) => void;
  onDeleteEmployee: (id: string) => void;
}

export const EmployeesManager: React.FC<EmployeesManagerProps> = ({
  employees,
  entries,
  settings,
  onAddEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
}) => {
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deletingEmployee, setDeletingEmployee] = useState<{ id: string; name: string } | null>(null);

  const [name, setName] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [passwordPin, setPasswordPin] = useState<string>('');
  const [color, setColor] = useState<string>('#2563eb');
  const [notes, setNotes] = useState<string>('');
  const [compMode, setCompMode] = useState<CompensationMode>('percentage');
  const [commissionRate, setCommissionRate] = useState<string>('25');
  const [salaryAmount, setSalaryAmount] = useState<string>('');
  const [salaryCycle, setSalaryCycle] = useState<PayCycle>('monthly');
  const [editPinInput, setEditPinInput] = useState<string>('');

  const today = getTodayDateString();

  const t = makeT(settings.language);
  const lang = settings.language ?? 'ar';
  const { showError } = useToast();

  const buildContract = (
    mode: CompensationMode,
    ratePct: string,
    salaryStr: string,
    cycle: PayCycle
  ): EmployeeContract => {    const rate = parseFloat(ratePct) || 0;
    const salary = parseFloat(salaryStr) || 0;
    if (mode === 'salary') {
      return { mode, salaryAmount: salary, salaryCycle: cycle };
    }
    if (mode === 'percentage') {
      return { mode, commissionRate: rate / 100 };
    }
    return { mode, commissionRate: rate / 100, salaryAmount: salary, salaryCycle: cycle };
  };

  const patchContract = (patch: Partial<EmployeeContract>) => {
    setEditingEmployee((prev) =>
      prev
        ? {
            ...prev,
            contract: {
              mode: prev.contract?.mode ?? 'percentage',
              ...prev.contract,
              ...patch,
            },
          }
        : prev
    );
  };

  const validateCompensation = (
    mode: CompensationMode,
    ratePct: string,
    salaryStr: string
  ): boolean => {
    if (mode !== 'salary') {
      const rate = parseFloat(ratePct);
      if (isNaN(rate) || rate <= 0) {
        showError(ratePct.trim() ? t('valErrNaN') : t('valErrRequired'));
        return false;
      }
    }
    if (mode !== 'percentage') {
      const salary = parseFloat(salaryStr);
      if (isNaN(salary) || salary <= 0) {
        showError(salaryStr.trim() ? t('valErrNaN') : t('valErrRequired'));
        return false;
      }
    }
    return true;
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nameResult = validateName(name);
    if (!nameResult.isValid) {
      showError(validationMessage(nameResult.code, t));
      return;
    }
    if (username.trim()) {
      const userResult = validateUsername(username.trim().toLowerCase());
      if (!userResult.isValid) {
        showError(validationMessage(userResult.code, t));
        return;
      }
    }
    if (passwordPin.trim()) {
      const pinResult = validatePin(passwordPin.trim());
      if (!pinResult.isValid) {
        showError(validationMessage(pinResult.code, t));
        return;
      }
    }
    if (!validateCompensation(compMode, commissionRate, salaryAmount)) {
      return;
    }

    onAddEmployee({
      name: name.trim(),
      username: username.trim().toLowerCase() || name.trim().split(' ')[0].toLowerCase(),
      passwordPin: passwordPin.trim(),
      color,
      isActive: true,
      notes: notes.trim() || undefined,
      contract: buildContract(compMode, commissionRate, salaryAmount, salaryCycle),
    });

    setName('');
    setUsername('');
    setPasswordPin('');
    setNotes('');
    setCompMode('percentage');
    setCommissionRate('25');
    setSalaryAmount('');
    setSalaryCycle('monthly');
    setShowAddModal(false);
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;
    const nameResult = validateName(editingEmployee.name);
    if (!nameResult.isValid) {
      showError(validationMessage(nameResult.code, t));
      return;
    }
    if (editingEmployee.username.trim()) {
      const userResult = validateUsername(editingEmployee.username.trim().toLowerCase());
      if (!userResult.isValid) {
        showError(validationMessage(userResult.code, t));
        return;
      }
    }
    if (editPinInput.trim()) {
      const pinResult = validatePin(editPinInput.trim());
      if (!pinResult.isValid) {
        showError(validationMessage(pinResult.code, t));
        return;
      }
    }

    const contractMode = editingEmployee.contract?.mode ?? 'percentage';
    const ratePct = String((editingEmployee.contract?.commissionRate ?? 0.25) * 100);
    const salaryStr = String(editingEmployee.contract?.salaryAmount ?? '');
    const cycle = editingEmployee.contract?.salaryCycle ?? 'monthly';

    if (!validateCompensation(contractMode, ratePct, salaryStr)) {
      return;
    }

    onUpdateEmployee({
      ...editingEmployee,
      passwordPin: editPinInput.trim() || editingEmployee.passwordPin,
      contract: buildContract(contractMode, ratePct, salaryStr, cycle),
    });
    setEditingEmployee(null);
    setEditPinInput('');
  };

  const colorsList = [
    '#2563eb', // Blue
    '#16a34a', // Green
    '#d97706', // Amber
    '#dc2626', // Red
    '#e11d48', // Rose
    '#0284c7', // Sky
    '#059669', // Emerald
    '#64748b', // Slate
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <span>{t('empPageTitle')}</span>
          </h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            {t('empPageSubtitle')}
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-full text-xs font-bold shadow-md shadow-blue-100 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>{t('addEmployeeBtn')}</span>
        </button>
      </div>

      {/* Employee Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {employees.map((emp) => {
          const empEntriesToday = entries.filter(
            (e) => e.employeeId === emp.id && e.date === today
          );
          const empTotalRevenueToday = empEntriesToday.reduce(
            (sum, e) => sum + e.amount,
            0
          );

          const empTotalEntries = entries.filter((e) => e.employeeId === emp.id);
          const empAllTimeRevenue = empTotalEntries.reduce(
            (sum, e) => sum + e.amount,
            0
          );

          return (
            <div
              key={emp.id}
              className={`bg-white rounded-3xl p-5 border shadow-sm transition-all flex flex-col justify-between ${
                emp.isActive
                  ? 'border-slate-100 hover:shadow-md'
                  : 'border-slate-100 opacity-60 bg-slate-50/50'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-4 h-4 rounded-full shadow-inner shrink-0"
                      style={{ backgroundColor: emp.color }}
                    ></span>
                    <h3 className="text-sm font-bold text-slate-900">{emp.name}</h3>
                  </div>

                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                      emp.isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {emp.isActive ? t('statusActive') : t('statusInactive')}
                  </span>
                </div>

                {/* Username & PIN info */}
                <div className="bg-slate-50 p-2.5 rounded-2xl mb-3 space-y-1 text-xs border border-slate-100">
                  <div className="flex items-center justify-between text-slate-500 font-mono">
                    <span className="text-xs text-slate-400 font-sans">{t('usernameColon')}</span>
                    <span className="font-bold text-slate-800 dir-ltr">@{emp.username}</span>
                  </div>
                </div>

                {emp.notes && (
                  <p className="text-xs text-slate-400 mb-3 line-clamp-2">
                    {emp.notes}
                  </p>
                )}

                {/* Stats */}
                <div className="space-y-2 py-3 border-y border-slate-100 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">{t('todayIncomeLabel')}</span>
                    <strong className="text-slate-900 font-black dir-ltr">
                      {formatCurrency(empTotalRevenueToday, settings.currency, lang)}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">{t('todayEntriesLabel')}</span>
                    <strong className="text-blue-600 font-bold">{empEntriesToday.length}</strong>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{t('totalRevenueLabel')}</span>
                    <span className="dir-ltr font-bold text-slate-700">{formatCurrency(empAllTimeRevenue, settings.currency, lang)}</span>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="pt-3 flex items-center justify-between gap-2 text-xs">
                <button
                  onClick={() =>
                    onUpdateEmployee({ ...emp, isActive: !emp.isActive })
                  }
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    emp.isActive
                      ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                  }`}
                >
                  {emp.isActive ? t('disableBtn') : t('activateBtn')}
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditingEmployee(emp);
                      setEditPinInput('');
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 cursor-pointer transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => setDeletingEmployee({ id: emp.id, name: emp.name })}
                    className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingEmployee}
        title={t('confirmDeleteEmpTitle')}
        message={t('confirmDeleteEmpMessage', { name: deletingEmployee?.name ?? '' })}
        language={lang}
        onConfirm={() => {
          if (deletingEmployee) {
            onDeleteEmployee(deletingEmployee.id);
          }
        }}
        onClose={() => setDeletingEmployee(null)}
      />

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900">{t('addEmpTitle')}</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('fullNameLabel')}</label>
                <input
                  type="text"
                  required
                  placeholder={t('fullNamePlaceholder')}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!username) {
                      const autoUser = e.target.value.trim().split(' ')[0].toLowerCase();
                      setUsername(autoUser);
                    }
                  }}
                  className="w-full border border-slate-200 rounded-xl p-2.5 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('usernameNetworkLabel')}</label>
                  <input
                    type="text"
                    required
                    placeholder={t('usernameNetworkLabel')}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 font-mono text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('pinPasswordLabel')}</label>
                  <input
                    type="text"
                    placeholder={t('empPinPlaceholder')}
                    value={passwordPin}
                    onChange={(e) => setPasswordPin(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 font-mono font-bold text-blue-600"
                  />
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{t('pinOptionalHint')}</p>
                </div>
              </div>

              <CompensationFields
                t={t as TFn}
                mode={compMode}
                onMode={setCompMode}
                ratePct={commissionRate}
                onRatePct={setCommissionRate}
                salaryStr={salaryAmount}
                onSalaryStr={setSalaryAmount}
                cycle={salaryCycle}
                onCycle={setSalaryCycle}
              />

              <div>
                <label className="block font-bold text-slate-700 mb-2">{t('empColorLabel')}</label>
                <div className="flex items-center gap-2">
                  {colorsList.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer ${
                        color === c ? 'scale-110 border-slate-900 shadow-md' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    ></button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('notesDepartmentLabel')}</label>
                <input
                  type="text"
                  placeholder={t('notesPlaceholder')}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border rounded-xl font-bold"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 text-white font-bold rounded-xl shadow-xs"
                >
                  {t('saveEmployeeBtn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {editingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900">{t('editEmpTitle')}</h3>
              <button
                onClick={() => {
                  setEditingEmployee(null);
                  setEditPinInput('');
                }}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('employeeNameLabel')}</label>
                <input
                  type="text"
                  required
                  value={editingEmployee.name}
                  onChange={(e) =>
                    setEditingEmployee({ ...editingEmployee, name: e.target.value })
                  }
                  className="w-full border border-slate-200 rounded-xl p-2.5 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('usernameLoginLabel')}</label>
                  <input
                    type="text"
                    required
                    value={editingEmployee.username}
                    onChange={(e) =>
                      setEditingEmployee({ ...editingEmployee, username: e.target.value })
                    }
                    className="w-full border border-slate-200 rounded-xl p-2.5 font-mono text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('changePinLabel')}</label>
                  <input
                    type="text"
                    placeholder={t('adminPinChangePlaceholder')}
                    value={editPinInput}
                    onChange={(e) => setEditPinInput(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 font-mono font-bold text-blue-600"
                  />
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{t('pinOptionalHint')}</p>
                </div>
              </div>

              <CompensationFields
                t={t as TFn}
                mode={editingEmployee.contract?.mode ?? 'percentage'}
                onMode={(m) => patchContract({ mode: m })}
                ratePct={String((editingEmployee.contract?.commissionRate ?? 0.25) * 100)}
                onRatePct={(v) => patchContract({ commissionRate: (parseFloat(v) || 0) / 100 })}
                salaryStr={String(editingEmployee.contract?.salaryAmount ?? '')}
                onSalaryStr={(v) => patchContract({ salaryAmount: parseFloat(v) || 0 })}
                cycle={editingEmployee.contract?.salaryCycle ?? 'monthly'}
                onCycle={(c) => patchContract({ salaryCycle: c })}
              />

              <div>
                <label className="block font-bold text-slate-700 mb-2">{t('colorShortLabel')}</label>
                <div className="flex items-center gap-2">
                  {colorsList.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditingEmployee({ ...editingEmployee, color: c })}
                      className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer ${
                        editingEmployee.color === c ? 'scale-110 border-slate-900 shadow-md' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    ></button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('notesLabel')}</label>
                <input
                  type="text"
                  value={editingEmployee.notes || ''}
                  onChange={(e) =>
                    setEditingEmployee({ ...editingEmployee, notes: e.target.value })
                  }
                  className="w-full border border-slate-200 rounded-xl p-2.5"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setEditingEmployee(null);
                    setEditPinInput('');
                  }}
                  className="px-4 py-2 border rounded-xl font-bold"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 text-white font-bold rounded-xl shadow-xs"
                >
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
