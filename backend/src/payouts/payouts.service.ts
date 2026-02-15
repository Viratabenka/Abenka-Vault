import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PayoutType, PayoutStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class PayoutsService {
  constructor(private readonly prisma: PrismaService) {}

  async prepareHourlyPayouts(periodStart: string, periodEnd: string) {
    const start = new Date(periodStart);
    const end = new Date(periodEnd);
    const contributions = await this.prisma.contribution.findMany({
      where: {
        type: 'TIME',
        date: { gte: start, lte: end },
        deferToEquity: false,
      },
      include: { user: true },
    });
    const byUser = new Map<string, { hours: number; rate: number }>();
    for (const c of contributions) {
      const hours = Number(c.hours ?? 0);
      const rate = Number(c.user.hourlyRate ?? 0);
      const prev = byUser.get(c.userId) ?? { hours: 0, rate: 0 };
      byUser.set(c.userId, {
        hours: prev.hours + hours,
        rate: rate || prev.rate,
      });
    }
    const prepared = [];
    for (const [userId, { hours, rate }] of byUser) {
      const amount = hours * rate;
      if (amount <= 0) continue;
      const payout = await this.prisma.payout.create({
        data: {
          userId,
          amount: new Decimal(amount),
          type: PayoutType.HOURLY,
          status: PayoutStatus.PENDING,
          periodStart: start,
          periodEnd: end,
          date: new Date(),
        },
      });
      prepared.push(payout);
    }
    return prepared;
  }

  async allocateProfitShare(periodStart: string, periodEnd: string, totalAmount: number) {
    const allocations = await this.prisma.equityAllocation.findMany({
      where: { projectId: null },
      distinct: ['userId'],
    });
    const latestByUser = new Map<string, { sharesAllocated: number }>();
    for (const a of allocations) {
      const current = await this.prisma.equityAllocation.findFirst({
        where: { userId: a.userId, projectId: null },
        orderBy: { createdAt: 'desc' },
      });
      if (current) latestByUser.set(a.userId, { sharesAllocated: Number(current.sharesAllocated) });
    }
    const start = new Date(periodStart);
    const end = new Date(periodEnd);
    const created = [];
    for (const [userId, { sharesAllocated }] of latestByUser) {
      const amount = (totalAmount * sharesAllocated) / 100;
      const payout = await this.prisma.payout.create({
        data: {
          userId,
          amount: new Decimal(amount),
          type: PayoutType.PROFIT,
          status: PayoutStatus.PENDING,
          periodStart: start,
          periodEnd: end,
          date: new Date(),
        },
      });
      created.push(payout);
    }
    return created;
  }

  async execute(id: string) {
    const payout = await this.prisma.payout.findUnique({ where: { id } });
    if (!payout) throw new NotFoundException('Payout not found');
    return this.prisma.payout.update({
      where: { id },
      data: { status: PayoutStatus.EXECUTED },
    });
  }

  async deferToEquity(id: string, conversionRate: number) {
    return this.prisma.payout.update({
      where: { id },
      data: { status: PayoutStatus.DEFERRED_TO_EQUITY },
    });
  }

  async findByUser(userId: string) {
    return this.prisma.payout.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
    });
  }
}
