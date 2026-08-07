import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import * as bcrypt from 'bcrypt';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting database seed (Hardened Schema)...');

  // 1. Initial Admin Settings
  await prisma.adminSettings.upsert({
    where: { id: 'default-settings' },
    update: {},
    create: {
      id: 'default-settings',
      roundDuration: 30,
      minBetAmount: 10,
      maxBetAmount: 100000,
      maintenanceMode: false,
    },
  });
  console.log('✅ Admin settings initialized');

  const salt = await bcrypt.genSalt(10);

  // 2. Create Admin Account
  const adminMobile = '1111111111';
  const adminPass = 'King@0706';
  const adminHash = await bcrypt.hash(adminPass, salt);
  await prisma.user.upsert({
    where: { mobile: adminMobile },
    update: { role: 'ADMIN' },
    create: {
      mobile: adminMobile,
      passwordHash: adminHash,
      role: 'ADMIN',
      balance: 100000,
      isActive: true,
    },
  });
  console.log(`✅ Admin created: ${adminMobile} / ${adminPass}`);

  // 3. Create Player Account
  // const userMobile = '7778889900';
  // const userPass = 'user123';
  // const userHash = await bcrypt.hash(userPass, salt);
  // await prisma.user.upsert({
  //   where: { mobile: userMobile },
  //   update: { role: 'PLAYER' },
  //   create: {
  //     mobile: userMobile,
  //     passwordHash: userHash,
  //     role: 'PLAYER',
  //     balance: 10000,
  //     isActive: true,
  //   },
  // });
  // console.log(`✅ Player created: ${userMobile} / ${userPass}`);

  // console.log('🟢 Hardened Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
