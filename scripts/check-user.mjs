import { PrismaClient } from '../src/generated/client/index.js';

const db = new PrismaClient();

async function main() {
  const users = await db.user.findMany({
    where: { email: { contains: 'pruskowff', mode: 'insensitive' } },
    select: { id: true, email: true, normalizedEmail: true, role: true, emailVerified: true, isVerified: true, isBanned: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 2,
  });

  for (const u of users) {
    console.log(JSON.stringify({
      id: u.id,
      email: u.email,
      normalizedEmail: u.normalizedEmail,
      role: u.role,
      role_upper: u.role?.toUpperCase(),
      emailVerified: u.emailVerified,
      isVerified: u.isVerified,
      isBanned: u.isBanned,
      createdAt: u.createdAt,
    }));
  }

  await db.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
