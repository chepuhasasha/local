import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';

describe('CurrentUser decorator', () => {
  it('returns a parameter decorator factory', () => {
    const decorator = (CurrentUser as any)();
    expect(typeof decorator).toBe('function');
  });
});
