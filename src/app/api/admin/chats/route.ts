// Admin Chat Monitoring API Route
// Stellt Chat-Daten aus AWS DynamoDB für Admin Dashboard bereit

import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
  PutCommand,
} from '@aws-sdk/lib-dynamodb';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { unmarshall } from '@aws-sdk/util-dynamodb';

const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'eu-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const lambdaClient = new LambdaClient({
  region: process.env.AWS_REGION || 'eu-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const docClient = DynamoDBDocumentClient.from(dynamoClient);

// DynamoDB Table Names
const TABLES = {
  CHAT_STATS: 'TaskiloChatStats',
  CHAT_MESSAGES: 'TaskiloChatMessages',
  CHAT_PARTICIPANTS: 'TaskiloChatParticipants',
  SENSITIVE_DATA_ALERTS: 'TaskiloSensitiveDataAlerts',
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'overview';
    const chatType = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');

    switch (action) {
      case 'overview':
        return await getChatOverview();
      case 'stats':
        return await getChatStatistics();
      case 'list':
        return await getChatList({
          type: chatType || undefined,
          limit,
          status: status || undefined,
        });
      case 'messages':
        const chatId = searchParams.get('chatId');
        const messageLimit = parseInt(searchParams.get('messageLimit') || '50');

        if (!chatId) {
          return NextResponse.json(
            { error: 'chatId parameter is required for messages action' },
            { status: 400 }
          );
        }

        const messagesData = await getChatMessages(chatId, chatType || 'all', messageLimit);
        return NextResponse.json(messagesData);
      case 'sensitive-data-alerts':
        return await getSensitiveDataAlerts({
          chatId: searchParams.get('chatId') || undefined,
          severity: searchParams.get('severity') || undefined,
          reviewed:
            searchParams.get('reviewed') === 'true'
              ? true
              : searchParams.get('reviewed') === 'false'
                ? false
                : undefined,
          limit: parseInt(searchParams.get('limit') || '100'),
        });
      case 'search':
        const query = searchParams.get('q');
        return await searchChats(query || '');
      default:
        return await getChatOverview();
    }
  } catch (error) {
    console.error('Admin Chat API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat data', details: error.message },
      { status: 500 }
    );
  }
}

async function getChatOverview() {
  try {
    // Get general statistics
    const statsResult = await docClient.send(
      new GetCommand({
        TableName: TABLES.CHAT_STATS,
        Key: { id: 'global-chat-stats' },
      })
    );

    // Get recent chats across all types
    const recentChatsResult = await docClient.send(
      new ScanCommand({
        TableName: TABLES.CHAT_MESSAGES,
        FilterExpression: 'isActive = :active',
        ExpressionAttributeValues: {
          ':active': { BOOL: true },
        },
        Limit: 10,
      })
    );

    const recentChats = recentChatsResult.Items?.map(item => unmarshall(item)) || [];

    const overview = {
      statistics: statsResult.Item || {
        totalChats: 0,
        totalDirectChats: 0,
        totalSupportChats: 0,
        activeChats: 0,
        totalMessages: 0,
      },
      recentChats: recentChats.sort(
        (a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
      ),
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(overview);
  } catch (error) {
    console.error('Error getting chat overview:', error);
    throw error;
  }
}

// GET Chat Messages - Neue Route für detaillierte Chat-Nachrichten
async function getChatMessages(chatId: string, chatType: string = 'all', limit: number = 50) {
  try {
    console.log(`Fetching messages for chatId: ${chatId}, type: ${chatType}`);

    // First, try to get the chat document directly
    const chatResult = await docClient.send(
      new GetCommand({
        TableName: TABLES.CHAT_MESSAGES,
        Key: { id: chatId },
      })
    );

    console.log('Direct chat lookup result:', chatResult.Item);

    // If not found, try scanning with filter
    if (!chatResult.Item) {
      console.log('Chat not found, scanning with filter...');

      const scanResult = await docClient.send(
        new ScanCommand({
          TableName: TABLES.CHAT_MESSAGES,
          FilterExpression: 'id = :chatId OR chatId = :chatId',
          ExpressionAttributeValues: {
            ':chatId': { S: chatId },
          },
          Limit: limit,
        })
      );

      console.log('Scan result:', scanResult.Items);

      if (scanResult.Items && scanResult.Items.length > 0) {
        const chatData = unmarshall(scanResult.Items[0]);
        console.log('Found chat data:', chatData);

        // Extract messages from the chat document
        const messages = Array.isArray(chatData.messages) ? chatData.messages : [];
        console.log('Extracted messages:', messages);

        return {
          chatId,
          chatType,
          messageCount: messages.length,
          messages: messages.map((msg: any) => ({
            messageId: msg.messageId || msg.id,
            senderId: msg.senderId || msg.userId,
            senderName: msg.senderName || msg.userName,
            senderType: msg.senderType || 'user',
            content: msg.content || msg.text || msg.message,
            text: msg.text || msg.content || msg.message,
            type: msg.type || 'text',
            timestamp: msg.timestamp || msg.createdAt || msg.sentAt,
            createdAt: msg.createdAt || msg.timestamp || msg.sentAt,
            updatedAt: msg.updatedAt,
            isRead: msg.isRead,
            metadata: msg.metadata,
          })),
          retrievedAt: new Date().toISOString(),
        };
      }
    } else {
      // Chat found directly
      const chatData = chatResult.Item;
      console.log('Found chat data directly:', chatData);

      const messages = Array.isArray(chatData.messages) ? chatData.messages : [];
      console.log('Extracted messages:', messages);

      return {
        chatId,
        chatType,
        messageCount: messages.length,
        messages: messages.map((msg: any) => ({
          messageId: msg.messageId || msg.id,
          senderId: msg.senderId || msg.userId,
          senderName: msg.senderName || msg.userName,
          senderType: msg.senderType || 'user',
          content: msg.content || msg.text || msg.message,
          text: msg.text || msg.content || msg.message,
          type: msg.type || 'text',
          timestamp: msg.timestamp || msg.createdAt || msg.sentAt,
          createdAt: msg.createdAt || msg.timestamp || msg.sentAt,
          updatedAt: msg.updatedAt,
          isRead: msg.isRead,
          metadata: msg.metadata,
        })),
        retrievedAt: new Date().toISOString(),
      };
    }

    // No messages found
    console.log('No messages found for chatId:', chatId);
    return {
      chatId,
      chatType,
      messageCount: 0,
      messages: [],
      retrievedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error getting chat messages:', error);
    throw error;
  }
}

async function getChatStatistics() {
  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLES.CHAT_STATS,
        Key: { id: 'global-chat-stats' },
      })
    );

    const stats = result.Item || {};

    // Get additional analytics
    const allChatsResult = await docClient.send(
      new ScanCommand({
        TableName: TABLES.CHAT_MESSAGES,
      })
    );

    const allChats = allChatsResult.Items?.map(item => unmarshall(item)) || [];

    // Calculate additional metrics
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const analytics = {
      ...stats,
      chatsByType: {
        chat: allChats.filter(c => c.type === 'chat').length,
        directChat: allChats.filter(c => c.type === 'directChat').length,
        supportChat: allChats.filter(c => c.type === 'supportChat').length,
      },
      activityTrends: {
        today: allChats.filter(c => new Date(c.lastActivity) >= today).length,
        thisWeek: allChats.filter(c => new Date(c.lastActivity) >= weekAgo).length,
        total: allChats.length,
      },
      supportMetrics: {
        open: allChats.filter(c => c.type === 'supportChat' && c.status === 'open').length,
        inProgress: allChats.filter(c => c.type === 'supportChat' && c.status === 'in-progress')
          .length,
        resolved: allChats.filter(c => c.type === 'supportChat' && c.status === 'resolved').length,
        highPriority: allChats.filter(c => c.type === 'supportChat' && c.priority === 'high')
          .length,
      },
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Error getting chat statistics:', error);
    throw error;
  }
}

async function getChatList(options: { type?: string; limit: number; status?: string }) {
  try {
    let filterExpression = '';
    const expressionAttributeValues: any = {};

    // Build filter expression
    const filters: string[] = [];

    if (options.type) {
      filters.push('#type = :type');
      expressionAttributeValues[':type'] = { S: options.type };
    }

    if (options.status) {
      filters.push('#status = :status');
      expressionAttributeValues[':status'] = { S: options.status };
    }

    if (filters.length > 0) {
      filterExpression = filters.join(' AND ');
    }

    const scanParams: any = {
      TableName: TABLES.CHAT_MESSAGES,
      Limit: options.limit,
    };

    if (filterExpression) {
      scanParams.FilterExpression = filterExpression;
      scanParams.ExpressionAttributeValues = expressionAttributeValues;

      if (options.type) {
        scanParams.ExpressionAttributeNames = { '#type': 'type' };
      }
      if (options.status) {
        scanParams.ExpressionAttributeNames = {
          ...scanParams.ExpressionAttributeNames,
          '#status': 'status',
        };
      }
    }

    const result = await docClient.send(new ScanCommand(scanParams));
    const chats = result.Items?.map(item => unmarshall(item)) || [];

    // Sort by last activity
    chats.sort(
      (a, b) => new Date(b.lastActivity || 0).getTime() - new Date(a.lastActivity || 0).getTime()
    );

    return NextResponse.json({
      chats,
      total: chats.length,
      hasMore: result.LastEvaluatedKey !== undefined,
      lastEvaluatedKey: result.LastEvaluatedKey,
    });
  } catch (error) {
    console.error('Error getting chat list:', error);
    throw error;
  }
}

async function searchChats(query: string) {
  try {
    if (!query || query.length < 2) {
      return NextResponse.json({ chats: [], total: 0 });
    }

    // Scan for chats that match the query in title or participants
    const result = await docClient.send(
      new ScanCommand({
        TableName: TABLES.CHAT_MESSAGES,
        FilterExpression: 'contains(title, :query) OR contains(participants, :query)',
        ExpressionAttributeValues: {
          ':query': { S: query },
        },
        Limit: 50,
      })
    );

    const chats = result.Items?.map(item => unmarshall(item)) || [];

    // Sort by relevance (exact matches first, then partial matches)
    chats.sort((a, b) => {
      const aExact = a.title?.toLowerCase().includes(query.toLowerCase()) ? 1 : 0;
      const bExact = b.title?.toLowerCase().includes(query.toLowerCase()) ? 1 : 0;

      if (aExact !== bExact) return bExact - aExact;

      return new Date(b.lastActivity || 0).getTime() - new Date(a.lastActivity || 0).getTime();
    });

    return NextResponse.json({
      chats,
      total: chats.length,
      query,
    });
  } catch (error) {
    console.error('Error searching chats:', error);
    throw error;
  }
}

// POST endpoint for chat operations (optional)
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Handle URL parameter actions first
    if (action === 'aggregate') {
      return await triggerChatAggregation();
    }

    // If no URL action, try to parse JSON body
    const contentType = request.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const { action: bodyAction, chatId, data } = await request.json();

      switch (bodyAction) {
        case 'update-status':
          return await updateChatStatus(chatId, data.status);
        case 'add-note':
          return await addAdminNote(chatId, data.note);
        case 'trigger-aggregation':
          return await triggerChatAggregation();
        default:
          return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
      }
    }

    return NextResponse.json({ error: 'No action specified' }, { status: 400 });
  } catch (error) {
    console.error('Admin Chat POST Error:', error);
    return NextResponse.json(
      { error: 'Failed to process request', details: error.message },
      { status: 500 }
    );
  }
}

async function updateChatStatus(chatId: string, status: string) {
  // Update chat status in DynamoDB
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLES.CHAT_MESSAGES,
      Key: { id: chatId },
    })
  );

  if (!result.Item) {
    return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
  }

  // Update status and timestamp
  const updatedChat = {
    ...result.Item,
    status,
    updatedAt: new Date().toISOString(),
    adminLastUpdate: new Date().toISOString(),
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLES.CHAT_MESSAGES,
      Item: updatedChat,
    })
  );

  return NextResponse.json({ success: true, chat: updatedChat });
}

async function addAdminNote(chatId: string, note: string) {
  // Add admin note to chat
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLES.CHAT_MESSAGES,
      Key: { id: chatId },
    })
  );

  if (!result.Item) {
    return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
  }

  const updatedChat = {
    ...result.Item,
    adminNotes: [
      ...(result.Item.adminNotes || []),
      {
        note,
        timestamp: new Date().toISOString(),
        adminId: 'admin', // TODO: Get from session
      },
    ],
    updatedAt: new Date().toISOString(),
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLES.CHAT_MESSAGES,
      Item: updatedChat,
    })
  );

  return NextResponse.json({ success: true, chat: updatedChat });
}

async function triggerChatAggregation() {
  // Trigger Lambda function to refresh chat data
  try {
    const payload = {
      source: 'admin-dashboard',
      timestamp: new Date().toISOString(),
    };

    const command = new InvokeCommand({
      FunctionName: 'taskilo-chat-aggregator',
      InvocationType: 'Event', // Async invocation
      Payload: JSON.stringify(payload),
    });

    console.log('Invoking Lambda function: taskilo-chat-aggregator');
    const result = await lambdaClient.send(command);

    console.log('Lambda invocation result:', result);

    return NextResponse.json({
      success: true,
      message: 'Chat aggregation triggered successfully',
      statusCode: result.StatusCode,
    });
  } catch (error) {
    console.error('Lambda invocation error:', error);
    return NextResponse.json(
      {
        error: 'Failed to trigger aggregation',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// Sensible Daten Alerts abrufen
async function getSensitiveDataAlerts(options: {
  chatId?: string;
  severity?: string;
  reviewed?: boolean;
  limit?: number;
}) {
  try {
    const { chatId, severity, reviewed, limit = 100 } = options;

    // Erst ohne Filter scannen, dann in JavaScript filtern
    const scanParams = {
      TableName: TABLES.SENSITIVE_DATA_ALERTS,
      Limit: limit,
    };

    const result = await dynamoClient.send(new ScanCommand(scanParams));
    let alerts = result.Items?.map(item => unmarshall(item)) || [];

    // Filter in JavaScript anwenden
    if (chatId) {
      alerts = alerts.filter(alert => alert.chatId === chatId);
    }

    if (severity) {
      alerts = alerts.filter(alert => alert.severity === severity);
    }

    if (reviewed !== undefined) {
      alerts = alerts.filter(alert => alert.reviewed === reviewed);
    }

    // Sortiere nach Timestamp (neueste zuerst)
    alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Gruppiere nach Severity für Statistiken
    const alertStats = {
      total: alerts.length,
      bySeverity: {
        high: alerts.filter(a => a.severity === 'high').length,
        medium: alerts.filter(a => a.severity === 'medium').length,
        low: alerts.filter(a => a.severity === 'low').length,
      },
      byType: {} as Record<string, number>,
      byStatus: {
        reviewed: alerts.filter(a => a.reviewed).length,
        unreviewed: alerts.filter(a => !a.reviewed).length,
        falsePositive: alerts.filter(a => a.falsePositive).length,
      },
      recentAlerts: alerts.filter(a => {
        const alertTime = new Date(a.timestamp).getTime();
        const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
        return alertTime > dayAgo;
      }).length,
    };

    // Zähle Typen sicher
    for (const alert of alerts) {
      if (alert && alert.dataType) {
        alertStats.byType[alert.dataType] = (alertStats.byType[alert.dataType] || 0) + 1;
      }
    }

    return NextResponse.json({
      alerts,
      statistics: alertStats,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching sensitive data alerts:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch sensitive data alerts',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
