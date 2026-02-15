import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { Role } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  iat?: number;
  exp?: number;
}

export interface LoginResult {
  access_token: string;
  user: { id: string; email: string; name: string; role: Role };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.users.findByEmail(email);
    if (!user) return null;
    const hash = user.passwordHash;
    if (!hash || typeof hash !== 'string') return null;
    try {
      const ok = await bcrypt.compare(password, hash);
      if (!ok) return null;
    } catch {
      return null;
    }
    const { passwordHash: _, ...rest } = user;
    return rest;
  }

  async login(email: string, password: string): Promise<LoginResult> {
    try {
      const user = await this.validateUser(email, password);
      if (!user) throw new UnauthorizedException('Invalid email or password');
      const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
      const access_token = this.jwt.sign(payload);
      return {
        access_token,
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
      };
    } catch (e) {
      if (e instanceof UnauthorizedException) throw e;
      this.logger.error(`Login failed: ${e instanceof Error ? e.message : String(e)}`, e instanceof Error ? e.stack : undefined);
      throw new BadRequestException('Login failed. Please try again or check the server logs.');
    }
  }

  async invite(email: string, name: string, role: Role, inviterId: string) {
    const existing = await this.users.findByEmail(email);
    if (existing) throw new BadRequestException('User with this email already exists');
    const tempPassword = Math.random().toString(36).slice(-10);
    const user = await this.users.create({
      email,
      name,
      role,
      password: tempPassword,
      invitedBy: inviterId,
      invitedAt: new Date(),
    });
    // In production: send email with temp password / magic link
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tempPassword, // remove in production; send via email
    };
  }

  async signUp(email: string, name: string, password: string, role: Role = 'FOUNDER') {
    const existing = await this.users.findByEmail(email);
    if (existing) throw new BadRequestException('User with this email already exists');
    return this.users.create({ email, name, password, role });
  }
}
