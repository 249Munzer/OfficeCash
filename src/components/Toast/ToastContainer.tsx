/**
 * Toast Container - حاوية عرض الإشعارات
 * تعرض جميع الإشعارات النشطة في زاوية الشاشة
 */

import { AnimatePresence } from 'motion/react';
import { useToast } from './useToast';
import { ToastItem } from './ToastItem';

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed bottom-4 left-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} onRemove={removeToast} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}