import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditEntry {
  userId: string | null;
  action: string;
  entity?: string;
  entityId?: string;
  payload?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(entry: AuditEntry) {
    return this.prisma.auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId,
        payload: (entry.payload ?? undefined) as object | undefined,
      },
    });
  }

  async findRecent(limit = 100, userId?: string) {
    return this.prisma.auditLog.findMany({
      where: userId ? { userId } : undefined,
      orderBy: { timestamp: 'desc' },
      take: limit,
      include: { user: { select: { id: true, email: true, name: true } } },
    });
  }
}
