const axios = require('axios');
const { io } = require('socket.io-client');

const API_BASE = 'http://localhost:4000';
const WS_BASE = 'http://localhost:4000';
const TEST_MOBILE = '9911223344'; // Use existing user from browser test
const TEST_PASS = 'Password123';

async function runTest() {
  console.log(`🚀 Starting 10-Round End-to-End Simulation for user ${TEST_MOBILE}...`);

  let token = '';
  let userId = '';
  let balance = 0;

  // 1. Login (Skip register to debug if it's the issue)
  try {
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      mobile: TEST_MOBILE,
      password: TEST_PASS
    });

    token = loginRes.data.data.token;
    userId = loginRes.data.data.userId;
    balance = loginRes.data.data.balance;
    console.log(`✅ User Authenticated | ID: ${userId} | Balance: ₹${balance}`);
  } catch (error) {
    if (error.response) {
      console.error('❌ Auth Failed (Server Response):', error.response.data);
    } else {
      console.error('❌ Auth Failed (Network/Other):', error.message);
    }
    return;
  }

  // 2. Socket Connection
  const socket = io(WS_BASE, {
    auth: { token },
    transports: ['websocket']
  });

  let roundsCompleted = 0;
  let hasBetThisRound = false;

  socket.on('connect', () => {
    console.log('📡 Connected to Game Engine via WebSocket');
  });

  socket.on('game_state', async (state) => {
    const { phase, timer, roundNumber } = state;

    if (phase === 'BETTING' && !hasBetThisRound && roundsCompleted < 10) {
      hasBetThisRound = true;
      console.log(`\n--- ROUND #${roundNumber} | PHASE: ${phase} | TIMER: ${timer}s ---`);
      
      const betAmount = 100;
      console.log(`💸 Placing Bet: ₹${betAmount} on Floor 7...`);
      
      socket.emit('place_bet', {
        betType: 'SINGLE',
        numbers: [7],
        amount: betAmount
      });
    }

    if (phase === 'RESULT' && hasBetThisRound) {
      console.log(`🎯 Phase: ${phase} | Winning Floors: [${state.winningFloors?.join(', ')}]`);
    }

    if (phase === 'BUFFER' && hasBetThisRound) {
      hasBetThisRound = false;
      roundsCompleted++;
      console.log(`✅ Round ${roundsCompleted}/10 Finished`);
      
      if (roundsCompleted >= 10) {
        console.log('\n🏁 10-Round Test Complete! Shutting down...');
        socket.disconnect();
        process.exit(0);
      }
    }
  });

  socket.on('bet_confirmed', (res) => {
    balance = res.balance;
    console.log(`✔️ Bet Confirmed! New Balance: ₹${balance}`);
  });

  socket.on('bet_rejected', (err) => {
    console.error(`❌ Bet Rejected: ${err.message}`);
  });

  socket.on('disconnect', () => {
    console.log('🔌 Disconnected from Server');
  });
}

runTest();
