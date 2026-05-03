const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  const user = await prisma.user.findUnique({ where: { mobile: '9911223344' } });
  if (!user) {
    console.error('Test user 9911223344 not found!');
    return;
  }
  const betCount = await prisma.bet.count({ where: { userId: user.id } });
  const totalStake = await prisma.bet.aggregate({
    where: { userId: user.id },
    _sum: { amount: true }
  });
  console.log(`--- DB VERIFICATION ---`);
  console.log(`User ID: ${user.id}`);
  console.log(`Current Balance: ₹${user.balance}`);
  console.log(`Total Bets Placed: ${betCount}`);
  console.log(`Total Stake: ₹${totalStake._sum.amount}`);
  await prisma.$disconnect();
}
verify();
