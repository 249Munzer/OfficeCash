import { describe, it, expect } from 'vitest';
import {
  DEFAULT_CURRENCY,
  formatCurrency,
  formatDateArabic,
  formatShortDate,
  formatTimeArabic,
  getDateStringFrom,
  getTodayDateString,
  getCurrentTimeString,
  getPaymentMethodLabel,
  getPaymentMethodBadgeClass,
  exportToCSV,
} from './formatters';

describe('formatters', () => {
  it('exposes a unified default currency', () => {
    expect(DEFAULT_CURRENCY).toBe('ر.س');
  });

  it('formatCurrency appends currency with Arabic default', () => {
    expect(formatCurrency(100)).toContain('ر.س');
  });

  it('formatCurrency handles zero and decimal values', () => {
    expect(formatCurrency(0)).toContain('٠');
    expect(formatCurrency(0)).toContain('ر.س');
    expect(formatCurrency(1.5, 'ر.س', 'en')).toContain('1.5');
  });

  it('formatCurrency supports english locale', () => {
    const out = formatCurrency(1234.5, 'SAR', 'en');
    expect(out).toContain('SAR');
  });

  it('formatDateArabic returns empty for empty input', () => {
    expect(formatDateArabic('')).toBe('');
  });

  it('formatDateArabic formats a full date', () => {
    const out = formatDateArabic('2026-01-15');
    expect(out.length).toBeGreaterThan(0);
  });

  it('formatShortDate converts YYYY-MM-DD to DD/MM/YYYY', () => {
    expect(formatShortDate('2026-03-07')).toBe('07/03/2026');
  });

  it('formatShortDate returns empty for empty input', () => {
    expect(formatShortDate('')).toBe('');
  });

  it('formatTimeArabic returns empty for empty input', () => {
    expect(formatTimeArabic('')).toBe('');
  });

  it('formatTimeArabic formats Arabic AM/PM', () => {
    expect(formatTimeArabic('09:30:00')).toContain('ص');
    expect(formatTimeArabic('14:15:00')).toContain('م');
  });

  it('formatTimeArabic formats English AM/PM', () => {
    expect(formatTimeArabic('09:30:00', 'en')).toContain('AM');
    expect(formatTimeArabic('23:00:00', 'en')).toContain('PM');
  });

  it('getDateStringFrom returns local YYYY-MM-DD', () => {
    expect(getDateStringFrom(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(getDateStringFrom(new Date(2026, 11, 31))).toBe('2026-12-31');
  });

  it('getTodayDateString returns current local date', () => {
    const expected = getDateStringFrom(new Date());
    expect(getTodayDateString()).toBe(expected);
  });

  it('getCurrentTimeString returns HH:MM:SS', () => {
    expect(getCurrentTimeString()).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });

  it('getPaymentMethodLabel returns Arabic labels by default', () => {
    expect(getPaymentMethodLabel('cash')).toBe('نقد');
    expect(getPaymentMethodLabel('card')).toBe('شبكة (مدى)');
    expect(getPaymentMethodLabel('transfer')).toBe('تحويل بنكي');
  });

  it('getPaymentMethodLabel returns English labels when lang is en', () => {
    expect(getPaymentMethodLabel('cash', 'en')).toBe('Cash');
    expect(getPaymentMethodLabel('card', 'en')).toBe('Card (Mada)');
    expect(getPaymentMethodLabel('transfer', 'en')).toBe('Bank Transfer');
  });

  it('getPaymentMethodBadgeClass returns a class string for every method', () => {
    expect(getPaymentMethodBadgeClass('cash')).toContain('emerald');
    expect(getPaymentMethodBadgeClass('card')).toContain('blue');
    expect(getPaymentMethodBadgeClass('transfer')).toContain('slate');
  });

  it('exportToCSV escapes quotes and triggers a download', () => {
    const clickSpy = { called: 0 };
    const originalClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () {
      clickSpy.called += 1;
    };
    try {
      exportToCSV('test', ['a', 'b'], [['x"y', 2]]);
      expect(clickSpy.called).toBe(1);
    } finally {
      HTMLAnchorElement.prototype.click = originalClick;
    }
  });
});
