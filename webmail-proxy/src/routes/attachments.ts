/**
 * Taskilo Webmail Proxy - Attachments Route
 * Sichere Anhang-Downloads
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { attachmentService } from '../services/AttachmentService';

const router: Router = Router();

const AttachmentRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  mailbox: z.string().default('INBOX'),
  uid: z.number().int().positive(),
  partId: z.string().optional(),
});

// POST /api/attachments/list - Anhänge einer E-Mail auflisten
router.post('/list', async (req: Request, res: Response) => {
  try {
    const validated = AttachmentRequestSchema.parse(req.body);

    const attachments = await attachmentService.getAttachments(
      validated.email,
      validated.password,
      validated.mailbox,
      validated.uid
    );

    return res.json({
      success: true,
      attachments,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to list attachments';
    return res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

// POST /api/attachments/download - Anhang herunterladen
router.post('/download', async (req: Request, res: Response) => {
  try {
    const schema = AttachmentRequestSchema.extend({
      partId: z.string().min(1),
    });

    const validated = schema.parse(req.body);

    const result = await attachmentService.downloadAttachment(
      validated.email,
      validated.password,
      validated.mailbox,
      validated.uid,
      validated.partId
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    // Download als Response
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(result.filename)}"`);
    res.setHeader('Content-Length', result.size.toString());
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    return res.send(result.data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    const errorMessage = error instanceof Error ? error.message : 'Download failed';
    return res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

// POST /api/attachments/stream - Streaming-Download für große Dateien
router.post('/stream', async (req: Request, res: Response) => {
  try {
    const schema = AttachmentRequestSchema.extend({
      partId: z.string().min(1),
    });

    const validated = schema.parse(req.body);

    const result = await attachmentService.downloadAttachmentStream(
      validated.email,
      validated.password,
      validated.mailbox,
      validated.uid,
      validated.partId
    );

    if (!result.success || !result.stream) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(result.filename)}"`);
    res.setHeader('Content-Length', result.size.toString());
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    result.stream.pipe(res);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    const errorMessage = error instanceof Error ? error.message : 'Stream failed';
    return res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

// GET /api/attachments/stats - Service-Statistiken
router.get('/stats', (_req: Request, res: Response) => {
  return res.json({
    success: true,
    stats: attachmentService.getStats(),
  });
});

export { router as attachmentsRouter };
