import { cn } from '../utils';
import { expect, describe, it } from '@jest/globals';

describe('cn utility function', () => {
  it('merges class names correctly', () => {
    // Test the cn function
    expect(cn('test', 'class')).toBe('test class');
    expect(cn('test', { active: true, disabled: false })).toBe('test active');
    expect(cn('test', ['class1', 'class2'])).toBe('test class1 class2');
  });
});