/**
 * Taskilo Webmail Proxy - Security Middleware
 * Absolute Sicherheit für Kundenmaildaten
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';

// Rate Limiting pro IP
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minuten
  max: 100, // Max 100 Requests pro IP pro 15 Minuten
  message: {
    success: false,
    error: 'Too many requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strenges Rate Limiting für Login/Authentifizierung
export const authRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 Stunde
  max: 10, // Max 10 fehlgeschlagene Logins pro Stunde
  message: {
    success: false,
    error: 'Too many failed login attempts. Account locked for 1 hour.',
  },
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
});

// IP-Blocklist für bekannte Angreifer
const blockedIPs: Set<string> = new Set();
const failedAttempts: Map<string, { count: number; lastAttempt: number }> = new Map();

// Automatische IP-Sperre nach zu vielen Fehlversuchen
export function trackFailedAttempt(ip: string): void {
  const now = Date.now();
  const attempt = failedAttempts.get(ip) || { count: 0, lastAttempt: now };
  
  // Reset nach 1 Stunde
  if (now - attempt.lastAttempt > 60 * 60 * 1000) {
    attempt.count = 0;
  }
  
  attempt.count++;
  attempt.lastAttempt = now;
  failedAttempts.set(ip, attempt);
  
  // IP sperren nach 20 fehlgeschlagenen Versuchen
  if (attempt.count >= 20) {
    blockedIPs.add(ip);
    console.warn(`[SECURITY] IP blocked: ${ip} - Too many failed attempts`);
  }
}

export function resetFailedAttempts(ip: string): void {
  failedAttempts.delete(ip);
}

// IP-Block Middleware
export function ipBlockMiddleware(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  
  if (blockedIPs.has(ip)) {
    res.status(403).json({
      success: false,
      error: 'Access denied. Your IP has been blocked.',
    });
    return;
  }
  
  next();
}

// Security Headers Middleware
export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  // Zusätzliche Security Headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Keine sensiblen Infos in Fehlermeldungen
  res.setHeader('X-Powered-By', 'Taskilo');
  
  next();
}

// Request-ID für Audit-Logging
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = crypto.randomUUID();
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
}

// Audit Logger
export function auditLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const requestId = req.headers['x-request-id'] as string;
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  
  // Log Request (ohne sensible Daten)
  const sanitizedBody = { ...req.body };
  if (sanitizedBody.password) sanitizedBody.password = '[REDACTED]';
  if (sanitizedBody.text) sanitizedBody.text = '[REDACTED]';
  if (sanitizedBody.html) sanitizedBody.html = '[REDACTED]';
  
  console.log(`[AUDIT] ${requestId} | ${req.method} ${req.path} | IP: ${ip}`);
  
  // Log Response
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[AUDIT] ${requestId} | Status: ${res.statusCode} | Duration: ${duration}ms`);
  });
  
  next();
}

// Input Validation - keine SQL Injection / XSS
export function validateInput(input: string): string {
  if (!input) return input;
  
  // Entferne potenziell gefährliche Zeichen
  return input
    .replace(/[<>]/g, '') // Keine HTML Tags
    .replace(/javascript:/gi, '') // Keine JS Injection
    .replace(/on\w+=/gi, '') // Keine Event Handler
    .trim();
}

// Passwort-Hash für sichere Speicherung (falls benötigt)
export function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

// Timing-Safe API Key Vergleich (gegen Timing Attacks)
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

// Verschlüsselung für sensible Daten im Transit
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32).padEnd(32, '0'));
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

export function decrypt(encryptedText: string): string {
  const parts = encryptedText.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32).padEnd(32, '0'));
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
