/**
 * Taskilo Webmail Proxy - TURN Route
 * TURN/STUN Credentials für WebRTC
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { turnService } from '../services/TURNService';

const router: Router = Router();

// POST /api/turn/credentials - TURN Credentials anfordern
router.post('/credentials', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      userId: z.string().min(1),
      email: z.string().email().optional(),
    });

    const validated = schema.parse(req.body);

    const credentials = turnService.generateCredentials(validated.userId);

    return res.json({
      success: true,
      iceServers: turnService.getICEServers(validated.userId),
      ttl: credentials.ttl,
      expiresAt: new Date(credentials.expiresAt).toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to generate credentials';
    return res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

// POST /api/turn/validate - Credentials validieren
router.post('/validate', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      username: z.string().min(1),
      credential: z.string().min(1),
    });

    const validated = schema.parse(req.body);

    const isValid = turnService.validateCredentials(
      validated.username,
      validated.credential
    );

    return res.json({
      success: true,
      valid: isValid,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    const errorMessage = error instanceof Error ? error.message : 'Validation failed';
    return res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

// GET /api/turn/stats - Service-Statistiken
router.get('/stats', (_req: Request, res: Response) => {
  return res.json({
    success: true,
    stats: turnService.getStats(),
  });
});

export { router as turnRouter };
