/**
 * Taskilo Webmail Proxy - Meeting Routes
 * REST API für Meeting-Räume (Google Meet Style)
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { meetingRoomService, CreateRoomOptions } from '../services/MeetingRoomService';
import { turnService } from '../services/TURNService';

const router: Router = Router();

// ============== ROOM ENDPOINTS ==============

// ============== FLUTTER APP KOMPATIBILITÄT (vor /:code!) ==============

/**
 * GET /api/meeting/meetings - Meetings des Users abrufen
 * WICHTIG: Muss VOR /:code definiert sein!
 */
router.get('/meetings', async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId required' });
    }
    
    // Aktive Meetings des Users abrufen
    const stats = meetingRoomService.getStats();
    
    // Da MeetingRoomService in-memory ist, geben wir hier
    // eine leere Liste zurück (Meetings werden on-demand erstellt)
    return res.json({
      success: true,
      meetings: [],
      totalActive: stats.activeRooms,
    });
  } catch (error) {
    console.error('[MEETING API] Get meetings error:', error);
    return res.status(500).json({
      success: false,
      error: 'Fehler beim Laden der Meetings',
    });
  }
});

/**
 * POST /api/meeting/meetings - Neues Meeting erstellen
 * WICHTIG: Muss VOR /:code definiert sein!
 */
router.post('/meetings', async (req: Request, res: Response) => {
  try {
    const { userId, title } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId required' });
    }
    
    const room = meetingRoomService.createRoom(userId, {
      name: title || 'Neues Meeting',
      type: 'instant',
    });
    
    const iceServers = turnService.getICEServers(userId);
    
    return res.json({
      success: true,
      meeting: {
        id: room.id,
        code: room.code,
        name: room.name,
        url: meetingRoomService.getMeetingUrl(room),
        type: room.type,
        status: room.status,
        createdAt: room.createdAt.toISOString(),
      },
      iceServers,
    });
  } catch (error) {
    console.error('[MEETING API] Create meeting error:', error);
    return res.status(500).json({
      success: false,
      error: 'Fehler beim Erstellen des Meetings',
    });
  }
});

// ============== STANDARD ROOM ENDPOINTS ==============

/**
 * POST /api/meeting/create - Neuen Meeting-Raum erstellen
 */
router.post('/create', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      userId: z.string().min(1),
      name: z.string().optional(),
      type: z.enum(['instant', 'scheduled', 'permanent']).optional(),
      maxParticipants: z.number().min(2).max(200).optional(),
      expiresAt: z.string().datetime().optional(),
      settings: z.object({
        // Basis-Einstellungen
        allowGuests: z.boolean().optional(),
        waitingRoom: z.boolean().optional(),
        muteOnEntry: z.boolean().optional(),
        videoOffOnEntry: z.boolean().optional(),
        allowScreenShare: z.boolean().optional(),
        allowRecording: z.boolean().optional(),
        allowChat: z.boolean().optional(),
        maxDurationMinutes: z.number().optional(),
        // Erweiterte Einstellungen (aus MeetingSettingsModal)
        hostMustJoinFirst: z.boolean().optional(),
        allowReactions: z.boolean().optional(),
        accessType: z.enum(['open', 'trusted', 'restricted']).optional(),
        allowGuestsWithLink: z.boolean().optional(),
      }).optional(),
      metadata: z.object({
        orderId: z.string().optional(),
        companyId: z.string().optional(),
        source: z.enum(['dashboard', 'webmail', 'app']).optional(),
      }).optional(),
    });

    const validated = schema.parse(req.body);

    const options: CreateRoomOptions = {
      name: validated.name,
      type: validated.type,
      maxParticipants: validated.maxParticipants,
      expiresAt: validated.expiresAt ? new Date(validated.expiresAt) : undefined,
      settings: validated.settings,
      metadata: validated.metadata,
    };

    const room = meetingRoomService.createRoom(validated.userId, options);

    // TURN Credentials für Host generieren
    const iceServers = turnService.getICEServers(validated.userId);

    return res.json({
      success: true,
      room: {
        id: room.id,
        code: room.code,
        name: room.name,
        url: meetingRoomService.getMeetingUrl(room),
        type: room.type,
        status: room.status,
        createdAt: room.createdAt.toISOString(),
        expiresAt: room.expiresAt?.toISOString(),
        settings: room.settings,
      },
      iceServers,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to create room';
    console.error('[MEETING API] Create error:', error);
    return res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

/**
 * GET /api/meeting/:code - Meeting-Raum per Code abrufen
 */
router.get('/:code', async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    
    const room = meetingRoomService.getRoomByCode(code);
    
    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Meeting not found',
      });
    }

    return res.json({
      success: true,
      room: {
        id: room.id,
        code: room.code,
        name: room.name,
        url: meetingRoomService.getMeetingUrl(room),
        type: room.type,
        status: room.status,
        createdAt: room.createdAt.toISOString(),
        expiresAt: room.expiresAt?.toISOString(),
        participantCount: room.participants.size,
        maxParticipants: room.maxParticipants,
        settings: {
          allowGuests: room.settings.allowGuests,
          waitingRoom: room.settings.waitingRoom,
        },
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to get room';
    console.error('[MEETING API] Get error:', error);
    return res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

/**
 * POST /api/meeting/:code/join - Meeting beitreten (Pre-Join Info)
 */
router.post('/:code/join', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      userId: z.string().min(1),
      name: z.string().min(1),
      email: z.string().email().optional(),
      avatarUrl: z.string().url().optional(),
    });

    const { code } = req.params;
    const validated = schema.parse(req.body);

    const room = meetingRoomService.getRoomByCode(code);
    
    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Meeting not found',
      });
    }

    if (room.status === 'ended') {
      return res.status(410).json({
        success: false,
        error: 'Meeting has ended',
      });
    }

    if (room.participants.size >= room.maxParticipants) {
      return res.status(403).json({
        success: false,
        error: 'Meeting is full',
      });
    }

    // TURN Credentials für Teilnehmer generieren
    const iceServers = turnService.getICEServers(validated.userId);

    // WebSocket URL für Signaling
    const wsUrl = process.env.MEETING_WS_URL || 'wss://mail.taskilo.de/ws/meeting';

    return res.json({
      success: true,
      room: {
        id: room.id,
        code: room.code,
        name: room.name,
        status: room.status,
        participantCount: room.participants.size,
        participants: meetingRoomService.getRoomParticipants(room.id),
        settings: room.settings,
      },
      connection: {
        wsUrl,
        iceServers,
      },
      user: {
        userId: validated.userId,
        name: validated.name,
        isHost: room.createdBy === validated.userId,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to join room';
    console.error('[MEETING API] Join error:', error);
    return res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

/**
 * POST /api/meeting/:code/settings - Meeting-Einstellungen aktualisieren
 */
router.post('/:code/settings', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      userId: z.string().min(1),
      settings: z.object({
        // Basis-Einstellungen
        allowGuests: z.boolean().optional(),
        waitingRoom: z.boolean().optional(),
        muteOnEntry: z.boolean().optional(),
        videoOffOnEntry: z.boolean().optional(),
        allowScreenShare: z.boolean().optional(),
        allowRecording: z.boolean().optional(),
        allowChat: z.boolean().optional(),
        maxDurationMinutes: z.number().optional(),
        // Erweiterte Einstellungen (aus MeetingSettingsModal)
        hostMustJoinFirst: z.boolean().optional(),
        allowReactions: z.boolean().optional(),
        accessType: z.enum(['open', 'trusted', 'restricted']).optional(),
        allowGuestsWithLink: z.boolean().optional(),
      }).optional(),
      coOrganizers: z.array(z.string().email()).optional(),
    });

    const { code } = req.params;
    const validated = schema.parse(req.body);

    const room = meetingRoomService.getRoomByCode(code);
    
    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Meeting not found',
      });
    }

    const updatedRoom = meetingRoomService.updateRoomSettings(
      room.id,
      validated.userId,
      validated.settings || {},
      validated.coOrganizers
    );

    if (!updatedRoom) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update meeting settings',
      });
    }

    return res.json({
      success: true,
      room: {
        id: updatedRoom.id,
        code: updatedRoom.code,
        settings: updatedRoom.settings,
        coOrganizers: updatedRoom.metadata?.coOrganizers || [],
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to update settings';
    console.error('[MEETING API] Settings update error:', error);
    return res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

/**
 * POST /api/meeting/:code/end - Meeting beenden
 */
router.post('/:code/end', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      userId: z.string().min(1),
    });

    const { code } = req.params;
    const validated = schema.parse(req.body);

    const room = meetingRoomService.getRoomByCode(code);
    
    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Meeting not found',
      });
    }

    // Nur Host kann Meeting beenden
    if (room.createdBy !== validated.userId) {
      return res.status(403).json({
        success: false,
        error: 'Only the host can end the meeting',
      });
    }

    const ended = meetingRoomService.endRoom(room.id, validated.userId);

    return res.json({
      success: ended,
      message: ended ? 'Meeting ended' : 'Failed to end meeting',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to end room';
    console.error('[MEETING API] End error:', error);
    return res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

/**
 * GET /api/meeting/:code/participants - Teilnehmer abrufen
 */
router.get('/:code/participants', async (req: Request, res: Response) => {
  try {
    const { code } = req.params;

    const room = meetingRoomService.getRoomByCode(code);
    
    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Meeting not found',
      });
    }

    const participants = meetingRoomService.getRoomParticipants(room.id);

    return res.json({
      success: true,
      participants,
      count: participants.length,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to get participants';
    console.error('[MEETING API] Participants error:', error);
    return res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

/**
 * GET /api/meeting/stats - Service-Statistiken
 */
router.get('/admin/stats', (_req: Request, res: Response) => {
  return res.json({
    success: true,
    stats: meetingRoomService.getStats(),
  });
});

export { router as meetingRouter };
