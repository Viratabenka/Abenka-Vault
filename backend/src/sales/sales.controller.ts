import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSalesDto, UpdateSalesDto } from './dto/sales.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class SalesController {
  constructor(private readonly sales: SalesService) {}

  @Post(':projectId/sales')
  create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateSalesDto,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.sales.create(projectId, userId, role as import('@prisma/client').Role, dto);
  }

  @Get(':projectId/sales')
  findByProject(
    @Param('projectId') projectId: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.sales.findByProject(projectId, userId, role as import('@prisma/client').Role);
  }

  @Get(':projectId/sales/:salesEntryId')
  findOne(
    @Param('salesEntryId') salesEntryId: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.sales.findOne(salesEntryId, userId, role as import('@prisma/client').Role);
  }

  @Put(':projectId/sales/:salesEntryId')
  update(
    @Param('salesEntryId') salesEntryId: string,
    @Body() dto: UpdateSalesDto,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.sales.update(salesEntryId, userId, role as import('@prisma/client').Role, dto);
  }

  @Delete(':projectId/sales/:salesEntryId')
  remove(
    @Param('salesEntryId') salesEntryId: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.sales.remove(salesEntryId, userId, role as import('@prisma/client').Role);
  }
}
