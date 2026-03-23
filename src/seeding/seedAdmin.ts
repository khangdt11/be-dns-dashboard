import { config as dotenvConfig } from 'dotenv';
import * as bcrypt from 'bcrypt';
import { Role, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type SeedAdminEnv = {
  email?: string;
  password?: string;
  name?: string;
};

function getSeedAdminEnv(): SeedAdminEnv {
  return {
    email: "admin@adhub.media",
    password: "Adhub@123",
    name: "Admin",
  };
}

export async function seedDefaultAdmin(prisma: PrismaService) {
  const { email, password, name } = getSeedAdminEnv();

  if (!email || !password) {
    console.warn(
      '[seedDefaultAdmin] Skipped (missing ADMIN_EMAIL or ADMIN_PASSWORD).',
    );
    return { seeded: false, reason: 'missing_env' as const };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    const hashedPassword = await bcrypt.hash(
      password,
      parseInt(process.env.SALT_ROUNDS as string) || 10,
    );

    await prisma.user.create({
      data: {
        email,
        name: name ?? 'Admin',
        role: Role.ADMIN,
        status: UserStatus.ACTIVE,
        password: hashedPassword,
      },
    });

    console.log(`[seedDefaultAdmin] Created admin user: ${email}`);
    return { seeded: true, action: 'created' as const };
  }

  // Ensure the existing user can act as admin, but don't overwrite password.
  const needsPromotion =
    existing.role !== Role.ADMIN || existing.status !== UserStatus.ACTIVE;
  if (needsPromotion) {
    await prisma.user.update({
      where: { email },
      data: {
        role: Role.ADMIN,
        status: UserStatus.ACTIVE,
        ...(name ? { name } : {}),
      },
    });
    console.log(`[seedDefaultAdmin] Updated existing user to ADMIN: ${email}`);
    return { seeded: true, action: 'updated' as const };
  }

  console.log(`[seedDefaultAdmin] Admin already present: ${email}`);
  return { seeded: false, reason: 'already_present' as const };
}

if (require.main === module) {
  (async () => {
    dotenvConfig();
    const prisma = new PrismaService();
    try {
      await seedDefaultAdmin(prisma);
    } catch (err) {
      console.error('[seedDefaultAdmin] Failed', err);
      process.exitCode = 1;
    } finally {
      await prisma.$disconnect();
    }
  })();
}
