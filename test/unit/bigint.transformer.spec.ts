import { bigintTransformer } from '@/infrastructure/database/transformers/bigint.transformer';

describe('bigintTransformer', () => {
  it('passes through null/undefined', () => {
    expect(bigintTransformer.to(null)).toBeNull();
    expect(bigintTransformer.to(undefined)).toBeUndefined();
    expect(bigintTransformer.from(null)).toBeNull();
    expect(bigintTransformer.from(undefined)).toBeUndefined();
  });

  it('serializes to string and back', () => {
    expect(bigintTransformer.to(42)).toBe('42');
    expect(bigintTransformer.to('99')).toBe('99');
    expect(bigintTransformer.from('123')).toBe(123);
    expect(bigintTransformer.from(456)).toBe(456);
  });
});
