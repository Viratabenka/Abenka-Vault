import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import { CreateSalesDto, UpdateSalesDto } from './dto/sales.dto';
import { Decimal } from '@prisma/client/runtime/library';

const NOTIONAL_RATE_PER_HOUR = 1500;
const SALES_WEIGHTAGE_FIRST_YEAR_PERCENT = 12;
const SALES_WEIGHTAGE_FROM_SECOND_YEAR_PERCENT = 5;
const FIRST_YEAR_MONTHS = 12;

/** Per-user sales-derived notional and hours for a given phase multiplier. */
export interface SalesDerivedTotals {
  byUserId: Map<string, { notional: number; hours: number }>;
  totalNotional: number;
  totalHours: number;
}

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureProjectAccess(projectId: string, userId: string, role: Role) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { members: { select: { userId: true } } },
    });
    if (!project) throw new NotFoundException('Project not found');
    const isOwner = project.ownerId === userId;
    const isMember = project.members.some((m) => m.userId === userId);
    if (role === Role.FOUNDER && !isOwner && !isMember) {
      throw new ForbiddenException('You do not have access to this project');
    }
    return project;
  }

  private async ensureAdminOrAccountant(role: Role) {
    if (role !== Role.ADMIN && role !== Role.ACCOUNTANT) {
      throw new ForbiddenException('Only Admin or Accountant can create or edit sales entries');
    }
  }

  /** Effective sales amount: 12% in first 12 months from project start, 5% thereafter. */
  private getEffectiveSalesAmount(
    salesAmount: number,
    entryDate: Date,
    projectStartDate: Date,
  ): number {
    const start = new Date(projectStartDate);
    start.setHours(0, 0, 0, 0);
    const entry = new Date(entryDate);
    entry.setHours(0, 0, 0, 0);
    const monthsDiff = (entry.getFullYear() - start.getFullYear()) * 12 + (entry.getMonth() - start.getMonth());
    const isFirstYear = monthsDiff < FIRST_YEAR_MONTHS;
    const percent = isFirstYear ? SALES_WEIGHTAGE_FIRST_YEAR_PERCENT : SALES_WEIGHTAGE_FROM_SECOND_YEAR_PERCENT;
    return (salesAmount * percent) / 100;
  }

  async create(projectId: string, userId: string, role: Role, dto: CreateSalesDto) {
    await this.ensureAdminOrAccountant(role);
    await this.ensureProjectAccess(projectId, userId, role);
    const sum = dto.allocations.reduce((s, a) => s + a.contributionPercent, 0);
    if (Math.abs(sum - 100) > 0.01) {
      throw new BadRequestException('Sum of contribution percentages must equal 100');
    }
    const entryDate = new Date(dto.entryDate);
    return this.prisma.salesEntry.create({
      data: {
        projectId,
        periodMonth: dto.periodMonth ?? null,
        entryDate,
        salesAmount: new Decimal(dto.salesAmount),
        notes: dto.notes ?? null,
        allocations: {
          create: dto.allocations.map((a) => ({
            userId: a.userId,
            contributionPercent: new Decimal(a.contributionPercent),
          })),
        },
      },
      include: {
        allocations: { include: { user: { select: { id: true, name: true, email: true } } } },
        project: { select: { id: true, name: true, startDate: true } },
      },
    });
  }

  async findByProject(projectId: string, userId: string, role: Role) {
    await this.ensureProjectAccess(projectId, userId, role);
    return this.prisma.salesEntry.findMany({
      where: { projectId },
      include: {
        allocations: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
      orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(salesEntryId: string, userId: string, role: Role) {
    const entry = await this.prisma.salesEntry.findUnique({
      where: { id: salesEntryId },
      include: {
        project: { select: { id: true, name: true, ownerId: true }, include: { members: { select: { userId: true } } } },
        allocations: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
    });
    if (!entry) throw new NotFoundException('Sales entry not found');
    const project = entry.project;
    const isOwner = project.ownerId === userId;
    const isMember = project.members.some((m) => m.userId === userId);
    if (role === Role.FOUNDER && !isOwner && !isMember) {
      throw new ForbiddenException('You do not have access to this sales entry');
    }
    return entry;
  }

  async update(salesEntryId: string, userId: string, role: Role, dto: UpdateSalesDto) {
    await this.ensureAdminOrAccountant(role);
    const entry = await this.prisma.salesEntry.findUnique({
      where: { id: salesEntryId },
      include: { project: true },
    });
    if (!entry) throw new NotFoundException('Sales entry not found');
    await this.ensureProjectAccess(entry.projectId, userId, role);
    if (dto.allocations != null) {
      const sum = dto.allocations.reduce((s, a) => s + a.contributionPercent, 0);
      if (Math.abs(sum - 100) > 0.01) {
        throw new BadRequestException('Sum of contribution percentages must equal 100');
      }
    }
    const data: {
      periodMonth?: string | null;
      entryDate?: Date;
      salesAmount?: Decimal;
      notes?: string | null;
    } = {};
    if (dto.periodMonth !== undefined) data.periodMonth = dto.periodMonth ?? null;
    if (dto.entryDate) data.entryDate = new Date(dto.entryDate);
    if (dto.salesAmount !== undefined) data.salesAmount = new Decimal(dto.salesAmount);
    if (dto.notes !== undefined) data.notes = dto.notes ?? null;

    if (dto.allocations != null) {
      await this.prisma.salesAllocation.deleteMany({ where: { salesEntryId } });
      if (Object.keys(data).length > 0) {
        await this.prisma.salesEntry.update({ where: { id: salesEntryId }, data });
      }
      await this.prisma.salesAllocation.createMany({
        data: dto.allocations.map((a) => ({
          salesEntryId,
          userId: a.userId,
          contributionPercent: a.contributionPercent,
        })),
      });
    } else if (Object.keys(data).length > 0) {
      await this.prisma.salesEntry.update({ where: { id: salesEntryId }, data });
    }
    return this.findOne(salesEntryId, userId, role);
  }

  async remove(salesEntryId: string, userId: string, role: Role) {
    await this.ensureAdminOrAccountant(role);
    const entry = await this.prisma.salesEntry.findUnique({ where: { id: salesEntryId } });
    if (!entry) throw new NotFoundException('Sales entry not found');
    await this.ensureProjectAccess(entry.projectId, userId, role);
    return this.prisma.salesEntry.delete({ where: { id: salesEntryId } });
  }

  /**
   * Aggregate sales-derived notional and hours per user for dashboard.
   * Uses current phase multiplier (from first phase in sort order).
   */
  async getSalesDerivedTotals(phaseMultiplier: number | null): Promise<SalesDerivedTotals> {
    const multiplier = phaseMultiplier ?? 1;
    const entries = await this.prisma.salesEntry.findMany({
      include: {
        allocations: true,
        project: { select: { startDate: true } },
      },
    });
    const byUserId = new Map<string, { notional: number; hours: number }>();
    let totalNotional = 0;
    let totalHours = 0;
    for (const e of entries) {
      const effectiveAmount = this.getEffectiveSalesAmount(
        Number(e.salesAmount),
        e.entryDate,
        e.project.startDate,
      );
      for (const a of e.allocations) {
        const notional = effectiveAmount * (Number(a.contributionPercent) / 100) * multiplier;
        const hours = notional / NOTIONAL_RATE_PER_HOUR;
        const cur = byUserId.get(a.userId) ?? { notional: 0, hours: 0 };
        cur.notional += notional;
        cur.hours += hours;
        byUserId.set(a.userId, cur);
        totalNotional += notional;
        totalHours += hours;
      }
    }
    return { byUserId, totalNotional, totalHours };
  }
}
