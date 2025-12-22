/**
 * Taskilo Webmail Proxy - Recording Route
 * Meeting-Aufnahmen verwalten
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { recordingService } from '../services/MeetingRecordingService';
import { createReadStream, statSync } from 'fs';

const router: Router = Router();

// POST /api/recording/start - Aufnahme starten
router.post('/start', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      meetingId: z.string().min(1),
      userId: z.string().min(1),
      mimeType: z.string().default('video/webm'),
    });

    const validated = schema.parse(req.body);

    const result = recordingService.startRecording(
      validated.meetingId,
      validated.userId,
      validated.mimeType
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    return res.json({
      success: true,
      recordingId: result.recordingId,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to start recording';
    return res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

// POST /api/recording/chunk - Chunk hinzufügen
router.post('/chunk', async (req: Request, res: Response) => {
  try {
    const recordingId = req.headers['x-recording-id'] as string;

    if (!recordingId) {
      return res.status(400).json({
        success: false,
        error: 'Missing x-recording-id header',
      });
    }

    // Body als Buffer lesen
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const data = Buffer.concat(chunks);

    if (data.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Empty chunk',
      });
    }

    const result = await recordingService.appendChunk(recordingId, data);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    return res.json({
      success: true,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to append chunk';
    return res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

// POST /api/recording/stop - Aufnahme beenden
router.post('/stop', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      recordingId: z.string().min(1),
    });

    const validated = schema.parse(req.body);

    const result = await recordingService.stopRecording(validated.recordingId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    return res.json({
      success: true,
      recording: result.recording,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to stop recording';
    return res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

// POST /api/recording/list - Aufnahmen auflisten
router.post('/list', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      meetingId: z.string().optional(),
    });

    const validated = schema.parse(req.body);

    const recordings = recordingService.listRecordings(validated.meetingId);

    return res.json({
      success: true,
      recordings: recordings.map(r => ({
        id: r.id,
        meetingId: r.meetingId,
        userId: r.userId,
        filename: r.filename,
        size: r.size,
        duration: r.duration,
        startedAt: r.startedAt,
        endedAt: r.endedAt,
        status: r.status,
        mimeType: r.mimeType,
      })),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to list recordings';
    return res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

// POST /api/recording/download - Aufnahme herunterladen
router.post('/download', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      filename: z.string().min(1),
    });

    const validated = schema.parse(req.body);

    const path = recordingService.getRecordingPath(validated.filename);

    if (!path) {
      return res.status(404).json({
        success: false,
        error: 'Recording not found',
      });
    }

    const stats = statSync(path);
    const mimeType = validated.filename.endsWith('.mp4') ? 'video/mp4' : 'video/webm';

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(validated.filename)}"`);
    res.setHeader('Content-Length', stats.size.toString());

    const stream = createReadStream(path);
    stream.pipe(res);
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

// POST /api/recording/delete - Aufnahme löschen
router.post('/delete', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      filename: z.string().min(1),
    });

    const validated = schema.parse(req.body);

    const deleted = recordingService.deleteRecording(validated.filename);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Recording not found or delete failed',
      });
    }

    return res.json({
      success: true,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    const errorMessage = error instanceof Error ? error.message : 'Delete failed';
    return res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

// GET /api/recording/stats - Service-Statistiken
router.get('/stats', (_req: Request, res: Response) => {
  return res.json({
    success: true,
    stats: recordingService.getStats(),
  });
});

export { router as recordingRouter };
