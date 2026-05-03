const { PrismaClient } = require('@prisma/client');
const { JwtService } = require('@nestjs/jwt');
const prisma = new PrismaClient();
const jwtService = new JwtService({ secret: 'super-secret-key-royalbet!' });

async function debug() {
  console.log('--- Auth Debugger (with Bcrypt) ---');
  try {
    const bcrypt = require('bcrypt');
    const mobile = `99${Math.floor(Math.random() * 89999999 + 10000000)}`;
    console.log(`Trying to create user: ${mobile}`);
    
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Password123', salt);
    console.log('Bcrypt hash generated.');

    const user = await prisma.user.create({
      data: {
        mobile,
        passwordHash,
        balance: 10000
      }
    });
    console.log('User created:', user.id);

    await prisma.transaction.create({
      data: {
        userId: user.id,
        type: 'ADJUSTMENT',
        amount: 10000,
        balanceBefore: 0,
        balanceAfter: 10000,
        status: 'COMPLETED',
        description: 'Welcome Bonus'
      }
    });
    console.log('Welcome Bonus Transaction created.');

    const payload = { sub: user.id, mobile: user.mobile, role: user.role };
    const token = jwtService.sign(payload);
    console.log('Token signed.');

    const decoded = jwtService.decode(token);
    const expiresAt = new Date(decoded.exp * 1000);

    const session = await prisma.userSession.create({
      data: {
        userId: user.id,
        token,
        expiresAt
      }
    });
    console.log('Session created:', session.id);

    console.log('✅ ALL TEST PASSED');
  } catch (error) {
    console.error('❌ DEBUG FAILED');
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

debug();
