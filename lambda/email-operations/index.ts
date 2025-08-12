/**
 * AWS Lambda Email Operations Function
 * Handles all email management operations for Taskilo
 * Replaces Firebase Firestore with AWS DynamoDB
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  QueryCommand,
  ScanCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';
import { SESClient, SendEmailCommand, SendRawEmailCommand } from '@aws-sdk/client-ses';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

// AWS Clients
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'eu-central-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const sesClient = new SESClient({ region: process.env.AWS_REGION || 'eu-central-1' });
const snsClient = new SNSClient({ region: process.env.AWS_REGION || 'eu-central-1' });

// DynamoDB Table Names
const ADMIN_EMAILS_TABLE = process.env.ADMIN_EMAILS_TABLE || 'TaskiloAdminEmails';
const EMAIL_TEMPLATES_TABLE = process.env.EMAIL_TEMPLATES_TABLE || 'TaskiloEmailTemplates';
const EMAIL_CONTACTS_TABLE = process.env.EMAIL_CONTACTS_TABLE || 'TaskiloEmailContacts';
const SENT_EMAILS_TABLE = process.env.SENT_EMAILS_TABLE || 'TaskiloSentEmails';

// Interface Definitions
interface AdminEmail {
  emailId: string;
  messageId: string;
  from: string;
  to: string[] | string;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  subject: string;
  htmlContent?: string;
  textContent?: string;
  receivedAt: string;
  isRead: boolean;
  isStarred: boolean;
  isArchived: boolean;
  labels: string[];
  priority: 'low' | 'normal' | 'high' | 'urgent';
  headers: Record<string, string>;
  source: string;
  preview?: string;
  spamScore: number;
  isSpam: boolean;
  metadata: {
    resendId?: string;
    webhookReceivedAt: string;
    source: string;
  };
}

interface EmailTemplate {
  templateId: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  category?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface EmailContact {
  contactId: string;
  email: string;
  name: string;
  tags: string[];
  status: 'active' | 'bounced' | 'unsubscribed';
  createdAt: string;
  lastEmailSent?: string;
}

interface SentEmail {
  emailId: string;
  messageId: string;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  htmlContent: string;
  textContent?: string;
  templateId?: string;
  status: 'sent' | 'delivered' | 'bounced' | 'failed';
  sentAt: string;
  deliveredAt?: string;
  bounceReason?: string;
  metadata: Record<string, any>;
}

// Helper Functions
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

const createResponse = (statusCode: number, body: any): APIGatewayProxyResult => ({
  statusCode,
  headers: corsHeaders,
  body: JSON.stringify(body),
});

// Main Lambda Handler
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Lambda Email Operations - Event:', JSON.stringify(event, null, 2));

  try {
    const method = event.httpMethod;
    const path = event.path;
    const pathParams = event.pathParameters || {};
    const queryParams = event.queryStringParameters || {};
    const body = event.body ? JSON.parse(event.body) : {};

    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return createResponse(200, { message: 'CORS preflight' });
    }

    // Route handling
    if (path.includes('/admin/emails/inbox')) {
      return await handleInboxOperations(method, pathParams, queryParams, body);
    } else if (path.includes('/admin/emails/templates')) {
      return await handleTemplateOperations(method, pathParams, queryParams, body);
    } else if (path.includes('/admin/emails/contacts')) {
      return await handleContactOperations(method, pathParams, queryParams, body);
    } else if (path.includes('/admin/emails/send')) {
      return await handleEmailSending(method, body);
    } else if (path.includes('/admin/emails/stats')) {
      return await handleEmailStats(method, queryParams);
    }

    return createResponse(404, { success: false, error: 'Route not found' });
  } catch (error) {
    console.error('Lambda Email Operations Error:', error);
    return createResponse(500, {
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Inbox Operations
async function handleInboxOperations(method: string, pathParams: any, queryParams: any, body: any) {
  try {
    switch (method) {
      case 'GET':
        if (pathParams.id) {
          // Get single email
          const result = await docClient.send(
            new QueryCommand({
              TableName: ADMIN_EMAILS_TABLE,
              KeyConditionExpression: 'emailId = :emailId',
              ExpressionAttributeValues: {
                ':emailId': pathParams.id,
              },
            })
          );

          if (result.Items && result.Items.length > 0) {
            return createResponse(200, {
              success: true,
              data: result.Items[0],
            });
          } else {
            return createResponse(404, {
              success: false,
              error: 'Email not found',
            });
          }
        } else {
          // Get inbox emails with filters
          const filter = queryParams.filter || 'all';
          let filterExpression = '';
          const expressionAttributeValues: any = {};

          if (filter === 'unread') {
            filterExpression = 'isRead = :isRead';
            expressionAttributeValues[':isRead'] = false;
          } else if (filter === 'starred') {
            filterExpression = 'contains(labels, :label)';
            expressionAttributeValues[':label'] = 'starred';
          } else if (filter === 'spam') {
            filterExpression = 'isSpam = :isSpam';
            expressionAttributeValues[':isSpam'] = true;
          }

          const params: any = {
            TableName: ADMIN_EMAILS_TABLE,
            ScanFilter: filterExpression
              ? {
                  FilterExpression: filterExpression,
                  ExpressionAttributeValues: expressionAttributeValues,
                }
              : undefined,
            Limit: 50, // Pagination
          };

          const result = await docClient.send(new ScanCommand(params));
          const emails = result.Items || [];

          // Calculate stats
          const stats = {
            total: emails.length,
            unread: emails.filter(email => !email.isRead).length,
            starred: emails.filter(email => email.labels?.includes('starred')).length,
            spam: emails.filter(email => email.isSpam).length,
          };

          return createResponse(200, {
            success: true,
            data: {
              emails: emails.sort(
                (a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
              ),
              stats,
            },
          });
        }

      case 'PATCH':
        // Update email(s) - mark as read, star, archive, etc.
        const { emailIds, action } = body;

        if (!emailIds || !Array.isArray(emailIds) || !action) {
          return createResponse(400, {
            success: false,
            error: 'emailIds array and action are required',
          });
        }

        const updates: any = {};

        switch (action) {
          case 'markAsRead':
            updates.isRead = true;
            break;
          case 'markAsUnread':
            updates.isRead = false;
            break;
          case 'star':
            updates.labels = ['starred'];
            updates.isStarred = true;
            break;
          case 'unstar':
            updates.labels = [];
            updates.isStarred = false;
            break;
          case 'archive':
            updates.isArchived = true;
            break;
          case 'unarchive':
            updates.isArchived = false;
            break;
          default:
            return createResponse(400, {
              success: false,
              error: 'Invalid action',
            });
        }

        // Update all specified emails
        for (const emailId of emailIds) {
          await docClient.send(
            new UpdateCommand({
              TableName: ADMIN_EMAILS_TABLE,
              Key: { emailId },
              UpdateExpression: Object.keys(updates)
                .map(key => `SET ${key} = :${key}`)
                .join(', '),
              ExpressionAttributeValues: Object.fromEntries(
                Object.entries(updates).map(([key, value]) => [`:${key}`, value])
              ),
            })
          );
        }

        return createResponse(200, {
          success: true,
          message: `Successfully updated ${emailIds.length} email(s)`,
        });

      case 'DELETE':
        // Delete email(s)
        const { emailIds: deleteIds } = body;

        if (!deleteIds || !Array.isArray(deleteIds)) {
          return createResponse(400, {
            success: false,
            error: 'emailIds array is required',
          });
        }

        for (const emailId of deleteIds) {
          await docClient.send(
            new DeleteCommand({
              TableName: ADMIN_EMAILS_TABLE,
              Key: { emailId },
            })
          );
        }

        return createResponse(200, {
          success: true,
          message: `Successfully deleted ${deleteIds.length} email(s)`,
        });

      default:
        return createResponse(405, {
          success: false,
          error: 'Method not allowed',
        });
    }
  } catch (error) {
    console.error('Inbox operations error:', error);
    return createResponse(500, {
      success: false,
      error: 'Failed to process inbox operation',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// Template Operations
async function handleTemplateOperations(
  method: string,
  pathParams: any,
  queryParams: any,
  body: any
) {
  try {
    switch (method) {
      case 'GET':
        if (pathParams.id) {
          // Get single template
          const result = await docClient.send(
            new QueryCommand({
              TableName: EMAIL_TEMPLATES_TABLE,
              KeyConditionExpression: 'templateId = :templateId',
              ExpressionAttributeValues: {
                ':templateId': pathParams.id,
              },
            })
          );

          if (result.Items && result.Items.length > 0) {
            return createResponse(200, {
              success: true,
              data: result.Items[0],
            });
          } else {
            return createResponse(404, {
              success: false,
              error: 'Template not found',
            });
          }
        } else {
          // Get all templates
          const result = await docClient.send(
            new ScanCommand({
              TableName: EMAIL_TEMPLATES_TABLE,
              FilterExpression: 'isActive = :isActive',
              ExpressionAttributeValues: {
                ':isActive': true,
              },
            })
          );

          return createResponse(200, {
            success: true,
            data: result.Items || [],
          });
        }

      case 'POST':
        // Create new template
        const templateId = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date().toISOString();

        const newTemplate: EmailTemplate = {
          templateId,
          name: body.name,
          subject: body.subject,
          htmlContent: body.htmlContent,
          textContent: body.textContent || '',
          category: body.category || 'general',
          isActive: true,
          createdAt: now,
          updatedAt: now,
        };

        await docClient.send(
          new PutCommand({
            TableName: EMAIL_TEMPLATES_TABLE,
            Item: newTemplate,
          })
        );

        return createResponse(201, {
          success: true,
          data: newTemplate,
        });

      case 'PUT':
        // Update template
        if (!pathParams.id) {
          return createResponse(400, {
            success: false,
            error: 'Template ID is required',
          });
        }

        const updateData = {
          ...body,
          updatedAt: new Date().toISOString(),
        };

        await docClient.send(
          new UpdateCommand({
            TableName: EMAIL_TEMPLATES_TABLE,
            Key: { templateId: pathParams.id },
            UpdateExpression: Object.keys(updateData)
              .map(key => `SET ${key} = :${key}`)
              .join(', '),
            ExpressionAttributeValues: Object.fromEntries(
              Object.entries(updateData).map(([key, value]) => [`:${key}`, value])
            ),
          })
        );

        return createResponse(200, {
          success: true,
          message: 'Template updated successfully',
        });

      case 'DELETE':
        // Delete template (soft delete by setting isActive = false)
        if (!pathParams.id) {
          return createResponse(400, {
            success: false,
            error: 'Template ID is required',
          });
        }

        await docClient.send(
          new UpdateCommand({
            TableName: EMAIL_TEMPLATES_TABLE,
            Key: { templateId: pathParams.id },
            UpdateExpression: 'SET isActive = :isActive, updatedAt = :updatedAt',
            ExpressionAttributeValues: {
              ':isActive': false,
              ':updatedAt': new Date().toISOString(),
            },
          })
        );

        return createResponse(200, {
          success: true,
          message: 'Template deleted successfully',
        });

      default:
        return createResponse(405, {
          success: false,
          error: 'Method not allowed',
        });
    }
  } catch (error) {
    console.error('Template operations error:', error);
    return createResponse(500, {
      success: false,
      error: 'Failed to process template operation',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// Contact Operations
async function handleContactOperations(
  method: string,
  pathParams: any,
  queryParams: any,
  body: any
) {
  try {
    switch (method) {
      case 'GET':
        // Get all contacts
        const result = await docClient.send(
          new ScanCommand({
            TableName: EMAIL_CONTACTS_TABLE,
            FilterExpression: '#status <> :unsubscribed',
            ExpressionAttributeNames: {
              '#status': 'status',
            },
            ExpressionAttributeValues: {
              ':unsubscribed': 'unsubscribed',
            },
          })
        );

        return createResponse(200, {
          success: true,
          data: result.Items || [],
        });

      case 'POST':
        // Create new contact
        const contactId = `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date().toISOString();

        const newContact: EmailContact = {
          contactId,
          email: body.email,
          name: body.name,
          tags: body.tags || [],
          status: 'active',
          createdAt: now,
        };

        await docClient.send(
          new PutCommand({
            TableName: EMAIL_CONTACTS_TABLE,
            Item: newContact,
          })
        );

        return createResponse(201, {
          success: true,
          data: newContact,
        });

      case 'PUT':
        // Update contact
        if (!pathParams.id) {
          return createResponse(400, {
            success: false,
            error: 'Contact ID is required',
          });
        }

        await docClient.send(
          new UpdateCommand({
            TableName: EMAIL_CONTACTS_TABLE,
            Key: { contactId: pathParams.id },
            UpdateExpression: Object.keys(body)
              .map(key => `SET ${key} = :${key}`)
              .join(', '),
            ExpressionAttributeValues: Object.fromEntries(
              Object.entries(body).map(([key, value]) => [`:${key}`, value])
            ),
          })
        );

        return createResponse(200, {
          success: true,
          message: 'Contact updated successfully',
        });

      case 'DELETE':
        // Delete contact
        if (!pathParams.id) {
          return createResponse(400, {
            success: false,
            error: 'Contact ID is required',
          });
        }

        await docClient.send(
          new DeleteCommand({
            TableName: EMAIL_CONTACTS_TABLE,
            Key: { contactId: pathParams.id },
          })
        );

        return createResponse(200, {
          success: true,
          message: 'Contact deleted successfully',
        });

      default:
        return createResponse(405, {
          success: false,
          error: 'Method not allowed',
        });
    }
  } catch (error) {
    console.error('Contact operations error:', error);
    return createResponse(500, {
      success: false,
      error: 'Failed to process contact operation',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// Email Sending
async function handleEmailSending(method: string, body: any) {
  try {
    if (method !== 'POST') {
      return createResponse(405, {
        success: false,
        error: 'Method not allowed',
      });
    }

    const { to, cc, bcc, subject, htmlContent, textContent, templateId } = body;

    if (!to || !subject || (!htmlContent && !textContent)) {
      return createResponse(400, {
        success: false,
        error: 'Missing required fields: to, subject, and content',
      });
    }

    // Prepare email parameters
    const emailParams = {
      Source: process.env.FROM_EMAIL || 'noreply@taskilo.de',
      Destination: {
        ToAddresses: Array.isArray(to) ? to : [to],
        CcAddresses: cc ? (Array.isArray(cc) ? cc : [cc]) : undefined,
        BccAddresses: bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : undefined,
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: 'UTF-8',
        },
        Body: {
          Html: htmlContent
            ? {
                Data: htmlContent,
                Charset: 'UTF-8',
              }
            : undefined,
          Text: textContent
            ? {
                Data: textContent,
                Charset: 'UTF-8',
              }
            : undefined,
        },
      },
    };

    // Send email via SES
    const result = await sesClient.send(new SendEmailCommand(emailParams));

    // Store sent email in DynamoDB
    const emailId = `sent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const sentEmail: SentEmail = {
      emailId,
      messageId: result.MessageId || '',
      from: emailParams.Source,
      to: emailParams.Destination.ToAddresses || [],
      cc: emailParams.Destination.CcAddresses,
      bcc: emailParams.Destination.BccAddresses,
      subject,
      htmlContent: htmlContent || '',
      textContent: textContent || '',
      templateId: templateId || undefined,
      status: 'sent',
      sentAt: new Date().toISOString(),
      metadata: {
        sesMessageId: result.MessageId,
        sesRequestId: result.$metadata.requestId,
      },
    };

    await docClient.send(
      new PutCommand({
        TableName: SENT_EMAILS_TABLE,
        Item: sentEmail,
      })
    );

    return createResponse(200, {
      success: true,
      data: {
        messageId: result.MessageId,
        emailId: sentEmail.emailId,
      },
    });
  } catch (error) {
    console.error('Email sending error:', error);
    return createResponse(500, {
      success: false,
      error: 'Failed to send email',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// Email Statistics
async function handleEmailStats(method: string, queryParams: any) {
  try {
    if (method !== 'GET') {
      return createResponse(405, {
        success: false,
        error: 'Method not allowed',
      });
    }

    // Get sent emails for statistics
    const sentResult = await docClient.send(
      new ScanCommand({
        TableName: SENT_EMAILS_TABLE,
      })
    );

    const sentEmails = sentResult.Items || [];

    const stats = {
      totalSent: sentEmails.length,
      totalDelivered: sentEmails.filter(email => email.status === 'delivered').length,
      totalBounced: sentEmails.filter(email => email.status === 'bounced').length,
      totalComplaints: 0, // TODO: Implement complaint tracking
      deliveryRate:
        sentEmails.length > 0
          ? (sentEmails.filter(email => email.status === 'delivered').length / sentEmails.length) *
            100
          : 0,
    };

    return createResponse(200, {
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Email stats error:', error);
    return createResponse(500, {
      success: false,
      error: 'Failed to get email statistics',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
