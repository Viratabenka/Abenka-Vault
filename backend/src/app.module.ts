import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProjectsModule } from './projects/projects.module';
import { ContributionsModule } from './contributions/contributions.module';
import { EquityModule } from './equity/equity.module';
import { PayoutsModule } from './payouts/payouts.module';
import { CompanyModule } from './company/company.module';
import { RevenueModule } from './revenue/revenue.module';
import { SalesModule } from './sales/sales.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ExportsModule } from './exports/exports.module';
import { AuditModule } from './audit/audit.module';
import { HealthModule } from './health/health.module';

@Module({
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    ProjectsModule,
    ContributionsModule,
    EquityModule,
    PayoutsModule,
    CompanyModule,
    RevenueModule,
    SalesModule,
    DashboardModule,
    ExportsModule,
    AuditModule,
  ],
})
export class AppModule {}
