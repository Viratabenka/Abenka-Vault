import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertCompanySettingsDto } from './dto/company-settings.dto';

@Injectable()
export class CompanySettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get() {
    const settings = await this.prisma.companySettings.findFirst();
    return settings ?? null;
  }

  async upsert(dto: UpsertCompanySettingsDto) {
    const existing = await this.prisma.companySettings.findFirst();
    if (existing) {
      return this.prisma.companySettings.update({
        where: { id: existing.id },
        data: dto,
      });
    }
    return this.prisma.companySettings.create({ data: dto });
  }
}
