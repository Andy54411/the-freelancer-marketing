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

export default router;
