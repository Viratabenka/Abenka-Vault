import { Module } from '@nestjs/common';
import { EquityService } from './equity.service';
import { EquityController } from './equity.controller';

@Module({
  controllers: [EquityController],
  providers: [EquityService],
  exports: [EquityService],
})
export class EquityModule {}
