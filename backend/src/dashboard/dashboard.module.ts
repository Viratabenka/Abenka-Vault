import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { EquityModule } from '../equity/equity.module';
import { PayoutsModule } from '../payouts/payouts.module';
import { SalesModule } from '../sales/sales.module';

@Module({
  imports: [EquityModule, PayoutsModule, SalesModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
