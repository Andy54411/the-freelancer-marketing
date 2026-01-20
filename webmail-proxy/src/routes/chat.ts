/**
 * Chat Routes - API für Chat-Gruppenbereiche (Spaces)
 * ====================================================
 * 
 * MongoDB-basierte Chat-Spaces für Webmail.
 * 
 * Endpoints:
 * GET    /api/chat/spaces              - Alle Spaces abrufen
 * POST   /api/chat/spaces              - Neuen Space erstellen
 * GET    /api/chat/spaces/:spaceId     - Einzelnen Space abrufen
 * PUT    /api/chat/spaces/:spaceId     - Space aktualisieren
 * DELETE /api/chat/spaces/:spaceId     - Space löschen
 * 
 * POST   /api/chat/spaces/:spaceId/members    - Mitglieder hinzufügen
 * DELETE /api/chat/spaces/:spaceId/members    - Mitglieder entfernen
 * 
 * GET    /api/chat/spaces/:spaceId/messages   - Nachrichten abrufen
 * POST   /api/chat/spaces/:spaceId/messages   - Nachricht senden
 */

import { Router, Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import mongoService, { Space, SpaceMember, SpaceMessage } from '../services/MongoDBService';
import chatInvitationService from '../services/ChatInvitationService';

const router = Router();

// User Email aus Request holen
const getUserEmail = (req: Request): string => {
  const email = req.headers['x-user-email'] as string || req.body?.email;
  if (!email) {
    throw new Error('User Email required');
  }
  return email.toLowerCase();
};

// ==================== SPACES ====================

/**
 * GET /chat/spaces
 * Alle Spaces für den User abrufen
 */
router.get('/spaces', async (req: Request, res: Response) => {
  try {
    const email = getUserEmail(req);
    
    // Spaces finden, wo User Creator oder Mitglied ist
    const spaces = await mongoService.spaces
      .find({
        $or: [
          { creatorEmail: email },
          { 'members.email': email }
        ],
        isActive: true,
      })
      .sort({ updatedAt: -1 })
      .toArray();

    res.json({
      success: true,
      spaces: spaces.map(space => ({
        id: space._id?.toString(),
        name: space.name,
        emoji: space.emoji,
        description: space.description,
        memberCount: space.members.length,
        members: space.members,
        creatorEmail: space.creatorEmail,
        createdAt: space.createdAt,
        updatedAt: space.updatedAt,
      })),
    });
  } catch (error) {
    console.error('[Chat] Error getting spaces:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Abrufen der Gruppenbereiche',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    });
  }
});

/**
 * POST /chat/spaces
 * Neuen Space erstellen
 */
router.post('/spaces', async (req: Request, res: Response) => {
  try {
    const email = getUserEmail(req);
    const { name, emoji, description } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Name ist erforderlich',
      });
    }

    const now = new Date();
    const space: Space = {
      creatorEmail: email,
      name: name.trim(),
      emoji: emoji || '😀',
      description: description || '',
      members: [{
        email,
        role: 'admin',
        joinedAt: now,
      }],
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    const result = await mongoService.spaces.insertOne(space);

    res.json({
      success: true,
      space: {
        id: result.insertedId.toString(),
        name: space.name,
        emoji: space.emoji,
        description: space.description,
        memberCount: 1,
        members: space.members,
        creatorEmail: space.creatorEmail,
        createdAt: space.createdAt,
        updatedAt: space.updatedAt,
      },
      message: 'Gruppenbereich erstellt',
    });
  } catch (error) {
    console.error('[Chat] Error creating space:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Erstellen des Gruppenbereichs',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    });
  }
});

/**
 * GET /chat/spaces/:spaceId
 * Einzelnen Space abrufen
 */
router.get('/spaces/:spaceId', async (req: Request, res: Response) => {
  try {
    const email = getUserEmail(req);
    const { spaceId } = req.params;

    if (!ObjectId.isValid(spaceId)) {
      return res.status(400).json({
        success: false,
        error: 'Ungültige Space ID',
      });
    }

    const space = await mongoService.spaces.findOne({
      _id: new ObjectId(spaceId),
      $or: [
        { creatorEmail: email },
        { 'members.email': email }
      ],
      isActive: true,
    });

    if (!space) {
      return res.status(404).json({
        success: false,
        error: 'Gruppenbereich nicht gefunden',
      });
    }

    res.json({
      success: true,
      space: {
        id: space._id?.toString(),
        name: space.name,
        emoji: space.emoji,
        description: space.description,
        memberCount: space.members.length,
        members: space.members,
        creatorEmail: space.creatorEmail,
        createdAt: space.createdAt,
        updatedAt: space.updatedAt,
      },
    });
  } catch (error) {
    console.error('[Chat] Error getting space:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Abrufen des Gruppenbereichs',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    });
  }
});

/**
 * PUT /chat/spaces/:spaceId
 * Space aktualisieren
 */
router.put('/spaces/:spaceId', async (req: Request, res: Response) => {
  try {
    const email = getUserEmail(req);
    const { spaceId } = req.params;
    const { name, emoji, description } = req.body;

    if (!ObjectId.isValid(spaceId)) {
      return res.status(400).json({
        success: false,
        error: 'Ungültige Space ID',
      });
    }

    // Prüfen ob User Admin ist
    const space = await mongoService.spaces.findOne({
      _id: new ObjectId(spaceId),
      'members': { $elemMatch: { email, role: 'admin' } },
      isActive: true,
    });

    if (!space) {
      return res.status(404).json({
        success: false,
        error: 'Gruppenbereich nicht gefunden oder keine Berechtigung',
      });
    }

    const updates: Partial<Space> = {
      updatedAt: new Date(),
    };

    if (name) updates.name = name.trim();
    if (emoji) updates.emoji = emoji;
    if (description !== undefined) updates.description = description;

    await mongoService.spaces.updateOne(
      { _id: new ObjectId(spaceId) },
      { $set: updates }
    );

    const updatedSpace = await mongoService.spaces.findOne({
      _id: new ObjectId(spaceId),
    });

    res.json({
      success: true,
      space: {
        id: updatedSpace?._id?.toString(),
        name: updatedSpace?.name,
        emoji: updatedSpace?.emoji,
        description: updatedSpace?.description,
        memberCount: updatedSpace?.members.length,
        members: updatedSpace?.members,
        creatorEmail: updatedSpace?.creatorEmail,
        createdAt: updatedSpace?.createdAt,
        updatedAt: updatedSpace?.updatedAt,
      },
      message: 'Gruppenbereich aktualisiert',
    });
  } catch (error) {
    console.error('[Chat] Error updating space:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Aktualisieren des Gruppenbereichs',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    });
  }
});

/**
 * DELETE /chat/spaces/:spaceId
 * Space löschen (soft delete)
 */
router.delete('/spaces/:spaceId', async (req: Request, res: Response) => {
  try {
    const email = getUserEmail(req);
    const { spaceId } = req.params;

    if (!ObjectId.isValid(spaceId)) {
      return res.status(400).json({
        success: false,
        error: 'Ungültige Space ID',
      });
    }

    // Nur Creator kann löschen
    const result = await mongoService.spaces.updateOne(
      { 
        _id: new ObjectId(spaceId),
        creatorEmail: email,
        isActive: true,
      },
      { 
        $set: { 
          isActive: false, 
          updatedAt: new Date(),
        } 
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Gruppenbereich nicht gefunden oder keine Berechtigung',
      });
    }

    res.json({
      success: true,
      message: 'Gruppenbereich gelöscht',
    });
  } catch (error) {
    console.error('[Chat] Error deleting space:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Löschen des Gruppenbereichs',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    });
  }
});

// ==================== MEMBERS ====================

/**
 * POST /chat/spaces/:spaceId/members
 * Mitglieder hinzufügen
 */
router.post('/spaces/:spaceId/members', async (req: Request, res: Response) => {
  try {
    const email = getUserEmail(req);
    const { spaceId } = req.params;
    const { members } = req.body;

    if (!ObjectId.isValid(spaceId)) {
      return res.status(400).json({
        success: false,
        error: 'Ungültige Space ID',
      });
    }

    if (!Array.isArray(members) || members.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Mitglieder-Liste erforderlich',
      });
    }

    // Prüfen ob User Admin ist
    const space = await mongoService.spaces.findOne({
      _id: new ObjectId(spaceId),
      'members': { $elemMatch: { email, role: 'admin' } },
      isActive: true,
    });

    if (!space) {
      return res.status(404).json({
        success: false,
        error: 'Gruppenbereich nicht gefunden oder keine Berechtigung',
      });
    }

    // Neue Mitglieder hinzufügen (ohne Duplikate)
    const existingEmails = space.members.map(m => m.email);
    const newMembers: SpaceMember[] = members
      .filter((m: { email: string }) => !existingEmails.includes(m.email.toLowerCase()))
      .map((m: { email: string; role?: 'admin' | 'member' }) => ({
        email: m.email.toLowerCase(),
        role: m.role || 'member',
        joinedAt: new Date(),
      }));

    if (newMembers.length > 0) {
      await mongoService.spaces.updateOne(
        { _id: new ObjectId(spaceId) },
        { 
          $push: { members: { $each: newMembers } },
          $set: { updatedAt: new Date() },
        }
      );

      // Einladungs-E-Mails versenden
      const invitations = newMembers.map(member => ({
        recipientEmail: member.email,
        recipientName: (members.find((m: { email: string; name?: string }) => 
          m.email.toLowerCase() === member.email) as { name?: string })?.name,
        spaceName: space.name,
        spaceEmoji: space.emoji,
        inviterEmail: email,
        spaceId,
      }));

      // E-Mails im Hintergrund versenden (nicht blockierend)
      chatInvitationService.sendBulkInvitations(invitations)
        .then(result => {
          if (result.sent > 0) {
            console.log(`[Chat] ${result.sent} Einladungs-E-Mails für Space "${space.name}" versendet`);
          }
          if (result.failed > 0) {
            console.warn(`[Chat] ${result.failed} Einladungs-E-Mails fehlgeschlagen:`, result.errors);
          }
        })
        .catch(err => {
          console.error('[Chat] Fehler beim Versenden der Einladungs-E-Mails:', err);
        });
    }

    const updatedSpace = await mongoService.spaces.findOne({
      _id: new ObjectId(spaceId),
    });

    res.json({
      success: true,
      memberCount: updatedSpace?.members.length,
      members: updatedSpace?.members,
      addedCount: newMembers.length,
      message: `${newMembers.length} Mitglieder hinzugefügt`,
    });
  } catch (error) {
    console.error('[Chat] Error adding members:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Hinzufügen der Mitglieder',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    });
  }
});

/**
 * DELETE /chat/spaces/:spaceId/members
 * Mitglieder entfernen
 */
router.delete('/spaces/:spaceId/members', async (req: Request, res: Response) => {
  try {
    const email = getUserEmail(req);
    const { spaceId } = req.params;
    const { memberEmail } = req.body;

    if (!ObjectId.isValid(spaceId)) {
      return res.status(400).json({
        success: false,
        error: 'Ungültige Space ID',
      });
    }

    if (!memberEmail) {
      return res.status(400).json({
        success: false,
        error: 'Mitglieder-E-Mail erforderlich',
      });
    }

    // Prüfen ob User Admin ist oder sich selbst entfernt
    const space = await mongoService.spaces.findOne({
      _id: new ObjectId(spaceId),
      isActive: true,
    });

    if (!space) {
      return res.status(404).json({
        success: false,
        error: 'Gruppenbereich nicht gefunden',
      });
    }

    const isAdmin = space.members.some(m => m.email === email && m.role === 'admin');
    const isSelf = memberEmail.toLowerCase() === email;

    if (!isAdmin && !isSelf) {
      return res.status(403).json({
        success: false,
        error: 'Keine Berechtigung',
      });
    }

    // Creator kann nicht entfernt werden
    if (memberEmail.toLowerCase() === space.creatorEmail) {
      return res.status(400).json({
        success: false,
        error: 'Der Ersteller kann nicht entfernt werden',
      });
    }

    await mongoService.spaces.updateOne(
      { _id: new ObjectId(spaceId) },
      { 
        $pull: { members: { email: memberEmail.toLowerCase() } },
        $set: { updatedAt: new Date() },
      }
    );

    const updatedSpace = await mongoService.spaces.findOne({
      _id: new ObjectId(spaceId),
    });

    res.json({
      success: true,
      memberCount: updatedSpace?.members.length,
      members: updatedSpace?.members,
      message: 'Mitglied entfernt',
    });
  } catch (error) {
    console.error('[Chat] Error removing member:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Entfernen des Mitglieds',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    });
  }
});

// ==================== MESSAGES ====================

/**
 * GET /chat/spaces/:spaceId/messages
 * Nachrichten für einen Space abrufen
 */
router.get('/spaces/:spaceId/messages', async (req: Request, res: Response) => {
  try {
    const email = getUserEmail(req);
    const { spaceId } = req.params;
    const { limit = '50', before } = req.query;

    if (!ObjectId.isValid(spaceId)) {
      return res.status(400).json({
        success: false,
        error: 'Ungültige Space ID',
      });
    }

    // Prüfen ob User Zugriff hat
    const space = await mongoService.spaces.findOne({
      _id: new ObjectId(spaceId),
      $or: [
        { creatorEmail: email },
        { 'members.email': email }
      ],
      isActive: true,
    });

    if (!space) {
      return res.status(404).json({
        success: false,
        error: 'Gruppenbereich nicht gefunden oder kein Zugriff',
      });
    }

    // Query für Nachrichten
    const query: Record<string, unknown> = { spaceId };
    if (before && ObjectId.isValid(before as string)) {
      query._id = { $lt: new ObjectId(before as string) };
    }

    const messages = await mongoService.messages
      .find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit as string, 10))
      .toArray();

    res.json({
      success: true,
      messages: messages.reverse().map(msg => ({
        id: msg._id?.toString(),
        spaceId: msg.spaceId,
        senderEmail: msg.senderEmail,
        senderName: msg.senderName || msg.senderEmail.split('@')[0],
        content: msg.content,
        encrypted: msg.encrypted,
        isEncrypted: msg.isEncrypted || false,
        attachments: msg.attachments,
        reactions: msg.reactions,
        threadId: msg.threadId,
        isEdited: msg.isEdited,
        editedAt: msg.editedAt,
        createdAt: msg.createdAt,
      })),
    });
  } catch (error) {
    console.error('[Chat] Error getting messages:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Abrufen der Nachrichten',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    });
  }
});

/**
 * POST /chat/spaces/:spaceId/messages
 * Nachricht senden
 */
router.post('/spaces/:spaceId/messages', async (req: Request, res: Response) => {
  try {
    const email = getUserEmail(req);
    const { spaceId } = req.params;
    const { content, senderName, encrypted, isEncrypted, attachments, threadId } = req.body;

    if (!ObjectId.isValid(spaceId)) {
      return res.status(400).json({
        success: false,
        error: 'Ungültige Space ID',
      });
    }

    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Nachrichteninhalt erforderlich',
      });
    }

    // Prüfen ob User Zugriff hat
    const space = await mongoService.spaces.findOne({
      _id: new ObjectId(spaceId),
      $or: [
        { creatorEmail: email },
        { 'members.email': email }
      ],
      isActive: true,
    });

    if (!space) {
      return res.status(404).json({
        success: false,
        error: 'Gruppenbereich nicht gefunden oder kein Zugriff',
      });
    }

    const message: SpaceMessage = {
      spaceId,
      senderEmail: email,
      senderName: senderName || email.split('@')[0],
      content: content.trim(),
      encrypted: encrypted || undefined,
      isEncrypted: isEncrypted || false,
      attachments: attachments || [],
      reactions: [],
      threadId: threadId || null,
      isEdited: false,
      editedAt: null,
      createdAt: new Date(),
    };

    const result = await mongoService.messages.insertOne(message);

    // Space updatedAt aktualisieren
    await mongoService.spaces.updateOne(
      { _id: new ObjectId(spaceId) },
      { $set: { updatedAt: new Date() } }
    );

    res.json({
      success: true,
      message: {
        id: result.insertedId.toString(),
        spaceId: message.spaceId,
        senderEmail: message.senderEmail,
        senderName: message.senderName,
        content: message.content,
        encrypted: message.encrypted,
        isEncrypted: message.isEncrypted,
        attachments: message.attachments,
        reactions: message.reactions,
        threadId: message.threadId,
        isEdited: message.isEdited,
        editedAt: message.editedAt,
        createdAt: message.createdAt,
      },
    });
  } catch (error) {
    console.error('[Chat] Error sending message:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Senden der Nachricht',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    });
  }
});

// ==================== SETTINGS ====================

interface ChatSettingsDoc {
  email: string;
  settings: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * GET /chat/settings
 * Chat-Einstellungen für den User abrufen
 */
router.get('/settings', async (req: Request, res: Response) => {
  try {
    const email = getUserEmail(req);
    
    // Einstellungen aus MongoDB laden
    const chatSettings = mongoService.getCollection<ChatSettingsDoc>('chat_settings');
    const settingsDoc = await chatSettings.findOne({ email });

    res.json({
      success: true,
      settings: settingsDoc?.settings || null,
    });
  } catch (error) {
    console.error('[Chat] Error getting settings:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Abrufen der Einstellungen',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    });
  }
});

/**
 * POST /chat/settings
 * Chat-Einstellungen speichern
 */
router.post('/settings', async (req: Request, res: Response) => {
  try {
    const email = getUserEmail(req);
    const { settings } = req.body;

    if (!settings) {
      return res.status(400).json({
        success: false,
        error: 'Einstellungen sind erforderlich',
      });
    }

    // Einstellungen in MongoDB speichern (upsert)
    const chatSettings = mongoService.getCollection<ChatSettingsDoc>('chat_settings');
    await chatSettings.updateOne(
      { email },
      { 
        $set: { 
          email,
          settings,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        }
      },
      { upsert: true }
    );

    res.json({
      success: true,
      message: 'Einstellungen gespeichert',
    });
  } catch (error) {
    console.error('[Chat] Error saving settings:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Speichern der Einstellungen',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    });
  }
});

// ==================== PRESENCE ====================

interface PresenceDoc {
  email: string;
  status: 'online' | 'away' | 'dnd' | 'offline';
  customMessage?: string;
  lastSeen: Date;
  updatedAt: Date;
}

/**
 * GET /chat/presence
 * Online-Status abrufen
 */
router.get('/presence', async (req: Request, res: Response) => {
  try {
    const { email, emails } = req.query;
    
    const presenceCollection = mongoService.getCollection<PresenceDoc>('chat_presence');
    
    if (emails) {
      // Bulk-Abfrage für mehrere E-Mails
      const emailList = (emails as string).split(',').map(e => e.trim().toLowerCase());
      const presences = await presenceCollection
        .find({ email: { $in: emailList } })
        .toArray();
      
      // Map für schnellen Zugriff
      const presenceMap: Record<string, PresenceDoc> = {};
      presences.forEach(p => {
        presenceMap[p.email] = p;
      });
      
      res.json({
        success: true,
        presences: presenceMap,
      });
    } else if (email) {
      // Einzelne E-Mail
      const presence = await presenceCollection.findOne({ 
        email: (email as string).toLowerCase() 
      });
      
      res.json({
        success: true,
        presence: presence ? {
          email: presence.email,
          status: presence.status,
          customMessage: presence.customMessage,
          lastSeen: presence.lastSeen,
        } : null,
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'E-Mail ist erforderlich',
      });
    }
  } catch (error) {
    console.error('[Chat] Error getting presence:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Abrufen des Online-Status',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    });
  }
});

/**
 * POST /chat/presence
 * Online-Status aktualisieren
 */
router.post('/presence', async (req: Request, res: Response) => {
  try {
    const email = getUserEmail(req);
    const { status, customMessage } = req.body;
    
    if (!status || !['online', 'away', 'dnd', 'offline'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Ungültiger Status',
      });
    }
    
    const presenceCollection = mongoService.getCollection<PresenceDoc>('chat_presence');
    
    await presenceCollection.updateOne(
      { email },
      { 
        $set: { 
          email,
          status,
          customMessage: customMessage || null,
          lastSeen: new Date(),
          updatedAt: new Date(),
        }
      },
      { upsert: true }
    );
    
    res.json({
      success: true,
      message: 'Status aktualisiert',
    });
  } catch (error) {
    console.error('[Chat] Error updating presence:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Aktualisieren des Online-Status',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    });
  }
});

// ==================== TYPING ====================

interface TypingDoc {
  spaceId: string;
  email: string;
  isTyping: boolean;
  updatedAt: Date;
}

/**
 * GET /chat/typing
 * Tipp-Status für einen Space abrufen
 */
router.get('/typing', async (req: Request, res: Response) => {
  try {
    const { spaceId } = req.query;
    
    if (!spaceId) {
      return res.status(400).json({
        success: false,
        error: 'Space-ID ist erforderlich',
      });
    }
    
    const typingCollection = mongoService.getCollection<TypingDoc>('chat_typing');
    
    // Nur aktive Typing-Einträge (nicht älter als 10 Sekunden)
    const tenSecondsAgo = new Date(Date.now() - 10000);
    const typingUsers = await typingCollection
      .find({ 
        spaceId: spaceId as string, 
        isTyping: true,
        updatedAt: { $gte: tenSecondsAgo }
      })
      .toArray();
    
    res.json({
      success: true,
      typing: typingUsers.map(t => ({
        email: t.email,
        updatedAt: t.updatedAt,
      })),
    });
  } catch (error) {
    console.error('[Chat] Error getting typing status:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Abrufen des Tipp-Status',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    });
  }
});

/**
 * POST /chat/typing
 * Tipp-Status senden
 */
router.post('/typing', async (req: Request, res: Response) => {
  try {
    const email = getUserEmail(req);
    const { spaceId, isTyping } = req.body;
    
    if (!spaceId) {
      return res.status(400).json({
        success: false,
        error: 'Space-ID ist erforderlich',
      });
    }
    
    const typingCollection = mongoService.getCollection<TypingDoc>('chat_typing');
    
    await typingCollection.updateOne(
      { spaceId, email },
      { 
        $set: { 
          spaceId,
          email,
          isTyping: isTyping !== false,
          updatedAt: new Date(),
        }
      },
      { upsert: true }
    );
    
    res.json({
      success: true,
      message: 'Tipp-Status aktualisiert',
    });
  } catch (error) {
    console.error('[Chat] Error updating typing status:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Senden des Tipp-Status',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    });
  }
});

// ==================== READ RECEIPTS ====================

interface ReadReceiptDoc {
  spaceId: string;
  email: string;
  messageIds: string[];
  lastReadAt: Date;
  updatedAt: Date;
}

/**
 * GET /chat/read-receipts
 * Lesebestätigungen abrufen
 */
router.get('/read-receipts', async (req: Request, res: Response) => {
  try {
    const { spaceId, messageId } = req.query;
    
    if (!spaceId) {
      return res.status(400).json({
        success: false,
        error: 'Space-ID ist erforderlich',
      });
    }
    
    const readReceiptsCollection = mongoService.getCollection<ReadReceiptDoc>('chat_read_receipts');
    
    if (messageId) {
      // Lesebestätigungen für eine bestimmte Nachricht
      const receipts = await readReceiptsCollection
        .find({ 
          spaceId: spaceId as string,
          messageIds: messageId as string,
        })
        .toArray();
      
      res.json({
        success: true,
        readBy: receipts.map(r => ({
          email: r.email,
          readAt: r.updatedAt,
        })),
      });
    } else {
      // Alle Lesebestätigungen für den Space
      const receipts = await readReceiptsCollection
        .find({ spaceId: spaceId as string })
        .toArray();
      
      res.json({
        success: true,
        receipts: receipts.map(r => ({
          email: r.email,
          lastReadAt: r.lastReadAt,
          messageCount: r.messageIds.length,
        })),
      });
    }
  } catch (error) {
    console.error('[Chat] Error getting read receipts:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Abrufen der Lesebestätigungen',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    });
  }
});

/**
 * POST /chat/read-receipts
 * Lesebestätigung senden
 */
router.post('/read-receipts', async (req: Request, res: Response) => {
  try {
    const email = getUserEmail(req);
    const { spaceId, messageIds, lastReadAt } = req.body;
    
    if (!spaceId) {
      return res.status(400).json({
        success: false,
        error: 'Space-ID ist erforderlich',
      });
    }
    
    const readReceiptsCollection = mongoService.getCollection<ReadReceiptDoc>('chat_read_receipts');
    
    await readReceiptsCollection.updateOne(
      { spaceId, email },
      { 
        $set: { 
          spaceId,
          email,
          lastReadAt: lastReadAt ? new Date(lastReadAt) : new Date(),
          updatedAt: new Date(),
        },
        $addToSet: messageIds?.length 
          ? { messageIds: { $each: messageIds } }
          : {},
      },
      { upsert: true }
    );
    
    res.json({
      success: true,
      message: 'Lesebestätigung gespeichert',
    });
  } catch (error) {
    console.error('[Chat] Error saving read receipt:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Speichern der Lesebestätigung',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    });
  }
});

// ==================== EMAIL NOTIFICATIONS ====================

/**
 * POST /chat/notifications/email
 * E-Mail-Benachrichtigung für ungelesene Nachrichten senden
 */
router.post('/notifications/email', async (req: Request, res: Response) => {
  try {
    const { recipientEmail, senderName, spaceName, messagePreview, unreadCount } = req.body;
    
    if (!recipientEmail) {
      return res.status(400).json({
        success: false,
        error: 'Empfänger-E-Mail ist erforderlich',
      });
    }
    
    // E-Mail über SMTP senden
    // Hier würde normalerweise der E-Mail-Service verwendet
    // Für jetzt nur Logging
    console.log('[Chat] E-Mail-Benachrichtigung würde gesendet:', {
      to: recipientEmail,
      subject: spaceName 
        ? `Neue Nachricht in ${spaceName}` 
        : `Neue Nachricht von ${senderName}`,
      preview: messagePreview,
      unreadCount,
    });
    
    // TODO: Integration mit bestehendem E-Mail-Service
    // await emailService.sendNotification({
    //   to: recipientEmail,
    //   template: 'chat-notification',
    //   data: { senderName, spaceName, messagePreview, unreadCount },
    // });
    
    res.json({
      success: true,
      message: 'E-Mail-Benachrichtigung verarbeitet',
    });
  } catch (error) {
    console.error('[Chat] Error sending email notification:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Senden der E-Mail-Benachrichtigung',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    });
  }
});

export default router;
