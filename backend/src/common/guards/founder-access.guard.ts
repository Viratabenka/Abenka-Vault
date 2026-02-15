import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';

/**
 * RBAC: Founders can only access their own resource (e.g. /users/:id = their id).
 * Admin and Accountant can access any.
 */
@Injectable()
export class FounderAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const resourceId = request.params?.id;
    if (user?.role === Role.ADMIN || user?.role === Role.ACCOUNTANT) return true;
    if (user?.role === Role.FOUNDER && resourceId && user.sub !== resourceId) {
      throw new ForbiddenException('You can only access your own data');
    }
    return true;
  }
}
