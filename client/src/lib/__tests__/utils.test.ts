import { cn } from '../utils';

describe('cn utility function', () => {
  it('combines multiple class names correctly', () => {
    // Test with simple string inputs
    expect(cn('class1', 'class2')).toBe('class1 class2');
    
    // Test with conditional class names
    expect(cn('base', true && 'active', false && 'inactive')).toBe('base active');
    
    // Test with undefined or null values
    expect(cn('base', undefined, null, 'valid')).toBe('base valid');
    
    // Test with empty strings
    expect(cn('', 'valid', '')).toBe('valid');
  });
});