import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ConsentsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Record or update consent for the current user + documentKey (upsert). */
  async agree(userId: string, documentKey: string) {
    return this.prisma.documentConsent.upsert({
      where: { userId_documentKey: { userId, documentKey } },
      create: { userId, documentKey },
      update: { agreedAt: new Date() },
    });
  }

  /** Return all consents for the current user. */
  myConsents(userId: string) {
    return this.prisma.documentConsent.findMany({
      where: { userId },
      select: { documentKey: true, agreedAt: true },
    });
  }

  /**
   * For admins: return all users with their consent status for a given documentKey.
   * Users who haven't consented still appear with agreedAt: null.
   */
  async allForDocument(documentKey: string) {
    const [users, consents] = await Promise.all([
      this.prisma.user.findMany({
        select: { id: true, name: true, email: true, role: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.documentConsent.findMany({
        where: { documentKey },
        select: { userId: true, agreedAt: true },
      }),
    ]);

    const consentMap = new Map(consents.map((c) => [c.userId, c.agreedAt]));

    return users.map((u) => ({
      userId: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      agreedAt: consentMap.get(u.id) ?? null,
    }));
  }
}
