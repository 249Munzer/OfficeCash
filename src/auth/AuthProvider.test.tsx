import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuthContext } from './AuthProvider';
import { hashCredential, verifyCredential } from '../lib/auth/credentials';
import { hashAnswer } from '../lib/auth/securityQuestions';
import { OfficeSettings } from '../types';

vi.mock('../lib/electron-storage', () => ({
  loadAuthSession: vi.fn().mockResolvedValue(null),
  saveAuthSession: vi.fn().mockResolvedValue(undefined),
  saveSettings: vi.fn().mockResolvedValue(undefined),
  clearAllData: vi.fn().mockResolvedValue(undefined),
  saveEmployee: vi.fn().mockResolvedValue(undefined),
}));

type ResetPinResultShape = {
  ok: boolean;
  error?: string;
  settings?: OfficeSettings;
};

let ctx: {
  resetAdminPin: (
    answers: Array<{ questionId: string; answer: string }>,
    newPin: string,
    settings?: OfficeSettings
  ) => Promise<ResetPinResultShape>;
  loginAsAdmin: (adminPin: string, settings?: OfficeSettings) => Promise<boolean>;
};
function Probe() {
  ctx = useAuthContext();
  return <span data-testid="ready" />;
}

function renderProvider() {
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>
  );
}

describe('AuthProvider PIN recovery', () => {
  let baseSettings: OfficeSettings;

  beforeAll(async () => {
    baseSettings = {
      officeName: 'مكتب الأمل',
      licenseNumber: '12345678',
      phone: '0501234567',
      address: 'الرياض',
      currency: 'ر.س',
      autoLockClosedDays: true,
      soundEffects: true,
      networkSyncCode: 'P2P-ABCD-2345',
      language: 'ar',
      theme: 'light',
      adminPasswordPin: await hashCredential('1234'),
      securityQuestions: [
        { questionId: 'sq_01', answerHash: await hashAnswer('جدة') },
        { questionId: 'sq_02', answerHash: await hashAnswer('الرياض') },
      ],
    };
  });

  it('returns the updated settings whose PIN verifies with the new pin', async () => {
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('ready')).toBeInTheDocument());

    const result = await ctx.resetAdminPin(
      [
        { questionId: 'sq_01', answer: 'جدة' },
        { questionId: 'sq_02', answer: 'الرياض' },
      ],
      '5814',
      baseSettings
    );

    expect(result.ok).toBe(true);
    expect(result.settings).toBeDefined();
    expect(result.settings!.adminPasswordPin).not.toBe(baseSettings.adminPasswordPin);

    const { valid } = await verifyCredential(result.settings!.adminPasswordPin, '5814');
    expect(valid).toBe(true);
  });

  it('lets the admin log in with the new pin against the reset settings (the contract App relies on)', async () => {
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('ready')).toBeInTheDocument());

    const result = await ctx.resetAdminPin(
      [
        { questionId: 'sq_01', answer: 'جدة' },
        { questionId: 'sq_02', answer: 'الرياض' },
      ],
      '5814',
      baseSettings
    );

    expect(await ctx.loginAsAdmin('5814', result.settings)).toBe(true);
    expect(await ctx.loginAsAdmin('1234', result.settings)).toBe(false);
  });

  it('rejects a reset when answers are wrong', async () => {
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('ready')).toBeInTheDocument());

    const result = await ctx.resetAdminPin(
      [
        { questionId: 'sq_01', answer: 'إجابة خاطئة' },
        { questionId: 'sq_02', answer: 'الرياض' },
      ],
      '5814',
      baseSettings
    );

    expect(result.ok).toBe(false);
    expect(result.error).toBe('answers');
    expect(result.settings).toBeUndefined();
  });
});
