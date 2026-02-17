import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { PayoutsService } from './payouts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { FounderAccessGuard } from '../common/guards/founder-access.guard';
import { PayoutStatus } from '@prisma/client';

@Controller('payouts')
@UseGuards(JwtAuthGuard)
export class PayoutsController {
  constructor(private readonly payouts: PayoutsService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.ACCOUNTANT)
  findAll(@Query('status') status?: PayoutStatus) {
    return this.payouts.findAll(status);
  }

  @Post('create')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.ACCOUNTANT)
  create(
    @Body() body: { userId: string; amount: number; type?: 'HOURLY' | 'PROFIT'; notes?: string },
  ) {
    return this.payouts.create(body);
  }

  @Post('prepare')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.ACCOUNTANT)
  prepare(@Body() body: { periodStart: string; periodEnd: string }) {
    return this.payouts.prepareHourlyPayouts(body.periodStart, body.periodEnd);
  }

  @Post('profit')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.ACCOUNTANT)
  allocateProfit(
    @Body() body: { periodStart: string; periodEnd: string; totalAmount: number },
  ) {
    return this.payouts.allocateProfitShare(
      body.periodStart,
      body.periodEnd,
      body.totalAmount,
    );
  }

  @Post(':id/execute')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.ACCOUNTANT)
  execute(@Param('id') id: string) {
    return this.payouts.execute(id);
  }

  @Get('user/:userId')
  @UseGuards(FounderAccessGuard)
  findByUser(@Param('userId') userId: string) {
    return this.payouts.findByUser(userId);
  }
}
