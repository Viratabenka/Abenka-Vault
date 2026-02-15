import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

/**
 * Project team (assigned members) API.
 * Base path /members-of-project to avoid any conflict with /projects routes.
 */
@Controller('members-of-project')
@UseGuards(JwtAuthGuard)
export class ProjectTeamController {
  constructor(private readonly projects: ProjectsService) {}

  @Get(':projectId/assignable-users')
  getAssignableUsers(
    @Param('projectId') projectId: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.projects.getAssignableUsers(projectId, userId, role as import('@prisma/client').Role);
  }

  @Get(':projectId')
  getMembers(
    @Param('projectId') projectId: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.projects.getMembers(projectId, userId, role as import('@prisma/client').Role);
  }

  @Post(':projectId')
  addMember(
    @Param('projectId') projectId: string,
    @Body() body: { userId: string },
    @CurrentUser('sub') assignedById: string,
    @CurrentUser('role') role: string,
  ) {
    return this.projects.addMember(projectId, body.userId, assignedById, role as import('@prisma/client').Role);
  }

  @Delete(':projectId/:memberUserId')
  removeMember(
    @Param('projectId') projectId: string,
    @Param('memberUserId') memberUserId: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.projects.removeMember(projectId, memberUserId, userId, role as import('@prisma/client').Role);
  }
}
