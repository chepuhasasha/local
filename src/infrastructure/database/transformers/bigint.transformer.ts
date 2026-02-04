import type { ValueTransformer } from 'typeorm';

export const bigintTransformer: ValueTransformer = {
  to(value: number | string | null | undefined): string | null | undefined {
    if (value === null || value === undefined) {
      return value;
    }
    return String(value);
  },
  from(value: string | number | null | undefined): number | null | undefined {
    if (value === null || value === undefined) {
      return value;
    }
    return Number(value);
  },
};
