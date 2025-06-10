// /Users/andystaudinger/Tasko/firebase_functions/src/server.ts

import { createServer } from 'http';
import { logger } from 'firebase-functions/v2';

// Dies ist ein Workaround für Cloud Run Healthchecks bei Event-Triggered Functions.
// Cloud Run erwartet, dass der Container auf PORT lauscht, auch wenn die Funktion kein HTTP-Endpunkt ist.
const PORT = process.env.PORT || 8080;

const server = createServer((req, res) => {
    // Diese Anfragen kommen vom Healthcheck oder von Fehlkonfigurationen.
    // Echte Event-Funktionen werden nicht über HTTP aufgerufen.
    logger.info(`Received HTTP request on Port ${PORT} (Path: ${req.url}, Method: ${req.method}). This is likely a Healthcheck.`);
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
});

server.listen(PORT, () => {
    logger.info(`Dummy HTTP server listening on Port ${PORT} for Healthchecks.`);
});

// Optional: Fehlerbehandlung für den Server
server.on('error', (e: any) => {
    logger.error(`Dummy HTTP server error: ${e.message}`);
});