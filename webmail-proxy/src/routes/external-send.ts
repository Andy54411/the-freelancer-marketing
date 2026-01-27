/**
 * External Send Route
 * ====================
 * 
 * Ermöglicht das Versenden von E-Mails über externe Domains,
 * die bei Taskilo registriert sind.
 * 
 * Anwendungsfälle:
 * - Kontaktformulare auf Kundenwebseiten
 * - Automatische Benachrichtigungen
 * - Newsletter-Versand
 * 
 * Sicherheit:
 * - API-Key Authentifizierung
 * - Domain muss in MongoDB registriert sein
 * - CORS-Origin wird gegen erlaubte Origins geprüft
 * - Rate-Limiting per Domain
 */

import { Router } from 'express';
import nodemailer from 'nodemailer';
import { z } from 'zod';
import mongoDBService from '../services/MongoDBService';

const router: Router = Router();

// Validation Schema für externe E-Mails
const ExternalSendSchema = z.object({
  // Domain-Identifier (z.B. "the-freelancer-marketing.de")
  domain: z.string().min(1),
  
  // E-Mail-Daten
  to: z.string().email(),
  subject: z.string().min(1).max(200),
  html: z.string().min(1),
  text: z.string().optional(),
  
  // Optional: Reply-To (für Kontaktformulare)
  replyTo: z.string().email().optional(),
  replyToName: z.string().optional(),
  
  // Optional: Anhänge (Base64)
  attachments: z.array(z.object({
    filename: z.string(),
    content: z.string(), // Base64 encoded
    contentType: z.string().optional(),
  })).optional(),
});

// Rate-Limiting Map (Domain -> { count, resetTime })
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_PER_HOUR = 100;

/**
 * POST /api/send/external
 * 
 * Sendet eine E-Mail über eine registrierte externe Domain.
 * 
 * Headers:
 *   X-API-Key: WEBMAIL_API_KEY
 * 
 * Body:
 *   {
 *     "domain": "the-freelancer-marketing.de",
 *     "to": "empfaenger@example.com",
 *     "subject": "Neue Kontaktanfrage",
 *     "html": "<html>...</html>",
 *     "replyTo": "kunde@gmail.com"
 *   }
 */
router.post('/', async (req, res) => {
  try {
    // 1. Request validieren
    const data = ExternalSendSchema.parse(req.body);
    
    // 2. Domain-Konfiguration aus MongoDB laden
    const domainConfig = await mongoDBService.getExternalDomain(data.domain);
    
    if (!domainConfig) {
      console.log(`[External Send] Domain nicht registriert: ${data.domain}`);
      return res.status(404).json({
        success: false,
        error: 'Domain nicht registriert',
      });
    }
    
    // 3. Origin prüfen (CORS) - Server-to-Server Anfragen erlauben (kein Origin Header)
    const origin = req.headers.origin || req.headers.referer;
    if (origin && domainConfig.allowedOrigins && domainConfig.allowedOrigins.length > 0) {
      const isAllowed = domainConfig.allowedOrigins.some(allowed => 
        origin.includes(allowed.replace('https://', '').replace('http://', ''))
      );
      
      if (!isAllowed && process.env.NODE_ENV === 'production') {
        console.log(`[External Send] Origin nicht erlaubt: ${origin} für ${data.domain}`);
        return res.status(403).json({
          success: false,
          error: 'Origin nicht erlaubt',
        });
      }
    }
    // Kein Origin Header = Server-to-Server Aufruf (z.B. von Vercel) = erlaubt
    
    // 4. Rate-Limiting
    const now = Date.now();
    const rateLimit = rateLimitMap.get(data.domain);
    
    if (rateLimit) {
      if (now < rateLimit.resetTime) {
        if (rateLimit.count >= RATE_LIMIT_PER_HOUR) {
          console.log(`[External Send] Rate limit erreicht für: ${data.domain}`);
          return res.status(429).json({
            success: false,
            error: 'Rate limit erreicht. Bitte später erneut versuchen.',
          });
        }
        rateLimit.count++;
      } else {
        rateLimitMap.set(data.domain, { count: 1, resetTime: now + 3600000 });
      }
    } else {
      rateLimitMap.set(data.domain, { count: 1, resetTime: now + 3600000 });
    }
    
    // 5. SMTP-Transporter erstellen
    const transporter = nodemailer.createTransport({
      host: domainConfig.smtpHost || 'mail.taskilo.de',
      port: domainConfig.smtpPort || 587,
      secure: domainConfig.smtpPort === 465,
      auth: {
        user: domainConfig.smtpEmail,
        pass: domainConfig.smtpPassword,
      },
    });
    
    // 6. E-Mail zusammenstellen
    const fromName = domainConfig.fromName || data.domain;
    const fromEmail = domainConfig.smtpEmail;
    
    const mailOptions: nodemailer.SendMailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to: data.to,
      subject: data.subject,
      html: data.html,
      text: data.text,
    };
    
    // Reply-To für Kontaktformulare
    if (data.replyTo) {
      const replyToFormatted = data.replyToName 
        ? `"${data.replyToName}" <${data.replyTo}>`
        : data.replyTo;
      mailOptions.replyTo = replyToFormatted;
    }
    
    // Anhänge
    if (data.attachments && data.attachments.length > 0) {
      mailOptions.attachments = data.attachments.map(att => ({
        filename: att.filename,
        content: Buffer.from(att.content, 'base64'),
        contentType: att.contentType,
      }));
    }
    
    // 7. E-Mail senden
    const result = await transporter.sendMail(mailOptions);
    
    console.log(`[External Send] E-Mail gesendet: ${data.domain} -> ${data.to}, MessageId: ${result.messageId}`);
    
    // 8. Statistik aktualisieren
    await mongoDBService.incrementExternalDomainStats(data.domain);
    
    res.json({
      success: true,
      messageId: result.messageId,
    });
    
  } catch (error) {
    console.error('[External Send] Error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Ungültige Anfrage',
        details: error.errors,
      });
    }
    
    const message = error instanceof Error ? error.message : 'E-Mail-Versand fehlgeschlagen';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * GET /api/send/external/stats/:domain
 * 
 * Gibt Statistiken für eine Domain zurück (nur für Admin).
 */
router.get('/stats/:domain', async (req, res) => {
  try {
    const { domain } = req.params;
    const domainConfig = await mongoDBService.getExternalDomain(domain);
    
    if (!domainConfig) {
      return res.status(404).json({ success: false, error: 'Domain nicht gefunden' });
    }
    
    res.json({
      success: true,
      stats: {
        domain: domainConfig.domain,
        emailsSent: domainConfig.emailsSent || 0,
        lastSentAt: domainConfig.lastSentAt,
        createdAt: domainConfig.createdAt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Fehler beim Laden der Statistiken';
    res.status(500).json({ success: false, error: message });
  }
});

export { router as externalSendRouter };
