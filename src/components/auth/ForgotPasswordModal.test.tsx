import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ForgotPasswordModal, ResetPinErrorCode } from './ForgotPasswordModal';
import { translations } from '../../lib/i18n';
import { OfficeSettings } from '../../types';

const ar = translations.ar;

const baseSettings: OfficeSettings = {
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
};

const settingsWithQuestions: OfficeSettings = {
  ...baseSettings,
  securityQuestions: [
    { questionId: 'sq_01', answerHash: 'sha256$salt$first-teacher-hash' },
    { questionId: 'sq_02', answerHash: 'sha256$salt$favorite-city-hash' },
  ],
};

interface RenderOpts {
  settings?: OfficeSettings;
  verifyResult?: { valid: boolean; error?: ResetPinErrorCode };
  resetResult?: { ok: boolean; error?: ResetPinErrorCode };
}

function renderModal(opts: RenderOpts = {}) {
  const { settings = settingsWithQuestions, verifyResult = { valid: true }, resetResult = { ok: true } } = opts;
  const onVerifyAnswers = vi.fn().mockResolvedValue(verifyResult);
  const onResetPin = vi.fn().mockResolvedValue(resetResult);
  const onClose = vi.fn();
  render(
    <ForgotPasswordModal
      isOpen
      settings={settings}
      language="ar"
      onClose={onClose}
      onVerifyAnswers={onVerifyAnswers}
      onResetPin={onResetPin}
    />
  );
  return { onVerifyAnswers, onResetPin, onClose };
}

describe('ForgotPasswordModal', () => {
  it('renders the saved questions with answer inputs', () => {
    renderModal();

    expect(screen.getByText(ar.fpTitle)).toBeInTheDocument();
    expect(screen.getByText(/ما اسم أول معلم لديك؟/)).toBeInTheDocument();
    expect(screen.getByText(/ما اسم مدينتك المفضلة؟/)).toBeInTheDocument();
    expect(screen.getAllByPlaceholderText(ar.fpAnswerPlaceholder)).toHaveLength(2);
  });

  it('shows a "not configured" notice when no questions are saved', () => {
    renderModal({ settings: baseSettings });

    expect(screen.getByText(ar.fpNotConfiguredTitle)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(ar.fpAnswerPlaceholder)).not.toBeInTheDocument();
  });

  it('requires an answer for every question', () => {
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: ar.fpVerifyBtn }));
    expect(screen.getByText(ar.fpAnswerRequiredError)).toBeInTheDocument();
  });

  it('verifies answers then lets the admin set a new PIN', async () => {
    const { onVerifyAnswers, onResetPin } = renderModal();

    const inputs = screen.getAllByPlaceholderText(ar.fpAnswerPlaceholder);
    fireEvent.change(inputs[0], { target: { value: 'أحمد' } });
    fireEvent.change(inputs[1], { target: { value: 'الرياض' } });
    fireEvent.click(screen.getByRole('button', { name: ar.fpVerifyBtn }));

    expect(await screen.findByText(ar.fpNewPinTitle)).toBeInTheDocument();
    expect(onVerifyAnswers).toHaveBeenCalledWith([
      { questionId: 'sq_01', answer: 'أحمد' },
      { questionId: 'sq_02', answer: 'الرياض' },
    ]);

    const pinInputs = [screen.getByLabelText(ar.fpNewPinLabel), screen.getByLabelText(ar.fpNewPinConfirmLabel)];
    fireEvent.change(pinInputs[0], { target: { value: '5814' } });
    fireEvent.change(pinInputs[1], { target: { value: '5814' } });
    fireEvent.click(screen.getByRole('button', { name: ar.fpSubmitBtn }));

    expect(await screen.findByText(ar.fpSuccessTitle)).toBeInTheDocument();
    expect(onResetPin).toHaveBeenCalledWith(
      [
        { questionId: 'sq_01', answer: 'أحمد' },
        { questionId: 'sq_02', answer: 'الرياض' },
      ],
      '5814'
    );
  });

  it('shows the wrong-answers error and locks after too many attempts', async () => {
    const { onVerifyAnswers } = renderModal({
      verifyResult: { valid: false, error: 'answers' },
    });

    const inputs = screen.getAllByPlaceholderText(ar.fpAnswerPlaceholder);
    for (let i = 0; i < 4; i++) {
      fireEvent.change(inputs[0], { target: { value: `wrong-${i}` } });
      fireEvent.change(inputs[1], { target: { value: `wrong-${i}` } });
      fireEvent.click(screen.getByRole('button', { name: ar.fpVerifyBtn }));
      await waitFor(() => expect(screen.getByRole('button', { name: ar.fpVerifyBtn })).not.toBeDisabled());
    }

    fireEvent.change(inputs[0], { target: { value: 'wrong-5' } });
    fireEvent.change(inputs[1], { target: { value: 'wrong-5' } });
    fireEvent.click(screen.getByRole('button', { name: ar.fpVerifyBtn }));

    expect(await screen.findByText(ar.fpLockedTitle)).toBeInTheDocument();
    expect(onVerifyAnswers).toHaveBeenCalledTimes(5);
  });

  it('rejects a weak new PIN', async () => {
    renderModal();

    const inputs = screen.getAllByPlaceholderText(ar.fpAnswerPlaceholder);
    fireEvent.change(inputs[0], { target: { value: 'أحمد' } });
    fireEvent.change(inputs[1], { target: { value: 'الرياض' } });
    fireEvent.click(screen.getByRole('button', { name: ar.fpVerifyBtn }));
    await screen.findByText(ar.fpNewPinTitle);

    const pinInputs = [screen.getByLabelText(ar.fpNewPinLabel), screen.getByLabelText(ar.fpNewPinConfirmLabel)];
    fireEvent.change(pinInputs[0], { target: { value: '1234' } });
    fireEvent.change(pinInputs[1], { target: { value: '1234' } });
    fireEvent.click(screen.getByRole('button', { name: ar.fpSubmitBtn }));

    expect(screen.getAllByText(ar.fpPinWeak)).toHaveLength(2);
  });

  it('rejects mismatched new PINs', async () => {
    renderModal();

    const inputs = screen.getAllByPlaceholderText(ar.fpAnswerPlaceholder);
    fireEvent.change(inputs[0], { target: { value: 'أحمد' } });
    fireEvent.change(inputs[1], { target: { value: 'الرياض' } });
    fireEvent.click(screen.getByRole('button', { name: ar.fpVerifyBtn }));
    await screen.findByText(ar.fpNewPinTitle);

    const pinInputs = [screen.getByLabelText(ar.fpNewPinLabel), screen.getByLabelText(ar.fpNewPinConfirmLabel)];
    fireEvent.change(pinInputs[0], { target: { value: '5814' } });
    fireEvent.change(pinInputs[1], { target: { value: '5815' } });
    fireEvent.click(screen.getByRole('button', { name: ar.fpSubmitBtn }));

    expect(screen.getByText(ar.fpPinMismatch)).toBeInTheDocument();
  });
});
