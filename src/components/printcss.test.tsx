import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { readFileSync, readdirSync } from 'fs';
import { resolve, join } from 'path';
import { PrintableReport } from './PrintableReport';
import { OfficeSettings } from '../types';

const settings: OfficeSettings = {
  officeName: 'مكتب الأمل',
  licenseNumber: '12345678',
  phone: '0500000000',
  address: 'الرياض',
  currency: 'ر.س',
  autoLockClosedDays: true,
  soundEffects: false,
  language: 'ar',
  theme: 'dark',
};

function loadBuiltCss(): string | null {
  const dir = resolve(__dirname, '../../dist/assets');
  try {
    const file = readdirSync(dir).find((f) => f.endsWith('.css'));
    if (!file) return null;
    return readFileSync(join(dir, file), 'utf8');
  } catch {
    return null;
  }
}

describe('print sheet dark mode (integration with built CSS)', () => {
  it('report sheet and KPI panels are white/light in dark mode', () => {
    const css = loadBuiltCss();
    if (!css) {
      return; // dist not built — skip (build first via `npm run build`)
    }
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
    document.documentElement.classList.add('dark');

    const entry = {
      id: 'e1',
      date: '2026-08-06',
      time: '10:00:00',
      employeeId: 'e1',
      employeeName: 'أحمد',
      serviceId: 's1',
      serviceName: 'حلاقة',
      amount: 100,
      paymentMethod: 'cash' as const,
      statement: 'بيان',
      createdAt: '2026-08-06T10:00:00.000Z',
    };
    const expense = {
      id: 'x1',
      date: '2026-08-06',
      time: '11:00',
      category: 'فواتير',
      statement: 'كهرباء',
      amount: 10,
      createdAt: '2026-08-06T11:00:00.000Z',
    };

    const { container } = render(
      <PrintableReport
        settings={settings}
        title="تقرير"
        entries={[entry]}
        expenses={[expense]}
          employees={[]}
        onClosePrint={() => {}}
      />
    );

    const sheet = container.querySelector('.print-paper') as HTMLElement;
    const sheetBg = getComputedStyle(sheet).backgroundColor;
    const sheetColor = getComputedStyle(sheet).color;

    expect(sheetBg).toBe('rgb(255, 255, 255)');
    expect(sheetColor).toBe('rgb(15, 23, 42)');

    // KPI panels (bg-slate-50) must stay light, not navy panel blue
    const kpi = sheet.querySelector('.bg-slate-50') as HTMLElement;
    expect(getComputedStyle(kpi).backgroundColor).toBe('rgb(248, 250, 252)');

    // Title bar (bg-slate-100) must stay light
    const titleBar = sheet.querySelector('.bg-slate-100') as HTMLElement;
    expect(getComputedStyle(titleBar).backgroundColor).toBe('rgb(241, 245, 249)');

    // Table header (bg-slate-200) must stay light
    const thead = sheet.querySelector('thead') as HTMLElement;
    expect(getComputedStyle(thead).backgroundColor).toBe('rgb(226, 232, 240)');

    // Table body row must be white
    const row = sheet.querySelector('tbody tr') as HTMLElement;
    expect(getComputedStyle(row).backgroundColor).toBe('rgb(255, 255, 255)');

    document.documentElement.classList.remove('dark');
    style.remove();
  });
});
