/**
 * Toast System Types
 * تعريفات الأنواع لنظام الإشعارات العام
 */

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number; // بالمللي ثانية، افتراضي 4000
}

export interface ToastContextType {
  toasts: Toast[];
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
  removeToast: (id: string) => void;
}