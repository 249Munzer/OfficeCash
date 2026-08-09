/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Toast Provider - مزود نظام الإشعارات العام
 * يوفر context للإشعارات يمكن الوصول إليه من أي مكون في التطبيق
 * @module components/Toast/ToastProvider
 */

import { createContext, useState, useCallback, ReactNode } from 'react';
import { Toast, ToastContextType, ToastType } from './types';

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback(
    (type: ToastType, message: string, duration?: number) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newToast: Toast = {
        id,
        type,
        message,
        duration: duration ?? 4000,
      };

      setToasts((prev) => [...prev, newToast]);

      // Auto-remove after duration
      if (newToast.duration && newToast.duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, newToast.duration);
      }
    },
    [removeToast]
  );

  const showSuccess = useCallback(
    (message: string, duration?: number) => addToast('success', message, duration),
    [addToast]
  );

  const showError = useCallback(
    (message: string, duration?: number) => addToast('error', message, duration ?? 6000),
    [addToast]
  );

  const showWarning = useCallback(
    (message: string, duration?: number) => addToast('warning', message, duration),
    [addToast]
  );

  const showInfo = useCallback(
    (message: string, duration?: number) => addToast('info', message, duration),
    [addToast]
  );

  return (
    <ToastContext.Provider
      value={{ toasts, showSuccess, showError, showWarning, showInfo, removeToast }}
    >
      {children}
    </ToastContext.Provider>
  );
}

export { ToastContext };