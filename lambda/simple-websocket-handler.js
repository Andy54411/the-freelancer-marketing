// WebSocket Handler ohne aws-sdk Dependencies
// Funktioniert nur für Connection Management

const CONNECTIONS_TABLE =
  process.env.AWS_DYNAMODB_CONNECTIONS_TABLE || 'TaskiloWebSocketConnections-production';

exports.handler = async event => {
  console.log('WebSocket Event:', JSON.stringify(event, null, 2));

  const { routeKey, connectionId, requestContext } = event;

  try {
    switch (routeKey) {
      case '$connect':
        return await handleConnect(event);
      case '$disconnect':
        return await handleDisconnect(event);
      case '$default':
        return await handleMessage(event);
      default:
        console.log(`Unknown route: ${routeKey}`);
        return { statusCode: 400, body: 'Unknown route' };
    }
  } catch (error) {
    console.error('Lambda error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};

async function handleConnect(event) {
  const { connectionId, requestContext } = event;
  const { queryStringParameters } = requestContext;

  console.log('WebSocket $connect for connection', connectionId);

  // Extrahiere adminId aus Query Parameters (falls vorhanden)
  const adminId = queryStringParameters?.adminId || 'anonymous';

  console.log(`Connection request: ${connectionId} for admin ${adminId}`);

  // Einfach erfolgreich antworten - DynamoDB wird später hinzugefügt
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Connected successfully',
      connectionId,
      adminId,
    }),
  };
}

async function handleDisconnect(event) {
  const { connectionId } = event;

  console.log('WebSocket $disconnect for connection', connectionId);

  // Einfach erfolgreich antworten
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Disconnected successfully',
      connectionId,
    }),
  };
}

async function handleMessage(event) {
  const { connectionId, body } = event;

  console.log('WebSocket message from', connectionId, ':', body);

  try {
    const message = JSON.parse(body || '{}');

    console.log('Parsed message:', message);

    // Einfach OK antworten - Echo wird später hinzugefügt
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Message received',
        connectionId,
        receivedAt: new Date().toISOString(),
      }),
    };
  } catch (error) {
    console.error('Error parsing message:', error);
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Message parsing failed',
        error: error.message,
      }),
    };
  }
}
