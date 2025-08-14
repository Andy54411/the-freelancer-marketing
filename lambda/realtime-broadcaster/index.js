// AWS Lambda Function für EventBridge zu WebSocket Broadcasting
const {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} = require('@aws-sdk/client-apigatewaymanagementapi');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'eu-central-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const apiGateway = new ApiGatewayManagementApiClient({
  region: process.env.AWS_REGION || 'eu-central-1',
  endpoint: process.env.WEBSOCKET_ENDPOINT,
});

exports.handler = async event => {
  console.log('EventBridge Event received:', JSON.stringify(event, null, 2));

  try {
    // Parse EventBridge Event
    const detail = event.detail;
    const { workspaceId, adminId, updateType, data, timestamp } = detail;

    // WebSocket Message erstellen
    const message = {
      type: 'workspace_update',
      workspaceId,
      updateType,
      data,
      timestamp,
    };

    // Alle aktiven WebSocket Connections aus DynamoDB holen
    const connections = await getActiveConnections();

    // Relevante Connections für diesen Workspace filtern
    const relevantConnections = connections.filter(
      conn => conn.subscriptions && conn.subscriptions.includes(workspaceId)
    );

    console.log(
      `Broadcasting to ${relevantConnections.length} connections for workspace ${workspaceId}`
    );

    // Parallel Broadcasting
    const broadcastPromises = relevantConnections.map(async connection => {
      try {
        const command = new PostToConnectionCommand({
          ConnectionId: connection.connectionId,
          Data: JSON.stringify(message),
        });

        await apiGateway.send(command);
        console.log(`Message sent to connection ${connection.connectionId}`);
      } catch (error) {
        console.error(`Failed to send to connection ${connection.connectionId}:`, error);

        // Stale Connection entfernen
        if (error.statusCode === 410) {
          await removeConnection(connection.connectionId);
        }
      }
    });

    await Promise.all(broadcastPromises);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Broadcast completed',
        sentTo: relevantConnections.length,
      }),
    };
  } catch (error) {
    console.error('Error in realtime broadcaster:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

// Aktive WebSocket Connections aus DynamoDB laden
async function getActiveConnections() {
  try {
    const command = new ScanCommand({
      TableName: process.env.CONNECTIONS_TABLE_NAME,
    });

    const result = await docClient.send(command);
    return result.Items || [];
  } catch (error) {
    console.error('Error fetching connections:', error);
    return [];
  }
}

// Stale Connection entfernen
async function removeConnection(connectionId) {
  try {
    const command = new DeleteCommand({
      TableName: process.env.CONNECTIONS_TABLE_NAME,
      Key: { connectionId },
    });

    await docClient.send(command);
    console.log(`Removed stale connection: ${connectionId}`);
  } catch (error) {
    console.error('Error removing connection:', error);
  }
}
