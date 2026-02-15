import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, InviteDto, SignUpDto } from './dto/auth.dto';
import { Roles } from './decorators/roles.decorator';
import { Public } from './decorators/public.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Role } from '@prisma/client';
import { CurrentUser } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Get('login')
  @Public()
  loginGet() {
    return { message: 'Use POST /api/auth/login with body { email, password } to log in.' };
  }

  @Post('login')
  @Public()
  async login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  @Post('signup')
  @Public()
  async signUp(@Body() dto: SignUpDto) {
    const user = await this.auth.signUp(dto.email, dto.name, dto.password, dto.role ?? 'FOUNDER');
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  }

  @Post('invite')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async invite(@Body() dto: InviteDto, @CurrentUser('sub') inviterId: string) {
    return this.auth.invite(dto.email, dto.name, dto.role, inviterId);
  }
}
