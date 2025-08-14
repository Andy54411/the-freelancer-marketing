// AWS Lambda Function für WebSocket Connection Management
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  PutCommand,
  DeleteCommand,
  GetCommand,
} = require('@aws-sdk/lib-dynamodb');

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'eu-central-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

exports.handler = async event => {
  const { routeKey, connectionId } = event.requestContext;

  console.log(`WebSocket ${routeKey} for connection ${connectionId}`);

  try {
    switch (routeKey) {
      case '$connect':
        await handleConnect(connectionId, event);
        break;

      case '$disconnect':
        await handleDisconnect(connectionId);
        break;

      case 'subscribe':
        await handleSubscribe(connectionId, event);
        break;

      case 'unsubscribe':
        await handleUnsubscribe(connectionId, event);
        break;

      default:
        console.log(`Unknown route: ${routeKey}`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Success' }),
    };
  } catch (error) {
    console.error('Error handling WebSocket event:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

// WebSocket Connect Handler
async function handleConnect(connectionId, event) {
  try {
    const queryParams = event.queryStringParameters || {};
    const adminId = queryParams.adminId;

    if (!adminId) {
      throw new Error('adminId required for connection');
    }

    const connection = {
      connectionId,
      adminId,
      subscriptions: [],
      connectedAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
    };

    const command = new PutCommand({
      TableName: process.env.CONNECTIONS_TABLE_NAME,
      Item: connection,
    });

    await docClient.send(command);
    console.log(`Connection stored: ${connectionId} for admin ${adminId}`);
  } catch (error) {
    console.error('Error handling connect:', error);
    throw error;
  }
}

// WebSocket Disconnect Handler
async function handleDisconnect(connectionId) {
  try {
    const command = new DeleteCommand({
      TableName: process.env.CONNECTIONS_TABLE_NAME,
      Key: { connectionId },
    });

    await docClient.send(command);
    console.log(`Connection removed: ${connectionId}`);
  } catch (error) {
    console.error('Error handling disconnect:', error);
    throw error;
  }
}

// Workspace Subscribe Handler
async function handleSubscribe(connectionId, event) {
  try {
    const body = JSON.parse(event.body || '{}');
    const { workspaceId } = body;

    if (!workspaceId) {
      throw new Error('workspaceId required for subscription');
    }

    // Connection laden und subscriptions updaten
    const getCommand = new GetCommand({
      TableName: process.env.CONNECTIONS_TABLE_NAME,
      Key: { connectionId },
    });

    const result = await docClient.send(getCommand);
    const connection = result.Item;

    if (!connection) {
      throw new Error('Connection not found');
    }

    // Subscription hinzufügen
    const subscriptions = connection.subscriptions || [];
    if (!subscriptions.includes(workspaceId)) {
      subscriptions.push(workspaceId);
    }

    const updateCommand = new PutCommand({
      TableName: process.env.CONNECTIONS_TABLE_NAME,
      Item: {
        ...connection,
        subscriptions,
        lastActivity: new Date().toISOString(),
      },
    });

    await docClient.send(updateCommand);
    console.log(`Subscribed connection ${connectionId} to workspace ${workspaceId}`);
  } catch (error) {
    console.error('Error handling subscribe:', error);
    throw error;
  }
}

// Workspace Unsubscribe Handler
async function handleUnsubscribe(connectionId, event) {
  try {
    const body = JSON.parse(event.body || '{}');
    const { workspaceId } = body;

    if (!workspaceId) {
      throw new Error('workspaceId required for unsubscription');
    }

    // Connection laden und subscription entfernen
    const getCommand = new GetCommand({
      TableName: process.env.CONNECTIONS_TABLE_NAME,
      Key: { connectionId },
    });

    const result = await docClient.send(getCommand);
    const connection = result.Item;

    if (!connection) {
      throw new Error('Connection not found');
    }

    // Subscription entfernen
    const subscriptions = (connection.subscriptions || []).filter(id => id !== workspaceId);

    const updateCommand = new PutCommand({
      TableName: process.env.CONNECTIONS_TABLE_NAME,
      Item: {
        ...connection,
        subscriptions,
        lastActivity: new Date().toISOString(),
      },
    });

    await docClient.send(updateCommand);
    console.log(`Unsubscribed connection ${connectionId} from workspace ${workspaceId}`);
  } catch (error) {
    console.error('Error handling unsubscribe:', error);
    throw error;
  }
}
