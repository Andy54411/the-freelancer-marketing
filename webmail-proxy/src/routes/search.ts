/**
 * Taskilo Webmail Proxy - Search Route
 * Volltextsuche über E-Mails
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { searchService } from '../services/SearchService';

const router: Router = Router();

const SearchQuerySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  mailbox: z.string().default('INBOX'),
  query: z.object({
    text: z.string().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    subject: z.string().optional(),
    body: z.string().optional(),
    since: z.string().optional(),
    before: z.string().optional(),
    hasAttachment: z.boolean().optional(),
    unread: z.boolean().optional(),
    flagged: z.boolean().optional(),
  }),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

// POST /api/search - Volltextsuche
router.post('/', async (req: Request, res: Response) => {
  try {
    const validated = SearchQuerySchema.parse(req.body);

    const query = {
      ...validated.query,
      since: validated.query.since ? new Date(validated.query.since) : undefined,
      before: validated.query.before ? new Date(validated.query.before) : undefined,
    };

    const result = await searchService.search(
      validated.email,
      validated.password,
      validated.mailbox,
      query,
      validated.limit,
      validated.offset
    );

    return res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    const errorMessage = error instanceof Error ? error.message : 'Search failed';
    return res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

// POST /api/search/quick - Schnellsuche
router.post('/quick', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(1),
      mailbox: z.string().default('INBOX'),
      term: z.string().min(1),
      limit: z.number().min(1).max(50).default(20),
    });

    const validated = schema.parse(req.body);

    const result = await searchService.quickSearch(
      validated.email,
      validated.password,
      validated.mailbox,
      validated.term,
      validated.limit
    );

    return res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    const errorMessage = error instanceof Error ? error.message : 'Search failed';
    return res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

// POST /api/search/all - Suche in allen Ordnern
router.post('/all', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(1),
      query: z.object({
        text: z.string().optional(),
        from: z.string().optional(),
        subject: z.string().optional(),
      }),
      limit: z.number().min(1).max(100).default(50),
    });

    const validated = schema.parse(req.body);

    const results = await searchService.searchAll(
      validated.email,
      validated.password,
      validated.query,
      validated.limit
    );

    return res.json({
      success: true,
      results,
      total: results.reduce((sum, r) => sum + r.results.length, 0),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    const errorMessage = error instanceof Error ? error.message : 'Search failed';
    return res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

export { router as searchRouter };
