import { describe, it, expect } from 'vitest';
import { generateSyncCode } from './syncCode';

describe('generateSyncCode', () => {
  it('produces the expected P2P-XXXX-XXXX format', () => {
    for (let i = 0; i < 20; i++) {
      const code = generateSyncCode();
      expect(code).toMatch(/^P2P-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    }
  });

  it('excludes ambiguous characters 0, O, 1 and I', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateSyncCode();
      const body = code.replace('P2P-', '');
      expect(body).not.toMatch(/[01IO]/);
    }
  });

  it('produces unique codes across many generations', () => {
    const codes = new Set<string>();
    for (let i = 0; i < 500; i++) {
      codes.add(generateSyncCode());
    }
    expect(codes.size).toBe(500);
  });
});
