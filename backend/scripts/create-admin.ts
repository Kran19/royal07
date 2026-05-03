import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function ensureAdmin() {
  const mobile = '9998887766';
  const password = 'admin123';
  const username = 'AdminHQ';
  const passwordHash = await bcrypt.hash(password, 10);

  console.log('--- Ensuring Admin Account ---');

  const existing = await prisma.user.findUnique({ where: { mobile } });

  const admin = existing
    ? await prisma.user.update({
        where: { mobile },
        data: {
          username,
          passwordHash,
          role: 'ADMIN',
          balance: 1000000,
          isActive: true,
        },
      })
    : await prisma.user.create({
        data: {
          mobile,
          username,
          passwordHash,
          role: 'ADMIN',
          balance: 1000000,
          isActive: true,
        },
      });

  console.log('Admin account is ready.');
  console.log(`Mobile: ${admin.mobile}`);
  console.log(`Password: ${password}`);
  console.log(`Username: ${admin.username}`);
  console.log(`Role: ${admin.role}`);
}

ensureAdmin()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
