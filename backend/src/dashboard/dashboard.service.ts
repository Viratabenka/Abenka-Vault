import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EquityService } from '../equity/equity.service';
import { PayoutsService } from '../payouts/payouts.service';
import { Role } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly equity: EquityService,
    private readonly payouts: PayoutsService,
  ) {}

  async getFounderDashboard(userId: string, requestedUserId: string, role: Role) {
    if (role === Role.FOUNDER && userId !== requestedUserId) {
      throw new ForbiddenException('You can only view your own dashboard');
    }
    const [user, contributions, equityAllocations, payouts] = await Promise.all([
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
    const totalPoints = contributions.reduce((s, c) => s + Number(c.points ?? 0), 0);
    const totalHours = contributions
      .filter((c) => c.type === 'TIME')
      .reduce((s, c) => s + Number(c.hours ?? 0), 0);
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
    return {
      user,
      contributions,
      totalPoints,
      totalHours,
      summaryByProject,
      equityAllocations,
      vestingTimeline: equityAllocations,
      payouts,
    };
  }
}
