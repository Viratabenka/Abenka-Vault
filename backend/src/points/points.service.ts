import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ContributionType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const DEFAULT_WEIGHTS = { timeWeight: 1, cashWeight: 0.001, otherWeight: 1 };

export interface PointsInput {
  type: ContributionType;
  hours?: number;
  amount?: number;
  otherPoints?: number;
  projectId: string;
}

@Injectable()
export class PointsService {
  constructor(private readonly prisma: PrismaService) {}

  async getWeights(projectId: string | null): Promise<{ timeWeight: number; cashWeight: number; otherWeight: number }> {
    const config = await this.prisma.weightsConfig.findFirst({
      where: projectId ? { projectId } : { scope: 'company', projectId: null },
    });
    if (!config) return DEFAULT_WEIGHTS;
    return {
      timeWeight: Number(config.timeWeight),
      cashWeight: Number(config.cashWeight),
      otherWeight: Number(config.otherWeight),
    };
  }

  async setWeights(
    projectId: string | null,
    timeWeight: number,
    cashWeight: number,
    otherWeight: number,
  ) {
    const scope = projectId ? 'project' : 'company';
    return this.prisma.weightsConfig.upsert({
      where: {
        scope_projectId: { scope, projectId: projectId ?? (undefined as unknown as string) },
      },
      create: {
        scope,
        projectId,
        timeWeight: new Decimal(timeWeight),
        cashWeight: new Decimal(cashWeight),
        otherWeight: new Decimal(otherWeight),
      },
      update: {
        timeWeight: new Decimal(timeWeight),
        cashWeight: new Decimal(cashWeight),
        otherWeight: new Decimal(otherWeight),
      },
    });
  }

  async computePointsForEntry(input: PointsInput): Promise<number> {
    const w = await this.getWeights(input.projectId);
    let p = 0;
    if (input.hours != null) p += input.hours * w.timeWeight;
    if (input.amount != null) p += input.amount * w.cashWeight;
    if (input.otherPoints != null) p += input.otherPoints * w.otherWeight;
    return Math.round(p * 100) / 100;
  }

  async recalculateProject(projectId: string): Promise<{ userId: string; totalPoints: number }[]> {
    const weights = await this.getWeights(projectId);
    const contributions = await this.prisma.contribution.findMany({
      where: { projectId },
    });
    const byUser = new Map<string, number>();
    for (const c of contributions) {
      let p = 0;
      if (c.hours != null) p += Number(c.hours) * weights.timeWeight;
      if (c.amount != null) p += Number(c.amount) * weights.cashWeight;
      if (c.otherPoints != null) p += Number(c.otherPoints) * weights.otherWeight;
      p = Math.round(p * 100) / 100;
      await this.prisma.contribution.update({
        where: { id: c.id },
        data: { points: new Decimal(p) },
      });
      const prev = byUser.get(c.userId) ?? 0;
      byUser.set(c.userId, prev + p);
    }
    return Array.from(byUser.entries()).map(([userId, totalPoints]) => ({ userId, totalPoints }));
  }

  async recalculateCompany(): Promise<{ userId: string; totalPoints: number }[]> {
    const weights = await this.getWeights(null);
    const contributions = await this.prisma.contribution.findMany();
    const byUser = new Map<string, number>();
    for (const c of contributions) {
      let p = 0;
      if (c.hours != null) p += Number(c.hours) * weights.timeWeight;
      if (c.amount != null) p += Number(c.amount) * weights.cashWeight;
      if (c.otherPoints != null) p += Number(c.otherPoints) * weights.otherWeight;
      p = Math.round(p * 100) / 100;
      await this.prisma.contribution.update({
        where: { id: c.id },
        data: { points: new Decimal(p) },
      });
      const prev = byUser.get(c.userId) ?? 0;
      byUser.set(c.userId, prev + p);
    }
    return Array.from(byUser.entries()).map(([userId, totalPoints]) => ({ userId, totalPoints }));
  }
}
