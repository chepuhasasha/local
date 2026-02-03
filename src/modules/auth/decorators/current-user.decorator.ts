import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import type { AuthenticatedRequest } from '@/modules/auth/guards/access-token.guard';
import type { AuthenticatedUser } from '@/modules/auth/types/auth.types';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser | null => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.auth ?? null;
  },
);
