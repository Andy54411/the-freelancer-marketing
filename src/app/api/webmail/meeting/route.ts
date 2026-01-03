/**
 * Webmail Meeting API Route
 * Leitet Meeting-Anfragen zum Hetzner Webmail-Proxy weiter
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const WEBMAIL_PROXY_URL = process.env.WEBMAIL_PROXY_URL || 'https://mail.taskilo.de/webmail-api';
const WEBMAIL_API_KEY = process.env.WEBMAIL_API_KEY || '';

const MeetingSettingsSchema = z.object({
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
});

const CreateMeetingSchema = z.object({
  userId: z.string().min(1),
  name: z.string().optional(),
  type: z.enum(['instant', 'scheduled', 'permanent']).optional(),
  maxParticipants: z.number().min(2).max(200).optional(),
  settings: MeetingSettingsSchema.optional(),
  metadata: z.object({
    source: z.enum(['dashboard', 'webmail', 'app']).optional(),
    coOrganizers: z.array(z.string().email()).optional(),
  }).optional(),
});

const EndMeetingSchema = z.object({
  code: z.string().min(1),
  userId: z.string().min(1),
});

const UpdateSettingsSchema = z.object({
  code: z.string().min(1),
  userId: z.string().min(1),
  settings: MeetingSettingsSchema.optional(),
  coOrganizers: z.array(z.string().email()).optional(),
});

/**
 * POST - Meeting erstellen, beenden oder Einstellungen aktualisieren
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action as string;

    if (action === 'create') {
      // Meeting erstellen
      const validated = CreateMeetingSchema.parse(body);

      const response = await fetch(`${WEBMAIL_PROXY_URL}/api/meeting/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': WEBMAIL_API_KEY,
        },
        body: JSON.stringify({
          userId: validated.userId,
          name: validated.name,
          type: validated.type || 'scheduled',
          maxParticipants: validated.maxParticipants || 200,
          settings: validated.settings,
          metadata: validated.metadata || { source: 'webmail' },
        }),
      });

      const data = await response.json();

      if (!data.success) {
        return NextResponse.json(
          { success: false, error: data.error || 'Failed to create meeting' },
          { status: response.status }
        );
      }

      return NextResponse.json({
        success: true,
        room: data.room,
        iceServers: data.iceServers,
      });

    } else if (action === 'end') {
      // Meeting beenden
      const validated = EndMeetingSchema.parse(body);

      const response = await fetch(`${WEBMAIL_PROXY_URL}/api/meeting/${validated.code}/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': WEBMAIL_API_KEY,
        },
        body: JSON.stringify({
          userId: validated.userId,
        }),
      });

      const data = await response.json();

      return NextResponse.json({
        success: data.success,
        message: data.message,
      });

    } else if (action === 'updateSettings') {
      // Meeting-Einstellungen aktualisieren
      const validated = UpdateSettingsSchema.parse(body);

      const response = await fetch(`${WEBMAIL_PROXY_URL}/api/meeting/${validated.code}/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': WEBMAIL_API_KEY,
        },
        body: JSON.stringify({
          userId: validated.userId,
          settings: validated.settings,
          coOrganizers: validated.coOrganizers,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        return NextResponse.json(
          { success: false, error: data.error || 'Failed to update settings' },
          { status: response.status }
        );
      }

      return NextResponse.json({
        success: true,
        room: data.room,
      });

    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Use "create", "end" or "updateSettings"' },
        { status: 400 }
      );
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    const message = error instanceof Error ? error.message : 'Meeting operation failed';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
