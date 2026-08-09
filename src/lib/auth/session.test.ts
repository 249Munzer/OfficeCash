import { describe, it, expect } from 'vitest';
import {
  createSession,
  getSessionExpiryMs,
  isSessionExpired,
  validateSession,
  ADMIN_SESSION_TTL_MS,
  EMPLOYEE_SESSION_TTL_MS,
} from './session';
import { AuthSession, OfficeSettings } from '../../types';

const settings: OfficeSettings = {
  officeName: 'مكتب الأمل',
  currency: 'ر.س',
  autoLockClosedDays: true,
} as OfficeSettings;

function makeSession(role: AuthSession['role'], loginTime: string, officeName = 'مكتب الأمل'): AuthSession {
  return { role, officeName, loginTime } as AuthSession;
}

describe('session', () => {
  it('creates a session with role and office name', () => {
    const session = createSession({ role: 'admin', officeName: 'X' });
    expect(session.role).toBe('admin');
    expect(session.officeName).toBe('X');
    expect(new Date(session.loginTime).getTime()).not.toBeNaN();
  });

  it('uses admin TTL of 12h for admin sessions', () => {
    expect(ADMIN_SESSION_TTL_MS).toBe(12 * 60 * 60 * 1000);
    const session = makeSession('admin', '2026-01-01T00:00:00.000Z');
    expect(getSessionExpiryMs(session)).toBe(
      new Date('2026-01-01T00:00:00.000Z').getTime() + ADMIN_SESSION_TTL_MS
    );
  });

  it('uses employee TTL of 24h for employee sessions', () => {
    expect(EMPLOYEE_SESSION_TTL_MS).toBe(24 * 60 * 60 * 1000);
    const session = makeSession('employee', '2026-01-01T00:00:00.000Z');
    expect(getSessionExpiryMs(session)).toBe(
      new Date('2026-01-01T00:00:00.000Z').getTime() + EMPLOYEE_SESSION_TTL_MS
    );
  });

  it('isSessionExpired is false before expiry and true after', () => {
    const login = new Date(Date.now() - 3600_000).toISOString();
    const session = makeSession('admin', login);
    expect(isSessionExpired(session, Date.now())).toBe(false);
    expect(isSessionExpired(session, Date.now() + ADMIN_SESSION_TTL_MS + 1)).toBe(true);
  });

  it('validateSession rejects a missing session', () => {
    expect(validateSession(null, settings)).toEqual({ valid: false, reason: 'no-session' });
  });

  it('validateSession rejects an office mismatch', () => {
    const session = makeSession('admin', new Date().toISOString(), 'مكتب آخر');
    expect(validateSession(session, settings)).toEqual({ valid: false, reason: 'office-mismatch' });
  });

  it('validateSession rejects an expired session', () => {
    const session = makeSession('employee', new Date(Date.now() - 25 * 3600_000).toISOString());
    expect(validateSession(session, settings)).toEqual({ valid: false, reason: 'expired' });
  });

  it('validateSession accepts a fresh matching session', () => {
    const session = makeSession('admin', new Date().toISOString());
    expect(validateSession(session, settings)).toEqual({ valid: true });
  });

  it('validateSession rejects when settings are missing office name', () => {
    const session = makeSession('admin', new Date().toISOString());
    expect(validateSession(session, null)).toEqual({ valid: false, reason: 'office-mismatch' });
  });
});
