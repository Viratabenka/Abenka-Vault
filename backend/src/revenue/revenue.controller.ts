import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { RevenueService } from './revenue.service';
import { CreateRevenueEntryDto, UpdateRevenueEntryDto } from './dto/revenue.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('revenue')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.ACCOUNTANT)
export class RevenueController {
  constructor(private readonly revenue: RevenueService) {}

  @Get('summary')
  getCompanySummary() {
    return this.revenue.getCompanySummary();
  }

  @Get('project/:projectId')
  findByProject(
    @Param('projectId') projectId: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.revenue.findByProject(projectId, userId, role as Role);
  }

  @Get()
  findAll(@CurrentUser('sub') userId: string, @CurrentUser('role') role: string) {
    return this.revenue.findAll(userId, role as Role);
  }

  @Post()
  create(
    @Body() dto: CreateRevenueEntryDto,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.revenue.create(dto, userId, role as Role);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRevenueEntryDto,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.revenue.update(id, dto, userId, role as Role);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.revenue.remove(id, userId, role as Role);
  }
}
