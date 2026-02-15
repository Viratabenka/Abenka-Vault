import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { EquityService } from './equity.service';
import { CalculateEquityDto } from './dto/equity.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('calculate')
@UseGuards(JwtAuthGuard)
export class EquityController {
  constructor(private readonly equity: EquityService) {}

  @Post('equity')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.ACCOUNTANT)
  calculateAndAllocate(@Body() body: CalculateEquityDto) {
    return this.equity.calculateAndAllocate({
      projectId: body.projectId,
      vestingStart: body.vestingStart,
      cliffMonths: body.cliffMonths,
      vestingMonths: body.vestingMonths,
    });
  }

  @Get('cap-table')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.ACCOUNTANT)
  getCapTable(@Query('projectId') projectId?: string) {
    return this.equity.getCapTable(projectId || undefined);
  }

  @Get('vesting')
  getVestingTimeline(@CurrentUser('sub') userId: string) {
    return this.equity.getVestingTimeline(userId);
  }
}
