import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { mailboxesRouter } from './routes/mailboxes';
import { messagesRouter } from './routes/messages';
import { messageRouter } from './routes/message';
import { sendRouter } from './routes/send';
import { actionsRouter } from './routes/actions';
import { testRouter } from './routes/test';
import { searchRouter } from './routes/search';
import { attachmentsRouter } from './routes/attachments';
import { calendarRouter } from './routes/calendar';
import { turnRouter } from './routes/turn';
import { recordingRouter } from './routes/recording';
import { 
  apiRateLimiter, 
  authRateLimiter,
  ipBlockMiddleware,
  securityHeaders,
  requestIdMiddleware,
  auditLogger,
  secureCompare,
} from './security/SecurityMiddleware';
import { wsService } from './services/WebSocketService';
import { cacheService } from './services/CacheService';
import { imapPool } from './services/ConnectionPool';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3100;

// Trust proxy - wichtig für Rate-Limiter hinter Nginx/Reverse-Proxy
app.set('trust proxy', 1);

// API Key für Authentifizierung
const API_KEY = process.env.WEBMAIL_API_KEY || 'taskilo-webmail-secret-key-change-in-production';

// Erlaubte Origins (Vercel + lokale Entwicklung)
const ALLOWED_ORIGINS = [
  'https://taskilo.de',
  'https://www.taskilo.de',
  'https://taskilo.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
];

// Security Middleware (ZUERST)
app.use(ipBlockMiddleware);
app.use(securityHeaders);
app.use(requestIdMiddleware);
app.use(auditLogger);

// Helmet mit strengen Einstellungen
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: 'same-origin' },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true,
}));

// CORS
app.use(cors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) return callback(null, true);
    
    if (ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Body Parser mit Limit
app.use(express.json({ limit: '25mb' })); // Erhöht für Attachments

// Rate Limiting
app.use('/api', apiRateLimiter);
app.use('/api/test', authRateLimiter); // Strenger für Auth

// API Key Validierung Middleware (Timing-Safe)
app.use('/api', (req, res, next) => {
  const apiKey = req.headers['x-api-key'] as string;
  
  if (!apiKey || !secureCompare(apiKey, API_KEY)) {
    return res.status(401).json({ 
      success: false, 
      error: 'Unauthorized - Invalid API Key' 
    });
  }
  
  next();
});

// Health Check (mit Stats)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'taskilo-webmail-proxy',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    stats: {
      pool: imapPool.getStats(),
      cache: cacheService.getStats(),
      websocket: wsService.getStats(),
    },
  });
});

// API Routes - Basis
app.use('/api/mailboxes', mailboxesRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/message', messageRouter);
app.use('/api/send', sendRouter);
app.use('/api/actions', actionsRouter);
app.use('/api/test', testRouter);

// API Routes - Erweitert
app.use('/api/search', searchRouter);
app.use('/api/attachments', attachmentsRouter);
app.use('/api/calendar', calendarRouter);
app.use('/api/turn', turnRouter);
app.use('/api/recording', recordingRouter);

// Error Handler (ohne Stack Trace in Production)
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const requestId = req.headers['x-request-id'] as string;
  console.error(`[ERROR] ${requestId} | ${err.message}`);
  
  res.status(500).json({ 
    success: false, 
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal Server Error' 
      : err.message,
    requestId,
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    error: 'Not Found',
  });
});

// WebSocket initialisieren
wsService.initialize(httpServer);

// Server starten
httpServer.listen(PORT, () => {
  console.log(`
+-----------------------------------------------------------+
|                                                           |
|   Taskilo Webmail Proxy Server v2.0.0                     |
|                                                           |
|   Port: ${PORT}                                            |
|   Environment: ${process.env.NODE_ENV || 'development'}                           |
|                                                           |
|   Basis-Endpoints:                                        |
|   - GET  /health           Health Check + Stats           |
|   - POST /api/mailboxes    Mailbox-Ordner                 |
|   - POST /api/messages     E-Mail-Liste                   |
|   - POST /api/message      Einzelne E-Mail                |
|   - POST /api/send         E-Mail senden                  |
|   - POST /api/actions      E-Mail-Aktionen                |
|   - POST /api/test         Verbindungstest                |
|                                                           |
|   Erweiterte Endpoints:                                   |
|   - POST /api/search       Volltextsuche                  |
|   - POST /api/attachments  Anhang-Download                |
|   - POST /api/calendar     CalDAV-Kalender                |
|   - POST /api/turn         TURN-Credentials               |
|   - POST /api/recording    Meeting-Aufnahmen              |
|                                                           |
|   WebSocket: /ws                                          |
|                                                           |
|   Security: Rate Limiting, IP-Blocking, Audit-Logging     |
|                                                           |
+-----------------------------------------------------------+
  `);
});

// Graceful Shutdown
async function shutdown(signal: string): Promise<void> {
  console.log(`\n[${signal}] Shutting down gracefully...`);
  
  wsService.shutdown();
  await imapPool.destroy();
  await cacheService.disconnect();
  
  httpServer.close(() => {
    console.log('[SHUTDOWN] Server closed');
    process.exit(0);
  });
  
  // Force exit nach 10 Sekunden
  setTimeout(() => {
    console.error('[SHUTDOWN] Forced exit after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (reason, promise) => {
  console.error('[UNHANDLED] Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[UNCAUGHT] Exception:', error);
  shutdown('UNCAUGHT');
});
