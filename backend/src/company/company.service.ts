import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EquityService } from '../equity/equity.service';
import { RevenueService } from '../revenue/revenue.service';
import { SalesService } from '../sales/sales.service';
import { Role } from '@prisma/client';

const NOTIONAL_RATE_PER_HOUR = 1500;

@Injectable()
export class CompanyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly equity: EquityService,
    private readonly revenue: RevenueService,
    private readonly sales: SalesService,
  ) {}

  async getDashboard(userId: string, role: Role) {
    if (role === Role.FOUNDER) {
      return this.getFounderDashboard(userId);
    }
    return this.getAdminDashboard();
  }

  /** Returns founder-wise contribution hours for chart: All projects + per project (TIME only). */
  async getContributionHoursByProject(): Promise<
    Array<{ projectId: string | null; projectName: string; byFounder: Array<{ userId: string; name: string; hours: number }> }>
  > {
    const [users, projects, timeContributionsByProject] = await Promise.all([
      this.prisma.user.findMany({ select: { id: true, name: true } }),
      this.prisma.project.findMany({ select: { id: true, name: true } }),
      this.prisma.contribution.findMany({
        where: { type: 'TIME' },
        select: { userId: true, projectId: true, hours: true },
      }),
    ]);
    const byProjectMap = new Map<string, Map<string, number>>();
    const allByUser = new Map<string, number>();
    for (const c of timeContributionsByProject) {
      const projId = c.projectId;
      if (!byProjectMap.has(projId)) byProjectMap.set(projId, new Map());
      const userMap = byProjectMap.get(projId)!;
      const h = Number(c.hours ?? 0);
      userMap.set(c.userId, (userMap.get(c.userId) ?? 0) + h);
      allByUser.set(c.userId, (allByUser.get(c.userId) ?? 0) + h);
    }
    const projectList = projects.map((p) => ({ id: p.id, name: p.name }));
    return [
      {
        projectId: null,
        projectName: 'All projects',
        byFounder: users.map((u) => ({
          userId: u.id,
          name: u.name,
          hours: Math.round((allByUser.get(u.id) ?? 0) * 100) / 100,
        })),
      },
      ...projectList.map((p) => ({
        projectId: p.id,
        projectName: p.name,
        byFounder: users.map((u) => ({
          userId: u.id,
          name: u.name,
          hours: Math.round((byProjectMap.get(p.id)?.get(u.id) ?? 0) * 100) / 100,
        })),
      })),
    ];
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

    const currentPhase = phases[0] ?? null;
    const phaseMultiplier = currentPhase?.salesWeightageMultiplier != null ? Number(currentPhase.salesWeightageMultiplier) : null;
    let salesTotals = { byUserId: new Map<string, { notional: number; hours: number }>(), totalNotional: 0, totalHours: 0 };
    try {
      salesTotals = await this.sales.getSalesDerivedTotals(phaseMultiplier);
    } catch {
      // Sales module may not be ready
    }

    const timeHoursTotal = timeContributions.reduce((s, c) => s + Number(c.hours ?? 0), 0);
    const byUserHours = new Map<string, number>();
    for (const c of timeContributions) {
      byUserHours.set(c.userId, (byUserHours.get(c.userId) ?? 0) + Number(c.hours ?? 0));
    }
    for (const [uid, { hours }] of salesTotals.byUserId) {
      byUserHours.set(uid, (byUserHours.get(uid) ?? 0) + hours);
    }
    const totalCompanyHours = timeHoursTotal + salesTotals.totalHours;
    const founderHours = byUserHours.get(userId) ?? 0;
    const equityPoolQty = currentPhase?.equityPoolQty ?? 1500;
    const allocatedEquity =
      totalCompanyHours > 0 ? (founderHours / totalCompanyHours) * equityPoolQty : 0;
    const equityPercent = totalCompanyHours > 0 ? (founderHours / totalCompanyHours) * 100 : 0;

    const timeHoursForUser = timeContributions.filter((c) => c.userId === userId).reduce((s, c) => s + Number(c.hours ?? 0), 0);
    const myTotalPoints = allContributionsForUser.reduce((s, c) => s + Number(c.points ?? 0), 0);
    const salesNotionalForUser = salesTotals.byUserId.get(userId)?.notional ?? 0;
    const notionalIncome = timeHoursForUser * NOTIONAL_RATE_PER_HOUR + salesNotionalForUser;
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
    const [users, projects, contributions, timeContributions, timeContributionsByProject, executedPayoutsByUser, capTable, payouts, phases] = await Promise.all([
      this.prisma.user.findMany({
        select: { id: true, name: true, email: true, role: true },
      }),
      this.prisma.project.findMany({
        include: { owner: { select: { id: true, name: true } }, members: { include: { user: { select: { id: true, name: true } } } } },
      }),
      this.prisma.contribution.groupBy({
        by: ['userId'],
        _count: { id: true },
        _sum: { points: true },
      }),
      this.prisma.contribution.findMany({
        where: { type: 'TIME' },
        select: { userId: true, hours: true, points: true },
      }),
      this.prisma.contribution.findMany({
        where: { type: 'TIME' },
        select: { userId: true, projectId: true, hours: true },
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

    const currentPhase = phases[0] ?? null;
    const phaseMultiplier = currentPhase?.salesWeightageMultiplier != null ? Number(currentPhase.salesWeightageMultiplier) : null;
    let salesTotals = { byUserId: new Map<string, { notional: number; hours: number }>(), totalNotional: 0, totalHours: 0 };
    try {
      salesTotals = await this.sales.getSalesDerivedTotals(phaseMultiplier);
    } catch {
      // Sales module may not be ready
    }

    const timeHoursTotal = timeContributions.reduce((s, c) => s + Number(c.hours ?? 0), 0);
    const byUserHours = new Map<string, number>();
    for (const c of timeContributions) {
      byUserHours.set(c.userId, (byUserHours.get(c.userId) ?? 0) + Number(c.hours ?? 0));
    }
    for (const [uid, { hours }] of salesTotals.byUserId) {
      byUserHours.set(uid, (byUserHours.get(uid) ?? 0) + hours);
    }
    const totalCompanyHours = timeHoursTotal + salesTotals.totalHours;
    const withdrawnByUser = new Map(executedPayoutsByUser.map((p) => [p.userId, Number(p._sum.amount ?? 0)]));
    const equityPoolQty = currentPhase?.equityPoolQty ?? 1500;

    const founderSummary = users.map((u) => {
      const totalHours = byUserHours.get(u.id) ?? 0;
      const timeHoursForUser = timeContributions.filter((c) => c.userId === u.id).reduce((s, c) => s + Number(c.hours ?? 0), 0);
      const salesHoursForUser = salesTotals.byUserId.get(u.id)?.hours ?? 0;
      const salesNotionalForUser = salesTotals.byUserId.get(u.id)?.notional ?? 0;
      const allocatedEquity =
        totalCompanyHours > 0 ? (totalHours / totalCompanyHours) * equityPoolQty : 0;
      const equityPercent = totalCompanyHours > 0 ? (totalHours / totalCompanyHours) * 100 : 0;
      const notionalIncome = timeHoursForUser * NOTIONAL_RATE_PER_HOUR + salesNotionalForUser;
      const withdrawnIncome = withdrawnByUser.get(u.id) ?? 0;
      const balanceAbenka = notionalIncome - withdrawnIncome;
      const contrib = contributions.find((c) => c.userId === u.id);
      const contributionCount = contrib ? contrib._count.id : 0;
      const totalPoints = contrib && contrib._sum.points != null ? Number(contrib._sum.points) : 0;
      return {
        userId: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        totalHours: Math.round(Number(totalHours) * 100) / 100,
        hoursFromProjects: Math.round(Number(timeHoursForUser) * 100) / 100,
        hoursFromSales: Math.round(Number(salesHoursForUser) * 100) / 100,
        totalPoints,
        contributionCount,
        allocatedEquity: Math.round(allocatedEquity * 100) / 100,
        equityPercent: Math.round(equityPercent * 100) / 100,
        notionalIncome: Math.round(notionalIncome * 100) / 100,
        withdrawnIncome: Math.round(withdrawnIncome * 100) / 100,
        balanceAbenka: Math.round(balanceAbenka * 100) / 100,
      };
    });

    const contributionCountByUser = new Map(contributions.map((c) => [c.userId, c._count.id]));
    const totalPointsByUser = new Map(
      contributions.map((c) => [c.userId, c._sum.points != null ? Number(c._sum.points) : 0]),
    );
    const topContributors = users
      .map((u) => ({
        userId: u.id,
        totalPoints: totalPointsByUser.get(u.id) ?? 0,
        contributionCount: contributionCountByUser.get(u.id) ?? 0,
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .slice(0, 10);
    const userNames = new Map(users.map((u) => [u.id, u.name]));

    const byProjectMap = new Map<string, Map<string, number>>();
    const allByUser = new Map<string, number>();
    for (const c of timeContributionsByProject) {
      const projId = c.projectId;
      if (!byProjectMap.has(projId)) byProjectMap.set(projId, new Map());
      const userMap = byProjectMap.get(projId)!;
      const h = Number(c.hours ?? 0);
      userMap.set(c.userId, (userMap.get(c.userId) ?? 0) + h);
      allByUser.set(c.userId, (allByUser.get(c.userId) ?? 0) + h);
    }
    const projectList = projects.map((p) => ({ id: p.id, name: p.name }));
    const contributionHoursByProject: Array<{
      projectId: string | null;
      projectName: string;
      byFounder: Array<{ userId: string; name: string; hours: number }>;
    }> = [
      {
        projectId: null,
        projectName: 'All projects',
        byFounder: users.map((u) => ({
          userId: u.id,
          name: u.name,
          hours: Math.round((allByUser.get(u.id) ?? 0) * 100) / 100,
        })),
      },
      ...projectList.map((p) => ({
        projectId: p.id,
        projectName: p.name,
        byFounder: users.map((u) => ({
          userId: u.id,
          name: u.name,
          hours: Math.round((byProjectMap.get(p.id)?.get(u.id) ?? 0) * 100) / 100,
        })),
      })),
    ];

    return {
      view: 'admin',
      users: users.length,
      projects: projects.length,
      capTable,
      founderSummary,
      contributionHoursByProject,
      topContributors: topContributors.map((t) => ({
        userId: t.userId,
        name: userNames.get(t.userId),
        totalPoints: t.totalPoints,
        contributionCount: t.contributionCount,
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

  /** Company health metrics for all roles (founder + admin). */
  async getCompanyHealth(): Promise<{
    totalRevenue: number;
    totalExpense: number;
    totalExecutedPayouts: number;
    totalNotionalIncome: number;
  }> {
    try {
      const [revenueSummary, payoutSum, phases, timeContributions] = await Promise.all([
        this.revenue.getCompanySummary().catch(() => this.emptyRevenueSummary()),
        this.prisma.payout.aggregate({
          where: { status: 'EXECUTED' },
          _sum: { amount: true },
        }),
        this.prisma.companyPhase.findMany({ orderBy: { sortOrder: 'asc' } }),
        this.prisma.contribution.findMany({
          where: { type: 'TIME' },
          select: { userId: true, hours: true },
        }),
      ]);
      const currentPhase = phases[0] ?? null;
      const phaseMultiplier = currentPhase?.salesWeightageMultiplier != null ? Number(currentPhase.salesWeightageMultiplier) : null;
      let salesTotals = { byUserId: new Map<string, { notional: number; hours: number }>(), totalNotional: 0, totalHours: 0 };
      try {
        salesTotals = await this.sales.getSalesDerivedTotals(phaseMultiplier);
      } catch {
        // ignore
      }
      const timeHoursByUser = new Map<string, number>();
      for (const c of timeContributions) {
        const h = Number(c.hours ?? 0);
        timeHoursByUser.set(c.userId, (timeHoursByUser.get(c.userId) ?? 0) + h);
      }
      const allUserIds = new Set([...timeHoursByUser.keys(), ...salesTotals.byUserId.keys()]);
      let totalNotionalIncome = 0;
      for (const uid of allUserIds) {
        const timeHours = timeHoursByUser.get(uid) ?? 0;
        const salesNotional = salesTotals.byUserId.get(uid)?.notional ?? 0;
        totalNotionalIncome += timeHours * NOTIONAL_RATE_PER_HOUR + salesNotional;
      }
      const totalExecutedPayouts = Number(payoutSum._sum.amount ?? 0);
      return {
        totalRevenue: revenueSummary.totalRevenue ?? 0,
        totalExpense: revenueSummary.totalExpense ?? 0,
        totalExecutedPayouts: Math.round(totalExecutedPayouts * 100) / 100,
        totalNotionalIncome: Math.round(totalNotionalIncome * 100) / 100,
      };
    } catch {
      return {
        totalRevenue: 0,
        totalExpense: 0,
        totalExecutedPayouts: 0,
        totalNotionalIncome: 0,
      };
    }
  }
}
