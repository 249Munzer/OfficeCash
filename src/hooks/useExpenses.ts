import { useCallback } from 'react';
import { Expense } from '../types';

/**
 * Hook عمليات المصروفات (إضافة/حذف + بث P2P).
 * يغلف `addExpense`/`deleteExpense` من `useAppState` مع إنشاء `id`/`createdAt`
 * ويُشغّل `broadcastP2PChange` بعد كل تعديل.
 * @param _expenses - مصفوفة المصروفات (للاعتمادية)
 * @param _setExpenses - setter للحالة
 * @param addExpense - دالة إضافة من useAppState
 * @param deleteExpense - دالة حذف من useAppState
 * @param broadcastP2PChange - دالة بث التغيير لأجهزة الشبكة
 * @returns {Object} دوال `handleAddExpense`، `handleDeleteExpense`
 */
export function useExpenses(
  _expenses: Expense[],
  _setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>,
  addExpense: (expense: Expense) => Promise<void>,
  deleteExpense: (id: string) => Promise<void>,
  broadcastP2PChange: () => void
) {
  const handleAddExpense = useCallback(async (expenseData: Omit<Expense, 'id' | 'createdAt'>) => {
    const newExpense: Expense = {
      id: `exp-${Date.now()}`,
      ...expenseData,
      createdAt: new Date().toISOString(),
    };

    await addExpense(newExpense);
    broadcastP2PChange();
  }, [addExpense, broadcastP2PChange]);

  const handleDeleteExpense = useCallback(async (id: string) => {
    await deleteExpense(id);
    broadcastP2PChange();
  }, [deleteExpense, broadcastP2PChange]);

  return {
    handleAddExpense,
    handleDeleteExpense,
  };
}