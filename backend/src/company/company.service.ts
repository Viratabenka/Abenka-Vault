import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EquityService } from '../equity/equity.service';
import { RevenueService } from '../revenue/revenue.service';
import { Role } from '@prisma/client';

const NOTIONAL_RATE_PER_HOUR = 1500;

@Injectable()
export class CompanyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly equity: EquityService,
    private readonly revenue: RevenueService,
  ) {}

  async getDashboard(userId: string, role: Role) {
    if (role === Role.FOUNDER) {
      return this.getFounderDashboard(userId);
    }
    return this.getAdminDashboard();
  }

  private emptyRevenueSummary() {
    return {
      totalMonthlyRevenue: 0,
      totalOneTimeRevenue: 0,
      totalRevenue: 0,
      totalExpense: 0,
      netRevenue: 0,
      currentMonthRevenue: 0,
      remainingToReach15Lakh: 15_00_000,
      sproutTargetAmount: 15_00_000,
      byProject: [] as Array<{ projectId: string; projectName: string; monthlyRevenue: number; oneTimeRevenue: number; expense: number }>,
    };
  }

  /** Founder view: phases, own contribution, allocated equity (hours/totalHours * pool), notional income, withdrawn, balance */
  async getFounderDashboard(userId: string) {
    const [phases, timeContributions, allContributionsForUser, executedPayouts] = await Promise.all([
      this.prisma.companyPhase.findMany({ orderBy: { sortOrder: 'asc' } }),
      this.prisma.contribution.findMany({
        where: { type: 'TIME' },
        select: { userId: true, hours: true, points: true },
      }),
      this.prisma.contribution.findMany({
        where: { userId },
        include: { project: { select: { name: true } } },
        orderBy: { date: 'desc' },
      }),
      this.prisma.payout.findMany({
        where: { userId, status: 'EXECUTED' },
        select: { amount: true },
      }),
    ]);
    let revenueSummary = this.emptyRevenueSummary();
    try {
      revenueSummary = await this.revenue.getCompanySummary();
    } catch {
      // Revenue table or Prisma client may not be ready (e.g. after migration without generate)
    }

    const totalCompanyHours = timeContributions.reduce((s, c) => s + Number(c.hours ?? 0), 0);
    const byUserHours = new Map<string, number>();
    for (const c of timeContributions) {
      byUserHours.set(c.userId, (byUserHours.get(c.userId) ?? 0) + Number(c.hours ?? 0));
    }
    const founderHours = byUserHours.get(userId) ?? 0;
    const currentPhase = phases[0] ?? null;
    const equityPoolQty = currentPhase?.equityPoolQty ?? 1500;
    const allocatedEquity =
      totalCompanyHours > 0 ? (founderHours / totalCompanyHours) * equityPoolQty : 0;
    const equityPercent = totalCompanyHours > 0 ? (founderHours / totalCompanyHours) * 100 : 0;

    const myTotalPoints = allContributionsForUser.reduce((s, c) => s + Number(c.points ?? 0), 0);
    const notionalIncome = founderHours * NOTIONAL_RATE_PER_HOUR;
    const withdrawnIncome = executedPayouts.reduce((s, p) => s + Number(p.amount), 0);
    const balanceAbenka = notionalIncome - withdrawnIncome;

    return {
      view: 'founder',
      phases: phases.map((p) => ({
        id: p.id,
        name: p.name,
        equityPoolPercent: p.equityPoolPercent != null ? Number(p.equityPoolPercent) : null,
        equityPoolQty: p.equityPoolQty,
        monthlySalesTargetLabel: p.monthlySalesTargetLabel,
        salesWeightageMultiplier: p.salesWeightageMultiplier != null ? Number(p.salesWeightageMultiplier) : null,
        notionalSalaryNotes: p.notionalSalaryNotes,
      })),
      currentPhaseName: currentPhase?.name ?? 'Sprout',
      totalEquityInPool: equityPoolQty,
      totalCompanyHours,
      myContribution: {
        totalHours: founderHours,
        totalPoints: myTotalPoints,
        contributionCount: allContributionsForUser.length,
        recentContributions: allContributionsForUser.slice(0, 20).map((c) => ({
          date: c.date,
          projectName: c.project.name,
          type: c.type,
          hours: c.hours != null ? Number(c.hours) : null,
          amount: c.amount != null ? Number(c.amount) : null,
          points: c.points != null ? Number(c.points) : null,
        })),
      },
      allocatedEquity: Math.round(allocatedEquity * 100) / 100,
      equityPercent: Math.round(equityPercent * 100) / 100,
      notionalIncome: Math.round(notionalIncome * 100) / 100,
      withdrawnIncome: Math.round(withdrawnIncome * 100) / 100,
      balanceAbenka: Math.round(balanceAbenka * 100) / 100,
      revenueSummary,
    };
  }

  async getAdminDashboard() {
    const [users, projects, contributions, timeContributions, executedPayoutsByUser, capTable, payouts, phases] = await Promise.all([
      this.prisma.user.findMany({
        select: { id: true, name: true, email: true, role: true },
      }),
      this.prisma.project.findMany({
        include: { owner: { select: { id: true, name: true } }, members: { include: { user: { select: { id: true, name: true } } } } },
      }),
      this.prisma.contribution.groupBy({
        by: ['userId'],
        _sum: { points: true },
        _count: { id: true },
      }),
      this.prisma.contribution.findMany({
        where: { type: 'TIME' },
        select: { userId: true, hours: true },
      }),
      this.prisma.payout.groupBy({
        by: ['userId'],
        _sum: { amount: true },
        where: { status: 'EXECUTED' },
      }),
      this.equity.getCapTable(undefined),
      this.prisma.payout.findMany({
        where: { status: 'PENDING' },
        include: { user: { select: { id: true, name: true } } },
      }),
      this.prisma.companyPhase.findMany({ orderBy: { sortOrder: 'asc' } }),
    ]);
    let revenueSummary = this.emptyRevenueSummary();
    try {
      revenueSummary = await this.revenue.getCompanySummary();
    } catch {
      // Revenue table or Prisma client may not be ready
    }

    const totalCompanyHours = timeContributions.reduce((s, c) => s + Number(c.hours ?? 0), 0);
    const byUserHours = new Map<string, number>();
    for (const c of timeContributions) {
      byUserHours.set(c.userId, (byUserHours.get(c.userId) ?? 0) + Number(c.hours ?? 0));
    }
    const withdrawnByUser = new Map(executedPayoutsByUser.map((p) => [p.userId, Number(p._sum.amount ?? 0)]));
    const currentPhase = phases[0] ?? null;
    const equityPoolQty = currentPhase?.equityPoolQty ?? 1500;

    const founderSummary = users.map((u) => {
      const totalHours = byUserHours.get(u.id) ?? 0;
      const allocatedEquity =
        totalCompanyHours > 0 ? (totalHours / totalCompanyHours) * equityPoolQty : 0;
      const equityPercent = totalCompanyHours > 0 ? (totalHours / totalCompanyHours) * 100 : 0;
      const notionalIncome = totalHours * NOTIONAL_RATE_PER_HOUR;
      const withdrawnIncome = withdrawnByUser.get(u.id) ?? 0;
      const balanceAbenka = notionalIncome - withdrawnIncome;
      const contrib = contributions.find((c) => c.userId === u.id);
      const totalPoints = contrib ? Number(contrib._sum.points ?? 0) : 0;
      const contributionCount = contrib ? contrib._count.id : 0;
      return {
        userId: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        totalHours: Math.round(totalHours * 100) / 100,
        totalPoints: Math.round(totalPoints * 100) / 100,
        contributionCount,
        allocatedEquity: Math.round(allocatedEquity * 100) / 100,
        equityPercent: Math.round(equityPercent * 100) / 100,
        notionalIncome: Math.round(notionalIncome * 100) / 100,
        withdrawnIncome: Math.round(withdrawnIncome * 100) / 100,
        balanceAbenka: Math.round(balanceAbenka * 100) / 100,
      };
    });

    const topContributors = contributions
      .map((c) => ({
        userId: c.userId,
        totalPoints: Number(c._sum.points ?? 0),
        contributionCount: c._count.id,
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .slice(0, 10);
    const userNames = new Map(users.map((u) => [u.id, u.name]));
    return {
      view: 'admin',
      users: users.length,
      projects: projects.length,
      capTable,
      founderSummary,
      topContributors: topContributors.map((t) => ({
        ...t,
        name: userNames.get(t.userId),
      })),
      pendingPayouts: payouts,
      revenueSummary,
      phases: phases.map((p) => ({
        id: p.id,
        name: p.name,
        equityPoolPercent: p.equityPoolPercent != null ? Number(p.equityPoolPercent) : null,
        equityPoolQty: p.equityPoolQty,
        monthlySalesTargetLabel: p.monthlySalesTargetLabel,
        salesWeightageMultiplier: p.salesWeightageMultiplier != null ? Number(p.salesWeightageMultiplier) : null,
        notionalSalaryNotes: p.notionalSalaryNotes,
      })),
    };
  }
}
