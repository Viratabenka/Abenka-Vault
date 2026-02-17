import { Controller, Get, UseGuards } from '@nestjs/common';
import { CompanyService } from './company.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('company')
@UseGuards(JwtAuthGuard)
export class CompanyController {
  constructor(private readonly company: CompanyService) {}

  @Get('dashboard')
  getDashboard(
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.company.getDashboard(userId, role as import('@prisma/client').Role);
  }

  @Get('contribution-hours-by-project')
  getContributionHoursByProject() {
    return this.company.getContributionHoursByProject();
  }
}
