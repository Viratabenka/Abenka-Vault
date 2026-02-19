import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

export interface CreateUserInput {
  email: string;
  name: string;
  password: string;
  role?: Role;
  invitedBy?: string;
  invitedAt?: Date;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateUserInput) {
    const passwordHash = await bcrypt.hash(input.password, 10);
    return this.prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash,
        role: input.role ?? 'FOUNDER',
        invitedBy: input.invitedBy,
        invitedAt: input.invitedAt,
      },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        hourlyRate: true,
        twoFactorEnabled: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        hourlyRate: true,
        createdAt: true,
      },
    });
  }

  async updateHourlyRate(id: string, hourlyRate: number) {
    return this.prisma.user.update({
      where: { id },
      data: { hourlyRate },
    });
  }

  /** Admin sets a new password for a user (no current password required). */
  async setPasswordByAdmin(userId: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  }

  /** Admin removes a user. Cascades to related data per schema. Cannot remove self. */
  async remove(userId: string, currentUserId: string) {
    if (userId === currentUserId) throw new ForbiddenException('You cannot remove your own user');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    await this.prisma.user.delete({ where: { id: userId } });
    return { id: user.id, email: user.email };
  }
}
