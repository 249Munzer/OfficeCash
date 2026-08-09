import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SettingsManager } from './SettingsManager';
import { ToastProvider } from './Toast/ToastProvider';
import { ToastContainer } from './Toast/ToastContainer';
import { translations } from '../lib/i18n';
import { OfficeSettings } from '../types';

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

function renderSettings(settings: OfficeSettings = baseSettings) {
  const onUpdateSettings = vi.fn();
  const onClearData = vi.fn();
  const onDeleteOffice = vi.fn();
  const onLogout = vi.fn();
  render(
    <ToastProvider>
      <SettingsManager
        settings={settings}
        onUpdateSettings={onUpdateSettings}
        onLogout={onLogout}
        onClearData={onClearData}
        onDeleteOffice={onDeleteOffice}
      />
      <ToastContainer />
    </ToastProvider>
  );
  return { onUpdateSettings, onClearData, onDeleteOffice, onLogout };
}

describe('SettingsManager', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
  });

  it('renders the office name in the identity summary (read-only)', () => {
    renderSettings();
    expect(screen.getByText('مكتب الأمل')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('مكتب الأمل')).not.toBeInTheDocument();
  });

  it('shows the office identity form only after clicking the edit button', () => {
    renderSettings();
    expect(screen.queryByRole('button', { name: ar.saveSettingsBtn })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: ar.editInfoBtn }));
    expect(screen.getByDisplayValue('مكتب الأمل')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: ar.saveSettingsBtn })).toBeInTheDocument();
  });

  it('renders the sync code as read-only text', () => {
    renderSettings();
    expect(screen.getByText('P2P-ABCD-2345')).toBeInTheDocument();
  });

  it('shows the em-dash placeholder when no sync code exists', () => {
    renderSettings({ ...baseSettings, networkSyncCode: undefined });
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('reflects the auto-lock-closed-days checkbox state', () => {
    renderSettings();
    fireEvent.click(screen.getByRole('button', { name: ar.editInfoBtn }));
    const checkbox = screen.getByRole('checkbox', { name: ar.autoLockClosedDaysLabel }) as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });

  it('persists auto-lock toggle and other edits via onUpdateSettings on submit', () => {
    const { onUpdateSettings } = renderSettings();
    fireEvent.click(screen.getByRole('button', { name: ar.editInfoBtn }));

    const checkbox = screen.getByRole('checkbox', { name: ar.autoLockClosedDaysLabel }) as HTMLInputElement;
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: ar.saveSettingsBtn }));

    expect(onUpdateSettings).toHaveBeenCalledTimes(1);
    const updated = onUpdateSettings.mock.calls[0][0] as OfficeSettings;
    expect(updated.autoLockClosedDays).toBe(false);
    expect(updated.officeName).toBe('مكتب الأمل');
  });

  it('discards unsaved edits when cancel is clicked', () => {
    const { onUpdateSettings } = renderSettings();
    fireEvent.click(screen.getByRole('button', { name: ar.editInfoBtn }));

    const nameInput = screen.getByDisplayValue('مكتب الأمل') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'مكتب جديد' } });

    fireEvent.click(screen.getByRole('button', { name: ar.cancel }));

    expect(onUpdateSettings).not.toHaveBeenCalled();
    expect(screen.getByText('مكتب الأمل')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('مكتب جديد')).not.toBeInTheDocument();
  });

  it('copy button writes the sync code to the clipboard', () => {
    const { onUpdateSettings } = renderSettings();
    fireEvent.click(screen.getByRole('button', { name: ar.copySyncCodeBtn }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('P2P-ABCD-2345');
    expect(onUpdateSettings).not.toHaveBeenCalled();
  });

  it('copy button is disabled when no sync code exists', () => {
    renderSettings({ ...baseSettings, networkSyncCode: undefined });
    const copyBtn = screen.getByRole('button', { name: ar.copySyncCodeBtn }) as HTMLButtonElement;
    expect(copyBtn.disabled).toBe(true);
  });

  it('rejects an invalid office name on submit with a validation toast', () => {
    const { onUpdateSettings } = renderSettings();
    fireEvent.click(screen.getByRole('button', { name: ar.editInfoBtn }));

    const nameInput = screen.getByDisplayValue('مكتب الأمل') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'م' } });

    fireEvent.click(screen.getByRole('button', { name: ar.saveSettingsBtn }));

    expect(onUpdateSettings).not.toHaveBeenCalled();
    expect(screen.getByText(ar.valErrTooShort)).toBeInTheDocument();
  });

  it('does not render the demo-data restore button anymore', () => {
    renderSettings();
    expect(screen.queryByText(ar.resetDemoBtn)).not.toBeInTheDocument();
  });

  it('requires typing the exact office name before clearing data (multi-step danger flow)', () => {
    const { onClearData } = renderSettings();

    fireEvent.click(screen.getByRole('button', { name: ar.dangerDeleteDataBtn }));
    expect(screen.getByText(ar.dangerStepWarningTitle)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: ar.dangerContinueBtn }));

    const input = screen.getByPlaceholderText(ar.dangerStepTypePlaceholder) as HTMLInputElement;
    const continueBtn = screen.getByRole('button', { name: ar.dangerContinueBtn }) as HTMLButtonElement;

    fireEvent.change(input, { target: { value: 'اسم غير مطابق' } });
    expect(continueBtn.disabled).toBe(true);
    expect(screen.getByText(ar.dangerStepTypeMismatch)).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'مكتب الأمل' } });
    expect(continueBtn.disabled).toBe(false);
    fireEvent.click(continueBtn);

    fireEvent.click(screen.getByRole('button', { name: ar.dangerFinalClearBtn }));
    expect(onClearData).toHaveBeenCalledTimes(1);
  });

  it('does not clear data when the final step is cancelled', () => {
    const { onClearData } = renderSettings();

    fireEvent.click(screen.getByRole('button', { name: ar.dangerDeleteDataBtn }));
    fireEvent.click(screen.getByRole('button', { name: ar.dangerContinueBtn }));

    const input = screen.getByPlaceholderText(ar.dangerStepTypePlaceholder) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'مكتب الأمل' } });
    fireEvent.click(screen.getByRole('button', { name: ar.dangerContinueBtn }));

    fireEvent.click(screen.getByRole('button', { name: ar.dangerBackBtn }));
    expect(onClearData).not.toHaveBeenCalled();
  });

  it('runs the office deletion action through the danger flow', () => {
    const { onDeleteOffice } = renderSettings();

    fireEvent.click(screen.getByRole('button', { name: ar.dangerDeleteOfficeBtn }));
    fireEvent.click(screen.getByRole('button', { name: ar.dangerContinueBtn }));

    const input = screen.getByPlaceholderText(ar.dangerStepTypePlaceholder) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'مكتب الأمل' } });
    fireEvent.click(screen.getByRole('button', { name: ar.dangerContinueBtn }));

    fireEvent.click(screen.getByRole('button', { name: ar.dangerFinalDeleteBtn }));
    expect(onDeleteOffice).toHaveBeenCalledTimes(1);
  });

  it('opens the privacy policy modal with translated content', () => {
    renderSettings();
    fireEvent.click(screen.getByRole('button', { name: ar.privacyPolicyBtn }));

    expect(screen.getByRole('heading', { name: ar.privacyPolicyTitle })).toBeInTheDocument();
    expect(screen.getByText(ar.privacySections[0].heading)).toBeInTheDocument();
    expect(screen.getByText(ar.privacySections[0].body)).toBeInTheDocument();
  });

  it('opens the terms of service modal and closes it', async () => {
    renderSettings();
    fireEvent.click(screen.getByRole('button', { name: ar.termsOfServiceBtn }));

    expect(screen.getByRole('heading', { name: ar.termsOfServiceTitle })).toBeInTheDocument();
    expect(screen.getByText(ar.termsSections[1].heading)).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: ar.legalCloseBtn })[1]);
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: ar.termsOfServiceTitle })).not.toBeInTheDocument()
    );
  });

  it('shows the logout button and calls onLogout on click without opening a confirmation modal', () => {
    const { onLogout } = renderSettings();

    const logoutBtn = screen.getByRole('button', { name: ar.logout });
    expect(logoutBtn).toBeInTheDocument();

    fireEvent.click(logoutBtn);
    expect(onLogout).toHaveBeenCalledTimes(1);

    expect(screen.queryByRole('heading', { name: ar.dangerZoneTitle })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: ar.dangerStepWarningTitle })).not.toBeInTheDocument();
  });

  it('disables the logout button when onLogout is not provided', () => {
    render(
      <ToastProvider>
        <SettingsManager
          settings={baseSettings}
          onUpdateSettings={vi.fn()}
          onClearData={vi.fn()}
          onDeleteOffice={vi.fn()}
        />
        <ToastContainer />
      </ToastProvider>
    );
    const logoutBtn = screen.getByRole('button', { name: ar.logout }) as HTMLButtonElement;
    expect(logoutBtn.disabled).toBe(true);
  });

  it('shows an empty state when no security questions are configured', () => {
    renderSettings();
    expect(screen.getByText(ar.settingsSecurityNone)).toBeInTheDocument();
  });

  it('lists the saved security questions in read-only mode', () => {
    renderSettings({
      ...baseSettings,
      securityQuestions: [
        { questionId: 'sq_01', answerHash: 'stored-hash-1' },
        { questionId: 'sq_02', answerHash: 'stored-hash-2' },
      ],
    });

    expect(screen.getByText('ما اسم أول معلم لديك؟')).toBeInTheDocument();
    expect(screen.getByText('ما اسم مدينتك المفضلة؟')).toBeInTheDocument();
  });

  it('saves re-entered answers as hashed security questions via onUpdateSettings', async () => {
    const { onUpdateSettings } = renderSettings({
      ...baseSettings,
      securityQuestions: [
        { questionId: 'sq_01', answerHash: 'stored-hash-1' },
        { questionId: 'sq_02', answerHash: 'stored-hash-2' },
      ],
    });

    fireEvent.click(screen.getByRole('button', { name: ar.settingsSecurityManageBtn }));

    const inputs = screen.getAllByPlaceholderText(ar.settingsSecurityAnswerReenter);
    expect(inputs).toHaveLength(2);
    fireEvent.change(inputs[0], { target: { value: 'جدة' } });
    fireEvent.change(inputs[1], { target: { value: 'الرياض' } });

    fireEvent.click(screen.getByRole('button', { name: ar.saveSettingsBtn }));

    await waitFor(() => expect(onUpdateSettings).toHaveBeenCalledTimes(1));
    const updated = onUpdateSettings.mock.calls[0][0] as OfficeSettings;
    expect(updated.securityQuestions).toHaveLength(2);
    expect(updated.securityQuestions![0].questionId).toBe('sq_01');
    expect(updated.securityQuestions![0].answerHash).not.toBe('stored-hash-1');
    expect(updated.securityQuestions![0].answerHash).not.toContain('جدة');
  });

  it('rejects duplicate security questions when saving', () => {
    renderSettings();
    fireEvent.click(screen.getByRole('button', { name: ar.settingsSecurityManageBtn }));

    const selects = screen.getAllByRole('combobox');
    const inputs = screen.getAllByPlaceholderText(ar.settingsSecurityAnswerReenter);
    fireEvent.change(selects[0], { target: { value: 'sq_01' } });
    fireEvent.change(selects[1], { target: { value: 'sq_01' } });
    fireEvent.change(inputs[0], { target: { value: 'جدة' } });
    fireEvent.change(inputs[1], { target: { value: 'الرياض' } });

    fireEvent.click(screen.getByRole('button', { name: ar.saveSettingsBtn }));

    expect(screen.getByText(ar.regErrSecurityDuplicate)).toBeInTheDocument();
  });
});
