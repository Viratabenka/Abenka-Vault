import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.ACCOUNTANT)
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  findRecent(@Query('limit') limit?: string, @Query('userId') userId?: string) {
    return this.audit.findRecent(limit ? parseInt(limit, 10) : 100, userId);
  }
}
