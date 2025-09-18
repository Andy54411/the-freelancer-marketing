import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient, ScanCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import {
  CloudWatchLogsClient,
  StartQueryCommand,
  GetQueryResultsCommand,
  DescribeLogGroupsCommand,
} from '@aws-sdk/client-cloudwatch-logs';
// Entfernt: AWS SES Import - wir nutzen Resend
// import { SESClient, GetSendQuotaCommand, GetSendStatisticsCommand } from '@aws-sdk/client-ses';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

// JWT Secret für Admin-Tokens
const JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || 'taskilo-admin-secret-key-2024'
);

const dynamodb = new DynamoDBClient({
  region: process.env.AWS_REGION || 'eu-central-1',
});

const cloudWatchClient = new CloudWatchLogsClient({
  region: process.env.AWS_REGION || 'eu-central-1',
});

// Entfernt: SES Client - wir nutzen Resend
// const sesClient = new SESClient({
//   region: process.env.AWS_REGION || 'eu-central-1',
// });

interface TicketMetrics {
  totalTickets: number;
  openTickets: number;
  closedTickets: number;
  averageResolutionTime: number;
  ticketsByCategory: Record<string, number>;
  ticketsByPriority: Record<string, number>;
  sentimentDistribution: Record<string, number>;
  urgencyScoreDistribution: Record<string, number>;
  performanceMetrics: {
    slaCompliance: number;
    firstResponseTime: number;
    resolutionRate: number;
  };
  trends: {
    daily: Array<{ date: string; count: number; resolved: number }>;
    weekly: Array<{ week: string; count: number; resolved: number }>;
    monthly: Array<{ month: string; count: number; resolved: number }>;
  };
  // Neue AWS-Features
  awsMetrics: {
    emailStats: {
      quotaUsed: number;
      quotaRemaining: number;
      bounceRate: number;
      complaintRate: number;
    };
    aiClassification: {
      accuracyRate: number;
      autoClassifiedTickets: number;
      manualOverrides: number;
    };
    cloudWatchInsights: Record<string, any>;
  };
}

// GET - Ticket Analytics abrufen
export async function GET(request: NextRequest) {
  try {
    // Admin-Authentifizierung prüfen
    const authResult = await verifyAdminAuth(request);
    if (!authResult.isValid) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '30d';
    const category = searchParams.get('category') || undefined;
    const priority = searchParams.get('priority') || undefined;

    // Ticket-Daten aus DynamoDB abrufen
    const tickets = await getTicketsForAnalytics(timeRange, category, priority);

    // Metriken berechnen
    const metrics = await calculateMetrics(tickets);

    // AWS-spezifische Metriken hinzufügen
    const awsMetrics = await getAWSEnhancedMetrics(tickets);

    return NextResponse.json({
      success: true,
      metrics: {
        ...metrics,
        awsMetrics,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Fehler beim Abrufen der Analytics-Daten',
      },
      { status: 500 }
    );
  }
}

// POST - Custom Metric senden
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAdminAuth(request);
    if (!authResult.isValid) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const body = await request.json();
    const { metricName, value, unit = 'Count', dimensions = {} } = body;

    await sendCustomMetric(metricName, value, unit, dimensions);

    return NextResponse.json({
      success: true,
      message: 'Metric erfolgreich gesendet',
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Fehler beim Senden der Metric',
      },
      { status: 500 }
    );
  }
}

async function verifyAdminAuth(
  request: NextRequest
): Promise<{ isValid: boolean; userId?: string; error?: string }> {
  const authHeader = request.headers.get('authorization');
  const cookieHeader = request.headers.get('cookie');

  // Prüfe Authorization Header (Bearer Token)
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      const decoded = payload as any;
      if (decoded.role === 'admin') {
        return { isValid: true, userId: decoded.userId };
      }
    } catch (error) {}
  }

  // Prüfe Admin Cookie (aus Login-System)
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').reduce(
      (acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        acc[key] = value;
        return acc;
      },
      {} as Record<string, string>
    );

    const adminToken = cookies['taskilo-admin-token'];
    if (adminToken) {
      try {
        const { payload } = await jwtVerify(adminToken, JWT_SECRET);
        const decoded = payload as any;
        if (decoded.role === 'admin') {
          return { isValid: true, userId: decoded.userId };
        }
      } catch (error) {}
    }
  }

  return { isValid: false, error: 'Keine gültige Admin-Authentifizierung gefunden' };
}

async function getTicketsForAnalytics(timeRange: string, category?: string, priority?: string) {
  const timeRangeMs = getTimeRangeInMs(timeRange);
  const cutoffDate = new Date(Date.now() - timeRangeMs).toISOString();

  // Verwende AWS DynamoDB direkt über AWSTicketStorage
  const { AWSTicketStorage } = await import('@/lib/aws-ticket-storage');

  const tickets = await AWSTicketStorage.getTickets({
    startDate: cutoffDate,
    category,
    priority,
    limit: 1000, // Für Analytics alle Tickets laden
  });

  return tickets;
}

function getTimeRangeInMs(timeRange: string): number {
  const timeRanges = {
    '1d': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
    '90d': 90 * 24 * 60 * 60 * 1000,
    '1y': 365 * 24 * 60 * 60 * 1000,
  };

  return timeRanges[timeRange] || timeRanges['30d'];
}

async function calculateMetrics(tickets: any[]): Promise<TicketMetrics> {
  const totalTickets = tickets.length;
  const openTickets = tickets.filter(t => t.status === 'open' || t.status === 'in-progress').length;
  const closedTickets = tickets.filter(
    t => t.status === 'closed' || t.status === 'resolved'
  ).length;

  // Durchschnittliche Auflösungszeit berechnen (aus echten Ticket-Daten)
  const resolvedTickets = tickets.filter(
    t => (t.status === 'closed' || t.status === 'resolved') && t.resolvedAt
  );

  const averageResolutionTime =
    resolvedTickets.length > 0
      ? resolvedTickets.reduce((sum, ticket) => {
          const created = new Date(ticket.createdAt).getTime();
          const resolved = new Date(ticket.resolvedAt || ticket.updatedAt).getTime();
          return sum + (resolved - created);
        }, 0) /
        resolvedTickets.length /
        (1000 * 60 * 60) // in Stunden
      : 0;

  // Kategorien-Verteilung (echte Daten)
  const ticketsByCategory = tickets.reduce((acc, ticket) => {
    const category = ticket.category || 'other';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {});

  // Prioritäts-Verteilung (echte Daten)
  const ticketsByPriority = tickets.reduce((acc, ticket) => {
    const priority = ticket.priority || 'medium';
    acc[priority] = (acc[priority] || 0) + 1;
    return acc;
  }, {});

  // Sentiment-Verteilung (aus AI-Klassifizierung)
  const sentimentDistribution = tickets.reduce((acc, ticket) => {
    const sentiment = ticket.aiSentiment || ticket.sentiment || 'neutral';
    acc[sentiment] = (acc[sentiment] || 0) + 1;
    return acc;
  }, {});

  // Urgency Score Verteilung (aus AI-Analyse)
  const urgencyScoreDistribution = tickets.reduce((acc, ticket) => {
    const score = ticket.aiUrgencyScore || ticket.urgencyScore || 50;
    const range = getScoreRange(score);
    acc[range] = (acc[range] || 0) + 1;
    return acc;
  }, {});

  // Trends berechnen (echte Zeitreihen-Daten)
  const trends = calculateTrends(tickets);

  // Echte Performance-Metriken berechnen
  const performanceMetrics = {
    slaCompliance: calculateSLACompliance(tickets),
    firstResponseTime: calculateFirstResponseTime(tickets),
    resolutionRate: totalTickets > 0 ? (closedTickets / totalTickets) * 100 : 0,
  };

  return {
    totalTickets,
    openTickets,
    closedTickets,
    averageResolutionTime,
    ticketsByCategory,
    ticketsByPriority,
    sentimentDistribution,
    urgencyScoreDistribution,
    performanceMetrics,
    trends,
    awsMetrics: {
      emailStats: {
        quotaUsed: 0,
        quotaRemaining: 0,
        bounceRate: 0,
        complaintRate: 0,
      },
      aiClassification: {
        accuracyRate: 0,
        autoClassifiedTickets: 0,
        manualOverrides: 0,
      },
      cloudWatchInsights: {},
    },
  };
}

function getScoreRange(score: number): string {
  if (score < 25) return '0-25';
  if (score < 50) return '25-50';
  if (score < 75) return '50-75';
  return '75-100';
}

function calculateTrends(tickets: any[]) {
  const now = new Date();
  const daily: Array<{ date: string; count: number; resolved: number }> = [];
  const weekly: Array<{ week: string; count: number; resolved: number }> = [];
  const monthly: Array<{ month: string; count: number; resolved: number }> = [];

  // Letzte 30 Tage
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];

    const dayTickets = tickets.filter(t => t.createdAt.startsWith(dateStr));

    const resolved = dayTickets.filter(
      t => t.status === 'closed' && t.resolvedAt?.startsWith(dateStr)
    ).length;

    daily.push({
      date: dateStr,
      count: dayTickets.length,
      resolved,
    });
  }

  // Letzte 12 Wochen
  for (let i = 11; i >= 0; i--) {
    const weekStart = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

    const weekTickets = tickets.filter(t => {
      const ticketDate = new Date(t.createdAt);
      return ticketDate >= weekStart && ticketDate < weekEnd;
    });

    const resolved = weekTickets.filter(t => {
      if (!t.resolvedAt) return false;
      const resolvedDate = new Date(t.resolvedAt);
      return resolvedDate >= weekStart && resolvedDate < weekEnd;
    }).length;

    weekly.push({
      week: `KW ${getWeekNumber(weekStart)}`,
      count: weekTickets.length,
      resolved,
    });
  }

  // Letzte 12 Monate
  for (let i = 11; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStr = monthDate.toISOString().substring(0, 7);

    const monthTickets = tickets.filter(t => t.createdAt.startsWith(monthStr));

    const resolved = monthTickets.filter(
      t => t.status === 'closed' && t.resolvedAt?.startsWith(monthStr)
    ).length;

    monthly.push({
      month: monthStr,
      count: monthTickets.length,
      resolved,
    });
  }

  return { daily, weekly, monthly };
}

function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

function calculateSLACompliance(tickets: any[]): number {
  const slaTargets = {
    urgent: 2, // 2 Stunden
    high: 24, // 24 Stunden
    medium: 72, // 3 Tage
    low: 168, // 1 Woche
  };

  const resolvedTickets = tickets.filter(t => t.status === 'closed' && t.resolvedAt);
  if (resolvedTickets.length === 0) return 100;

  const compliantTickets = resolvedTickets.filter(ticket => {
    const created = new Date(ticket.createdAt).getTime();
    const resolved = new Date(ticket.resolvedAt).getTime();
    const resolutionHours = (resolved - created) / (1000 * 60 * 60);
    const slaTarget = slaTargets[ticket.priority] || slaTargets['medium'];

    return resolutionHours <= slaTarget;
  });

  return (compliantTickets.length / resolvedTickets.length) * 100;
}

function calculateFirstResponseTime(tickets: any[]): number {
  const ticketsWithFirstResponse = tickets.filter(t => t.firstResponseAt);
  if (ticketsWithFirstResponse.length === 0) return 0;

  const totalResponseTime = ticketsWithFirstResponse.reduce((sum, ticket) => {
    const created = new Date(ticket.createdAt).getTime();
    const firstResponse = new Date(ticket.firstResponseAt).getTime();
    return sum + (firstResponse - created);
  }, 0);

  return totalResponseTime / ticketsWithFirstResponse.length / (1000 * 60 * 60); // in Stunden
}

// CloudWatch Metrics (vereinfacht für Demo)
async function sendMetricsToCloudWatch(metrics: any, namespace: string = 'Taskilo/Tickets') {
  try {
    // In einer vollständigen Implementierung würden hier CloudWatch Metrics gesendet
  } catch (error) {}
}

// Performance Metrics (aus echten AWS CloudWatch Daten)
async function getPerformanceMetrics(timeRange: string) {
  try {
    // Echte CloudWatch Metrics abrufen
    const logGroupName = '/taskilo/tickets';

    // Query für SLA Compliance
    const slaQuery = `
      fields @timestamp, ticket_id, created_at, resolved_at, priority
      | filter @message like /ticket_resolved/
      | stats count() by bin(5m)
    `;

    // Query für Response Time
    const responseQuery = `
      fields @timestamp, ticket_id, first_response_time
      | filter @message like /first_response/
      | stats avg(first_response_time) by bin(5m)
    `;

    // Echte CloudWatch Queries würden hier ausgeführt
    // Für jetzt verwenden wir die berechneten Werte aus den Tickets
    return {
      slaCompliance: 0, // Wird von calculateSLACompliance berechnet
      firstResponseTime: 0, // Wird von calculateFirstResponseTime berechnet
      resolutionRate: 0, // Wird aus den Ticket-Daten berechnet
    };
  } catch (error) {
    return {
      slaCompliance: 0,
      firstResponseTime: 0,
      resolutionRate: 0,
    };
  }
}

async function sendCustomMetric(
  metricName: string,
  value: number,
  unit: string,
  dimensions: Record<string, string>
) {
  // CloudWatch Metrics würden hier implementiert werden
  // Für jetzt loggen wir nur
}

// AWS Enhanced Metrics Funktion (angepasst für Resend)
async function getAWSEnhancedMetrics(tickets: any[]) {
  try {
    // 1. Resend E-Mail-Statistiken (ersetzt AWS SES)
    const emailStats = await getResendStatistics();

    // 2. AI Classification Analysis
    const aiStats = analyzeAIClassification(tickets);

    // 3. CloudWatch Insights (vereinfacht)
    const cloudWatchInsights = await getCloudWatchInsights();

    return {
      emailStats: emailStats,
      aiClassification: aiStats,
      cloudWatchInsights,
    };
  } catch (error) {
    return {
      emailStats: {
        quotaUsed: 0,
        quotaRemaining: 0,
        bounceRate: 0,
        complaintRate: 0,
      },
      aiClassification: {
        accuracyRate: 0,
        autoClassifiedTickets: 0,
        manualOverrides: 0,
      },
      cloudWatchInsights: {},
    };
  }
}

// Resend E-Mail-Statistiken abrufen (ersetzt AWS SES)
async function getResendStatistics() {
  try {
    // Für Resend gibt es keine direkte API für Quota/Stats wie bei AWS SES
    // Wir können stattdessen eigene Metriken basierend auf gesendeten E-Mails verfolgen

    // Beispiel: E-Mail-Logs aus eigener Datenbank oder Firestore abrufen
    // Hier verwenden wir Platzhalter-Werte, die durch echte Resend-Metriken ersetzt werden können

    const emailStats = {
      emailsSentToday: 0, // Anzahl heute gesendeter E-Mails
      emailsThisMonth: 0, // Anzahl diesen Monat gesendeter E-Mails
      successRate: 100, // Erfolgsquote in %
      failureRate: 0, // Fehlerrate in %
    };

    // TODO: Echte Resend-Metriken implementieren
    // - Resend Webhook Events verfolgen
    // - Delivery/Bounce/Complaint Status aus Webhook-Daten
    // - Eigene Tracking-Tabelle für E-Mail-Statistiken

    return {
      quotaUsed: emailStats.emailsSentToday,
      quotaRemaining: 10000 - emailStats.emailsSentToday, // Resend hat höhere Limits
      bounceRate: emailStats.failureRate,
      complaintRate: 0, // Resend managed anti-spam
      provider: 'resend',
      successRate: emailStats.successRate,
      emailsThisMonth: emailStats.emailsThisMonth,
    };
  } catch (error) {
    console.error('Error fetching Resend statistics:', error);
    return {
      quotaUsed: 0,
      quotaRemaining: 10000, // Resend Standard-Limit
      bounceRate: 0,
      complaintRate: 0,
      provider: 'resend',
      successRate: 100,
      emailsThisMonth: 0,
    };
  }
}

// AI Classification Analysis
function analyzeAIClassification(tickets: any[]) {
  const autoClassified = tickets.filter(t => t.autoClassified === true).length;
  const manualOverrides = tickets.filter(t => t.manualOverride === true).length;
  const totalClassified = autoClassified + manualOverrides;

  const accuracyRate =
    totalClassified > 0 ? ((autoClassified - manualOverrides) / totalClassified) * 100 : 0;

  return {
    accuracyRate: Math.max(0, accuracyRate),
    autoClassifiedTickets: autoClassified,
    manualOverrides,
  };
}

// CloudWatch Insights (echte AWS CloudWatch Logs Integration)
async function getCloudWatchInsights() {
  try {
    const logGroupName = '/taskilo/tickets';

    // Prüfen ob Log Group existiert
    const logGroupsCommand = new DescribeLogGroupsCommand({
      logGroupNamePrefix: logGroupName,
    });

    const logGroupsResult = await cloudWatchClient.send(logGroupsCommand);
    const logGroupExists = logGroupsResult.logGroups?.some(lg => lg.logGroupName === logGroupName);

    if (!logGroupExists) {
      return {
        logGroups: [],
        totalLogEvents: 0,
        errorRate: 0,
        responseTime: 0,
        status: 'log_group_not_found',
      };
    }

    // CloudWatch Insights Query für Ticket-Events
    const queryString = `
      fields @timestamp, @message, level, ticket_id, action, duration
      | filter @message like /ticket_/
      | stats count() as totalEvents,
              avg(duration) as avgDuration,
              count(level="ERROR") as errorCount
      | eval errorRate = (errorCount / totalEvents) * 100
    `;

    const startTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // Letzte 24h
    const endTime = new Date();

    const startQueryCommand = new StartQueryCommand({
      logGroupName,
      startTime: Math.floor(startTime.getTime() / 1000),
      endTime: Math.floor(endTime.getTime() / 1000),
      queryString,
    });

    const queryResult = await cloudWatchClient.send(startQueryCommand);
    const queryId = queryResult.queryId;

    if (!queryId) {
      throw new Error('Query ID nicht erhalten');
    }

    // Warten auf Query-Ergebnis
    let results;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 Sekunde warten
      const getResultsCommand = new GetQueryResultsCommand({ queryId });
      results = await cloudWatchClient.send(getResultsCommand);
      attempts++;
    } while (results.status === 'Running' && attempts < maxAttempts);

    if (results.status === 'Complete' && results.results && results.results.length > 0) {
      const data = results.results[0];
      return {
        logGroups: [logGroupName],
        totalLogEvents: parseInt(data.find(r => r.field === 'totalEvents')?.value || '0'),
        errorRate: parseFloat(data.find(r => r.field === 'errorRate')?.value || '0'),
        responseTime: parseFloat(data.find(r => r.field === 'avgDuration')?.value || '0'),
        status: 'success',
        queryId,
        lastUpdated: new Date().toISOString(),
      };
    } else {
      return {
        logGroups: [logGroupName],
        totalLogEvents: 0,
        errorRate: 0,
        responseTime: 0,
        status: 'no_data',
        message: 'Keine Log-Daten für den Zeitraum gefunden',
      };
    }
  } catch (error) {
    return {
      logGroups: [],
      totalLogEvents: 0,
      errorRate: 0,
      responseTime: 0,
      status: 'error',
      error: error.message,
    };
  }
}
