import { useCallback } from 'react';
import { Employee } from '../types';

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