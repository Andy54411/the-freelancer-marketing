#!/usr/bin/env node

/**
 * DATEV Port 80 Proxy Server
 * Leitet DATEV Callbacks von Port 80 auf den lokalen Next.js Server weiter
 * WICHTIG: Erforderlich für DATEV Sandbox Compliance
 */

const http = require('http');

// Next.js Development Server (läuft auf Port 3001)
const TARGET_PORT = process.env.TARGET_PORT || '3001';
const TARGET_HOST = process.env.TARGET_HOST || 'localhost';

console.log('🚀 DATEV Port 80 Proxy Server wird gestartet...');
console.log(`📋 Ziel: http://${TARGET_HOST}:${TARGET_PORT}`);
console.log('🔧 Grund: DATEV Sandbox Compliance (redirect_uri muss Port 80 verwenden)');

// Proxy Server auf Port 80 (OHNE externe Abhängigkeiten)
const server = http.createServer((req, res) => {
  console.log(`🔄 [Port 80 Proxy] ${req.method} ${req.url}`);

  // DATEV Callback URLs abfangen
  if (req.url && req.url.includes('code=') && req.url.includes('state=')) {
    console.log('🎯 [Port 80 Proxy] DATEV OAuth Callback erkannt!');
    console.log(
      `📤 [Port 80 Proxy] Weiterleitung an Next.js Server: ${TARGET_HOST}:${TARGET_PORT}`
    );
  }

  // Einfache HTTP-Weiterleitung
  const options = {
    hostname: TARGET_HOST,
    port: TARGET_PORT,
    path: req.url,
    method: req.method,
    headers: req.headers,
  };

  const proxyReq = http.request(options, proxyRes => {
    console.log(`📨 [Port 80 Proxy] Response: ${proxyRes.statusCode} für ${req.url}`);

    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', error => {
    console.error('❌ [Port 80 Proxy] Proxy-Fehler:', error.message);
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Bad Gateway - Next.js Server nicht erreichbar');
  });

  req.pipe(proxyReq, { end: true });
});

// Proxy-Events
proxy.on('proxyReq', (proxyReq, req, res) => {
  console.log(`📡 [Port 80 Proxy] Proxy Request: ${req.method} ${req.url}`);
});

proxy.on('proxyRes', (proxyRes, req, res) => {
  console.log(`📨 [Port 80 Proxy] Proxy Response: ${proxyRes.statusCode} für ${req.url}`);
});

// Server starten
const PORT = 80;

server.listen(PORT, error => {
  if (error) {
    console.error('❌ [Port 80 Proxy] Server konnte nicht gestartet werden:', error.message);
    console.log('💡 [Port 80 Proxy] Tipp: Verwenden Sie "sudo" für Port 80');
    process.exit(1);
  }

  console.log('✅ [Port 80 Proxy] Server läuft erfolgreich!');
  console.log(`🌐 [Port 80 Proxy] Listening auf: http://localhost:${PORT}`);
  console.log(`🔄 [Port 80 Proxy] Leitet weiter an: http://${TARGET_HOST}:${TARGET_PORT}`);
  console.log('🎯 [Port 80 Proxy] Bereit für DATEV OAuth Callbacks!');
});

// Graceful Shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 [Port 80 Proxy] Server wird beendet...');
  server.close(() => {
    console.log('✅ [Port 80 Proxy] Server erfolgreich beendet.');
    process.exit(0);
  });
});

// Error Handling
process.on('uncaughtException', error => {
  console.error('❌ [Port 80 Proxy] Uncaught Exception:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ [Port 80 Proxy] Unhandled Rejection:', reason);
  process.exit(1);
});
