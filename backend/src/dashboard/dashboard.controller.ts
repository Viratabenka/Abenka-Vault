import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { FounderAccessGuard } from '../common/guards/founder-access.guard';

@Controller('users')
@UseGuards(JwtAuthGuard, FounderAccessGuard)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get(':id/dashboard')
  getDashboard(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.dashboard.getFounderDashboard(
      userId,
      id,
      role as import('@prisma/client').Role,
    );
  }
}
