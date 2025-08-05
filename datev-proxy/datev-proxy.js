const express = require('express');

const app = express();
const PORT = 80; // Muss Port 80 sein für "http://localhost"
const TARGET_PORT = 3000;

// Proxy für DATEV OAuth Callbacks
app.get('/', (req, res) => {
  const hasDatevCallback = req.query.code || req.query.error || req.query.state;
  
  if (hasDatevCallback) {
    console.log('🔄 [DATEV Proxy] Redirecting DATEV callback to Next.js app');
    console.log('Query params:', req.query);
    
    // Redirect zu unserem Cookie-Callback-Handler
    const queryString = new URLSearchParams(req.query).toString();
    const targetUrl = `http://localhost:${TARGET_PORT}/api/datev/callback-cookie?${queryString}`;
    console.log('Target URL:', targetUrl);
    
    return res.redirect(307, targetUrl);
  }
  
  // Für Basis-Requests, zeige Info-Seite
  res.send(`
    <h1>DATEV OAuth Proxy Server</h1>
    <p>Dieser Server leitet DATEV OAuth Callbacks zu Taskilo weiter.</p>
    <p>Next.js App läuft auf: <a href="http://localhost:${TARGET_PORT}">localhost:${TARGET_PORT}</a></p>
  `);
});

app.listen(PORT, () => {
  console.log(`🚀 DATEV Proxy Server läuft auf Port ${PORT}`);
  console.log(`📡 Leitet DATEV OAuth Callbacks zu localhost:${TARGET_PORT} weiter`);
  console.log(`🌐 URL für DATEV Developer Portal: http://localhost (Port 80)`);
  console.log('⚠️  Starte diesen Server mit sudo: sudo node datev-proxy.js');
});

process.on('SIGINT', () => {
  console.log('\n🛑 DATEV Proxy Server wird beendet...');
  process.exit(0);
});
