import { describe, it, expect } from 'vitest';
import {
  SECURITY_QUESTIONS,
  MIN_SECURITY_QUESTIONS,
  normalizeAnswer,
  isValidAnswer,
  validateSecurityQuestionSet,
  canAttemptRecovery,
  recordFailedAttempt,
  resetAttemptState,
  MAX_RECOVERY_ATTEMPTS,
} from './securityQuestions';

describe('securityQuestions', () => {
  it('exposes exactly 10 predefined questions with ar/en text', () => {
    expect(SECURITY_QUESTIONS).toHaveLength(10);
    for (const q of SECURITY_QUESTIONS) {
      expect(q.id).toMatch(/^sq_\d{2}$/);
      expect(q.ar.length).toBeGreaterThan(0);
      expect(q.en.length).toBeGreaterThan(0);
    }
    const ids = SECURITY_QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('normalizes answers (trims and lowercases)', () => {
    expect(normalizeAnswer('  محمد  ')).toBe('محمد');
    expect(normalizeAnswer('JEDDAH')).toBe('jeddah');
    expect(normalizeAnswer('  AhaD ')).toBe('ahad');
  });

  it('isValidAnswer rejects empty or overlong answers', () => {
    expect(isValidAnswer('  ')).toBe(false);
    expect(isValidAnswer('x'.repeat(101))).toBe(false);
    expect(isValidAnswer('جدة')).toBe(true);
  });

  it('MIN_SECURITY_QUESTIONS is 2', () => {
    expect(MIN_SECURITY_QUESTIONS).toBe(2);
  });

  it('validateSecurityQuestionSet passes with two distinct answered questions', () => {
    const errors = validateSecurityQuestionSet([
      { questionId: 'sq_01', answer: 'جدة' },
      { questionId: 'sq_02', answer: 'ريال' },
    ]);
    expect(errors).toEqual({});
  });

  it('rejects fewer than the minimum number of questions', () => {
    const errors = validateSecurityQuestionSet([{ questionId: 'sq_01', answer: 'جدة' }]);
    expect(errors.count).toBe('min');
  });

  it('rejects duplicate questions', () => {
    const errors = validateSecurityQuestionSet([
      { questionId: 'sq_01', answer: 'جدة' },
      { questionId: 'sq_01', answer: 'الرياض' },
    ]);
    expect(errors['question.1.questionId']).toBe('taken');
  });

  it('rejects empty answers', () => {
    const errors = validateSecurityQuestionSet([
      { questionId: 'sq_01', answer: '' },
      { questionId: 'sq_02', answer: '  ' },
    ]);
    expect(errors['question.0.answer']).toBe('required');
    expect(errors['question.1.answer']).toBe('required');
  });

  it('rejects missing question ids', () => {
    const errors = validateSecurityQuestionSet([
      { questionId: '', answer: 'جدة' },
      { questionId: 'sq_02', answer: 'الرياض' },
    ]);
    expect(errors['question.0.questionId']).toBe('required');
  });

  it('allows attempts under the limit and locks after max attempts', () => {
    const fresh = resetAttemptState();
    expect(canAttemptRecovery(fresh)).toBe(true);

    let state = fresh;
    for (let i = 0; i < MAX_RECOVERY_ATTEMPTS; i++) {
      expect(canAttemptRecovery(state)).toBe(true);
      state = recordFailedAttempt(state);
    }
    expect(canAttemptRecovery(state)).toBe(false);
  });

  it('unlocks after the lockout window passes', () => {
    const now = 1_000_000;
    let state = resetAttemptState();
    for (let i = 0; i < MAX_RECOVERY_ATTEMPTS; i++) {
      state = recordFailedAttempt(state, now);
    }
    expect(canAttemptRecovery(state, now)).toBe(false);
    const later = state.lockedUntil! + 1;
    expect(canAttemptRecovery(state, later)).toBe(true);
  });
});
