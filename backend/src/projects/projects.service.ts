import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(ownerId: string, dto: CreateProjectDto) {
    return this.prisma.project.create({
      data: {
        name: dto.name,
        ownerId,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        budget: dto.budget,
      },
    });
  }

  async findAll(userId: string, role: Role) {
    if (role === Role.ADMIN || role === Role.ACCOUNTANT) {
      return this.prisma.project.findMany({
        include: {
          owner: { select: { id: true, name: true, email: true } },
          members: { include: { user: { select: { id: true, name: true, email: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      });
    }
    return this.prisma.project.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string, role: Role) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
        contributions: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
    });
    if (!project) throw new NotFoundException('Project not found');
    const isOwner = project.ownerId === userId;
    const isMember = project.members.some((m) => m.userId === userId);
    if (role === Role.FOUNDER && !isOwner && !isMember) {
      throw new ForbiddenException('You do not have access to this project');
    }
    return project;
  }

  async addMember(projectId: string, userId: string, assignedById: string, role: Role) {
    if (role !== Role.ADMIN && role !== Role.ACCOUNTANT) {
      throw new ForbiddenException('Only Admin or Accountant can assign founders and users to projects');
    }
    await this.findOne(projectId, assignedById, role);
    return this.prisma.projectMember.upsert({
      where: { projectId_userId: { projectId, userId } },
      create: { projectId, userId, assignedById },
      update: { assignedById },
    });
  }

  async removeMember(projectId: string, memberUserId: string, byUserId: string, role: Role) {
    if (role !== Role.ADMIN && role !== Role.ACCOUNTANT) {
      throw new ForbiddenException('Only Admin or Accountant can remove project members');
    }
    await this.findOne(projectId, byUserId, role);
    return this.prisma.projectMember.delete({
      where: { projectId_userId: { projectId, userId: memberUserId } },
    });
  }

  async getMembers(projectId: string, userId: string, role: Role) {
    await this.findOne(projectId, userId, role);
    return this.prisma.projectMember.findMany({
      where: { projectId },
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
    });
  }

  /** Users that can be assigned to this project (not owner, not already members). Only Admin and Accountant. */
  async getAssignableUsers(projectId: string, userId: string, role: Role) {
    if (role !== Role.ADMIN && role !== Role.ACCOUNTANT) {
      throw new ForbiddenException('Only Admin or Accountant can list assignable users');
    }
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { members: { select: { userId: true } } },
    });
    if (!project) throw new NotFoundException('Project not found');
    const excludeIds = [project.ownerId, ...project.members.map((m) => m.userId)];
    return this.prisma.user.findMany({
      where: { id: { notIn: excludeIds } },
      select: { id: true, name: true, email: true, role: true },
    });
  }

  async update(id: string, userId: string, role: Role, dto: UpdateProjectDto) {
    await this.findOne(id, userId, role);
    const data: Parameters<typeof this.prisma.project.update>[0]['data'] = {
      name: dto.name,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      budget: dto.budget,
    };
    if (role === Role.ADMIN || role === Role.ACCOUNTANT) {
      if (dto.monthlyRevenuePipeline !== undefined) data.monthlyRevenuePipeline = dto.monthlyRevenuePipeline;
    }
    return this.prisma.project.update({
      where: { id },
      data,
    });
  }

  /** Only Admin can delete projects (including those created by Founders). */
  async remove(id: string, userId: string, role: Role) {
    if (role !== Role.ADMIN) {
      throw new ForbiddenException('Only Admin can delete projects');
    }
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');
    return this.prisma.project.delete({ where: { id } });
  }
}
