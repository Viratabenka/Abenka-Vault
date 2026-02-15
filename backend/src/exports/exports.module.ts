import { Module } from '@nestjs/common';
import { ExportsService } from './exports.service';
import { ExportsController } from './exports.controller';
import { EquityModule } from '../equity/equity.module';

@Module({
  imports: [EquityModule],
  controllers: [ExportsController],
  providers: [ExportsService],
})
export class ExportsModule {}
