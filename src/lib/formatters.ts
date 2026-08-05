import { PaymentMethod } from '../types';
import { Language } from './i18n';

/** العملة الافتراضية الموحّدة للمكتب الجديد والتنسيقات */
export const DEFAULT_CURRENCY = 'ر.س';

export function formatCurrency(amount: number, currency: string = DEFAULT_CURRENCY, lang: Language = 'ar'): string {
  const locale = lang === 'en' ? 'en-US' : 'ar-SA';
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount || 0);
  return `${formatted} ${currency}`;
}

export function formatDateArabic(dateStr: string, lang: Language = 'ar'): string {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  const locale = lang === 'en' ? 'en-US' : 'ar-SA-u-ca-gregory';
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export function formatShortDate(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

export function formatTimeArabic(timeStr: string, lang: Language = 'ar'): string {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':');
  const h = parseInt(hours, 10);
  if (lang === 'en') {
    const period = h >= 12 ? 'PM' : 'AM';
    const displayHours = h % 12 || 12;
    return `${displayHours}:${minutes} ${period}`;
  }
  const period = h >= 12 ? 'م' : 'ص';
  const displayHours = h % 12 || 12;
  return `${displayHours}:${minutes} ${period}`;
}

export function getTodayDateString(): string {
  return getDateStringFrom(new Date());
}

// إرجاع التاريخ بصيغة YYYY-MM-DD وفق التوقيت المحلي (وليس UTC)
export function getDateStringFrom(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCurrentTimeString(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

export function getPaymentMethodLabel(method: PaymentMethod, lang: Language = 'ar'): string {
  if (lang === 'en') {
    switch (method) {
      case 'cash':
        return 'Cash';
      case 'card':
        return 'Card (Mada)';
      case 'transfer':
        return 'Bank Transfer';
      default:
        return method;
    }
  }
  switch (method) {
    case 'cash':
      return 'نقد';
    case 'card':
      return 'شبكة (مدى)';
    case 'transfer':
      return 'تحويل بنكي';
    default:
      return method;
  }
}

export function getPaymentMethodBadgeClass(method: PaymentMethod): string {
  switch (method) {
    case 'cash':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'card':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'transfer':
      return 'bg-slate-100 text-slate-700 border-slate-200';
    default:
      return 'bg-slate-100 text-slate-800 border-slate-200';
  }
}

/**
 * Downloads a CSV file with UTF-8 BOM so Microsoft Excel correctly handles Arabic text
 */
export function exportToCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const bom = '\uFEFF';
  const csvContent = [
    headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
    ...rows.map(row =>
      row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')
    ),
  ].join('\n');

  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
