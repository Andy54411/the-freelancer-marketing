/**
 * Taskilo Meeting Logging Service
 * Speichert Meeting-Metadaten in MongoDB für Historie und Analytics
 * 
 * Collections:
 * - meeting_history: Abgeschlossene Meetings
 * - meeting_scheduled: Geplante Meetings
 * - meeting_participants_log: Teilnehmer-Log für Analytics
 */

import { mongoDBService, ObjectId } from './MongoDBService';

// ==================== Interfaces ====================

export interface MeetingRecord {
  _id?: ObjectId;
  meetingId: string;
  roomCode: string;
  title?: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  hostEmail: string;
  hostName: string;
  scheduledStartTime?: Date;
  actualStartTime?: Date;
  endTime?: Date;
  durationMinutes?: number;
  maxParticipants: number;
  totalParticipants: number;
  participantEmails: string[];
  settings: {
    waitingRoom: boolean;
    requireHostApproval: boolean;
    allowScreenShare: boolean;
    allowChat: boolean;
    autoRecord: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
  endedBy?: string;  // Email des Beenders
  endReason?: 'host_ended' | 'all_left' | 'timeout' | 'cancelled';
  calendarEventId?: string;  // Falls mit Kalender verknüpft
  companyId?: string;  // Für Firmen-Analytics
}

export interface MeetingParticipantLog {
  _id?: ObjectId;
  meetingId: string;
  participantId: string;
  email?: string;
  name: string;
  role: 'host' | 'co-host' | 'participant';
  joinedAt: Date;
  leftAt?: Date;
  durationMinutes?: number;
  actions: {
    type: 'join' | 'leave' | 'mute' | 'unmute' | 'video_on' | 'video_off' | 'screen_share' | 'chat' | 'reaction' | 'hand_raised';
    timestamp: Date;
    details?: string;
  }[];
  wasRemoved: boolean;
  removedBy?: string;
}

export interface ScheduledMeeting {
  _id?: ObjectId;
  meetingId: string;
  roomCode: string;
  title: string;
  description?: string;
  hostEmail: string;
  hostName: string;
  scheduledStartTime: Date;
  scheduledEndTime?: Date;
  durationMinutes: number;
  invitees: {
    email: string;
    name?: string;
    status: 'pending' | 'accepted' | 'declined';
    respondedAt?: Date;
  }[];
  settings: MeetingRecord['settings'];
  createdAt: Date;
  updatedAt: Date;
  reminderSent: boolean;
  reminderSentAt?: Date;
  isRecurring: boolean;
  recurringPattern?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
    endDate?: Date;
    daysOfWeek?: number[];  // 0-6 (So-Sa)
  };
  calendarEventId?: string;
  companyId?: string;
}

export interface MeetingStats {
  totalMeetings: number;
  totalDurationMinutes: number;
  averageDurationMinutes: number;
  averageParticipants: number;
  meetingsByStatus: {
    completed: number;
    cancelled: number;
    scheduled: number;
  };
}

// ==================== Service ====================

class MeetingLoggingService {
  private readonly DB_NAME = 'taskilo_ki';
  private readonly HISTORY_COLLECTION = 'meeting_history';
  private readonly SCHEDULED_COLLECTION = 'meeting_scheduled';
  private readonly PARTICIPANTS_COLLECTION = 'meeting_participants_log';

  // ==================== Meeting Lifecycle ====================

  /**
   * Startet ein neues Meeting (wird in-progress gesetzt)
   */
  async startMeeting(
    roomCode: string,
    hostEmail: string,
    hostName: string,
    settings?: Partial<MeetingRecord['settings']>,
    title?: string,
    companyId?: string
  ): Promise<MeetingRecord> {
    const collection = await mongoDBService.getCollectionFromDb<MeetingRecord>(
      this.DB_NAME,
      this.HISTORY_COLLECTION
    );

    const meeting: MeetingRecord = {
      meetingId: this.generateId(),
      roomCode,
      title: title || `Meeting ${roomCode}`,
      status: 'in-progress',
      hostEmail,
      hostName,
      actualStartTime: new Date(),
      maxParticipants: 1,
      totalParticipants: 1,
      participantEmails: [hostEmail],
      settings: {
        waitingRoom: settings?.waitingRoom ?? true,
        requireHostApproval: settings?.requireHostApproval ?? true,
        allowScreenShare: settings?.allowScreenShare ?? true,
        allowChat: settings?.allowChat ?? true,
        autoRecord: settings?.autoRecord ?? false,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      companyId,
    };

    await collection.insertOne(meeting);
    console.log(`[MeetingLogging] Started meeting ${meeting.meetingId} (${roomCode}) by ${hostEmail}`);
    
    // Host als Teilnehmer loggen
    await this.logParticipantJoin(meeting.meetingId, {
      participantId: this.generateId(),
      email: hostEmail,
      name: hostName,
      role: 'host',
    });

    return meeting;
  }

  /**
   * Beendet ein Meeting
   */
  async endMeeting(
    roomCode: string,
    endedBy: string,
    reason: MeetingRecord['endReason'] = 'host_ended'
  ): Promise<void> {
    const collection = await mongoDBService.getCollectionFromDb<MeetingRecord>(
      this.DB_NAME,
      this.HISTORY_COLLECTION
    );

    const meeting = await collection.findOne({ roomCode, status: 'in-progress' });
    if (!meeting) {
      console.log(`[MeetingLogging] No active meeting found for room ${roomCode}`);
      return;
    }

    const endTime = new Date();
    const durationMinutes = meeting.actualStartTime 
      ? Math.round((endTime.getTime() - meeting.actualStartTime.getTime()) / 60000)
      : 0;

    await collection.updateOne(
      { meetingId: meeting.meetingId },
      {
        $set: {
          status: 'completed',
          endTime,
          durationMinutes,
          endedBy,
          endReason: reason,
          updatedAt: new Date(),
        },
      }
    );

    // Alle Teilnehmer als "left" markieren
    await this.markAllParticipantsLeft(meeting.meetingId, endTime);

    console.log(`[MeetingLogging] Ended meeting ${meeting.meetingId} after ${durationMinutes} minutes`);
  }

  /**
   * Aktualisiert Meeting bei neuem Teilnehmer
   */
  async updateMeetingParticipants(
    roomCode: string,
    participantEmail: string,
    participantCount: number
  ): Promise<void> {
    const collection = await mongoDBService.getCollectionFromDb<MeetingRecord>(
      this.DB_NAME,
      this.HISTORY_COLLECTION
    );

    await collection.updateOne(
      { roomCode, status: 'in-progress' },
      {
        $addToSet: { participantEmails: participantEmail },
        $max: { maxParticipants: participantCount },
        $inc: { totalParticipants: 1 },
        $set: { updatedAt: new Date() },
      }
    );
  }

  // ==================== Participant Logging ====================

  /**
   * Loggt Teilnehmer-Beitritt
   */
  async logParticipantJoin(
    meetingId: string,
    participant: {
      participantId: string;
      email?: string;
      name: string;
      role: 'host' | 'co-host' | 'participant';
    }
  ): Promise<void> {
    const collection = await mongoDBService.getCollectionFromDb<MeetingParticipantLog>(
      this.DB_NAME,
      this.PARTICIPANTS_COLLECTION
    );

    const log: MeetingParticipantLog = {
      meetingId,
      participantId: participant.participantId,
      email: participant.email,
      name: participant.name,
      role: participant.role,
      joinedAt: new Date(),
      actions: [{ type: 'join', timestamp: new Date() }],
      wasRemoved: false,
    };

    await collection.insertOne(log);
    console.log(`[MeetingLogging] Participant ${participant.name} joined meeting ${meetingId}`);
  }

  /**
   * Loggt Teilnehmer-Aktion
   */
  async logParticipantAction(
    meetingId: string,
    participantId: string,
    action: MeetingParticipantLog['actions'][0]['type'],
    details?: string
  ): Promise<void> {
    const collection = await mongoDBService.getCollectionFromDb<MeetingParticipantLog>(
      this.DB_NAME,
      this.PARTICIPANTS_COLLECTION
    );

    await collection.updateOne(
      { meetingId, participantId },
      {
        $push: {
          actions: {
            type: action,
            timestamp: new Date(),
            details,
          },
        },
      }
    );
  }

  /**
   * Loggt Teilnehmer-Verlassen
   */
  async logParticipantLeave(
    meetingId: string,
    participantId: string,
    wasRemoved: boolean = false,
    removedBy?: string
  ): Promise<void> {
    const collection = await mongoDBService.getCollectionFromDb<MeetingParticipantLog>(
      this.DB_NAME,
      this.PARTICIPANTS_COLLECTION
    );

    const now = new Date();

    const log = await collection.findOne({ meetingId, participantId });
    const durationMinutes = log?.joinedAt 
      ? Math.round((now.getTime() - log.joinedAt.getTime()) / 60000)
      : 0;

    await collection.updateOne(
      { meetingId, participantId },
      {
        $set: {
          leftAt: now,
          durationMinutes,
          wasRemoved,
          removedBy,
        },
        $push: {
          actions: { type: 'leave', timestamp: now },
        },
      }
    );

    console.log(`[MeetingLogging] Participant ${participantId} left meeting ${meetingId} (${durationMinutes} min)`);
  }

  /**
   * Markiert alle Teilnehmer als verlassen (bei Meeting-Ende)
   */
  private async markAllParticipantsLeft(meetingId: string, endTime: Date): Promise<void> {
    const collection = await mongoDBService.getCollectionFromDb<MeetingParticipantLog>(
      this.DB_NAME,
      this.PARTICIPANTS_COLLECTION
    );

    const participants = await collection.find({
      meetingId,
      leftAt: undefined,
    }).toArray();

    for (const p of participants) {
      const durationMinutes = Math.round((endTime.getTime() - p.joinedAt.getTime()) / 60000);
      await collection.updateOne(
        { _id: p._id },
        {
          $set: { leftAt: endTime, durationMinutes },
          $push: { actions: { type: 'leave', timestamp: endTime } },
        }
      );
    }
  }

  // ==================== Scheduled Meetings ====================

  /**
   * Plant ein neues Meeting
   */
  async scheduleMeeting(
    hostEmail: string,
    hostName: string,
    title: string,
    scheduledStartTime: Date,
    durationMinutes: number,
    invitees: { email: string; name?: string }[],
    settings?: Partial<MeetingRecord['settings']>,
    description?: string,
    companyId?: string
  ): Promise<ScheduledMeeting> {
    const collection = await mongoDBService.getCollectionFromDb<ScheduledMeeting>(
      this.DB_NAME,
      this.SCHEDULED_COLLECTION
    );

    const meeting: ScheduledMeeting = {
      meetingId: this.generateId(),
      roomCode: this.generateRoomCode(),
      title,
      description,
      hostEmail,
      hostName,
      scheduledStartTime,
      scheduledEndTime: new Date(scheduledStartTime.getTime() + durationMinutes * 60000),
      durationMinutes,
      invitees: invitees.map(i => ({
        ...i,
        status: 'pending' as const,
      })),
      settings: {
        waitingRoom: settings?.waitingRoom ?? true,
        requireHostApproval: settings?.requireHostApproval ?? true,
        allowScreenShare: settings?.allowScreenShare ?? true,
        allowChat: settings?.allowChat ?? true,
        autoRecord: settings?.autoRecord ?? false,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      reminderSent: false,
      isRecurring: false,
      companyId,
    };

    await collection.insertOne(meeting);
    console.log(`[MeetingLogging] Scheduled meeting ${meeting.meetingId} for ${scheduledStartTime.toISOString()}`);

    return meeting;
  }

  /**
   * Holt geplante Meetings für einen User
   */
  async getScheduledMeetings(
    email: string,
    from?: Date,
    to?: Date
  ): Promise<ScheduledMeeting[]> {
    const collection = await mongoDBService.getCollectionFromDb<ScheduledMeeting>(
      this.DB_NAME,
      this.SCHEDULED_COLLECTION
    );

    const query: {
      $or: { hostEmail?: string; 'invitees.email'?: string }[];
      scheduledStartTime?: { $gte?: Date; $lte?: Date };
    } = {
      $or: [
        { hostEmail: email },
        { 'invitees.email': email },
      ],
    };

    if (from || to) {
      query.scheduledStartTime = {};
      if (from) query.scheduledStartTime.$gte = from;
      if (to) query.scheduledStartTime.$lte = to;
    }

    return collection.find(query).toArray();
  }

  /**
   * Aktualisiert Einladungsstatus
   */
  async updateInviteeStatus(
    meetingId: string,
    email: string,
    status: 'accepted' | 'declined'
  ): Promise<void> {
    const collection = await mongoDBService.getCollectionFromDb<ScheduledMeeting>(
      this.DB_NAME,
      this.SCHEDULED_COLLECTION
    );

    await collection.updateOne(
      { meetingId, 'invitees.email': email },
      {
        $set: {
          'invitees.$.status': status,
          'invitees.$.respondedAt': new Date(),
          updatedAt: new Date(),
        },
      }
    );

    console.log(`[MeetingLogging] Invitee ${email} ${status} meeting ${meetingId}`);
  }

  // ==================== Analytics ====================

  /**
   * Holt Meeting-Historie für einen User
   */
  async getMeetingHistory(
    email: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<MeetingRecord[]> {
    const collection = await mongoDBService.getCollectionFromDb<MeetingRecord>(
      this.DB_NAME,
      this.HISTORY_COLLECTION
    );

    const meetings = await collection.find({
      $or: [
        { hostEmail: email },
        { participantEmails: email },
      ],
      status: { $in: ['completed', 'cancelled'] },
    })
    .skip(offset)
    .limit(limit)
    .toArray();

    // Nach Startzeit sortieren (neueste zuerst)
    return meetings.sort((a, b) => 
      (b.actualStartTime?.getTime() || 0) - (a.actualStartTime?.getTime() || 0)
    );
  }

  /**
   * Holt Meeting-Statistiken für einen User oder Firma
   */
  async getStats(
    email?: string,
    companyId?: string,
    from?: Date,
    to?: Date
  ): Promise<MeetingStats> {
    const collection = await mongoDBService.getCollectionFromDb<MeetingRecord>(
      this.DB_NAME,
      this.HISTORY_COLLECTION
    );

    const query: {
      $or?: { hostEmail?: string; participantEmails?: string }[];
      companyId?: string;
      actualStartTime?: { $gte?: Date; $lte?: Date };
    } = {};

    if (email) {
      query.$or = [
        { hostEmail: email },
        { participantEmails: email },
      ];
    }
    if (companyId) {
      query.companyId = companyId;
    }
    if (from || to) {
      query.actualStartTime = {};
      if (from) query.actualStartTime.$gte = from;
      if (to) query.actualStartTime.$lte = to;
    }

    const meetings = await collection.find(query).toArray();

    const completed = meetings.filter(m => m.status === 'completed');
    const cancelled = meetings.filter(m => m.status === 'cancelled');
    const scheduled = meetings.filter(m => m.status === 'scheduled');

    const totalDuration = completed.reduce((sum, m) => sum + (m.durationMinutes || 0), 0);
    const totalParticipants = completed.reduce((sum, m) => sum + m.maxParticipants, 0);

    return {
      totalMeetings: meetings.length,
      totalDurationMinutes: totalDuration,
      averageDurationMinutes: completed.length > 0 ? Math.round(totalDuration / completed.length) : 0,
      averageParticipants: completed.length > 0 ? Math.round(totalParticipants / completed.length * 10) / 10 : 0,
      meetingsByStatus: {
        completed: completed.length,
        cancelled: cancelled.length,
        scheduled: scheduled.length,
      },
    };
  }

  /**
   * Holt aktives Meeting für einen Raum
   */
  async getActiveMeeting(roomCode: string): Promise<MeetingRecord | null> {
    const collection = await mongoDBService.getCollectionFromDb<MeetingRecord>(
      this.DB_NAME,
      this.HISTORY_COLLECTION
    );

    return collection.findOne({ roomCode, status: 'in-progress' });
  }

  // ==================== Utilities ====================

  private generateId(): string {
    return `mtg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateRoomCode(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    const part1 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const part3 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `${part1}-${part2}-${part3}`;
  }

  /**
   * Health Check
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    activeMeetings?: number;
    completedMeetings?: number;
    scheduledMeetings?: number;
    error?: string;
  }> {
    try {
      const historyCol = await mongoDBService.getCollectionFromDb<MeetingRecord>(
        this.DB_NAME,
        this.HISTORY_COLLECTION
      );
      const scheduledCol = await mongoDBService.getCollectionFromDb<ScheduledMeeting>(
        this.DB_NAME,
        this.SCHEDULED_COLLECTION
      );

      const [active, completed, scheduled] = await Promise.all([
        historyCol.countDocuments({ status: 'in-progress' }),
        historyCol.countDocuments({ status: 'completed' }),
        scheduledCol.countDocuments({ scheduledStartTime: { $gte: new Date() } }),
      ]);

      return {
        status: 'healthy',
        activeMeetings: active,
        completedMeetings: completed,
        scheduledMeetings: scheduled,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Singleton
export const meetingLoggingService = new MeetingLoggingService();
