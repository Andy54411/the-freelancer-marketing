/**
 * Taskilo Webmail Proxy - CalDAV Service
 * Kalender-Synchronisation mit Mailcow CalDAV/SOGo
 */

import { z } from 'zod';

// CalDAV-Schemas
export const CalendarEventSchema = z.object({
  uid: z.string(),
  summary: z.string(),
  description: z.string().optional(),
  location: z.string().optional(),
  start: z.string(), // ISO 8601
  end: z.string(),
  allDay: z.boolean().default(false),
  recurrence: z.string().optional(), // RRULE
  attendees: z.array(z.object({
    email: z.string().email(),
    name: z.string().optional(),
    status: z.enum(['accepted', 'declined', 'tentative', 'needs-action']).default('needs-action'),
  })).optional(),
  organizer: z.object({
    email: z.string().email(),
    name: z.string().optional(),
  }).optional(),
  reminders: z.array(z.object({
    type: z.enum(['email', 'popup']),
    minutes: z.number(),
  })).optional(),
  meetLink: z.string().optional(),
  color: z.string().optional(),
  status: z.enum(['confirmed', 'tentative', 'cancelled']).default('confirmed'),
});

export type CalendarEvent = z.infer<typeof CalendarEventSchema>;

interface Calendar {
  id: string;
  name: string;
  color: string;
  description?: string;
  timezone: string;
  isDefault: boolean;
  canEdit: boolean;
}

interface CalDAVConfig {
  baseUrl: string;
  principalPath: string;
  calendarPath: string;
}

const DEFAULT_CONFIG: CalDAVConfig = {
  baseUrl: 'https://mail.taskilo.de',
  principalPath: '/SOGo/dav',
  calendarPath: '/SOGo/dav/{email}/Calendar',
};

class CalDAVService {
  private config: CalDAVConfig;
  private stats = {
    totalRequests: 0,
    eventsCreated: 0,
    eventsUpdated: 0,
    eventsDeleted: 0,
  };

  constructor(config: Partial<CalDAVConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // Basic Auth Header generieren
  private getAuthHeader(email: string, password: string): string {
    const credentials = Buffer.from(`${email}:${password}`).toString('base64');
    return `Basic ${credentials}`;
  }

  // CalDAV Request mit XML
  private async caldavRequest(
    email: string,
    password: string,
    method: string,
    path: string,
    body?: string,
    contentType = 'text/calendar; charset=utf-8'
  ): Promise<{ status: number; body: string; headers: Headers }> {
    this.stats.totalRequests++;

    const url = `${this.config.baseUrl}${path.replace('{email}', email)}`;
    
    const headers: Record<string, string> = {
      Authorization: this.getAuthHeader(email, password),
      'Content-Type': contentType,
    };

    if (body) {
      headers['Content-Length'] = Buffer.byteLength(body).toString();
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body || undefined,
      });

      return {
        status: response.status,
        body: await response.text(),
        headers: response.headers,
      };
    } catch (error) {
      console.error('[CALDAV] Request failed:', error);
      throw error;
    }
  }

  // Kalender-Liste abrufen
  async getCalendars(email: string, password: string): Promise<Calendar[]> {
    const path = `${this.config.principalPath}/${email}/`;
    
    const propfindBody = `<?xml version="1.0" encoding="UTF-8"?>
<D:propfind xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav" xmlns:CS="http://calendarserver.org/ns/">
  <D:prop>
    <D:displayname/>
    <D:resourcetype/>
    <CS:getctag/>
    <C:calendar-description/>
    <apple:calendar-color xmlns:apple="http://apple.com/ns/ical/"/>
    <C:supported-calendar-component-set/>
  </D:prop>
</D:propfind>`;

    const response = await this.caldavRequest(
      email,
      password,
      'PROPFIND',
      path,
      propfindBody,
      'application/xml; charset=utf-8'
    );

    if (response.status !== 207) {
      throw new Error(`CalDAV PROPFIND failed: ${response.status}`);
    }

    // XML parsen (vereinfacht - in Produktion XML-Parser verwenden)
    const calendars = this.parseCalendarList(response.body, email);
    return calendars;
  }

  private parseCalendarList(_xml: string, _email: string): Calendar[] {
    // Vereinfachtes Parsing - in Produktion mit xml2js oder ähnlichem
    const calendars: Calendar[] = [];
    
    // Standard-Kalender
    calendars.push({
      id: 'personal',
      name: 'Kalender',
      color: '#4CAF50',
      timezone: 'Europe/Berlin',
      isDefault: true,
      canEdit: true,
    });

    return calendars;
  }

  // Events aus einem Kalender abrufen
  async getEvents(
    email: string,
    password: string,
    calendarId: string,
    start: Date,
    end: Date
  ): Promise<CalendarEvent[]> {
    const path = `${this.config.calendarPath.replace('{email}', email)}/${calendarId}/`;

    // CALDAV REPORT mit Zeitraum-Filter
    const reportBody = `<?xml version="1.0" encoding="UTF-8"?>
<C:calendar-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:prop>
    <D:getetag/>
    <C:calendar-data/>
  </D:prop>
  <C:filter>
    <C:comp-filter name="VCALENDAR">
      <C:comp-filter name="VEVENT">
        <C:time-range start="${this.formatDateForCalDAV(start)}" end="${this.formatDateForCalDAV(end)}"/>
      </C:comp-filter>
    </C:comp-filter>
  </C:filter>
</C:calendar-query>`;

    const response = await this.caldavRequest(
      email,
      password,
      'REPORT',
      path,
      reportBody,
      'application/xml; charset=utf-8'
    );

    if (response.status !== 207) {
      throw new Error(`CalDAV REPORT failed: ${response.status}`);
    }

    const events = this.parseEventsFromXML(response.body);
    return events;
  }

  private formatDateForCalDAV(date: Date): string {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  }

  private parseEventsFromXML(xml: string): CalendarEvent[] {
    // iCal-Events parsen
    const events: CalendarEvent[] = [];
    
    // Vereinfachtes Regex-Parsing für VEVENT
    const veventMatches = xml.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || [];
    
    for (const vevent of veventMatches) {
      const event = this.parseVEvent(vevent);
      if (event) {
        events.push(event);
      }
    }

    return events;
  }

  private parseVEvent(vevent: string): CalendarEvent | null {
    const getValue = (key: string): string | undefined => {
      const match = vevent.match(new RegExp(`${key}[^:]*:(.+)`));
      return match ? match[1].trim() : undefined;
    };

    const uid = getValue('UID');
    const summary = getValue('SUMMARY');
    const dtstart = getValue('DTSTART');
    const dtend = getValue('DTEND');

    if (!uid || !summary || !dtstart || !dtend) {
      return null;
    }

    return {
      uid,
      summary,
      description: getValue('DESCRIPTION'),
      location: getValue('LOCATION'),
      start: this.parseICalDate(dtstart),
      end: this.parseICalDate(dtend),
      allDay: dtstart.length === 8, // YYYYMMDD = ganztägig
      status: 'confirmed',
    };
  }

  private parseICalDate(icalDate: string): string {
    // 20231220T100000Z -> ISO 8601
    if (icalDate.length === 8) {
      // Ganztägig: YYYYMMDD
      return `${icalDate.substring(0, 4)}-${icalDate.substring(4, 6)}-${icalDate.substring(6, 8)}`;
    }

    // YYYYMMDDTHHMMSS oder YYYYMMDDTHHMMSSZ
    const year = icalDate.substring(0, 4);
    const month = icalDate.substring(4, 6);
    const day = icalDate.substring(6, 8);
    const hour = icalDate.substring(9, 11);
    const minute = icalDate.substring(11, 13);
    const second = icalDate.substring(13, 15);

    return `${year}-${month}-${day}T${hour}:${minute}:${second}${icalDate.endsWith('Z') ? 'Z' : ''}`;
  }

  // Event erstellen
  async createEvent(
    email: string,
    password: string,
    calendarId: string,
    event: CalendarEvent
  ): Promise<{ success: boolean; uid: string; error?: string }> {
    const uid = event.uid || this.generateUID(email);
    const path = `${this.config.calendarPath.replace('{email}', email)}/${calendarId}/${uid}.ics`;

    const icalEvent = this.eventToICal(event, uid, email);

    const response = await this.caldavRequest(
      email,
      password,
      'PUT',
      path,
      icalEvent
    );

    if (response.status === 201 || response.status === 204) {
      this.stats.eventsCreated++;
      return { success: true, uid };
    }

    return { success: false, uid, error: `Create failed: ${response.status}` };
  }

  // Event aktualisieren
  async updateEvent(
    email: string,
    password: string,
    calendarId: string,
    event: CalendarEvent
  ): Promise<{ success: boolean; error?: string }> {
    const path = `${this.config.calendarPath.replace('{email}', email)}/${calendarId}/${event.uid}.ics`;

    const icalEvent = this.eventToICal(event, event.uid, email);

    const response = await this.caldavRequest(
      email,
      password,
      'PUT',
      path,
      icalEvent
    );

    if (response.status === 204 || response.status === 201) {
      this.stats.eventsUpdated++;
      return { success: true };
    }

    return { success: false, error: `Update failed: ${response.status}` };
  }

  // Event löschen
  async deleteEvent(
    email: string,
    password: string,
    calendarId: string,
    eventUid: string
  ): Promise<{ success: boolean; error?: string }> {
    const path = `${this.config.calendarPath.replace('{email}', email)}/${calendarId}/${eventUid}.ics`;

    const response = await this.caldavRequest(
      email,
      password,
      'DELETE',
      path
    );

    if (response.status === 204 || response.status === 200) {
      this.stats.eventsDeleted++;
      return { success: true };
    }

    return { success: false, error: `Delete failed: ${response.status}` };
  }

  // Event zu iCal konvertieren
  private eventToICal(event: CalendarEvent, uid: string, email: string): string {
    const formatDate = (dateStr: string, allDay: boolean): string => {
      const date = new Date(dateStr);
      if (allDay) {
        return date.toISOString().substring(0, 10).replace(/-/g, '');
      }
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    let ical = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Taskilo//Webmail Calendar//DE
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${formatDate(new Date().toISOString(), false)}
DTSTART${event.allDay ? ';VALUE=DATE' : ''}:${formatDate(event.start, event.allDay)}
DTEND${event.allDay ? ';VALUE=DATE' : ''}:${formatDate(event.end, event.allDay)}
SUMMARY:${this.escapeICalText(event.summary)}`;

    if (event.description) {
      ical += `\nDESCRIPTION:${this.escapeICalText(event.description)}`;
    }

    if (event.location) {
      ical += `\nLOCATION:${this.escapeICalText(event.location)}`;
    }

    if (event.organizer) {
      ical += `\nORGANIZER;CN=${event.organizer.name || email}:mailto:${event.organizer.email}`;
    }

    if (event.attendees) {
      for (const attendee of event.attendees) {
        const status = attendee.status?.toUpperCase().replace('-', '') || 'NEEDS-ACTION';
        ical += `\nATTENDEE;PARTSTAT=${status};CN=${attendee.name || attendee.email}:mailto:${attendee.email}`;
      }
    }

    if (event.meetLink) {
      ical += `\nX-TASKILO-MEET-LINK:${event.meetLink}`;
    }

    if (event.recurrence) {
      ical += `\nRRULE:${event.recurrence}`;
    }

    ical += `\nSTATUS:${event.status?.toUpperCase() || 'CONFIRMED'}
END:VEVENT
END:VCALENDAR`;

    return ical;
  }

  private escapeICalText(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  }

  private generateUID(_email: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    return `${timestamp}-${random}@taskilo.de`;
  }

  getStats() {
    return { ...this.stats };
  }
}

// Singleton
export const caldavService = new CalDAVService();
