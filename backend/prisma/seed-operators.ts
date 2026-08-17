import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const FAKE_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA2mX3k8XqzZm3P9kLxM4w
7Y6vQpRnH8aGdWk2fLjN1cXoP5mBtV0E3sKqYhUi9FwX1nMzRpAo6GtlD4bJe8
kUc9vSyHmN7P0xWqY2RoFd1iXjH4nKpL3eGtM5vBwZs0Ry1cUmP8aFkN9jX2Tb
-----END PUBLIC KEY-----`;

const pastDate = (daysAgo: number, hoursAgo = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(d.getHours() - hoursAgo);
  return d;
};

async function main() {
  console.log('\n Operator Test Seed Starting...\n');

  await prisma.adminSettings.upsert({
    where: { id: 'default-settings' },
    update: {},
    create: { id: 'default-settings', roundDuration: 30, minBetAmount: 10, maxBetAmount: 100000 },
  });

  const salt = await bcrypt.genSalt(10);
  const adminHash = await bcrypt.hash('King@0706', salt);
  await prisma.user.upsert({
    where: { mobile: '1111111111' },
    update: { role: 'ADMIN' },
    create: { mobile: '1111111111', passwordHash: adminHash, role: 'ADMIN', balance: 100000, isActive: true },
  });
  console.log('Admin ensured');

  // ── 3 Operators ────────────────────────────────────────
  const opA = await prisma.operator.upsert({
    where: { operatorId: 'OP_DREAM_01' },
    update: {},
    create: {
      name: 'Dream Delhi',
      operatorId: 'OP_DREAM_01',
      publicKey: FAKE_PUBLIC_KEY,
      callbackUrl: 'https://api.dreamdelhi.com/wallet',
      allowedIps: ['103.21.58.1', '103.21.58.2'],
      status: 'ACTIVE',
    },
  });

  const opB = await prisma.operator.upsert({
    where: { operatorId: 'OP_BETSTAR_02' },
    update: {},
    create: {
      name: 'BetStar India',
      operatorId: 'OP_BETSTAR_02',
      publicKey: FAKE_PUBLIC_KEY,
      callbackUrl: 'https://wallet.betstar.in/api',
      allowedIps: ['202.44.12.9'],
      status: 'ACTIVE',
    },
  });

  const opC = await prisma.operator.upsert({
    where: { operatorId: 'OP_PLAYZONE_03' },
    update: {},
    create: {
      name: 'PlayZone Gaming',
      operatorId: 'OP_PLAYZONE_03',
      publicKey: FAKE_PUBLIC_KEY,
      callbackUrl: 'https://game.playzone.io/callback',
      allowedIps: [],
      status: 'SUSPENDED',
    },
  });
  console.log('3 Operators created');

  // ── Federated Users ─────────────────────────────────────
  const dreamUsers = await Promise.all([
    prisma.user.upsert({ where: { mobile: 'OP-OP_DREAM_01-USR_001' }, update: {}, create: { mobile: 'OP-OP_DREAM_01-USR_001', username: 'rahul_dd', passwordHash: 'FEDERATED_NO_PASSWORD', balance: 5800, operatorId: opA.id, operatorUserId: 'USR_001' } }),
    prisma.user.upsert({ where: { mobile: 'OP-OP_DREAM_01-USR_002' }, update: {}, create: { mobile: 'OP-OP_DREAM_01-USR_002', username: 'priya_dd', passwordHash: 'FEDERATED_NO_PASSWORD', balance: 12500, operatorId: opA.id, operatorUserId: 'USR_002' } }),
    prisma.user.upsert({ where: { mobile: 'OP-OP_DREAM_01-USR_003' }, update: {}, create: { mobile: 'OP-OP_DREAM_01-USR_003', username: 'amit_dd', passwordHash: 'FEDERATED_NO_PASSWORD', balance: 0, operatorId: opA.id, operatorUserId: 'USR_003' } }), // Edge: zero balance
  ]);

  const betstarUsers = await Promise.all([
    prisma.user.upsert({ where: { mobile: 'OP-OP_BETSTAR_02-USR_A1' }, update: {}, create: { mobile: 'OP-OP_BETSTAR_02-USR_A1', username: 'rohan_bs', passwordHash: 'FEDERATED_NO_PASSWORD', balance: 3200, operatorId: opB.id, operatorUserId: 'USR_A1' } }),
    prisma.user.upsert({ where: { mobile: 'OP-OP_BETSTAR_02-USR_A2' }, update: {}, create: { mobile: 'OP-OP_BETSTAR_02-USR_A2', username: 'sneha_bs', passwordHash: 'FEDERATED_NO_PASSWORD', balance: 750, operatorId: opB.id, operatorUserId: 'USR_A2' } }),
  ]);

  const playzoneUsers = await Promise.all([
    prisma.user.upsert({ where: { mobile: 'OP-OP_PLAYZONE_03-PZ_001' }, update: {}, create: { mobile: 'OP-OP_PLAYZONE_03-PZ_001', username: 'dev_pz', passwordHash: 'FEDERATED_NO_PASSWORD', balance: 100, operatorId: opC.id, operatorUserId: 'PZ_001' } }),
  ]);
  console.log('6 Federated users created');

  // ── Game Rounds ─────────────────────────────────────────
  let roundCounter = 9900;
  const rounds: any[] = [];
  for (const daysAgo of [7, 5, 3, 1, 0]) {
    const rn = ++roundCounter;
    const r = await prisma.gameRound.upsert({
      where: { roundNumber: rn },
      update: {},
      create: {
        roundNumber: rn,
        openingResult: [3, 7],
        openingType: 'PAIR',
        totalStake: 0,
        totalPayout: 0,
        houseProfit: 0,
        status: 'SETTLED',
        startedAt: pastDate(daysAgo, 2),
        endedAt: pastDate(daysAgo, 1),
      },
    });
    rounds.push(r);
  }
  console.log('5 historical rounds created');

  // ── Settled Bets (for Profit Summary widget) ────────────
  const createBet = async (userId: string, roundId: string, amount: number, won: boolean) => {
    const payout = won ? amount * 9 : 0;
    return prisma.bet.create({ data: { userId, roundId, betType: 'SINGLE', numbers: [3], amount, status: 'SETTLED', settlementAmount: payout, payoutMultiplier: won ? 9 : 0, updatedAt: new Date() } });
  };

  await createBet(dreamUsers[0].id, rounds[0].id, 5000, false);    // Lost
  await createBet(dreamUsers[0].id, rounds[1].id, 2000, true);     // Won
  await createBet(dreamUsers[1].id, rounds[2].id, 10000, false);   // Lost
  await createBet(dreamUsers[1].id, rounds[3].id, 3000, false);    // Lost
  await createBet(dreamUsers[2].id, rounds[4].id, 500, false);     // Edge: tiny bet

  await createBet(betstarUsers[0].id, rounds[1].id, 8000, false);  // Lost
  await createBet(betstarUsers[0].id, rounds[2].id, 1500, true);   // Won
  await createBet(betstarUsers[1].id, rounds[3].id, 200, false);   // Edge: tiny bet

  await createBet(playzoneUsers[0].id, rounds[0].id, 1000, false); // Suspended operator
  console.log('Settled bets created');

  // ── Operator Transactions (Callback Log) ────────────────
  const txns = [
    // Dream Delhi — all SUCCESS
    { operatorId: opA.id, userId: dreamUsers[0].id, transactionId: `txn-dd-${randomUUID()}`, roundId: rounds[0].id, type: 'DEBIT',    amount: 5000,   status: 'SUCCESS',  retries: 0 },
    { operatorId: opA.id, userId: dreamUsers[0].id, transactionId: `txn-dd-${randomUUID()}`, roundId: rounds[1].id, type: 'DEBIT',    amount: 2000,   status: 'SUCCESS',  retries: 0 },
    { operatorId: opA.id, userId: dreamUsers[0].id, transactionId: `txn-dd-${randomUUID()}`, roundId: rounds[1].id, type: 'CREDIT',   amount: 18000,  status: 'SUCCESS',  retries: 0 },
    { operatorId: opA.id, userId: dreamUsers[1].id, transactionId: `txn-dd-${randomUUID()}`, roundId: rounds[2].id, type: 'DEBIT',    amount: 10000,  status: 'SUCCESS',  retries: 0 },
    { operatorId: opA.id, userId: dreamUsers[1].id, transactionId: `txn-dd-${randomUUID()}`, roundId: rounds[3].id, type: 'DEBIT',    amount: 3000,   status: 'SUCCESS',  retries: 0 },
    { operatorId: opA.id, userId: dreamUsers[2].id, transactionId: `txn-dd-${randomUUID()}`, roundId: rounds[4].id, type: 'DEBIT',    amount: 500,    status: 'SUCCESS',  retries: 0 },
    // Edge: ROLLBACK type
    { operatorId: opA.id, userId: dreamUsers[0].id, transactionId: `txn-rb-${randomUUID()}`, roundId: rounds[0].id, type: 'ROLLBACK', amount: 5000,   status: 'SUCCESS',  retries: 0 },
    // Edge: Very large amount
    { operatorId: opA.id, userId: dreamUsers[1].id, transactionId: `txn-lg-${randomUUID()}`, roundId: rounds[2].id, type: 'DEBIT',    amount: 100000, status: 'SUCCESS',  retries: 0 },

    // BetStar India — mix of SUCCESS and FAILED
    { operatorId: opB.id, userId: betstarUsers[0].id, transactionId: `txn-bs-${randomUUID()}`, roundId: rounds[1].id, type: 'DEBIT',   amount: 8000,  status: 'SUCCESS',  retries: 0 },
    { operatorId: opB.id, userId: betstarUsers[0].id, transactionId: `txn-bs-${randomUUID()}`, roundId: rounds[2].id, type: 'DEBIT',   amount: 1500,  status: 'SUCCESS',  retries: 1 }, // Edge: 1 retry but succeeded
    // Edge: CREDIT payout never delivered (max retries)
    { operatorId: opB.id, userId: betstarUsers[0].id, transactionId: `txn-bs-${randomUUID()}`, roundId: rounds[2].id, type: 'CREDIT',  amount: 13500, status: 'FAILED',   retries: 10 },
    // Edge: Failed debit
    { operatorId: opB.id, userId: betstarUsers[1].id, transactionId: `txn-bs-${randomUUID()}`, roundId: rounds[3].id, type: 'DEBIT',   amount: 200,   status: 'FAILED',   retries: 3 },
    // Edge: instant fail (0 retries)
    { operatorId: opB.id, userId: betstarUsers[0].id, transactionId: `txn-bs-${randomUUID()}`, roundId: rounds[4].id, type: 'CREDIT',  amount: 5000,  status: 'FAILED',   retries: 0 },

    // PlayZone — PENDING (suspended operator, callbacks stuck)
    { operatorId: opC.id, userId: playzoneUsers[0].id, transactionId: `txn-pz-${randomUUID()}`, roundId: rounds[0].id, type: 'DEBIT', amount: 1000,  status: 'PENDING',  retries: 2 },
  ];

  for (const txn of txns) {
    await prisma.operatorTransaction.create({ data: txn as any });
  }
  console.log('15 operator transactions created (all edge cases)');

  // ── Sessions for retry functionality ────────────────────
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 1);
  for (const user of [...dreamUsers, ...betstarUsers, ...playzoneUsers]) {
    await prisma.userSession.create({ data: { userId: user.id, token: randomUUID(), expiresAt: expiry } });
  }
  console.log('Sessions created\n');

  console.log('══════════════════════════════════════════════════════');
  console.log('  SEED COMPLETE — Edge Cases Summary');
  console.log('══════════════════════════════════════════════════════');
  console.log('  Dream Delhi  (ACTIVE)     3 users | 8 txns | All SUCCESS');
  console.log('  BetStar India (ACTIVE)    2 users | 5 txns | 3 FAILED (check Callback Logs!)');
  console.log('  PlayZone Gaming (SUSPENDED) 1 user | 1 txn  | PENDING');
  console.log('');
  console.log('  Specific Edge Cases:');
  console.log('  • ROLLBACK transaction type (Dream Delhi)');
  console.log('  • Max retries = 10, FAILED credit — player won but got nothing (BetStar)');
  console.log('  • Zero-balance federated user (amit_dd)');
  console.log('  • Instant fail on first attempt, retries = 0 (BetStar)');
  console.log('  • Suspended operator with stuck PENDING callback (PlayZone)');
  console.log('  • Large bet: ₹1,00,000 (Dream Delhi)');
  console.log('══════════════════════════════════════════════════════');
}

main()
  .catch((e) => { console.error('Seeding failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
