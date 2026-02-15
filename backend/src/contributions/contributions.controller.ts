import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ContributionsService } from './contributions.service';
import { CreateContributionDto, UpdateContributionDto } from './dto/contribution.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ContributionsController {
  constructor(private readonly contributions: ContributionsService) {}

  @Post(':id/contributions')
  create(
    @Param('id') projectId: string,
    @Body() dto: Omit<CreateContributionDto, 'projectId'>,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.contributions.create(
      projectId,
      userId,
      role as import('@prisma/client').Role,
      { ...dto, projectId },
    );
  }

  @Get(':id/contributions')
  findByProject(
    @Param('id') projectId: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.contributions.findByProject(
      projectId,
      userId,
      role as import('@prisma/client').Role,
    );
  }

  @Put('contributions/:cid')
  update(
    @Param('cid') id: string,
    @Body() dto: UpdateContributionDto,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.contributions.update(id, userId, role as import('@prisma/client').Role, dto);
  }

  @Delete('contributions/:cid')
  remove(
    @Param('cid') id: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.contributions.remove(id, userId, role as import('@prisma/client').Role);
  }
}
