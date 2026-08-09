import { useCallback } from 'react';
import { Employee } from '../types';

/**
 * Hook عمليات الموظفين (إضافة/تعديل/حذف + بث P2P).
 * يغلف `addEmployee`/`updateEmployee`/`deleteEmployee` من `useAppState` مع إنشاء `id`/`createdAt`
 * ويُشغّل `broadcastP2PChange` بعد كل تعديل.
 * @param _employees - مصفوفة الموظفين (للاعتمادية)
 * @param _setEmployees - setter للحالة
 * @param addEmployee - دالة إضافة من useAppState
 * @param updateEmployee - دالة تعديل من useAppState
 * @param deleteEmployee - دالة حذف من useAppState
 * @param broadcastP2PChange - دالة بث التغيير لأجهزة الشبكة
 * @returns {Object} دوال `handleAddEmployee`، `handleUpdateEmployee`، `handleDeleteEmployee`
 */
export function useEmployees(
  _employees: Employee[],
  _setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>,
  addEmployee: (employee: Employee) => Promise<void>,
  updateEmployee: (employee: Employee) => Promise<void>,
  deleteEmployee: (id: string) => Promise<void>,
  broadcastP2PChange: () => void
) {
  const handleAddEmployee = useCallback(async (empData: Omit<Employee, 'id' | 'createdAt'>) => {
    const newEmp: Employee = {
      id: `emp-${Date.now()}`,
      ...empData,
      createdAt: new Date().toISOString(),
    };

    await addEmployee(newEmp);
    broadcastP2PChange();
  }, [addEmployee, broadcastP2PChange]);

  const handleUpdateEmployee = useCallback(async (updatedEmployee: Employee) => {
    await updateEmployee(updatedEmployee);
    broadcastP2PChange();
  }, [updateEmployee, broadcastP2PChange]);

  const handleDeleteEmployee = useCallback(async (id: string) => {
    await deleteEmployee(id);
    broadcastP2PChange();
  }, [deleteEmployee, broadcastP2PChange]);

  return {
    handleAddEmployee,
    handleUpdateEmployee,
    handleDeleteEmployee,
  };
}