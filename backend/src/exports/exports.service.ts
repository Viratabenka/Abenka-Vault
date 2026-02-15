import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { stringify } from 'csv-stringify/sync';
import { Role } from '@prisma/client';
import { EquityService } from '../equity/equity.service';

@Injectable()
export class ExportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly equity: EquityService,
  ) {}

  async contributionsCsv(projectId: string | null, userId: string, role: Role): Promise<string> {
    const where = projectId ? { projectId } : {};
    if (role === 'FOUNDER') {
      (where as { userId?: string }).userId = userId;
    }
    const rows = await this.prisma.contribution.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        project: { select: { name: true } },
      },
    });
    const data = rows.map((r) => ({
      date: r.date.toISOString().slice(0, 10),
      user: r.user.name,
      email: r.user.email,
      project: r.project?.name ?? '',
      type: r.type,
      hours: r.hours?.toString() ?? '',
      amount: r.amount?.toString() ?? '',
      otherPoints: r.otherPoints?.toString() ?? '',
      points: r.points?.toString() ?? '',
      notes: r.notes ?? '',
    }));
    return stringify(data, { header: true });
  }

  async capTableCsv(projectId: string | null): Promise<string> {
    const capTable = await this.equity.getCapTable(projectId ?? undefined);
    return stringify(capTable, { header: true });
  }
}
