import React, { useState, useEffect, useRef } from 'react';
import {
  PlusCircle,
  X,
  Banknote,
  CreditCard,
  Building,
  Zap,
  Tag,
  User,
  DollarSign,
  FileText,
  Lock,
} from 'lucide-react';
import { Employee, Service, PaymentMethod, OfficeSettings } from '../types';
import { formatCurrency } from '../lib/formatters';
import { makeT, validationMessage } from '../lib/i18n';
import { validateAmount } from '../lib/validation';
import { playSuccessSound } from '../lib/audio';
import { motion, AnimatePresence } from 'motion/react';
import { useToast } from './Toast';

interface FastEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  services: Service[];
  settings: OfficeSettings;
  isTodayClosed: boolean;
  onAddEntry: (entry: {
    employeeId: string;
    employeeName: string;
    serviceId: string;
    serviceName: string;
    amount: number;
    paymentMethod: PaymentMethod;
    statement?: string;
    notes?: string;
  }) => void;
}

export const FastEntryModal: React.FC<FastEntryModalProps> = ({
  isOpen,
  onClose,
  employees,
  services,
  settings,
  isTodayClosed,
  onAddEntry,
}) => {
  const activeEmployees = employees.filter((e) => e.isActive);
  const activeServices = services.filter((s) => s.isActive);
  const t = makeT(settings.language);
  const lang = settings.language ?? 'ar';

  // قفل الإدخال عند إغلاق اليوم إذا كان الإعداد مفعّلاً
  const isDayLocked = isTodayClosed && settings.autoLockClosedDays !== false;

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [statement, setStatement] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const { showSuccess, showError } = useToast();

  const serviceRef = useRef<HTMLSelectElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (isOpen) {
      if (activeEmployees.length > 0 && !selectedEmployeeId) {
        setSelectedEmployeeId(activeEmployees[0].id);
      }
      if (activeServices.length > 0 && !selectedServiceId) {
        const firstService = activeServices[0];
        setSelectedServiceId(firstService.id);
        setAmount(String(firstService.defaultPrice));
      }
      // Focus amount or service
      setTimeout(() => {
        amountRef.current?.focus();
        amountRef.current?.select();
      }, 100);
    }
  }, [isOpen]);

  // Handle service change to update default price
  const handleServiceChange = (serviceId: string) => {
    setSelectedServiceId(serviceId);
    const service = activeServices.find((s) => s.id === serviceId);
    if (service) {
      setAmount(String(service.defaultPrice));
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (isDayLocked) {
      showError(t('feDayClosedMessage'));
      return;
    }

    const emp = activeEmployees.find((e) => e.id === selectedEmployeeId);
    const srv = activeServices.find((s) => s.id === selectedServiceId);

    if (!emp || !srv) {
      showError(t('feValidation'));
      return;
    }
    const amountResult = validateAmount(amount);
    if (!amountResult.isValid) {
      showError(validationMessage(amountResult.code, t) || t('feValidation'));
      return;
    }
    const numAmount = parseFloat(amount);

    onAddEntry({
      employeeId: emp.id,
      employeeName: emp.name,
      serviceId: srv.id,
      serviceName: srv.name,
      amount: numAmount,
      paymentMethod,
      statement: statement.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    if (settings.soundEffects) {
      playSuccessSound();
    }

    showSuccess(
      t('feSavedToast', {
        service: srv.name,
        employee: emp.name,
        amount: formatCurrency(numAmount, settings.currency, lang),
      }),
      3000
    );

    // Reset fields for NEXT fast transaction immediately
    setStatement('');
    setNotes('');
    // Keep employee & service or refocus amount for super fast repetitive entries
    setTimeout(() => {
      amountRef.current?.focus();
      amountRef.current?.select();
    }, 50);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.15 }}
            className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-100 overflow-hidden"
          >
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-blue-600 text-white p-2 rounded-xl font-bold shadow-sm">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">{t('feTitle')}</h2>
              <p className="text-xs text-slate-400">{t('feSubtitle')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {isDayLocked && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-bold flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{t('feDayClosedMessage')}</span>
            </div>
          )}

          {/* Step 1: Employee Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
              <User className="w-4 h-4 text-emerald-600" />
              <span>{t('employeeDoingService')}</span>
              <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {activeEmployees.map((emp) => {
                const isSelected = selectedEmployeeId === emp.id;
                return (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => setSelectedEmployeeId(emp.id)}
                    className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm ring-2 ring-emerald-500/50'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: emp.color }}
                    ></span>
                    <span className="truncate">{emp.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Service Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
              <Tag className="w-4 h-4 text-emerald-600" />
              <span>{t('requiredService')}</span>
              <span className="text-rose-500">*</span>
            </label>
            <select
              ref={serviceRef}
              value={selectedServiceId}
              onChange={(e) => handleServiceChange(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            >
              {activeServices.map((srv) => (
                <option key={srv.id} value={srv.id}>
                  {srv.name} ({srv.category}) — {srv.defaultPrice} {settings.currency}
                </option>
              ))}
            </select>
          </div>

          {/* Step 3: Amount & Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Amount Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span>{t('amountReceivedLabel', { currency: settings.currency })}</span>
                <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  ref={amountRef}
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all dir-ltr text-right"
                />
                <span className="absolute left-3 top-3.5 text-xs font-bold text-slate-400">
                  {settings.currency}
                </span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                {t('paymentMethod')}
              </label>
              <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`py-2 px-2 rounded-lg text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                    paymentMethod === 'cash'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Banknote className="w-4 h-4" />
                  <span>{t('cashShort')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`py-2 px-2 rounded-lg text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                    paymentMethod === 'card'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>{t('cardShort')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('transfer')}
                  className={`py-2 px-2 rounded-lg text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                    paymentMethod === 'transfer'
                      ? 'bg-slate-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Building className="w-4 h-4" />
                  <span>{t('transferShort')}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Statement / Notes (Optional) */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>{t('feStatementLabel')}</span>
              </label>
              <input
                type="text"
                value={statement}
                onChange={(e) => setStatement(e.target.value)}
                placeholder={t('feStatementPlaceholder')}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              {t('cancel')}
            </button>

            <button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-full text-xs font-bold shadow-md shadow-blue-100 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t('saveFastEntryBtn')}</span>
            </button>
          </div>
        </form>
        </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
