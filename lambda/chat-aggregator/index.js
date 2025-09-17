// AWS Lambda Function für Chat Data Aggregation
// Sammelt Firebase Chat-Daten und speichert sie in DynamoDB für Admin-System

// AWS Lambda bereits hat Umgebungsvariablen - kein dotenv nötig
// require('dotenv').config();

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  PutCommand,
  UpdateCommand,
  ScanCommand,
  DeleteCommand,
} = require('@aws-sdk/lib-dynamodb');
const { EventBridgeClient, PutEventsCommand } = require('@aws-sdk/client-eventbridge');
const admin = require('firebase-admin');

// AWS Clients
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'eu-central-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: {
    convertEmptyValues: false,
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  },
  unmarshallOptions: {
    wrapNumbers: false,
  },
});
const eventBridge = new EventBridgeClient({ region: process.env.AWS_REGION || 'eu-central-1' });

// DynamoDB Table Names
const TABLES = {
  CHAT_STATS: process.env.CHAT_STATS_TABLE || 'TaskiloChatStats',
  CHAT_MESSAGES: process.env.CHAT_MESSAGES_TABLE || 'TaskiloChatMessages',
  CHAT_PARTICIPANTS: process.env.CHAT_PARTICIPANTS_TABLE || 'TaskiloChatParticipants',
  SENSITIVE_DATA_ALERTS: process.env.SENSITIVE_DATA_ALERTS_TABLE || 'TaskiloSensitiveDataAlerts',
};

// Sensible Daten Erkennung - RegEx Patterns
const SENSITIVE_DATA_PATTERNS = {
  email: {
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    description: 'E-Mail-Adresse',
    severity: 'medium',
  },
  phone: {
    pattern:
      /(?:\+49\s?|0)(?:1[5-7][0-9]|30|40|69|89|211|221|228|231|241|251|261|271|281|291|321|351|361|371|381|391|40[1-9]|421|431|441|451|461|471|511|521|531|541|551|561|571|581|591|60[1-9]|611|621|631|641|651|661|671|681|691|70[1-9]|711|721|731|741|751|761|771|781|791|80[1-9]|811|821|831|841|851|861|871|881|891|90[1-9]|911|921|931|941|951|961|971|981|991)[\s\-\(\)]?[0-9]{3,12}|(?:01[5-7][0-9]|016[0-9])[0-9]{7,10}/g,
    description: 'Telefonnummer',
    severity: 'high',
  },
  iban: {
    pattern: /DE[0-9]{2}\s?[0-9]{4}\s?[0-9]{4}\s?[0-9]{4}\s?[0-9]{4}\s?[0-9]{2}/gi,
    description: 'IBAN (Bankverbindung)',
    severity: 'high',
  },
  creditCard: {
    pattern:
      /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3[0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/g,
    description: 'Kreditkartennummer',
    severity: 'high',
  },
  address: {
    pattern:
      /(?:[A-ZÄÖÜ][a-zäöüß]*(?:straße|str\.|gasse|weg|platz|ring|allee|damm)\s*[0-9]+[a-z]?)|(?:[0-9]{5}\s+[A-ZÄÖÜ][a-zäöüß\s]+)/gi,
    description: 'Adresse',
    severity: 'low',
  },
  socialSecurity: {
    pattern: /\b[0-9]{2}\s?[0-9]{6}\s?[A-Z]\s?[0-9]{3}\b/g,
    description: 'Sozialversicherungsnummer',
    severity: 'high',
  },
  passport: {
    pattern: /\b[C-F|G-H|J-N|P-R|T-Z][0-9]{8}\b/g,
    description: 'Reisepassnummer',
    severity: 'high',
  },
};

// Analysiere Nachrichten auf sensible Daten
function analyzeSensitiveData(content, messageId, chatId, chatType, senderId) {
  if (!content || typeof content !== 'string') {
    return [];
  }

  const alerts = [];
  const contentLower = content.toLowerCase();

  // Überprüfe jedes Pattern
  for (const [dataType, config] of Object.entries(SENSITIVE_DATA_PATTERNS)) {
    const matches = content.match(config.pattern);

    if (matches && matches.length > 0) {
      // Entferne Duplikate
      const uniqueMatches = [...new Set(matches)];

      for (const match of uniqueMatches) {
        alerts.push({
          alertId: `${messageId}_${dataType}_${Date.now()}`,
          messageId,
          chatId,
          chatType,
          senderId,
          dataType,
          detectedData: match,
          description: config.description,
          severity: config.severity,
          timestamp: new Date().toISOString(),
          reviewed: false,
          falsePositive: false,
          context: content
            .substring(
              Math.max(0, content.indexOf(match) - 50),
              Math.min(content.length, content.indexOf(match) + match.length + 50)
            )
            .trim(),
        });
      }
    }
  }

  // Zusätzliche Heuristiken für verdächtige Muster
  const suspiciousKeywords = [
    'passwort',
    'password',
    'pin',
    'gehalt',
    'lohn',
    'steuer',
    'vertraulich',
    'geheim',
    'privat',
    'bankdaten',
    'kontonummer',
    'ausweis',
    'personalausweis',
  ];

  for (const keyword of suspiciousKeywords) {
    if (contentLower.includes(keyword)) {
      alerts.push({
        alertId: `${messageId}_keyword_${keyword}_${Date.now()}`,
        messageId,
        chatId,
        chatType,
        senderId,
        dataType: 'keyword',
        detectedData: keyword,
        description: 'Verdächtiges Schlüsselwort',
        severity: 'low',
        timestamp: new Date().toISOString(),
        reviewed: false,
        falsePositive: false,
        context: content
          .substring(
            Math.max(0, contentLower.indexOf(keyword) - 30),
            Math.min(content.length, contentLower.indexOf(keyword) + keyword.length + 30)
          )
          .trim(),
      });
      break; // Nur ein Keyword-Alert pro Message
    }
  }

  return alerts;
}

// Speichere Sensible-Daten-Alerts in DynamoDB
async function storeSensitiveDataAlerts(alerts) {
  if (!alerts || alerts.length === 0) {
    return;
  }

  try {
    for (const alert of alerts) {
      await docClient.send(
        new PutCommand({
          TableName: TABLES.SENSITIVE_DATA_ALERTS,
          Item: {
            ...alert,
            ttl: Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60, // 90 Tage TTL
          },
        })
      );
    }

    console.log(`🚨 Stored ${alerts.length} sensitive data alerts`);
  } catch (error) {
    console.error('❌ Error storing sensitive data alerts:', error);
  }
}

// Firebase Admin initialisieren
if (!admin.apps.length) {
  try {
    console.log('� Initialisiere Firebase Admin...');

    // Verwende Service Account JSON Datei
    const serviceAccount = require('./firebase-service-account.json');

    console.log('Firebase Service Account Details:', {
      project_id: serviceAccount.project_id,
      client_email: serviceAccount.client_email,
      has_private_key: !!serviceAccount.private_key,
      private_key_format: serviceAccount.private_key ? 'PEM' : 'none',
    });

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });

    console.log('✅ Firebase Admin erfolgreich initialisiert');

    // Test Firestore-Verbindung
    const firestore = admin.firestore();
    console.log('📊 Firestore-Verbindung hergestellt');
  } catch (error) {
    console.error('❌ Firebase Admin Initialisierung fehlgeschlagen:', error.message);
    console.error('Details:', error.stack);
    throw error;
  }
}

const firestore = admin.firestore();

exports.handler = async event => {
  console.log('Chat Aggregation Event:', JSON.stringify(event, null, 2));

  try {
    const { action, triggerType } = event;

    switch (action) {
      case 'aggregate-all':
        return await aggregateAllChats();
      case 'aggregate-recent':
        return await aggregateRecentChats();
      case 'cleanup-old':
        return await cleanupOldData();
      case 'get-stats':
        return await getChatStats();
      default:
        return await aggregateAllChats(); // Default action
    }
  } catch (error) {
    console.error('Chat aggregation error:', error);
    throw error;
  }
};

async function aggregateAllChats() {
  console.log('🔄 Starting complete chat aggregation...');

  const results = {
    chats: await aggregateChatsCollection(),
    directChats: await aggregateDirectChats(),
    supportChats: await aggregateSupportChats(),
    timestamp: new Date().toISOString(),
  };

  // Erweitert: Sammle auch detaillierte Nachrichten für aktive Chats
  await aggregateDetailedMessages(results);

  // Update general stats
  await updateChatStatistics(results);

  console.log('✅ Chat aggregation completed:', results);
  return {
    statusCode: 200,
    body: JSON.stringify(results),
  };
}

// Erweiterte Chat-Nachrichten Aggregation
async function aggregateDetailedMessages(chatResults) {
  console.log('📖 Aggregating detailed chat messages...');

  try {
    let totalMessagesProcessed = 0;

    // Verarbeite aktive Chats
    for (const chat of chatResults.chats) {
      if (chat.messageCount > 0 && chat.isActive) {
        console.log(`📝 Processing messages for chat: ${chat.id}`);
        const messages = await getDetailedChatMessages('chats', chat.id, 20);
        await storeDetailedChatMessages(messages);
        totalMessagesProcessed += messages.length;
      }
    }

    // Verarbeite aktive Direct Chats
    for (const directChat of chatResults.directChats) {
      if (directChat.messageCount > 0) {
        console.log(`📝 Processing messages for directChat: ${directChat.id}`);
        const messages = await getDetailedChatMessages('directChats', directChat.id, 20);
        await storeDetailedChatMessages(messages);
        totalMessagesProcessed += messages.length;
      }
    }

    // Verarbeite Support Chats (alle, da wichtig für Admin)
    for (const supportChat of chatResults.supportChats) {
      console.log(`📝 Processing messages for supportChat: ${supportChat.id}`);
      const messages = await getDetailedChatMessages('supportChats', supportChat.id, 50);
      await storeDetailedChatMessages(messages);
      totalMessagesProcessed += messages.length;
    }

    console.log(`✅ Processed ${totalMessagesProcessed} detailed messages total`);
  } catch (error) {
    console.error('❌ Error in detailed message aggregation:', error);
  }
}

// Erweiterte Chat-Nachrichten Abruf
async function getDetailedChatMessages(chatType, chatId, limit = 50) {
  try {
    let messagesSnapshot;

    if (chatType === 'chats') {
      messagesSnapshot = await firestore
        .collection('chats')
        .doc(chatId)
        .collection('messages')
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();
    } else if (chatType === 'directChats') {
      messagesSnapshot = await firestore
        .collection('directChats')
        .doc(chatId)
        .collection('messages')
        .orderBy('timestamp', 'desc') // DirectChats use timestamp field
        .limit(limit)
        .get();
    } else if (chatType === 'supportChats') {
      messagesSnapshot = await firestore
        .collection('supportChats')
        .doc(chatId)
        .collection('messages')
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();
    }

    const messages = [];
    const allSensitiveDataAlerts = [];

    messagesSnapshot?.docs?.forEach(messageDoc => {
      const messageData = messageDoc.data();
      const content = messageData.message || messageData.content || messageData.text || '';

      const message = {
        messageId: messageDoc.id,
        chatId: chatId,
        chatType: chatType,
        senderId: messageData.senderId || messageData.userId || null,
        senderName: messageData.senderName || messageData.userName || 'Unknown',
        senderType: messageData.senderType || 'user',
        content: content,
        type: messageData.type || 'text',
        // Handle different timestamp fields for different chat types
        createdAt:
          chatType === 'directChats'
            ? messageData.timestamp?.toDate?.()?.toISOString() || null
            : messageData.createdAt?.toDate?.()?.toISOString() || null,
        timestamp:
          chatType === 'directChats'
            ? messageData.timestamp?.toDate?.()?.toISOString() || null
            : messageData.createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: messageData.updatedAt?.toDate?.()?.toISOString() || null,
        isRead: messageData.isRead || false,
        metadata: {
          hasAttachment: !!(messageData.attachment || messageData.file || messageData.image),
          isSystemMessage: messageData.isSystemMessage || false,
          priority: messageData.priority || null,
          status: messageData.status || null,
        },
      };

      // Analysiere sensible Daten in der Nachricht
      if (content && content.trim().length > 0) {
        const sensitiveDataAlerts = analyzeSensitiveData(
          content,
          messageDoc.id,
          chatId,
          chatType,
          message.senderId
        );
        allSensitiveDataAlerts.push(...sensitiveDataAlerts);

        // Füge Sensible-Daten-Flag zur Message hinzu
        message.metadata.hasSensitiveData = sensitiveDataAlerts.length > 0;
        message.metadata.sensitiveDataCount = sensitiveDataAlerts.length;
        message.metadata.maxSeverity =
          sensitiveDataAlerts.length > 0
            ? Math.max(
                ...sensitiveDataAlerts.map(alert =>
                  alert.severity === 'high' ? 3 : alert.severity === 'medium' ? 2 : 1
                )
              )
            : 0;
      }

      messages.push(message);
    });

    // Speichere sensible Daten Alerts
    if (allSensitiveDataAlerts.length > 0) {
      console.log(
        `🚨 Found ${allSensitiveDataAlerts.length} sensitive data alerts in ${chatType}/${chatId}`
      );
      await storeSensitiveDataAlerts(allSensitiveDataAlerts);
    }

    return messages;
  } catch (error) {
    console.error(`❌ Error getting messages for ${chatType}/${chatId}:`, error);
    return [];
  }
}

// Speichere detaillierte Nachrichten in DynamoDB
async function storeDetailedChatMessages(messages) {
  try {
    for (const message of messages) {
      await docClient.send(
        new PutCommand({
          TableName: TABLES.CHAT_MESSAGES,
          Item: {
            ...message,
            ttl: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 Tage TTL
            aggregatedAt: new Date().toISOString(),
          },
        })
      );
    }

    console.log(`💾 Stored ${messages.length} detailed messages in DynamoDB`);
  } catch (error) {
    console.error('❌ Error storing detailed messages:', error);
    throw error;
  }
}

async function aggregateChatsCollection() {
  console.log('📊 Aggregating chats collection...');

  try {
    const chatsSnapshot = await firestore.collection('chats').get();
    const chatData = [];

    for (const chatDoc of chatsSnapshot.docs) {
      const chat = chatDoc.data();
      const chatId = chatDoc.id;

      // Get latest messages for admin monitoring (mehr Nachrichten)
      const messagesSnapshot = await firestore
        .collection('chats')
        .doc(chatId)
        .collection('messages')
        .orderBy('createdAt', 'desc')
        .limit(50) // Erhöht von 5 auf 50 für Admin-Monitoring
        .get();

      const messages = messagesSnapshot.docs.map(doc => ({
        messageId: doc.id,
        senderId: doc.data().senderId || doc.data().userId,
        senderName: doc.data().senderName || doc.data().userName,
        senderType: doc.data().senderType || 'user',
        content: doc.data().message || doc.data().content || doc.data().text,
        text: doc.data().message || doc.data().content || doc.data().text,
        type: doc.data().type || 'text',
        timestamp: doc.data().createdAt?.toDate?.()?.toISOString() || null,
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null,
        isRead: doc.data().isRead || false,
        metadata: doc.data().metadata || {},
      }));

      const chatInfo = {
        id: chatId,
        type: 'chat',
        title: chat.title || 'Unnamed Chat',
        participants: chat.participants || [],
        participantCount: (chat.participants || []).length,
        messageCount: await getChatMessageCount(chatId, 'chats'),
        lastActivity: getLastActivityTime(chat, messages),
        isActive: isRecentActivity(chat, messages),
        orderId: chat.orderId || null,
        customerId: chat.customerId || null,
        providerId: chat.providerId || null,
        status: chat.status || 'active',
        messages: messages, // Vollständige Nachrichten für Admin-Dashboard
        recentMessages: messages.slice(0, 5), // Nur die letzten 5 für Übersicht
        createdAt: chat.createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: new Date().toISOString(),
      };

      chatData.push(chatInfo);

      // Store individual chat in DynamoDB
      await docClient.send(
        new PutCommand({
          TableName: TABLES.CHAT_MESSAGES,
          Item: chatInfo,
        })
      );
    }

    console.log(`✅ Processed ${chatData.length} chats`);
    return chatData;
  } catch (error) {
    console.error('❌ Error aggregating chats:', error);
    throw error;
  }
}

async function aggregateDirectChats() {
  console.log('📊 Aggregating directChats collection...');

  try {
    const directChatsSnapshot = await firestore.collection('directChats').get();
    const directChatData = [];

    for (const chatDoc of directChatsSnapshot.docs) {
      const chat = chatDoc.data();
      const chatId = chatDoc.id;

      // Get latest messages für admin monitoring (mehr Nachrichten)
      const messagesSnapshot = await firestore
        .collection('directChats')
        .doc(chatId)
        .collection('messages')
        .orderBy('timestamp', 'desc') // DirectChats use 'timestamp' field, not 'createdAt'
        .limit(50) // Erhöht von 5 auf 50 für Admin-Monitoring
        .get();

      const messages = messagesSnapshot.docs.map(doc => ({
        messageId: doc.id,
        senderId: doc.data().senderId || doc.data().userId,
        senderName: doc.data().senderName || doc.data().userName,
        senderType: doc.data().senderType || 'user',
        content: doc.data().message || doc.data().content || doc.data().text,
        text: doc.data().message || doc.data().content || doc.data().text,
        type: doc.data().type || 'text',
        timestamp: doc.data().timestamp?.toDate?.()?.toISOString() || null, // Use timestamp field
        createdAt: doc.data().timestamp?.toDate?.()?.toISOString() || null, // Map timestamp to createdAt for consistency
        updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null,
        isRead: doc.data().isRead || false,
        metadata: doc.data().metadata || {},
      }));

      // Enhanced title with participant names from participantNames map
      const participantNamesList = [];
      if (chat.participantNames) {
        Object.values(chat.participantNames).forEach(name => {
          if (name && typeof name === 'string') {
            participantNamesList.push(name);
          }
        });
      }

      const title =
        participantNamesList.length > 0
          ? `DirectChat: ${participantNamesList.join(' ↔ ')}`
          : `DirectChat: ${(chat.participants || []).join(' ↔ ')}`;

      const chatInfo = {
        id: chatId,
        type: 'directChat',
        title: title,
        participants: chat.participants || [],
        participantNames: chat.participantNames || {},
        participantCount: (chat.participants || []).length,
        messageCount: await getChatMessageCount(chatId, 'directChats'),
        lastActivity: getDirectChatLastActivity(chat, messages), // Use specialized function for DirectChats
        isActive: isRecentActivity(chat, messages),
        messages: messages, // Vollständige Nachrichten für Admin-Dashboard
        recentMessages: messages.slice(0, 5), // Nur die letzten 5 für Übersicht
        createdAt: chat.createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: chat.lastUpdated?.toDate?.()?.toISOString() || new Date().toISOString(),
        // Include DirectChat-specific fields
        providerId: chat.providerId || null,
        providerName: chat.providerName || null,
        companyId: chat.companyId || null,
        companyName: chat.companyName || null,
        lastMessage: chat.lastMessage || null,
      };

      directChatData.push(chatInfo);

      // Store individual chat in DynamoDB
      await docClient.send(
        new PutCommand({
          TableName: TABLES.CHAT_MESSAGES,
          Item: chatInfo,
        })
      );
    }

    console.log(`✅ Processed ${directChatData.length} direct chats`);
    return directChatData;
  } catch (error) {
    console.error('❌ Error aggregating direct chats:', error);
    throw error;
  }
}

async function aggregateSupportChats() {
  console.log('📊 Aggregating supportChats collection...');

  try {
    const supportChatsSnapshot = await firestore.collection('supportChats').get();
    const supportChatData = [];

    for (const chatDoc of supportChatsSnapshot.docs) {
      const chat = chatDoc.data();
      const chatId = chatDoc.id;

      // Get latest messages für admin monitoring (mehr Nachrichten)
      const messagesSnapshot = await firestore
        .collection('supportChats')
        .doc(chatId)
        .collection('messages')
        .orderBy('createdAt', 'desc')
        .limit(50) // Erhöht von 5 auf 50 für Admin-Monitoring
        .get();

      const messages = messagesSnapshot.docs.map(doc => ({
        messageId: doc.id,
        senderId: doc.data().senderId || doc.data().userId,
        senderName: doc.data().senderName || doc.data().userName,
        senderType: doc.data().senderType || 'user',
        content: doc.data().message || doc.data().content || doc.data().text,
        text: doc.data().message || doc.data().content || doc.data().text,
        type: doc.data().type || 'text',
        timestamp: doc.data().createdAt?.toDate?.()?.toISOString() || null,
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null,
        isRead: doc.data().isRead || false,
        metadata: doc.data().metadata || {},
      }));

      const chatInfo = {
        id: chatId,
        type: 'supportChat',
        title: chat.subject || 'Support Request',
        participants: [chat.userId, 'support'].filter(Boolean),
        participantCount: 2,
        messageCount: await getChatMessageCount(chatId, 'supportChats'),
        lastActivity: getLastActivityTime(chat, messages),
        isActive: isRecentActivity(chat, messages),
        priority: chat.priority || 'medium',
        status: chat.status || 'open',
        category: chat.category || 'general',
        userId: chat.userId || null,
        userEmail: chat.userEmail || null,
        messages: messages, // Vollständige Nachrichten für Admin-Dashboard
        recentMessages: messages.slice(0, 5), // Nur die letzten 5 für Übersicht
        createdAt: chat.createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: new Date().toISOString(),
      };

      supportChatData.push(chatInfo);

      // Store individual chat in DynamoDB
      await docClient.send(
        new PutCommand({
          TableName: TABLES.CHAT_MESSAGES,
          Item: chatInfo,
        })
      );
    }

    console.log(`✅ Processed ${supportChatData.length} support chats`);
    return supportChatData;
  } catch (error) {
    console.error('❌ Error aggregating support chats:', error);
    throw error;
  }
}

async function getChatMessageCount(chatId, collection) {
  try {
    const messagesSnapshot = await firestore
      .collection(collection)
      .doc(chatId)
      .collection('messages')
      .get();
    return messagesSnapshot.size;
  } catch (error) {
    console.error(`Error counting messages for ${collection}/${chatId}:`, error);
    return 0;
  }
}

function getLastActivityTime(chat, messages) {
  const times = [
    chat.updatedAt?.toDate?.(),
    chat.lastMessageAt?.toDate?.(),
    ...(messages || []).map(msg => new Date(msg.createdAt)).filter(Boolean),
  ].filter(Boolean);

  if (times.length === 0) return null;

  const latest = new Date(Math.max(...times.map(t => t.getTime())));
  return latest.toISOString();
}

// Specialized function for DirectChats which use different field structure
function getDirectChatLastActivity(chat, messages) {
  const times = [
    chat.lastUpdated?.toDate?.(), // DirectChats use lastUpdated
    chat.lastMessage?.timestamp?.toDate?.(), // DirectChats have lastMessage.timestamp
    ...(messages || []).map(msg => new Date(msg.timestamp)).filter(Boolean), // DirectChat messages use timestamp
  ].filter(Boolean);

  if (times.length === 0) return null;

  const latest = new Date(Math.max(...times.map(t => t.getTime())));
  return latest.toISOString();
}

function isRecentActivity(chat, messages) {
  const lastActivity = getLastActivityTime(chat, messages);
  if (!lastActivity) return false;

  const hoursSinceLastActivity = (Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60);
  return hoursSinceLastActivity < 24; // Active if activity within 24 hours
}

async function updateChatStatistics(aggregationResults) {
  console.log('📊 Updating chat statistics...');

  const stats = {
    id: 'global-chat-stats',
    type: 'chat_statistics',
    totalChats: aggregationResults.chats.length,
    totalDirectChats: aggregationResults.directChats.length,
    totalSupportChats: aggregationResults.supportChats.length,
    activeChats: [
      ...aggregationResults.chats,
      ...aggregationResults.directChats,
      ...aggregationResults.supportChats,
    ].filter(chat => chat.isActive).length,
    totalMessages: [
      ...aggregationResults.chats,
      ...aggregationResults.directChats,
      ...aggregationResults.supportChats,
    ].reduce((sum, chat) => sum + chat.messageCount, 0),
    supportChatsByStatus: aggregationResults.supportChats.reduce((acc, chat) => {
      acc[chat.status] = (acc[chat.status] || 0) + 1;
      return acc;
    }, {}),
    supportChatsByPriority: aggregationResults.supportChats.reduce((acc, chat) => {
      acc[chat.priority] = (acc[chat.priority] || 0) + 1;
      return acc;
    }, {}),
    lastUpdated: new Date().toISOString(),
    timestamp: Date.now(),
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLES.CHAT_STATS,
      Item: stats,
    })
  );

  console.log('✅ Chat statistics updated:', stats);
  return stats;
}

async function aggregateRecentChats() {
  console.log('🔄 Aggregating recent chat activity...');
  // Similar to aggregateAllChats but only for last 24 hours
  // Implementation would filter by recent timestamps
  return await aggregateAllChats(); // Simplified for now
}

async function cleanupOldData() {
  console.log('🧹 Cleaning up old chat data...');

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30); // Keep 30 days

    const scanCommand = new ScanCommand({
      TableName: TABLES.CHAT_MESSAGES,
      FilterExpression: 'updatedAt < :cutoff',
      ExpressionAttributeValues: {
        ':cutoff': cutoffDate.toISOString(),
      },
    });

    const result = await docClient.send(scanCommand);
    let deletedCount = 0;

    for (const item of result.Items || []) {
      await docClient.send(
        new DeleteCommand({
          TableName: TABLES.CHAT_MESSAGES,
          Key: { id: item.id },
        })
      );
      deletedCount++;
    }

    console.log(`🗑️ Deleted ${deletedCount} old chat records`);
    return { deletedCount };
  } catch (error) {
    console.error('❌ Error cleaning up old data:', error);
    throw error;
  }
}

async function getChatStats() {
  console.log('📈 Getting chat statistics...');

  try {
    const result = await docClient.send(
      new ScanCommand({
        TableName: TABLES.CHAT_STATS,
        FilterExpression: 'id = :id',
        ExpressionAttributeValues: {
          ':id': 'global-chat-stats',
        },
      })
    );

    return {
      statusCode: 200,
      body: JSON.stringify(result.Items?.[0] || {}),
    };
  } catch (error) {
    console.error('❌ Error getting chat stats:', error);
    throw error;
  }
}
