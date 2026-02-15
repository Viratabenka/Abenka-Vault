import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { PointsService } from './points.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('calculate')
@UseGuards(JwtAuthGuard)
export class PointsController {
  constructor(private readonly points: PointsService) {}

  @Get('weights')
  getWeights(@Query('projectId') projectId?: string) {
    return this.points.getWeights(projectId || null);
  }

  @Post('points')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.ACCOUNTANT)
  recalculate(@Body() body: { projectId?: string }) {
    if (body.projectId) {
      return this.points.recalculateProject(body.projectId);
    }
    return this.points.recalculateCompany();
  }

  @Post('weights')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.ACCOUNTANT)
  setWeights(
    @Body()
    body: { projectId?: string; timeWeight: number; cashWeight: number; otherWeight: number },
  ) {
    return this.points.setWeights(
      body.projectId ?? null,
      body.timeWeight,
      body.cashWeight,
      body.otherWeight,
    );
  }
}
