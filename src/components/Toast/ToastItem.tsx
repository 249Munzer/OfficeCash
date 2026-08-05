/**
 * Toast Item - مكون إشعار واحد
 * يعرض إشعار واحد مع أنيميشن وأيقونة مناسبة للنوع
 */

import { CheckCircle2, XCircle, AlertCircle, Info, X } from 'lucide-react';
import { motion } from 'motion/react';
import { Toast } from './types';

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

const toastConfig = {
  success: {
    icon: CheckCircle2,
    bgClass: 'bg-emerald-600',
    borderClass: 'border-emerald-700',
    iconClass: 'text-white',
  },
  error: {
    icon: XCircle,
    bgClass: 'bg-rose-600',
    borderClass: 'border-rose-700',
    iconClass: 'text-white',
  },
  warning: {
    icon: AlertCircle,
    bgClass: 'bg-amber-500',
    borderClass: 'border-amber-600',
    iconClass: 'text-white',
  },
  info: {
    icon: Info,
    bgClass: 'bg-blue-600',
    borderClass: 'border-blue-700',
    iconClass: 'text-white',
  },
};

export function ToastItem({ toast, onRemove }: ToastItemProps) {
  const config = toastConfig[toast.type];
  const Icon = config.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`${config.bgClass} ${config.borderClass} border text-white rounded-xl shadow-lg px-4 py-3 flex items-center gap-3 min-w-[300px] max-w-md cursor-pointer`}
      onClick={() => onRemove(toast.id)}
    >
      <Icon className={`w-5 h-5 ${config.iconClass} shrink-0`} />
      <span className="text-sm font-bold flex-1">{toast.message}</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove(toast.id);
        }}
        className="text-white/80 hover:text-white shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}