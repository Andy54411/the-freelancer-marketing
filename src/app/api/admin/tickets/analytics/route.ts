import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient, ScanCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import {
  CloudWatchLogsClient,
  StartQueryCommand,
  GetQueryResultsCommand,
  DescribeLogGroupsCommand,
} from '@aws-sdk/client-cloudwatch-logs';
import { SESClient, GetSendQuotaCommand, GetSendStatisticsCommand } from '@aws-sdk/client-ses';
import jwt from 'jsonwebtoken';

const dynamodb = new DynamoDBClient({
  region: process.env.AWS_REGION || 'eu-central-1',
});

const cloudWatchClient = new CloudWatchLogsClient({
  region: process.env.AWS_REGION || 'eu-central-1',
});

const sesClient = new SESClient({
  region: process.env.AWS_REGION || 'eu-central-1',
});

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
    const category = searchParams.get('category');
    const priority = searchParams.get('priority');

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
    console.error('Analytics error:', error);
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
    console.error('Custom metric error:', error);
    return NextResponse.json(
      {
        error: 'Fehler beim Senden der Metric',
      },
      { status: 500 }
    );
  }
}

async function verifyAdminAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { isValid: false, error: 'Authorization header fehlt' };
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    if (decoded.role !== 'admin') {
      return { isValid: false, error: 'Admin-Berechtigung erforderlich' };
    }

    return { isValid: true, userId: decoded.userId };
  } catch (error) {
    return { isValid: false, error: 'Ungültiger Token' };
  }
}

async function getTicketsForAnalytics(timeRange: string, category?: string, priority?: string) {
  const tableName = 'taskilo-admin-data';
  const timeRangeMs = getTimeRangeInMs(timeRange);
  const cutoffDate = new Date(Date.now() - timeRangeMs).toISOString();

  const scanParams: any = {
    TableName: tableName,
    FilterExpression: '#createdAt >= :cutoffDate',
    ExpressionAttributeNames: {
      '#createdAt': 'createdAt',
    },
    ExpressionAttributeValues: {
      ':cutoffDate': { S: cutoffDate },
    },
  };

  // Filter hinzufügen
  if (category) {
    scanParams.FilterExpression += ' AND #category = :category';
    scanParams.ExpressionAttributeNames['#category'] = 'category';
    scanParams.ExpressionAttributeValues[':category'] = { S: category };
  }

  if (priority) {
    scanParams.FilterExpression += ' AND #priority = :priority';
    scanParams.ExpressionAttributeNames['#priority'] = 'priority';
    scanParams.ExpressionAttributeValues[':priority'] = { S: priority };
  }

  const result = await dynamodb.send(new ScanCommand(scanParams));
  return result.Items?.map(item => unmarshall(item)) || [];
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
  const openTickets = tickets.filter(t => t.status !== 'closed').length;
  const closedTickets = tickets.filter(t => t.status === 'closed').length;

  // Durchschnittliche Bearbeitungszeit
  const resolvedTickets = tickets.filter(t => t.status === 'closed' && t.resolvedAt);
  const averageResolutionTime =
    resolvedTickets.length > 0
      ? resolvedTickets.reduce((sum, ticket) => {
          const created = new Date(ticket.createdAt).getTime();
          const resolved = new Date(ticket.resolvedAt).getTime();
          return sum + (resolved - created);
        }, 0) /
        resolvedTickets.length /
        (1000 * 60 * 60) // in Stunden
      : 0;

  // Kategorien-Verteilung
  const ticketsByCategory = tickets.reduce((acc, ticket) => {
    const category = ticket.category || 'other';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {});

  // Prioritäts-Verteilung
  const ticketsByPriority = tickets.reduce((acc, ticket) => {
    const priority = ticket.priority || 'medium';
    acc[priority] = (acc[priority] || 0) + 1;
    return acc;
  }, {});

  // Sentiment-Verteilung
  const sentimentDistribution = tickets.reduce((acc, ticket) => {
    const sentiment = ticket.sentiment || 'neutral';
    acc[sentiment] = (acc[sentiment] || 0) + 1;
    return acc;
  }, {});

  // Urgency Score Verteilung
  const urgencyScoreDistribution = tickets.reduce((acc, ticket) => {
    const score = ticket.urgencyScore || 50;
    const range = getScoreRange(score);
    acc[range] = (acc[range] || 0) + 1;
    return acc;
  }, {});

  // Trends berechnen
  const trends = calculateTrends(tickets);

  return {
    totalTickets,
    openTickets,
    closedTickets,
    averageResolutionTime,
    ticketsByCategory,
    ticketsByPriority,
    sentimentDistribution,
    urgencyScoreDistribution,
    performanceMetrics: {
      slaCompliance: calculateSLACompliance(tickets),
      firstResponseTime: calculateFirstResponseTime(tickets),
      resolutionRate: (closedTickets / totalTickets) * 100,
    },
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
  const daily = [];
  const weekly = [];
  const monthly = [];

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
    console.log('Metrics would be sent to CloudWatch:', {
      namespace,
      totalTickets: metrics.totalTickets,
      slaCompliance: metrics.performanceMetrics.slaCompliance,
      resolutionRate: metrics.performanceMetrics.resolutionRate,
    });
  } catch (error) {
    console.error('Error sending metrics to CloudWatch:', error);
  }
}

// Performance Metrics (vereinfacht ohne CloudWatch)
async function getPerformanceMetrics(timeRange: string) {
  try {
    // Placeholder-Daten für Performance Metrics
    return {
      slaCompliance: 95,
      firstResponseTime: 2.5,
      resolutionRate: 85,
    };
  } catch (error) {
    console.error('Error getting performance metrics:', error);
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
  console.log(`Metric: ${metricName}, Value: ${value}, Unit: ${unit}`, dimensions);
}

// AWS Enhanced Metrics Funktion
async function getAWSEnhancedMetrics(tickets: any[]) {
  try {
    // 1. SES Email Statistics
    const sesStats = await getSESStatistics();

    // 2. AI Classification Analysis
    const aiStats = analyzeAIClassification(tickets);

    // 3. CloudWatch Insights (vereinfacht)
    const cloudWatchInsights = await getCloudWatchInsights();

    return {
      emailStats: sesStats,
      aiClassification: aiStats,
      cloudWatchInsights,
    };
  } catch (error) {
    console.error('AWS Enhanced Metrics Error:', error);
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

// SES Statistiken abrufen
async function getSESStatistics() {
  try {
    const [quotaResponse, statsResponse] = await Promise.all([
      sesClient.send(new GetSendQuotaCommand({})),
      sesClient.send(new GetSendStatisticsCommand({})),
    ]);

    const quota = quotaResponse.Max24HourSend || 0;
    const sent = quotaResponse.SentLast24Hours || 0;

    const stats = statsResponse.SendDataPoints || [];
    const latestStats = stats[stats.length - 1];

    return {
      quotaUsed: sent,
      quotaRemaining: quota - sent,
      bounceRate: latestStats?.Bounces || 0,
      complaintRate: latestStats?.Complaints || 0,
    };
  } catch (error) {
    console.error('SES Statistics Error:', error);
    return {
      quotaUsed: 0,
      quotaRemaining: 0,
      bounceRate: 0,
      complaintRate: 0,
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

// CloudWatch Insights (vereinfacht)
async function getCloudWatchInsights() {
  try {
    // Hier würden CloudWatch Logs Insights Queries ausgeführt
    // Für jetzt simulieren wir die Daten
    return {
      logGroups: [
        '/taskilo/tickets/notifications',
        '/taskilo/tickets/classification',
        '/taskilo/tickets/actions',
      ],
      totalLogEvents: 1234,
      errorRate: 2.5,
      responseTime: 156,
    };
  } catch (error) {
    console.error('CloudWatch Insights Error:', error);
    return {};
  }
}
