import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import { CreateContributionDto, UpdateContributionDto } from './dto/contribution.dto';

@Injectable()
export class ContributionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    projectId: string,
    userId: string,
    role: Role,
    dto: CreateContributionDto,
  ) {
    await this.ensureProjectAccess(projectId, userId, role);
    const points =
      dto.type === 'TIME'
        ? dto.hours ?? 0
        : dto.type === 'CASH'
          ? dto.amount ?? 0
          : dto.otherPoints ?? 0;
    return this.prisma.contribution.create({
      data: {
        userId,
        projectId,
        type: dto.type,
        hours: dto.hours,
        amount: dto.amount,
        otherPoints: dto.otherPoints,
        points,
        date: new Date(dto.date),
        notes: dto.notes,
        attachmentUrl: dto.attachmentUrl,
        deferToEquity: dto.deferToEquity ?? false,
        conversionRate: dto.conversionRate,
      },
    });
  }

  async findByProject(projectId: string, userId: string, role: Role) {
    await this.ensureProjectAccess(projectId, userId, role);
    return this.prisma.contribution.findMany({
      where: { projectId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { date: 'desc' },
    });
  }

  async findByUser(userId: string, requestingUserId: string, role: Role) {
    if (role === Role.FOUNDER && requestingUserId !== userId) {
      throw new ForbiddenException('You can only view your own contributions');
    }
    return this.prisma.contribution.findMany({
      where: { userId },
      include: { project: { select: { id: true, name: true } } },
      orderBy: { date: 'desc' },
    });
  }

  async update(
    id: string,
    userId: string,
    role: Role,
    dto: UpdateContributionDto,
  ) {
    await this.getOneAndCheckAccess(id, userId, role);
    const points =
      dto.type === 'TIME'
        ? dto.hours
        : dto.type === 'CASH'
          ? dto.amount
          : dto.type === 'OTHER'
            ? dto.otherPoints
            : undefined;
    return this.prisma.contribution.update({
      where: { id },
      data: {
        type: dto.type,
        hours: dto.hours,
        amount: dto.amount,
        otherPoints: dto.otherPoints,
        ...(points !== undefined && { points }),
        date: dto.date ? new Date(dto.date) : undefined,
        notes: dto.notes,
        attachmentUrl: dto.attachmentUrl,
        deferToEquity: dto.deferToEquity,
        conversionRate: dto.conversionRate,
      },
    });
  }

  async remove(id: string, userId: string, role: Role) {
    await this.getOneAndCheckAccess(id, userId, role);
    return this.prisma.contribution.delete({ where: { id } });
  }

  private async ensureProjectAccess(projectId: string, userId: string, role: Role) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { members: { where: { userId } } },
    });
    if (!project) throw new NotFoundException('Project not found');
    const isOwner = project.ownerId === userId;
    const isMember = project.members.some((m) => m.userId === userId);
    if (role === Role.FOUNDER && !isOwner && !isMember) {
      throw new ForbiddenException('You do not have access to this project');
    }
  }

  private async getOneAndCheckAccess(id: string, userId: string, role: Role) {
    const c = await this.prisma.contribution.findUnique({
      where: { id },
      include: { project: { include: { members: { where: { userId } } } } },
    });
    if (!c) throw new NotFoundException('Contribution not found');
    const isOwner = c.project.ownerId === userId;
    const isMember = c.project.members.some((m) => m.userId === userId);
    if (role === Role.FOUNDER && !isOwner && !isMember && c.userId !== userId) {
      throw new ForbiddenException('You cannot edit this contribution');
    }
    return c;
  }
}
