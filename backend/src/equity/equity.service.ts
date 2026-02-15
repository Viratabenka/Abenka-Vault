import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

export interface CalculateEquityInput {
  projectId?: string; // null = company-wide
  vestingStart: string; // YYYY-MM-DD
  cliffMonths: number;
  vestingMonths: number;
}

@Injectable()
export class EquityService {
  constructor(private readonly prisma: PrismaService) {}

  async calculateAndAllocate(input: CalculateEquityInput) {
    const vestingStart = new Date(input.vestingStart);
    const contributions = await this.prisma.contribution.findMany({
      where: input.projectId ? { projectId: input.projectId } : undefined,
    });
    const totalPoints = contributions.reduce(
      (sum, c) => sum + Number(c.points ?? 0),
      0,
    );
    if (totalPoints === 0) return { allocations: [] };
    const byUser = new Map<string, number>();
    for (const c of contributions) {
      const prev = byUser.get(c.userId) ?? 0;
      byUser.set(c.userId, prev + Number(c.points ?? 0));
    }
    const allocations = [];
    for (const [userId, points] of byUser) {
      const sharesAllocated = (points / totalPoints) * 100;
      const alloc = await this.prisma.equityAllocation.create({
        data: {
          userId,
          points: new Decimal(points),
          totalPoints: new Decimal(totalPoints),
          sharesAllocated: new Decimal(Math.round(sharesAllocated * 10000) / 10000),
          vestingStart,
          cliffMonths: input.cliffMonths,
          vestingMonths: input.vestingMonths,
          projectId: input.projectId,
        },
      });
      allocations.push(alloc);
    }
    return { allocations };
  }

  async getCapTable(projectId?: string) {
    const allocations = await this.prisma.equityAllocation.findMany({
      where: projectId ? { projectId } : { projectId: null },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { sharesAllocated: 'desc' },
    });
    return allocations.map((a) => ({
      userId: a.userId,
      userName: a.user.name,
      userEmail: a.user.email,
      points: Number(a.points),
      totalPoints: Number(a.totalPoints),
      equityPercent: Number(a.sharesAllocated),
      vestingStart: a.vestingStart,
      cliffMonths: a.cliffMonths,
      vestingMonths: a.vestingMonths,
    }));
  }

  async getVestingTimeline(userId: string) {
    return this.prisma.equityAllocation.findMany({
      where: { userId },
      orderBy: { vestingStart: 'desc' },
    });
  }
}
