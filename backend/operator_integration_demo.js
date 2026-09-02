/**
 * RoyalBet B2B Operator Integration Demo Code (Node.js + Express)
 * 
 * This is a completely self-contained demo file. It includes:
 * 1. An Express backend server simulating the B2B Operator's server.
 * 2. Seamless Login signature generation (`POST /operator/login`).
 * 3. Wallet Webhook Callbacks (`/balance`, `/betrequest`, `/resultrequest`).
 * 4. A beautiful mock frontend Lobby served directly on http://localhost:5000/ to test launching and playing inside an iframe.
 * 
 * HOW TO RUN:
 * npm install express axios
 * node operator_integration_demo.js
 */

const express = require('express');
const crypto = require('crypto');
const axios = require('axios'); // For making HTTP requests to RoyalBet

const app = express();
// Capture the raw body buffer for accurate RSA signature verification
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

// ==========================================
// INTEGRATION CONFIGURATION
// ==========================================
const ROYALBET_API_URL = 'http://localhost:4000'; // RoyalBet Engine URL
const OPERATOR_ID = 'Gap_wala';                  // Your Operator ID
const ALLOWED_IP = '127.0.0.1';                  // Whitelisted IP

// RSA Keys for Signature Verification
// 1. YOUR PRIVATE KEY: Used to sign requests sent to RoyalBet (e.g., operator login).
const OPERATOR_PRIVATE_KEY = `-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEAnfPsU28tFdvQUrVPAYfvS9KlXLSmu0Aa1PKTkfO5x2e17uoK
ULSuhf+1Hs/4j6AmCBXwiWV0RkzoiiVVZRjrwmm4oZ5XafRFVJnb8xPOKqZNaV/E
P5iXnVKfn0mMXGxJZzyMrqPB/CPE4XY9YloTNrxOx/4bGsSCrMO0eKiR0OrZxI9l
F0hmpGAJfeFspumbrWmUwEldpDSgVOIq9BuOjCDmAnxPkdBHhI3SuSsKlZysPZC+
KTFF7uFW5E9vO5KTdziWcOOGFFCgEkIIm+mS3Q76UFWuRXSJ1vKf1j1gZORSyVfc
lKCLE+IPrReQv0kPcdutypzUIGKe+LqV5egrPQIDAQABAoIBAB0YqGGMOtFqfxsl
RAsDp+yfPo/vxUD8I5UzpESAEapua+C5YzIPvpB3lL060U5f0XGu3PLqaftjQnjk
PLFVYGSdRgIboX2mnjjh6NcDwHgxz1PIbOXMLa2w4S+eBEmoNvNZ/45SIzNXwXZI
6jDaZ+yuzpJfuE17gpjhqjaJ0uaZemV1eRG59TfpSHkZSUAdUoFq498TObuBtyEn
zYPtcqoclmT5PZnxx/devdXRaeYsTULQdaXSptnWPMC1q/qn89ewH9ZNHsiluioH
xEydjmegWneNZgKwrbyYJ3ex+I8sWrjRnutzfqkX7beg8colASxnrjQFZVYbRZZF
OmSwYqECgYEA0Oi8hj6WoOWwfGJsPfcSNzy1yInf2XnTbKLXivsiPS251uvf6a4t
TNl52198UZVAPcLHAwl+wJtGMsXbRgcpYlt4boltjxT6XZ6yuf0k6g1m70ApB8w5
yEWi6BuooR2AhyOGkzdGtEvzrWv7RcjBrtUWF/ApGFdu/R9Qshc7Ho0CgYEAwY62
tZkcKQJfbgMmrFnibVdisTVcRxbvhJMtwiEYTqyns/JulSFo8T/8u0ZRHkPdFcPg
sm8twwi1ErtXl/Eo9hSofYWUEw6NLKsOKQwKsHDwFgHPjCU4lYowUnH/M9yylfEc
KDrfgPNz+Ff6Fy2Pi5Yw0V9CHcjq5vTIa1TmK3ECgYBjQQA5A8mK/jXgkt58fkOA
TO7NLXxWFgR2S9P+axy0VmJCE2UZ4DAToAu+R1qIZFHWRhFJhxxapCsw+kIYvlRS
L8VDNzX/Uec1za16oiQEs4NhTmlwE/6sATHJ90Ih8iNbkWxhy1RjWuaWUYRbfmtP
Blxt2SOdNgU8a8FqK5FiDQKBgQCo1+Z4GVzgRSqb2/HTbQFA4na8INEjTlWX749+
BcKfdqtAJN3kB2X09R1w/BDs9sQYJWuQG73uoVzbP0NUztEtgK3N+UVHLm1mJr1O
fyuf6JT2jZPQK/PlNsuaT8kQI5hBhjdKvLiVU0m5vHzz1RGf8V8adR9GvipzV9qx
DjlOcQKBgQCYDGqdm9SwrgGbIwZtd9vLboLNCTxkb0H8RgPmafmkPm2qxdM7zHOl
41ADqyqwC4cS6GzQGlD3Hh5an65Zy7AMi2KddyMbdhnw8lB4vXNIY53kSB/7agl/
TLvEMPyLhIgwf02Y5rvegeCywIiin/4d/l0zqJMdgjq2+jOvxgsRlw==
-----END RSA PRIVATE KEY-----`;

// 2. ROYALBET'S PUBLIC KEY (Given by RoyalBet): Used to verify callback requests sent from RoyalBet to your webhook.
const ROYALBET_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAvKGyvpBTNp0XS5c9Bb6V
L9S25ADxg9MPmIY+veCEyCeOL4NgtlE22jJynVwxUEed94/r+LgQ+aVp4iawaRqv
KF3fwzW58mgdfQPIbokOwSMGJPy4PErnB18w8rmiFWgABYuyUOgsDtD0vEvbRIEh
u6v7MQj4iSZ57IxYwJRZDT6W61vYu8dIGW039XaWmjjU2avvUiwAF1Y0Nv5TwVuK
wEkmOTeiKPnVJ4gvu5A2RoCxjVYvjDBjoCiZAvvFd1Y6+OmJKGTRNlEM32VcBvvu
LLIwuwGCwWfEzUqzXe98V7J5gFKLe7lnSXknlQ1GjCNalwddazeQaPnRZr6B7kvR
pwIDAQAB
-----END PUBLIC KEY-----`;


// Mock Database representing your players' balances on your platform
const mockUserDatabase = {
  'player_100': {
    username: 'John Doe',
    balance: 10000.00, // INR
    currency: 'INR',
  }
};

// ==========================================
// HELPERS
// ==========================================

/**
 * Generate RSA-SHA256 signature for requests sent to RoyalBet
 */
function generateSignature(payload, privateKey) {
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(JSON.stringify(payload));
  return signer.sign(privateKey, 'base64');
}

/**
 * Verify RSA-SHA256 signature on callback requests from RoyalBet
 */
function verifyRoyalBetSignature(req, publicKey) {
  const signature = req.headers['signature'];
  if (!signature || !req.rawBody) {
    console.error('Signature missing or rawBody not captured');
    return false;
  }

  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(req.rawBody);
  const isValid = verifier.verify(publicKey, signature, 'base64');
  
  if (!isValid) {
    console.error('Signature verification failed! Raw body:', req.rawBody.toString('utf8'));
  }
  
  return isValid;
}

// ==========================================
// 1. MOCK LOBBY FRONTEND (SERVED DIRECTLY)
// ==========================================
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GapWala Casino - Premium B2B Lobby Demo</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800;900&family=Playfair+Display:ital,wght@0,700;1,700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #070913;
      --surface: #101426;
      --surface-hover: #171d37;
      --primary: #f5a623;
      --primary-hover: #e09315;
      --text: #ffffff;
      --text-muted: #838ea3;
      --accent: #6366f1;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: 'Outfit', sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      overflow-x: hidden;
    }
    header {
      background: rgba(16, 20, 38, 0.85);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      padding: 1.25rem 5%;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .logo {
      font-family: 'Playfair Display', serif;
      font-size: 1.8rem;
      font-weight: 700;
      color: var(--primary);
      font-style: italic;
      letter-spacing: -0.02em;
    }
    .logo span { color: var(--text); }
    .wallet-pill {
      background: rgba(99, 102, 241, 0.15);
      border: 1px solid rgba(99, 102, 241, 0.3);
      border-radius: 99px;
      padding: 0.5rem 1.25rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .wallet-amount { color: var(--primary); }
    main {
      flex: 1;
      padding: 3rem 5%;
      max-width: 1200px;
      width: 100%;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 3rem;
    }
    .hero {
      text-align: center;
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(245, 166, 35, 0.05));
      border: 1px solid rgba(255, 255, 255, 0.04);
      border-radius: 24px;
      padding: 4rem 2rem;
      position: relative;
      overflow: hidden;
    }
    .hero h1 { font-size: 3rem; font-weight: 900; letter-spacing: -0.02em; margin-bottom: 1rem; }
    .hero h1 span {
      background: linear-gradient(90deg, var(--primary), #ffc875);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .hero p { color: var(--text-muted); font-size: 1.1rem; max-width: 600px; margin: 0 auto; }
    .section-title { font-size: 1.75rem; font-weight: 800; margin-bottom: 1.5rem; position: relative; padding-left: 14px; }
    .section-title::before {
      content: ''; position: absolute; left: 0; top: 50%; transform: translateY(-50%);
      width: 4px; height: 24px; background: var(--primary); border-radius: 4px;
    }
    .games-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 2rem; }
    .game-card {
      background: var(--surface);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 20px;
      overflow: hidden;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      flex-direction: column;
      position: relative;
    }
    .game-card:hover {
      transform: translateY(-6px);
      border-color: rgba(245, 166, 35, 0.3);
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
    }
    .game-thumb {
      height: 180px;
      background: linear-gradient(45deg, #1f1a3a, #30233b);
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
    }
    .game-thumb svg { width: 64px; height: 64px; color: var(--primary); opacity: 0.8; transition: transform 0.5s ease; }
    .game-card:hover .game-thumb svg { transform: scale(1.15) rotate(5deg); }
    .game-badge {
      position: absolute; top: 12px; left: 12px; background: var(--accent);
      font-size: 0.75rem; font-weight: 800; text-transform: uppercase;
      padding: 0.25rem 0.75rem; border-radius: 6px; letter-spacing: 0.05em;
    }
    .game-details { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; flex: 1; }
    .game-title { font-size: 1.25rem; font-weight: 700; }
    .game-desc { color: var(--text-muted); font-size: 0.875rem; line-height: 1.4; flex: 1; }
    .play-btn {
      width: 100%; background: var(--primary); color: #000000; border: none; border-radius: 12px;
      padding: 0.85rem; font-weight: 800; cursor: pointer; transition: all 0.2s ease;
      display: flex; align-items: center; justify-content: center; gap: 8px;
    }
    .play-btn:hover {
      background: var(--primary-hover);
      box-shadow: 0 4px 15px rgba(245, 166, 35, 0.25);
    }
    .play-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    
    /* Overlay IFrame */
    .game-overlay {
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: #000000; z-index: 1000; display: none; flex-direction: column;
    }
    .game-overlay-header {
      background: #0a0c16; border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding: 1rem 5%; display: flex; justify-content: space-between; align-items: center; height: 60px;
    }
    .close-game-btn {
      background: #ef4444; color: #ffffff; border: none; border-radius: 8px;
      padding: 0.5rem 1.25rem; font-weight: 700; cursor: pointer; transition: background 0.2s;
    }
    .close-game-btn:hover { background: #dc2626; }
    .game-iframe { width: 100%; height: calc(100% - 60px); border: none; background: #050811; }
  </style>
</head>
<body>
  <header>
    <div class="logo">GapWala<span>Casino</span></div>
    <div class="wallet-pill">
      <span>Balance:</span>
      <span class="wallet-amount" id="balanceDisplay">₹10,000.00</span>
    </div>
  </header>

  <main>
    <div class="hero">
      <h1>Welcome to the <span>Luxe Gaming Lounge</span></h1>
      <p>Enjoy our selection of premium third-party integrated games. Funds are seamlessly debited and credited to your GapWala wallet in real-time.</p>
    </div>

    <!-- Configuration Panel -->
    <div style="background: var(--surface); padding: 2rem; border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.05); display: flex; gap: 2rem; flex-wrap: wrap; margin-top: -1.5rem;">
      <div style="flex: 1; min-width: 220px; display: flex; flex-direction: column; gap: 8px;">
        <label style="font-weight: 600; font-size: 0.9rem; color: var(--text-muted);">Configure Player Balance</label>
        <input type="number" id="customBalanceInput" value="10000" style="background: var(--bg); border: 1px solid rgba(255,255,255,0.1); padding: 12px 16px; border-radius: 10px; color: #fff; outline: none; font-size: 1rem; font-weight: 600;" />
      </div>
      <div style="flex: 1; min-width: 220px; display: flex; flex-direction: column; gap: 8px;">
        <label style="font-weight: 600; font-size: 0.9rem; color: var(--text-muted);">Select Currency</label>
        <select id="customCurrencyInput" style="background: var(--bg); border: 1px solid rgba(255,255,255,0.1); padding: 12px 16px; border-radius: 10px; color: #fff; outline: none; font-size: 1rem; font-weight: 600; cursor: pointer;">
          <option value="INR" selected>INR (₹)</option>
          <option value="USDT">USDT ($)</option>
        </select>
      </div>
      <div style="display: flex; align-items: flex-end;">
        <button onclick="updateSettings()" style="background: var(--accent); color: #fff; border: none; padding: 12px 24px; border-radius: 10px; font-weight: 700; cursor: pointer; transition: opacity 0.2s; height: 48px;">
          Update Wallet
        </button>
      </div>
    </div>

    <div>
      <h2 class="section-title">Featured Seamless Games</h2>
      <div class="games-grid">
        <div class="game-card">
          <span class="game-badge">Crash Game</span>
          <div class="game-thumb">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div class="game-details">
            <h3 class="game-title">Elevator Royale</h3>
            <p class="game-desc">A premium crash multiplayer elevator game. Predict which floor the elevator will reach before it crashes, and cash out up to 30x!</p>
            <button class="play-btn" id="playBtn" onclick="launchGame()">Play Now</button>
          </div>
        </div>

        <div class="game-card" style="opacity: 0.6;">
          <span class="game-badge" style="background: #374151;">Slot</span>
          <div class="game-thumb">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <div class="game-details">
            <h3 class="game-title">Golden Fortune Slot</h3>
            <p class="game-desc">Experience classic Vegas slot machine thrills. Spin and win big with wild symbols and bonus rounds. (Coming Soon)</p>
            <button class="play-btn" disabled>Locked</button>
          </div>
        </div>
      </div>
    </div>
  </main>

  <div class="game-overlay" id="gameOverlay">
    <div class="game-overlay-header">
      <div class="logo">GapWala<span>Room</span></div>
      <button class="close-game-btn" onclick="closeGame()">Exit Game</button>
    </div>
    <iframe class="game-iframe" id="gameIframe"></iframe>
  </div>

  <script>
    const userId = 'player_100';

    async function updateBalance() {
      try {
        const response = await fetch('/royalbet-callback/balance', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Signature': 'MOCK_BYPASS_FOR_DEVELOPMENT'
          },
          body: JSON.stringify({ userId: userId })
        });
        const data = await response.json();
        if (data.status === 'OP_SUCCESS') {
          const isUSDT = data.currency === 'USDT';
          const formatted = new Intl.NumberFormat(isUSDT ? 'en-US' : 'en-IN', {
            style: 'currency',
            currency: data.currency || 'INR'
          }).format(data.balance);
          document.getElementById('balanceDisplay').innerText = formatted;
        }
      } catch (err) {
        console.error('Balance sync failed:', err);
      }
    }

    async function updateSettings() {
      const balance = document.getElementById('customBalanceInput').value;
      const currency = document.getElementById('customCurrencyInput').value;
      
      try {
        const response = await fetch('/api/play/launch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userId: userId,
            balance: parseFloat(balance),
            currency: currency,
            onlyUpdate: true
          })
        });
        const data = await response.json();
        if (data.success) {
          updateBalance();
          alert('Mock wallet updated! Balance: ' + balance + ' ' + currency);
        } else {
          alert('Failed to update mock wallet');
        }
      } catch (err) {
        console.error('Update settings failed:', err);
      }
    }

    async function launchGame() {
      const playBtn = document.getElementById('playBtn');
      playBtn.innerText = 'Launching...';
      playBtn.disabled = true;

      const balance = document.getElementById('customBalanceInput').value;
      const currency = document.getElementById('customCurrencyInput').value;

      try {
        const response = await fetch('/api/play/launch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userId: userId,
            balance: parseFloat(balance),
            currency: currency
          })
        });
        const data = await response.json();

        if (data.success && data.gameUrl) {
          document.getElementById('gameIframe').src = data.gameUrl;
          document.getElementById('gameOverlay').style.display = 'flex';
          // window.balanceInterval = setInterval(updateBalance, 5000);
        } else {
          alert('Failed to launch game: ' + (data.error || 'Server error'));
        }
      } catch (err) {
        console.error('Launch failed:', err);
        alert('Failed to connect to integration server');
      } finally {
        playBtn.innerText = 'Play Now';
        playBtn.disabled = false;
      }
    }

    function closeGame() {
      document.getElementById('gameOverlay').style.display = 'none';
      document.getElementById('gameIframe').src = '';
      if (window.balanceInterval) {
        clearInterval(window.balanceInterval);
      }
      updateBalance();
    }

    updateBalance();
  </script>
</body>
</html>
  `);
});

// ==========================================
// 2. GAME LAUNCH (INITIATE SEAMLESS LOGIN)
// ==========================================
/**
 * When a user on your frontend clicks "Play Elevator Royale", your frontend
 * calls this endpoint on YOUR backend.
 */
app.post('/api/play/launch', async (req, res) => {
  const { userId, balance, currency, onlyUpdate } = req.body;

  // Update mock database dynamically with user inputs if provided
  if (balance !== undefined && currency !== undefined) {
    mockUserDatabase[userId] = {
      username: 'John Doe',
      balance: parseFloat(balance),
      currency: currency
    };
  }

  if (onlyUpdate) {
    return res.json({ success: true, message: 'Settings updated' });
  }

  const player = mockUserDatabase[userId];
  if (!player) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  // 1. Construct payload
  const payload = {
    operatorId: OPERATOR_ID,
    userId: userId,
    username: player.username,
    balance: player.balance,
    currency: player.currency,
    platformId: 'web',
    gameId: 'royalbet-elevator',
    clientIp: req.ip || req.connection.remoteAddress || '127.0.0.1',
  };

  try {
    // 2. Sign payload
    const signature = generateSignature(payload, OPERATOR_PRIVATE_KEY);

    // 3. Post to RoyalBet Seamless Login Endpoint
    const response = await axios.post(`${ROYALBET_API_URL}/operator/login`, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Signature': signature
      }
    });

    // 4. Return the generated launch URL to your frontend
    if (response.data && response.data.status === 1) {
      // response.data.url contains: http://localhost:3000/play?session=UUID
      return res.json({ success: true, gameUrl: response.data.url });
    } else {
      return res.status(400).json({ success: false, error: response.data.errorDescription || 'Authentication failed' });
    }
  } catch (error) {
    if (error.response) {
      console.error('Launch request failed:', error.response.status, error.response.data);
      return res.status(error.response.status).json({ 
        success: false, 
        error: error.response.data.message || error.response.data.error || 'Authentication failed' 
      });
    }
    console.error('Launch request failed:', error.message);
    return res.status(500).json({ success: false, error: 'Internal Server Error connecting to RoyalBet' });
  }
});

// ==========================================
// 3. WALLET CALLBACKS (WEBHOOKS)
// ==========================================

// Middleware to verify incoming callbacks from RoyalBet
app.use('/royalbet-callback', (req, res, next) => {
  // Option 1: IP Whitelist Check (Highly Recommended)
  const clientIp = req.ip || req.connection.remoteAddress;
  const isLocal = clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === '::ffff:127.0.0.1';
  if (!isLocal && clientIp !== ALLOWED_IP && !clientIp.endsWith(ALLOWED_IP)) {
    console.warn(`Unauthorized IP access attempt: ${clientIp}`);
    // return res.status(401).json({ status: "OP_FAILED", message: "Unauthorized IP" });
  }

  // Option 2: RSA Signature Verification (with development bypass)
  const signature = req.headers['signature'];
  if (signature === 'MOCK_BYPASS_FOR_DEVELOPMENT') {
    return next();
  }

  const isVerified = verifyRoyalBetSignature(req, ROYALBET_PUBLIC_KEY);
  if (!isVerified) {
    console.error(`\n❌ [WEBHOOK REJECTED] Signature verification failed for ${req.path}`);
    return res.status(401).json({
      status: 'OP_FAILED',
      message: 'Invalid signature verification failed'
    });
  }

  console.log(`\n✅ [WEBHOOK VERIFIED] Signature verified for ${req.path}`);
  next();
});

/**
 * 3.1 Balance Check callback
 * Called by RoyalBet to query the player's latest balance.
 */
app.post('/royalbet-callback/balance', (req, res) => {
  console.log(`\n[WEBHOOK RECEIVED] /balance request for user: ${req.body.userId}`);
  const { userId } = req.body;
  const player = mockUserDatabase[userId];

  if (!player) {
    return res.json({ status: 'USER_NOT_FOUND', balance: 0, currency: 'INR' });
  }

  return res.json({
    status: 'OP_SUCCESS',
    balance: player.balance,
    currency: player.currency
  });
});

/**
 * 3.2 Debit Callback (Bet Placement)
 * Called by RoyalBet to deduct funds when the player places a bet.
 */
app.post('/royalbet-callback/betrequest', (req, res) => {
  console.log(`\n[WEBHOOK RECEIVED] /betrequest | User: ${req.body.userId} | Amount: ${req.body.debitAmount}`);
  const { userId, debitAmount, transactionId } = req.body;
  const player = mockUserDatabase[userId];

  if (!player) {
    console.error(`❌ [BET REJECTED] User ${userId} not found in mock DB.`);
    return res.json({ status: 'USER_NOT_FOUND', balance: 0 });
  }

  // 🛡️ Deduct Balance & Ensure sufficient funds
  if (player.balance < debitAmount) {
    return res.json({
      status: 'INSUFFICIENT_FUNDS',
      balance: player.balance,
      message: 'Insufficient balance to place bet'
    });
  }

  // Deduct
  player.balance -= debitAmount;

  // Log transactionId for idempotency checks in your database
  console.log(`[DEBIT SUCCESS] TxId: ${transactionId} | User: ${userId} | Deducted: ${debitAmount}`);

  return res.json({
    status: 'OP_SUCCESS',
    balance: player.balance,
    message: 'Deduction successful'
  });
});

/**
 * 3.3 Credit Callback (Win Payout)
 * Called by RoyalBet to credit funds when the player wins.
 */
app.post('/royalbet-callback/resultrequest', (req, res) => {
  console.log(`\n[WEBHOOK RECEIVED] /resultrequest | User: ${req.body.userId} | Amount: ${req.body.creditAmount}`);
  const { userId, creditAmount, transactionId } = req.body;
  const player = mockUserDatabase[userId];

  if (!player) {
    console.error(`❌ [WIN REJECTED] User ${userId} not found in mock DB.`);
    return res.json({ status: 'USER_NOT_FOUND', balance: 0 });
  }

  // Credit
  player.balance += creditAmount;

  // Log transactionId for idempotency checks in your database
  console.log(`[CREDIT SUCCESS] TxId: ${transactionId} | User: ${userId} | Credited: ${creditAmount}`);

  return res.json({
    status: 'OP_SUCCESS',
    balance: player.balance,
    message: 'Payout credited successfully'
  });
});

// Start Operator Webhook Server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🚀 Demo Operator Integration server running on port ${PORT}`);
  console.log(`   - Lobby & Webhooks running in a single file on: http://localhost:${PORT}`);
});
