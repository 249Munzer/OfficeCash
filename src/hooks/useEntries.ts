import { useCallback } from 'react';
import { FinancialEntry, PaymentMethod } from '../types';
import { getTodayDateString, getCurrentTimeString } from '../lib/formatters';

/**
 * Hook عمليات الحركات المالية (CRUD + بث P2P).
 * يغلف دوال `addEntry`/`updateEntry`/`deleteEntry` من `useAppState` مع إنشاء `id`/`date`/`time`/`createdAt`
 * ويُشغّل `broadcastP2PChange` بعد كل تعديل لمزامنة أجهزة LAN.
 * @param _entries - مصفوفة الحركات (غير مستخدمة مباشرة، للاعتمادية)
 * @param _setEntries - setter للحالة (غير مستخدم مباشرة)
 * @param addEntry - دالة إضافة من useAppState
 * @param updateEntry - دالة تعديل من useAppState
 * @param deleteEntry - دالة حذف من useAppState
 * @param broadcastP2PChange - دالة بث التغيير لأجهزة الشبكة
 * @returns {Object} دوال `handleAddEntry`، `handleUpdateEntry`، `handleDeleteEntry`
 */
export function useEntries(
  _entries: FinancialEntry[],
  _setEntries: React.Dispatch<React.SetStateAction<FinancialEntry[]>>,
  addEntry: (entry: FinancialEntry) => Promise<void>,
  updateEntry: (entry: FinancialEntry) => Promise<void>,
  deleteEntry: (id: string) => Promise<void>,
  broadcastP2PChange: () => void
) {
  const handleAddEntry = useCallback(async (data: {
    employeeId: string;
    employeeName: string;
    serviceId: string;
    serviceName: string;
    amount: number;
    paymentMethod: PaymentMethod;
    statement?: string;
    notes?: string;
  }) => {
    const newEntry: FinancialEntry = {
      id: `ent-${Date.now()}`,
      date: getTodayDateString(),
      time: getCurrentTimeString(),
      ...data,
      createdAt: new Date().toISOString(),
    };

    await addEntry(newEntry);
    broadcastP2PChange();
  }, [addEntry, broadcastP2PChange]);

  const handleUpdateEntry = useCallback(async (updatedEntry: FinancialEntry) => {
    await updateEntry(updatedEntry);
    broadcastP2PChange();
  }, [updateEntry, broadcastP2PChange]);

  const handleDeleteEntry = useCallback(async (id: string) => {
    await deleteEntry(id);
    broadcastP2PChange();
  }, [deleteEntry, broadcastP2PChange]);

  return {
    handleAddEntry,
    handleUpdateEntry,
    handleDeleteEntry,
  };
}