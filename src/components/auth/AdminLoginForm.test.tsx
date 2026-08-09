import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdminLoginForm } from './AdminLoginForm';
import { translations } from '../../lib/i18n';
import { OfficeSettings } from '../../types';

const ar = translations.ar;

const settings: OfficeSettings = {
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
  securityQuestions: [
    { questionId: 'sq_01', answerHash: 'sha256$salt$first-teacher-hash' },
    { questionId: 'sq_02', answerHash: 'sha256$salt$favorite-city-hash' },
  ],
};

function renderForm() {
  const onLogin = vi.fn().mockResolvedValue(false);
  const onVerifyAnswers = vi.fn().mockResolvedValue({ valid: true });
  const onResetPin = vi.fn().mockResolvedValue({ ok: true });
  render(
    <AdminLoginForm
      onLogin={onLogin}
      t={makeTAr()}
      settings={settings}
      onVerifyAnswers={onVerifyAnswers}
      onResetPin={onResetPin}
    />
  );
  return { onLogin, onVerifyAnswers, onResetPin };
}

function makeTAr() {
  return (key: string, vars?: Record<string, number | string>): string => {
    const raw = (translations.ar as unknown as Record<string, unknown>)[key];
    let text = typeof raw === 'string' ? raw : key;
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        text = text.replaceAll(`{${k}}`, String(v));
      });
    }
    return text;
  };
}

describe('AdminLoginForm + ForgotPasswordModal integration', () => {
  it('keeps the recovery modal open and does not submit the login form while verifying', async () => {
    const { onLogin, onVerifyAnswers } = renderForm();

    fireEvent.click(screen.getByRole('button', { name: ar.fpOpenLink }));
    expect(screen.getByText(ar.fpTitle)).toBeInTheDocument();

    const inputs = screen.getAllByPlaceholderText(ar.fpAnswerPlaceholder);
    fireEvent.change(inputs[0], { target: { value: 'أحمد' } });
    fireEvent.change(inputs[1], { target: { value: 'الرياض' } });
    fireEvent.click(screen.getByRole('button', { name: ar.fpVerifyBtn }));

    expect(await screen.findByText(ar.fpNewPinTitle)).toBeInTheDocument();
    expect(onVerifyAnswers).toHaveBeenCalledTimes(1);
    expect(onLogin).not.toHaveBeenCalled();
  });

  it('shows the success step and only closes the modal when the user clicks done', async () => {
    const { onLogin, onResetPin } = renderForm();

    fireEvent.click(screen.getByRole('button', { name: ar.fpOpenLink }));
    const inputs = screen.getAllByPlaceholderText(ar.fpAnswerPlaceholder);
    fireEvent.change(inputs[0], { target: { value: 'أحمد' } });
    fireEvent.change(inputs[1], { target: { value: 'الرياض' } });
    fireEvent.click(screen.getByRole('button', { name: ar.fpVerifyBtn }));
    await screen.findByText(ar.fpNewPinTitle);

    const pinInputs = [
      screen.getByLabelText(ar.fpNewPinLabel),
      screen.getByLabelText(ar.fpNewPinConfirmLabel),
    ];
    fireEvent.change(pinInputs[0], { target: { value: '5814' } });
    fireEvent.change(pinInputs[1], { target: { value: '5814' } });
    fireEvent.click(screen.getByRole('button', { name: ar.fpSubmitBtn }));

    expect(await screen.findByText(ar.fpSuccessTitle)).toBeInTheDocument();
    expect(onResetPin).toHaveBeenCalledTimes(1);
    expect(onLogin).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: ar.fpDoneBtn }));
    await waitFor(() => expect(screen.queryByText(ar.fpSuccessTitle)).not.toBeInTheDocument());
  });
});
