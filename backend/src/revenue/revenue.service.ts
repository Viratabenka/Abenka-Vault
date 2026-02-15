import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import { CreateRevenueEntryDto, UpdateRevenueEntryDto } from './dto/revenue.dto';
import { RevenueEntryType } from '@prisma/client';

@Injectable()
export class RevenueService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRevenueEntryDto, userId: string, role: Role) {
    this.ensureAdmin(role);
    await this.ensureProjectExists(dto.projectId);
    return this.prisma.projectRevenueEntry.create({
      data: {
        projectId: dto.projectId,
        type: dto.type as RevenueEntryType,
        amount: dto.amount,
        periodMonth: dto.periodMonth ?? null,
        entryDate: new Date(dto.entryDate),
        notes: dto.notes ?? null,
      },
      include: { project: { select: { id: true, name: true } } },
    });
  }

  async findAll(userId: string, role: Role) {
    this.ensureAdmin(role);
    const [projects, entries] = await Promise.all([
      this.prisma.project.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.projectRevenueEntry.findMany({
        include: { project: { select: { id: true, name: true } } },
        orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
      }),
    ]);
    return { projects, entries };
  }

  async findByProject(projectId: string, userId: string, role: Role) {
    this.ensureAdmin(role);
    await this.ensureProjectExists(projectId);
    return this.prisma.projectRevenueEntry.findMany({
      where: { projectId },
      orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async update(id: string, dto: UpdateRevenueEntryDto, userId: string, role: Role) {
    this.ensureAdmin(role);
    const existing = await this.prisma.projectRevenueEntry.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Revenue entry not found');
    return this.prisma.projectRevenueEntry.update({
      where: { id },
      data: {
        type: dto.type as RevenueEntryType | undefined,
        amount: dto.amount,
        periodMonth: dto.periodMonth,
        entryDate: dto.entryDate ? new Date(dto.entryDate) : undefined,
        notes: dto.notes,
      },
      include: { project: { select: { id: true, name: true } } },
    });
  }

  async remove(id: string, userId: string, role: Role) {
    this.ensureAdmin(role);
    const existing = await this.prisma.projectRevenueEntry.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Revenue entry not found');
    return this.prisma.projectRevenueEntry.delete({ where: { id } });
  }

  /** Sprout phase target: 15 lakh per month */
  static readonly SPROUT_TARGET_LAKH = 15;
  static readonly SPROUT_TARGET_AMOUNT = 15_00_000;

  /** Company-wide summary: revenue/expense from entries; phase monthly revenue from project pipeline (one-time per project). */
  async getCompanySummary() {
    const [entries, projects] = await Promise.all([
      this.prisma.projectRevenueEntry.findMany({
        select: { type: true, amount: true, projectId: true },
      }),
      this.prisma.project.findMany({
        select: { id: true, name: true, monthlyRevenuePipeline: true },
      }),
    ]);
    const phaseMonthlyRevenue = projects.reduce(
      (s, p) => s + Number(p.monthlyRevenuePipeline ?? 0),
      0,
    );
    const remainingToReach15Lakh = Math.max(
      0,
      RevenueService.SPROUT_TARGET_AMOUNT - phaseMonthlyRevenue,
    );
    let totalMonthlyRevenue = 0;
    let totalOneTimeRevenue = 0;
    let totalExpense = 0;
    const byProject = new Map<string, { monthlyRevenue: number; oneTimeRevenue: number; expense: number; projectName?: string }>();

    const projectIds = [...new Set(entries.map((e) => e.projectId))];
    const projectNames = new Map(projects.map((p) => [p.id, p.name]));

    for (const e of entries) {
      const amount = Number(e.amount);
      if (!byProject.has(e.projectId)) {
        byProject.set(e.projectId, { monthlyRevenue: 0, oneTimeRevenue: 0, expense: 0, projectName: projectNames.get(e.projectId) });
      }
      const row = byProject.get(e.projectId)!;
      if (e.type === 'MONTHLY_REVENUE') {
        totalMonthlyRevenue += amount;
        row.monthlyRevenue += amount;
      } else if (e.type === 'ONE_TIME_REVENUE') {
        totalOneTimeRevenue += amount;
        row.oneTimeRevenue += amount;
      } else if (e.type === 'EXPENSE') {
        totalExpense += amount;
        row.expense += amount;
      }
    }

    const totalRevenue = totalMonthlyRevenue + totalOneTimeRevenue;
    return {
      totalMonthlyRevenue: Math.round(totalMonthlyRevenue * 100) / 100,
      totalOneTimeRevenue: Math.round(totalOneTimeRevenue * 100) / 100,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalExpense: Math.round(totalExpense * 100) / 100,
      netRevenue: Math.round((totalRevenue - totalExpense) * 100) / 100,
      currentMonthRevenue: Math.round(phaseMonthlyRevenue * 100) / 100,
      remainingToReach15Lakh: Math.round(remainingToReach15Lakh * 100) / 100,
      sproutTargetAmount: RevenueService.SPROUT_TARGET_AMOUNT,
      byProject: Array.from(byProject.entries()).map(([projectId, row]) => ({
        projectId,
        projectName: row.projectName ?? '',
        ...row,
      })),
    };
  }

  private ensureAdmin(role: Role) {
    if (role !== 'ADMIN' && role !== 'ACCOUNTANT') {
      throw new ForbiddenException('Only Admin or Accountant can manage revenue');
    }
  }

  private async ensureProjectExists(projectId: string) {
    const p = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!p) throw new NotFoundException('Project not found');
  }
}
