/**
 * Taskilo Webmail Proxy - Calendar Route
 * CalDAV-Integration für Kalender
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { caldavService, CalendarEventSchema } from '../services/CalDAVService';

const router: Router = Router();

const AuthSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// POST /api/calendar/calendars - Kalender-Liste abrufen
router.post('/calendars', async (req: Request, res: Response) => {
  try {
    const validated = AuthSchema.parse(req.body);

    const calendars = await caldavService.getCalendars(
      validated.email,
      validated.password
    );

    return res.json({
      success: true,
      calendars,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to get calendars';
    return res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

// POST /api/calendar/events - Events abrufen
router.post('/events', async (req: Request, res: Response) => {
  try {
    const schema = AuthSchema.extend({
      calendarId: z.string().default('personal'),
      start: z.string(), // ISO date
      end: z.string(),
    });

    const validated = schema.parse(req.body);

    const events = await caldavService.getEvents(
      validated.email,
      validated.password,
      validated.calendarId,
      new Date(validated.start),
      new Date(validated.end)
    );

    return res.json({
      success: true,
      events,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to get events';
    return res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

// POST /api/calendar/events/create - Event erstellen
router.post('/events/create', async (req: Request, res: Response) => {
  try {
    const schema = AuthSchema.extend({
      calendarId: z.string().default('personal'),
      event: CalendarEventSchema,
    });

    const validated = schema.parse(req.body);

    const result = await caldavService.createEvent(
      validated.email,
      validated.password,
      validated.calendarId,
      validated.event
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    return res.json({
      success: true,
      uid: result.uid,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to create event';
    return res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

// POST /api/calendar/events/update - Event aktualisieren
router.post('/events/update', async (req: Request, res: Response) => {
  try {
    const schema = AuthSchema.extend({
      calendarId: z.string().default('personal'),
      event: CalendarEventSchema,
    });

    const validated = schema.parse(req.body);

    const result = await caldavService.updateEvent(
      validated.email,
      validated.password,
      validated.calendarId,
      validated.event
    );

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
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to update event';
    return res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

// POST /api/calendar/events/delete - Event löschen
router.post('/events/delete', async (req: Request, res: Response) => {
  try {
    const schema = AuthSchema.extend({
      calendarId: z.string().default('personal'),
      eventUid: z.string().min(1),
    });

    const validated = schema.parse(req.body);

    const result = await caldavService.deleteEvent(
      validated.email,
      validated.password,
      validated.calendarId,
      validated.eventUid
    );

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
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to delete event';
    return res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

// GET /api/calendar/stats - Service-Statistiken
router.get('/stats', (_req: Request, res: Response) => {
  return res.json({
    success: true,
    stats: caldavService.getStats(),
  });
});

export { router as calendarRouter };
