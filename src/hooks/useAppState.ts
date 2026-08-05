import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Employee,
  Service,
  FinancialEntry,
  Expense,
  DayClosing,
  OfficeSettings,
} from '../types';
import {
  loadSettings as loadSettingsElectron,
  saveSettings as saveSettingsElectron,
  loadEmployees as loadEmployeesElectron,
  saveEmployees as saveEmployeesElectron,
  loadServices as loadServicesElectron,
  saveServices as saveServicesElectron,
  loadEntries as loadEntriesElectron,
  saveEntries as saveEntriesElectron,
  loadExpenses as loadExpensesElectron,
  saveExpenses as saveExpensesElectron,
  loadDayClosings as loadDayClosingsElectron,
  saveDayClosings as saveDayClosingsElectron,
  resetToDemoData as resetToDemoDataElectron,
} from '../lib/electron-storage';

export function useAppState() {
  const [settings, setSettings] = useState<OfficeSettings | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [dayClosings, setDayClosings] = useState<DayClosing[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // نسخ مرجعية متزامنة تُستخدم للحفظ لتفادي الكتابة اعتماداً على closure قديمة
  const employeesRef = useRef<Employee[]>([]);
  const servicesRef = useRef<Service[]>([]);
  const entriesRef = useRef<FinancialEntry[]>([]);
  const expensesRef = useRef<Expense[]>([]);
  const dayClosingsRef = useRef<DayClosing[]>([]);

  // سلسلة حفظ متسلسلة تمنع إعادة ترتيب عمليات الكتابة وتفادي فقدان التحديثات
  const saveChainRef = useRef<Promise<void>>(Promise.resolve());

  const enqueueSave = useCallback((task: () => Promise<void>) => {
    saveChainRef.current = saveChainRef.current
      .then(task)
      .catch((error) => console.error('Failed to save data:', error));
  }, []);

  // تطبيق البيانات على الحالة والمراجع معاً بعد أي تحميل/إعادة تحميل
  const applyData = useCallback((
    employeesData: Employee[],
    servicesData: Service[],
    entriesData: FinancialEntry[],
    expensesData: Expense[],
    dayClosingsData: DayClosing[],
  ) => {
    employeesRef.current = employeesData;
    servicesRef.current = servicesData;
    entriesRef.current = entriesData;
    expensesRef.current = expensesData;
    dayClosingsRef.current = dayClosingsData;
    setEmployees(employeesData);
    setServices(servicesData);
    setEntries(entriesData);
    setExpenses(expensesData);
    setDayClosings(dayClosingsData);
  }, []);

  // Load initial data
  useEffect(() => {
    async function loadInitialData() {
      try {
        const [
          settingsData,
          employeesData,
          servicesData,
          entriesData,
          expensesData,
          dayClosingsData,
        ] = await Promise.all([
          loadSettingsElectron(),
          loadEmployeesElectron(),
          loadServicesElectron(),
          loadEntriesElectron(),
          loadExpensesElectron(),
          loadDayClosingsElectron(),
        ]);

        setSettings(settingsData);
        applyData(employeesData, servicesData, entriesData, expensesData, dayClosingsData);
      } catch (error) {
        console.error('Failed to load initial data:', error);
        return null;
      } finally {
        setIsLoading(false);
      }
    }

    loadInitialData();
  }, []);

  // CRUD Operations
  const updateSettings = useCallback(async (newSettings: OfficeSettings) => {
    setSettings(newSettings);
    await saveSettingsElectron(newSettings);
  }, []);

  const addEntry = useCallback(async (entry: FinancialEntry) => {
    const next = [entry, ...entriesRef.current];
    entriesRef.current = next;
    setEntries(next);
    enqueueSave(() => saveEntriesElectron(next));
  }, [enqueueSave]);

  const updateEntry = useCallback(async (updatedEntry: FinancialEntry) => {
    const next = entriesRef.current.map((e) => (e.id === updatedEntry.id ? updatedEntry : e));
    entriesRef.current = next;
    setEntries(next);
    enqueueSave(() => saveEntriesElectron(next));
  }, [enqueueSave]);

  const deleteEntry = useCallback(async (id: string) => {
    const next = entriesRef.current.filter((e) => e.id !== id);
    entriesRef.current = next;
    setEntries(next);
    enqueueSave(() => saveEntriesElectron(next));
  }, [enqueueSave]);

  const addExpense = useCallback(async (expense: Expense) => {
    const next = [expense, ...expensesRef.current];
    expensesRef.current = next;
    setExpenses(next);
    enqueueSave(() => saveExpensesElectron(next));
  }, [enqueueSave]);

  const deleteExpense = useCallback(async (id: string) => {
    const next = expensesRef.current.filter((e) => e.id !== id);
    expensesRef.current = next;
    setExpenses(next);
    enqueueSave(() => saveExpensesElectron(next));
  }, [enqueueSave]);

  const addEmployee = useCallback(async (employee: Employee) => {
    const next = [...employeesRef.current, employee];
    employeesRef.current = next;
    setEmployees(next);
    enqueueSave(() => saveEmployeesElectron(next));
  }, [enqueueSave]);

  const updateEmployee = useCallback(async (updatedEmployee: Employee) => {
    const next = employeesRef.current.map((e) => (e.id === updatedEmployee.id ? updatedEmployee : e));
    employeesRef.current = next;
    setEmployees(next);
    enqueueSave(() => saveEmployeesElectron(next));
  }, [enqueueSave]);

  const deleteEmployee = useCallback(async (id: string) => {
    const next = employeesRef.current.filter((e) => e.id !== id);
    employeesRef.current = next;
    setEmployees(next);
    enqueueSave(() => saveEmployeesElectron(next));
  }, [enqueueSave]);

  const addService = useCallback(async (service: Service) => {
    const next = [...servicesRef.current, service];
    servicesRef.current = next;
    setServices(next);
    enqueueSave(() => saveServicesElectron(next));
  }, [enqueueSave]);

  const updateService = useCallback(async (updatedService: Service) => {
    const next = servicesRef.current.map((s) => (s.id === updatedService.id ? updatedService : s));
    servicesRef.current = next;
    setServices(next);
    enqueueSave(() => saveServicesElectron(next));
  }, [enqueueSave]);

  const deleteService = useCallback(async (id: string) => {
    const next = servicesRef.current.filter((s) => s.id !== id);
    servicesRef.current = next;
    setServices(next);
    enqueueSave(() => saveServicesElectron(next));
  }, [enqueueSave]);

  const saveDayClosing = useCallback(async (closing: DayClosing) => {
    const next = [closing, ...dayClosingsRef.current];
    dayClosingsRef.current = next;
    setDayClosings(next);
    enqueueSave(() => saveDayClosingsElectron(next));
  }, [enqueueSave]);

  const resetToDemoData = useCallback(async () => {
    await resetToDemoDataElectron();
    // Reload all data
    const [
      settingsData,
      employeesData,
      servicesData,
      entriesData,
      expensesData,
      dayClosingsData,
    ] = await Promise.all([
      loadSettingsElectron(),
      loadEmployeesElectron(),
      loadServicesElectron(),
      loadEntriesElectron(),
      loadExpensesElectron(),
      loadDayClosingsElectron(),
    ]);

    setSettings(settingsData);
    applyData(employeesData, servicesData, entriesData, expensesData, dayClosingsData);
  }, [applyData]);

  // إعادة تحميل جميع البيانات من التخزين (بعد تسجيل مكتب جديد أو مسح البيانات)
  const reloadAll = useCallback(async () => {
    const [
      settingsData,
      employeesData,
      servicesData,
      entriesData,
      expensesData,
      dayClosingsData,
    ] = await Promise.all([
      loadSettingsElectron(),
      loadEmployeesElectron(),
      loadServicesElectron(),
      loadEntriesElectron(),
      loadExpensesElectron(),
      loadDayClosingsElectron(),
    ]);

    setSettings(settingsData);
    applyData(employeesData, servicesData, entriesData, expensesData, dayClosingsData);
  }, [applyData]);

  return {
    // State
    settings,
    employees,
    services,
    entries,
    expenses,
    dayClosings,
    isLoading,
    setSettings,
    setEmployees,
    setServices,
    setEntries,
    setExpenses,
    setDayClosings,
    // CRUD Operations
    updateSettings,
    addEntry,
    updateEntry,
    deleteEntry,
    addExpense,
    deleteExpense,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    addService,
    updateService,
    deleteService,
    saveDayClosing,
    resetToDemoData,
    reloadAll,
  };
}