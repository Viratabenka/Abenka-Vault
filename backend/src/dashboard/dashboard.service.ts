import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EquityService } from '../equity/equity.service';
import { PayoutsService } from '../payouts/payouts.service';
import { SalesService } from '../sales/sales.service';
import { Role } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly equity: EquityService,
    private readonly payouts: PayoutsService,
    private readonly sales: SalesService,
  ) {}

  async getFounderDashboard(userId: string, requestedUserId: string, role: Role) {
    if (role === Role.FOUNDER && userId !== requestedUserId) {
      throw new ForbiddenException('You can only view your own dashboard');
    }
    const [user, contributions, rawEquityAllocations, payouts] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: requestedUserId },
        select: { id: true, name: true, email: true, role: true, hourlyRate: true },
      }),
      this.prisma.contribution.findMany({
        where: { userId: requestedUserId },
        include: { project: { select: { id: true, name: true } } },
        orderBy: { date: 'desc' },
      }),
      this.equity.getVestingTimeline(requestedUserId),
      this.payouts.findByUser(requestedUserId),
    ]);
    if (!user) return null;

    const phases = await this.prisma.companyPhase.findMany({ orderBy: { sortOrder: 'asc' } });
    const equityPoolQty = phases[0]?.equityPoolQty ?? 1500;
    const equityAllocations = rawEquityAllocations.map((a) => ({
      ...a,
      points: a.points,
      totalPoints: a.totalPoints,
      sharesAllocated: a.sharesAllocated,
      equityQty: (Number(a.sharesAllocated) / 100) * equityPoolQty,
    }));
    const timeHours = contributions
      .filter((c) => c.type === 'TIME')
      .reduce((s, c) => s + Number(c.hours ?? 0), 0);
    let salesHoursForUser = 0;
    try {
      const phases = await this.prisma.companyPhase.findMany({ orderBy: { sortOrder: 'asc' } });
      const currentPhase = phases[0] ?? null;
      const phaseMultiplier = currentPhase?.salesWeightageMultiplier != null ? Number(currentPhase.salesWeightageMultiplier) : null;
      const salesTotals = await this.sales.getSalesDerivedTotals(phaseMultiplier);
      salesHoursForUser = salesTotals.byUserId.get(requestedUserId)?.hours ?? 0;
    } catch {
      // Sales module may not be ready
    }
    const totalHours = timeHours + salesHoursForUser;
    const totalPoints = contributions.reduce((s, c) => s + Number(c.points ?? 0), 0);
    const byProject = new Map<string, { projectName: string; hours: number; points: number; count: number }>();
    for (const c of contributions) {
      const key = c.project.id;
      const cur = byProject.get(key) ?? { projectName: c.project.name, hours: 0, points: 0, count: 0 };
      cur.hours += c.type === 'TIME' ? Number(c.hours ?? 0) : 0;
      cur.points += Number(c.points ?? 0);
      cur.count += 1;
      byProject.set(key, cur);
    }
    const summaryByProject = Array.from(byProject.entries()).map(([projectId, data]) => ({
      projectId,
      projectName: data.projectName,
      totalHours: data.hours,
      totalPoints: data.points,
      contributionCount: data.count,
    }));

    // Same live allocated-equity (units) as Company page: (my hours / total company hours) * pool
    let allocatedEquityUnits = 0;
    const timeContributionsAll = await this.prisma.contribution.findMany({
      where: { type: 'TIME' },
      select: { userId: true, hours: true },
    });
    const timeHoursTotal = timeContributionsAll.reduce((s, c) => s + Number(c.hours ?? 0), 0);
    let salesTotalHours = 0;
    try {
      const salesTotalsForPool = await this.sales.getSalesDerivedTotals(
        phases[0]?.salesWeightageMultiplier != null ? Number(phases[0].salesWeightageMultiplier) : null,
      );
      salesTotalHours = salesTotalsForPool.totalHours;
    } catch {
      // Sales module may not be ready
    }
    const totalCompanyHours = timeHoursTotal + salesTotalHours;
    if (totalCompanyHours > 0 && equityPoolQty > 0) {
      allocatedEquityUnits = (totalHours / totalCompanyHours) * equityPoolQty;
      allocatedEquityUnits = Math.round(allocatedEquityUnits * 100) / 100;
    }

    return {
      user,
      contributions,
      totalHours,
      totalPoints,
      summaryByProject,
      equityAllocations,
      vestingTimeline: equityAllocations,
      payouts,
      allocatedEquityUnits,
    };
  }
}
