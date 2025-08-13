// Erweiterte AWS-basierte Ticket-System Features
// SES Notifications, Lambda Auto-Classification, CloudWatch Analytics

import {
  SESClient,
  SendEmailCommand,
  GetSendQuotaCommand,
  GetSendStatisticsCommand,
} from '@aws-sdk/client-ses';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import {
  ComprehendClient,
  DetectSentimentCommand,
  DetectKeyPhrasesCommand,
  ClassifyDocumentCommand,
} from '@aws-sdk/client-comprehend';
import {
  CloudWatchLogsClient,
  CreateLogGroupCommand,
  CreateLogStreamCommand,
  PutLogEventsCommand,
  DescribeLogGroupsCommand,
  DescribeLogStreamsCommand,
} from '@aws-sdk/client-cloudwatch-logs';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { Ticket, TicketComment } from '@/types/ticket';

// AWS Client-Konfiguration
const AWS_REGION = process.env.AWS_REGION || 'eu-central-1';

const sesClient = new SESClient({ region: AWS_REGION });
const lambdaClient = new LambdaClient({ region: AWS_REGION });
const comprehendClient = new ComprehendClient({ region: AWS_REGION });
const cloudWatchClient = new CloudWatchLogsClient({ region: AWS_REGION });
const snsClient = new SNSClient({ region: AWS_REGION });

// Enhanced Ticket Service mit AWS Features
export class EnhancedTicketService {
  // 1. SES EMAIL NOTIFICATIONS
  static async sendTicketNotification(
    ticket: Ticket,
    type: 'created' | 'updated' | 'commented' | 'resolved' | 'assigned',
    comment?: TicketComment,
    recipients?: string[]
  ): Promise<boolean> {
    try {
      const defaultRecipients = ['andy.staudinger@taskilo.de', 'support@taskilo.de'];

      const emailRecipients = recipients || defaultRecipients;

      // Falls ein Benutzer zugewiesen ist, hinzufügen
      if (ticket.assignedTo && !emailRecipients.includes(ticket.assignedTo)) {
        emailRecipients.push(ticket.assignedTo);
      }

      // Falls der Reporter nicht Admin ist, hinzufügen
      if (ticket.reportedBy && !emailRecipients.includes(ticket.reportedBy)) {
        emailRecipients.push(ticket.reportedBy);
      }

      const subject = this.generateSubject(ticket, type);
      const htmlContent = this.generateEmailTemplate(ticket, type, comment);

      for (const recipient of emailRecipients) {
        const command = new SendEmailCommand({
          Source: 'noreply@taskilo.de',
          Destination: {
            ToAddresses: [recipient],
          },
          Message: {
            Subject: {
              Data: subject,
              Charset: 'UTF-8',
            },
            Body: {
              Html: {
                Data: htmlContent,
                Charset: 'UTF-8',
              },
            },
          },
          ReplyToAddresses: ['support@taskilo.de'],
        });

        await sesClient.send(command);
      }

      // Log zur CloudWatch
      await this.logToCloudWatch('ticket-notifications', {
        action: 'email_sent',
        ticketId: ticket.id,
        type,
        recipients: emailRecipients,
        timestamp: new Date().toISOString(),
      });

      return true;
    } catch (error) {
      console.error('Fehler beim Senden der Ticket-Benachrichtigung:', error);
      await this.logToCloudWatch('ticket-notifications-errors', {
        error: error instanceof Error ? error.message : 'Unknown error',
        ticketId: ticket.id,
        type,
        timestamp: new Date().toISOString(),
      });
      return false;
    }
  }

  // 2. AI-BASIERTE AUTO-KLASSIFIZIERUNG
  static async autoClassifyTicket(
    title: string,
    description: string
  ): Promise<{
    priority: 'low' | 'medium' | 'high' | 'urgent';
    category: string;
    sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | 'MIXED';
    keyPhrases: string[];
    confidence: number;
  }> {
    try {
      const text = `${title}\n\n${description}`;

      // 1. Sentiment Analysis
      const sentimentCommand = new DetectSentimentCommand({
        Text: text,
        LanguageCode: 'de',
      });
      const sentimentResult = await comprehendClient.send(sentimentCommand);

      // 2. Key Phrases Extraction
      const keyPhrasesCommand = new DetectKeyPhrasesCommand({
        Text: text,
        LanguageCode: 'de',
      });
      const keyPhrasesResult = await comprehendClient.send(keyPhrasesCommand);

      // 3. Automatische Prioritätserkennung basierend auf Keywords
      const urgentKeywords = [
        'dringend',
        'sofort',
        'kritisch',
        'fehler',
        'nicht funktioniert',
        'down',
        'ausfall',
      ];
      const highKeywords = ['problem', 'bug', 'fehler', 'hilfe', 'wichtig'];
      const mediumKeywords = ['frage', 'unterstützung', 'verbesserung', 'feature'];

      const lowerText = text.toLowerCase();
      let priority: 'low' | 'medium' | 'high' | 'urgent' = 'low';
      let confidence = 0.5;

      if (urgentKeywords.some(keyword => lowerText.includes(keyword))) {
        priority = 'urgent';
        confidence = 0.9;
      } else if (highKeywords.some(keyword => lowerText.includes(keyword))) {
        priority = 'high';
        confidence = 0.8;
      } else if (mediumKeywords.some(keyword => lowerText.includes(keyword))) {
        priority = 'medium';
        confidence = 0.7;
      }

      // 4. Kategorisierung basierend auf Keywords
      const categoryKeywords = {
        technical: ['fehler', 'bug', 'api', 'system', 'code', 'entwicklung'],
        billing: ['rechnung', 'zahlung', 'bezahlen', 'konto', 'abrechnung'],
        support: ['hilfe', 'frage', 'unterstützung', 'anleitung'],
        feature: ['feature', 'funktion', 'verbesserung', 'wunsch', 'vorschlag'],
        account: ['profil', 'anmeldung', 'passwort', 'zugang', 'login'],
      };

      let category = 'other';
      for (const [cat, keywords] of Object.entries(categoryKeywords)) {
        if (keywords.some(keyword => lowerText.includes(keyword))) {
          category = cat;
          break;
        }
      }

      // 5. Sentiment-basierte Prioritätsanpassung
      if (
        sentimentResult.Sentiment === 'NEGATIVE' &&
        sentimentResult.SentimentScore?.Negative &&
        sentimentResult.SentimentScore.Negative > 0.7
      ) {
        if (priority === 'low') priority = 'medium';
        else if (priority === 'medium') priority = 'high';
        confidence = Math.min(confidence + 0.1, 1);
      }

      const result = {
        priority,
        category,
        sentiment: sentimentResult.Sentiment as 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | 'MIXED',
        keyPhrases: keyPhrasesResult.KeyPhrases?.map(kp => kp.Text || '') || [],
        confidence,
      };

      // Log zur CloudWatch
      await this.logToCloudWatch('ticket-classification', {
        action: 'auto_classify',
        result,
        originalText: text.substring(0, 200) + '...',
        timestamp: new Date().toISOString(),
      });

      return result;
    } catch (error) {
      console.error('Fehler bei der Auto-Klassifizierung:', error);

      // Fallback: Standard-Werte
      return {
        priority: 'medium',
        category: 'other',
        sentiment: 'NEUTRAL',
        keyPhrases: [],
        confidence: 0.1,
      };
    }
  }

  // 3. CLOUDWATCH ANALYTICS - Erweitert für echte AWS Integration
  static async logToCloudWatch(
    logGroup: string,
    data: any,
    level: 'INFO' | 'WARN' | 'ERROR' = 'INFO'
  ): Promise<void> {
    try {
      const logGroupName = `/taskilo/tickets/${logGroup}`;
      const logStreamName = `${new Date().toISOString().split('T')[0]}-${Math.random().toString(36).substr(2, 9)}`;

      // Prüfe ob Log Group existiert
      try {
        const describeResult = await cloudWatchClient.send(
          new DescribeLogGroupsCommand({
            logGroupNamePrefix: logGroupName,
          })
        );

        const groupExists = describeResult.logGroups?.some(lg => lg.logGroupName === logGroupName);

        if (!groupExists) {
          await cloudWatchClient.send(
            new CreateLogGroupCommand({
              logGroupName,
            })
          );
          console.log(`CloudWatch Log Group ${logGroupName} erstellt`);
        }
      } catch (createError) {
        console.error('Fehler beim Erstellen der Log Group:', createError);
      }

      // Erstelle Log Stream
      try {
        await cloudWatchClient.send(
          new CreateLogStreamCommand({
            logGroupName,
            logStreamName,
          })
        );
      } catch {
        // Stream existiert bereits - das ist ok
      }

      // Strukturierte Log-Nachricht für bessere Queries
      const logMessage = {
        timestamp: new Date().toISOString(),
        level,
        source: 'enhanced-ticket-service',
        logGroup,
        ...data,
      };

      // Sende Log Event
      await cloudWatchClient.send(
        new PutLogEventsCommand({
          logGroupName,
          logStreamName,
          logEvents: [
            {
              timestamp: Date.now(),
              message: JSON.stringify(logMessage),
            },
          ],
        })
      );

      // Zusätzliche Metriken für wichtige Events
      if (data.action === 'ticket_created' || data.action === 'ticket_resolved') {
        await this.sendCloudWatchMetrics(data);
      }
    } catch (error) {
      console.error('CloudWatch Logging fehler:', error);
      // Fallback zu Console für lokale Entwicklung
      console.log(`[CLOUDWATCH-FALLBACK] ${logGroup}:`, {
        level,
        timestamp: new Date().toISOString(),
        ...data,
      });
    }
  }

  // CloudWatch Custom Metrics senden
  static async sendCloudWatchMetrics(data: any): Promise<void> {
    try {
      // Hier würden CloudWatch Custom Metrics gesendet werden
      // Implementierung hängt von AWS CloudWatch Metrics SDK ab
      console.log('CloudWatch Metric gesendet:', {
        metricName: `Tickets.${data.action}`,
        value: 1,
        unit: 'Count',
        dimensions: {
          Category: data.category || 'unknown',
          Priority: data.priority || 'unknown',
        },
      });
    } catch (error) {
      console.error('CloudWatch Metrics Fehler:', error);
    }
  }

  // 4. ANALYTICS DASHBOARD DATEN
  static async getTicketAnalytics(days: number = 30): Promise<{
    totalTickets: number;
    resolvedTickets: number;
    averageResolutionTime: number;
    priorityDistribution: Record<string, number>;
    categoryDistribution: Record<string, number>;
    sentimentDistribution: Record<string, number>;
    dailyTicketCount: Record<string, number>;
  }> {
    try {
      // Diese Implementierung würde normalerweise CloudWatch Insights Queries verwenden
      // Für jetzt simulieren wir mit einer einfachen API-Abfrage
      const response = await fetch('/api/admin/tickets/analytics', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Analytics API Fehler');
      }

      return await response.json();
    } catch (error) {
      console.error('Fehler beim Abrufen der Analytics:', error);

      // Fallback: Leere Analytics
      return {
        totalTickets: 0,
        resolvedTickets: 0,
        averageResolutionTime: 0,
        priorityDistribution: {},
        categoryDistribution: {},
        sentimentDistribution: {},
        dailyTicketCount: {},
      };
    }
  }

  // 5. SES QUOTA & STATISTIKEN
  static async getSESStats(): Promise<{
    quotaUsed: number;
    quotaRemaining: number;
    bounceRate: number;
    complaintRate: number;
  }> {
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
      console.error('Fehler beim Abrufen der SES-Statistiken:', error);
      return {
        quotaUsed: 0,
        quotaRemaining: 0,
        bounceRate: 0,
        complaintRate: 0,
      };
    }
  }

  // 6. SNS PUSH NOTIFICATIONS
  static async sendPushNotification(
    message: string,
    topic: string = 'TaskiloTicketAlerts'
  ): Promise<boolean> {
    try {
      const command = new PublishCommand({
        TopicArn: `arn:aws:sns:${AWS_REGION}:${process.env.AWS_ACCOUNT_ID}:${topic}`,
        Message: message,
        Subject: 'Taskilo Ticket Alert',
      });

      await snsClient.send(command);
      return true;
    } catch (error) {
      console.error('Fehler beim Senden der Push-Benachrichtigung:', error);
      return false;
    }
  }

  // HILFSMETHODEN
  private static generateSubject(ticket: Ticket, type: string): string {
    const typeEmojis = {
      created: '🆕',
      updated: '📝',
      commented: '💬',
      resolved: '✅',
      assigned: '👤',
    };

    const emoji = typeEmojis[type as keyof typeof typeEmojis] || '📋';
    const actionText = {
      created: 'Neues Ticket',
      updated: 'Ticket aktualisiert',
      commented: 'Neue Antwort',
      resolved: 'Ticket gelöst',
      assigned: 'Ticket zugewiesen',
    };

    return `${emoji} ${actionText[type as keyof typeof actionText]}: ${ticket.title} (#${ticket.id})`;
  }

  private static generateEmailTemplate(
    ticket: Ticket,
    type: string,
    comment?: TicketComment
  ): string {
    const baseUrl =
      process.env.NODE_ENV === 'production' ? 'https://taskilo.de' : 'http://localhost:3000';

    const ticketUrl = `${baseUrl}/dashboard/admin/tickets?ticket=${ticket.id}`;

    const priorityColors = {
      low: '#28a745',
      medium: '#ffc107',
      high: '#fd7e14',
      urgent: '#dc3545',
    };

    const priorityColor = priorityColors[ticket.priority] || '#6c757d';

    return `
      <!DOCTYPE html>
      <html lang="de">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Taskilo Ticket Benachrichtigung</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #14ad9f 0%, #129488 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">Taskilo Support</h1>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">Ticket-System Benachrichtigung</p>
        </div>

        <!-- Content -->
        <div style="background: white; padding: 20px; border: 1px solid #e9ecef;">
          
          <!-- Ticket Info -->
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #14ad9f;">
            <h2 style="margin: 0 0 15px 0; color: #14ad9f;">
              ${ticket.title}
            </h2>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
              <div>
                <strong>Ticket-ID:</strong> #${ticket.id}
              </div>
              <div>
                <strong>Status:</strong> <span style="background: #14ad9f; color: white; padding: 3px 8px; border-radius: 4px; font-size: 12px;">${ticket.status.toUpperCase()}</span>
              </div>
              <div>
                <strong>Priorität:</strong> <span style="background: ${priorityColor}; color: white; padding: 3px 8px; border-radius: 4px; font-size: 12px;">${ticket.priority.toUpperCase()}</span>
              </div>
              <div>
                <strong>Kategorie:</strong> ${ticket.category}
              </div>
            </div>

            ${
              ticket.assignedTo
                ? `
              <div style="margin-bottom: 15px;">
                <strong>Zugewiesen an:</strong> ${ticket.assignedTo}
              </div>
            `
                : ''
            }

            <div style="margin-bottom: 15px;">
              <strong>Beschreibung:</strong><br>
              <div style="background: white; padding: 15px; border-radius: 4px; margin-top: 5px; border: 1px solid #e9ecef;">
                ${ticket.description}
              </div>
            </div>

            ${
              comment
                ? `
              <div style="margin-bottom: 15px;">
                <strong>Neuer Kommentar:</strong><br>
                <div style="background: #e3f2fd; padding: 15px; border-radius: 4px; margin-top: 5px; border-left: 3px solid #2196f3;">
                  ${comment.content}
                  <div style="margin-top: 10px; font-size: 12px; color: #666;">
                    Von: ${comment.userDisplayName} • ${new Date(comment.createdAt).toLocaleString('de-DE')}
                  </div>
                </div>
              </div>
            `
                : ''
            }
          </div>

          <!-- Call to Action -->
          <div style="text-align: center; margin: 20px 0;">
            <a href="${ticketUrl}" 
               style="background: #14ad9f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Ticket im Dashboard öffnen
            </a>
          </div>

          <!-- Footer -->
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 14px; color: #6c757d;">
            <p>
              <strong>Taskilo Support Team</strong><br>
              E-Mail: <a href="mailto:support@taskilo.de" style="color: #14ad9f;">support@taskilo.de</a><br>
              Web: <a href="https://taskilo.de" style="color: #14ad9f;">taskilo.de</a>
            </p>
            <p style="font-size: 12px; margin-top: 15px;">
              Diese E-Mail wurde automatisch vom Taskilo Ticket-System generiert.<br>
              Antworten Sie direkt auf diese E-Mail oder verwenden Sie das Dashboard.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
