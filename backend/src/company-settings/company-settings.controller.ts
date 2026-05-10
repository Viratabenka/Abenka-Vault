import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CompanySettingsService } from './company-settings.service';
import { UpsertCompanySettingsDto } from './dto/company-settings.dto';

@Controller('company-settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class CompanySettingsController {
  constructor(private readonly settings: CompanySettingsService) {}

  @Get()
  get() {
    return this.settings.get();
  }

  @Put()
  upsert(@Body() dto: UpsertCompanySettingsDto) {
    return this.settings.upsert(dto);
  }
}
