import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { FounderAccessGuard } from '../common/guards/founder-access.guard';
import { SetPasswordDto } from './dto/users.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.ACCOUNTANT)
  findAll() {
    return this.users.findAll();
  }

  @Get(':id')
  @UseGuards(FounderAccessGuard)
  findOne(@Param('id') id: string) {
    return this.users.findById(id);
  }

  @Post(':id/set-password')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  setPassword(@Param('id') id: string, @Body() dto: SetPasswordDto) {
    return this.users.setPasswordByAdmin(id, dto.newPassword);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string, @CurrentUser('sub') currentUserId: string) {
    return this.users.remove(id, currentUserId);
  }
}
