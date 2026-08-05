import React from 'react';
import { AlertCircle } from 'lucide-react';

interface LoginErrorBoxProps {
  message: string | null;
}

export const LoginErrorBox: React.FC<LoginErrorBoxProps> = ({ message }) => {
  if (!message) return null;
  return (
    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 dark:bg-rose-950/80 dark:border-rose-800 dark:text-rose-300 rounded-xl text-xs font-bold flex items-center gap-2">
      <AlertCircle className="w-4 h-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
};
