/**
 * useToast Hook - hook للوصول لنظام الإشعارات
 * يمكن استدعاؤه من أي مكون داخل ToastProvider
 */

import { useContext } from 'react';
import { ToastContext } from './ToastProvider';
import { ToastContextType } from './types';

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}