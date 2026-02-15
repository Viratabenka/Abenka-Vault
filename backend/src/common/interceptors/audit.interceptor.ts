import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from '../../audit/audit.service';
import { REQUEST_USER_KEY } from '../../auth/constants';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const user = request[REQUEST_USER_KEY];
    const method = request.method;
    const url = request.url;
    const body = request.body ? { ...request.body } : undefined;
    if (body?.password) body.password = '[REDACTED]';
    if (body?.passwordHash) body.passwordHash = '[REDACTED]';

    return next.handle().pipe(
      tap({
        next: () => {
          if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
            this.audit.log({
              userId: user?.sub ?? null,
              action: `${method} ${url}`,
              entity: this.entityFromUrl(url),
              entityId: request.params?.id ?? undefined,
              payload: body,
            }).catch(() => {});
          }
        },
      }),
    );
  }

  private entityFromUrl(url: string): string | undefined {
    const match = url.match(/\/api\/([^/?]+)/);
    return match ? match[1] : undefined;
  }
}
