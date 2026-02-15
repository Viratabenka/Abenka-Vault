import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { EquityModule } from '../equity/equity.module';
import { PayoutsModule } from '../payouts/payouts.module';

@Module({
  imports: [EquityModule, PayoutsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
