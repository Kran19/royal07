const ngrok = require('ngrok');

(async function() {
  const token = process.argv[2];
  
  if (!token) {
    console.error('\x1b[31m%s\x1b[0m', 'Error: No Authtoken provided.');
    console.log('To share your site, follow these steps:');
    console.log('1. Go to https://dashboard.ngrok.com/get-started/your-authtoken');
    console.log('2. Copy your token.');
    console.log('3. Run: \x1b[32mnode share.js YOUR_TOKEN_HERE\x1b[0m');
    process.exit(1);
  }

  try {
    console.log('Connecting to ngrok...');
    
    const url = await ngrok.connect({
      authtoken: token,
      addr: 3000,
    });

    console.log('\n\x1b[35m%s\x1b[0m', '----------------------------------------');
    console.log('\x1b[32m%s\x1b[0m', '🚀 PLATFORM SHARED SUCCESSFULLY!');
    console.log('\x1b[36m%s\x1b[0m', `Public URL: ${url}`);
    console.log('\x1b[35m%s\x1b[0m', '----------------------------------------');
    console.log('Press Ctrl+C to stop sharing.\n');

  } catch (err) {
    console.error('\x1b[31m%s\x1b[0m', 'Error connecting to ngrok:');
    console.error(err.message);
  }
})();
