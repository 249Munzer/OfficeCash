import { describe, it, expect } from 'vitest';
import {
  hashCredential,
  verifyCredential,
  isNewFormat,
  isUpgradable,
  sha256Hex,
} from './credentials';

describe('credentials', () => {
  it('hashCredential produces the new format sha256$salt$hash', async () => {
    const stored = await hashCredential('1234');
    expect(isNewFormat(stored)).toBe(true);
    expect(stored.startsWith('sha256$')).toBe(true);
    expect(stored.split('$')).toHaveLength(3);
  });

  it('hashCredential is salted (same input yields different hashes)', async () => {
    const a = await hashCredential('1234');
    const b = await hashCredential('1234');
    expect(a).not.toBe(b);
  });

  it('verifyCredential accepts a correct new-format PIN', async () => {
    const stored = await hashCredential('4321');
    const { valid, upgradable } = await verifyCredential(stored, '4321');
    expect(valid).toBe(true);
    expect(upgradable).toBe(false);
  });

  it('verifyCredential rejects a wrong new-format PIN', async () => {
    const stored = await hashCredential('4321');
    const { valid } = await verifyCredential(stored, '9999');
    expect(valid).toBe(false);
  });

  it('verifyCredential accepts a plain legacy PIN and flags upgradable', async () => {
    const { valid, upgradable } = await verifyCredential('1234', '1234');
    expect(valid).toBe(true);
    expect(upgradable).toBe(true);
  });

  it('verifyCredential rejects a wrong plain PIN', async () => {
    const { valid } = await verifyCredential('1234', '0000');
    expect(valid).toBe(false);
  });

  it('verifyCredential accepts a legacy SHA-256 hex hash and flags upgradable', async () => {
    const legacy = await sha256Hex('1234OfficeCash-2026-Secure-Salt-v1');
    const { valid, upgradable } = await verifyCredential(legacy, '1234');
    expect(valid).toBe(true);
    expect(upgradable).toBe(true);
  });

  it('verifyCredential rejects empty/missing stored value', async () => {
    expect((await verifyCredential(null, '1234')).valid).toBe(false);
    expect((await verifyCredential(undefined, '1234')).valid).toBe(false);
    expect((await verifyCredential('', '1234')).valid).toBe(false);
  });

  it('verifyCredential rejects malformed new-format strings', async () => {
    const { valid } = await verifyCredential('sha256$bad', '1234');
    expect(valid).toBe(false);
  });

  it('isUpgradable reflects whether the stored value uses legacy format', async () => {
    expect(isUpgradable('1234')).toBe(true);
    expect(isUpgradable(await hashCredential('1234'))).toBe(false);
    expect(isUpgradable(null)).toBe(false);
  });

  it('sha256Hex computes a 64-char hex digest deterministically', async () => {
    const a = await sha256Hex('hello');
    const b = await sha256Hex('hello');
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
});
