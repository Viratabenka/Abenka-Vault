import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ExportsService } from './exports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('exports')
@UseGuards(JwtAuthGuard)
export class ExportsController {
  constructor(private readonly exports: ExportsService) {}

  @Get('contributions')
  async contributionsCsv(
    @Query('projectId') projectId: string | null,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
    @Res() res: Response,
  ) {
    const csv = await this.exports.contributionsCsv(
      projectId || null,
      userId,
      role as Role,
    );
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=contributions.csv');
    res.send(csv);
  }

  @Get('cap-table')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.ACCOUNTANT)
  async capTableCsv(
    @Query('projectId') projectId: string | null,
    @Res() res: Response,
  ) {
    const csv = await this.exports.capTableCsv(projectId || null);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=cap-table.csv');
    res.send(csv);
  }
}
