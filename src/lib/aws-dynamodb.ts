// AWS DynamoDB Client für Taskilo
// Ersetzt Firebase Firestore für bessere Performance und Skalierung

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';

// TypeScript Interfaces
export interface AdminEmail {
  id: string;
  emailId: string; // Eindeutige Email-ID
  messageId: string;
  from: string;
  to: string;
  subject: string;
  textContent?: string;
  htmlContent?: string;
  source: string;
  type: string;
  read: boolean;
  timestamp: number;
  createdAt: string;
  labels?: string[]; // Email-Labels für Kategorisierung
  raw?: any;
}

// DynamoDB Client konfigurieren
const dynamoClient = new DynamoDBClient({
  region: 'eu-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const docClient = DynamoDBDocumentClient.from(dynamoClient);

// Tabellen-Namen
export const TABLES = {
  ADMIN_EMAILS: 'taskilo-admin-emails',
  USERS: 'taskilo-users',
  ORDERS: 'taskilo-orders',
  COMPANIES: 'taskilo-companies',
  SERVICES: 'taskilo-services',
  PAYMENTS: 'taskilo-payments',
  REVIEWS: 'taskilo-reviews',
} as const;

// Admin E-Mails Service
export class AdminEmailsService {
  private tableName = TABLES.ADMIN_EMAILS;

  async createEmail(emailData: {
    id?: string;
    messageId: string;
    from: string;
    to: string;
    subject: string;
    textContent?: string;
    htmlContent?: string;
    source: string;
    type: string;
    read?: boolean;
    timestamp?: number;
    labels?: string[];
    raw?: any;
  }) {
    const id = emailData.id || `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = emailData.timestamp || Date.now();

    const item = {
      id,
      emailId: id, // Eindeutige Email-ID (gleich wie id)
      messageId: emailData.messageId,
      from: emailData.from,
      to: emailData.to,
      subject: emailData.subject,
      textContent: emailData.textContent || '',
      htmlContent: emailData.htmlContent || '',
      source: emailData.source,
      type: emailData.type,
      read: emailData.read || false,
      timestamp,
      createdAt: new Date().toISOString(),
      labels: emailData.labels || [],
      raw: emailData.raw || null,
    };

    try {
      await docClient.send(
        new PutCommand({
          TableName: this.tableName,
          Item: item,
        })
      );

      return { success: true, id, item };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Alle E-Mails abrufen (für Admin Dashboard)
   */
  async getAllEmails(): Promise<AdminEmail[]> {
    try {
      const command = new ScanCommand({
        TableName: this.tableName,
      });

      const result = await docClient.send(command);
      return (result.Items as AdminEmail[]) || [];
    } catch (error) {
      throw error;
    }
  }

  /**
   * E-Mail nach ID abrufen
   */
  async getEmailById(id: string): Promise<AdminEmail | null> {
    try {
      const command = new GetCommand({
        TableName: this.tableName,
        Key: {
          id,
        },
      });

      const result = await docClient.send(command);
      return (result.Item as AdminEmail) || null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * E-Mails nach Typ abrufen (sent, received, etc.)
   */
  async getEmailsByType(type: string): Promise<AdminEmail[]> {
    try {
      const command = new ScanCommand({
        TableName: this.tableName,
        FilterExpression: '#type = :type',
        ExpressionAttributeNames: {
          '#type': 'type',
        },
        ExpressionAttributeValues: {
          ':type': type,
        },
      });

      const result = await docClient.send(command);
      return (result.Items as AdminEmail[]) || [];
    } catch (error) {
      throw error;
    }
  }

  /**
   * E-Mail aktualisieren
   */
  async updateEmail(emailId: string, updates: Partial<AdminEmail>): Promise<void> {
    try {
      // Build update expression
      const updateExpressions: string[] = [];
      const expressionAttributeNames: Record<string, string> = {};
      const expressionAttributeValues: Record<string, any> = {};

      Object.entries(updates).forEach(([key, value], index) => {
        const attrName = `#attr${index}`;
        const attrValue = `:val${index}`;

        updateExpressions.push(`${attrName} = ${attrValue}`);
        expressionAttributeNames[attrName] = key;
        expressionAttributeValues[attrValue] = value;
      });

      const command = new UpdateCommand({
        TableName: this.tableName,
        Key: {
          id: emailId,
        },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
      });

      await docClient.send(command);
    } catch (error) {
      throw error;
    }
  }

  /**
   * E-Mails mit Filtern abrufen
   */
  async getEmails(
    options: { limit?: number; filter?: string; startKey?: any } = {}
  ): Promise<AdminEmail[]> {
    const { limit = 50, filter = 'all' } = options;

    try {
      const params: any = {
        TableName: this.tableName,
        Limit: limit,
        ScanIndexForward: false, // Neueste zuerst
      };

      if (options.startKey) {
        params.ExclusiveStartKey = options.startKey;
      }

      // Filter anwenden
      if (filter === 'unread') {
        params.FilterExpression = '#read = :readValue';
        params.ExpressionAttributeNames = { '#read': 'read' };
        params.ExpressionAttributeValues = { ':readValue': false };
      } else if (filter === 'read') {
        params.FilterExpression = '#read = :readValue';
        params.ExpressionAttributeNames = { '#read': 'read' };
        params.ExpressionAttributeValues = { ':readValue': true };
      }

      const result = await docClient.send(new ScanCommand(params));

      // Nach Timestamp sortieren (neueste zuerst)
      const sortedItems = (result.Items || []).sort(
        (a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0)
      );

      return sortedItems as AdminEmail[];
    } catch (error) {
      throw error;
    }
  }

  async markAsRead(emailId: string) {
    try {
      await docClient.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key: { id: emailId },
          UpdateExpression: 'SET #read = :readValue',
          ExpressionAttributeNames: { '#read': 'read' },
          ExpressionAttributeValues: { ':readValue': true },
        })
      );

      return { success: true };
    } catch (error) {
      throw error;
    }
  }

  async deleteEmail(emailId: string) {
    try {
      await docClient.send(
        new DeleteCommand({
          TableName: this.tableName,
          Key: { id: emailId },
        })
      );

      return { success: true };
    } catch (error) {
      throw error;
    }
  }

  async getStats() {
    try {
      const emails = await this.getEmails({ limit: 1000 });

      const stats = {
        total: emails.length,
        unread: emails.filter(email => !email.read).length,
        read: emails.filter(email => email.read).length,
        today: emails.filter(email => {
          const emailDate = new Date(email.timestamp || 0);
          const today = new Date();
          return emailDate.toDateString() === today.toDateString();
        }).length,
      };

      return { success: true, stats };
    } catch (error) {
      throw error;
    }
  }
}

// Singleton-Instance
export const adminEmailsService = new AdminEmailsService();

// DynamoDB Utilities
export class DynamoDBService {
  async healthCheck() {
    try {
      await docClient.send(
        new ScanCommand({
          TableName: TABLES.ADMIN_EMAILS,
          Limit: 1,
        })
      );
      return { success: true, message: 'DynamoDB connection healthy' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async listTables() {
    try {
      const { TableNames } = await dynamoClient.send(
        new (await import('@aws-sdk/client-dynamodb')).ListTablesCommand({})
      );
      return { success: true, tables: TableNames };
    } catch (error) {
      throw error;
    }
  }
}

export const dynamoService = new DynamoDBService();
export { docClient, dynamoClient };
