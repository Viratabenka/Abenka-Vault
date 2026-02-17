import { Module } from '@nestjs/common';
import { CompanyService } from './company.service';
import { CompanyController } from './company.controller';
import { EquityModule } from '../equity/equity.module';
import { RevenueModule } from '../revenue/revenue.module';
import { SalesModule } from '../sales/sales.module';

@Module({
  imports: [EquityModule, RevenueModule, SalesModule],
  controllers: [CompanyController],
  providers: [CompanyService],
})
export class CompanyModule {}
