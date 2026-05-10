import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ConsentsService } from './consents.service';
import { CreateConsentDto } from './dto/consent.dto';

@Controller('consents')
@UseGuards(JwtAuthGuard)
export class ConsentsController {
  constructor(private readonly consents: ConsentsService) {}

  /** Any authenticated user — record their consent. */
  @Post()
  agree(@CurrentUser('sub') userId: string, @Body() dto: CreateConsentDto) {
    return this.consents.agree(userId, dto.documentKey);
  }

  /** Any authenticated user — get their own consents. */
  @Get('my')
  my(@CurrentUser('sub') userId: string) {
    return this.consents.myConsents(userId);
  }

  /** Admin only — get all users + consent status for a given documentKey. */
  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  all(@Query('documentKey') documentKey: string) {
    return this.consents.allForDocument(documentKey);
  }
}
