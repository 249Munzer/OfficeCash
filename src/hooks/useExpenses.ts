import { useCallback } from 'react';
import { Expense } from '../types';

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