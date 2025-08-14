exports.handler = async event => {
  console.log('Ultra Simple WebSocket Handler - Event:', JSON.stringify(event, null, 2));

  // PayloadFormatVersion 1.0 structure for WebSocket
  const routeKey = event.requestContext?.routeKey;
  const connectionId = event.requestContext?.connectionId;
  const requestContext = event.requestContext;

  try {
    switch (routeKey) {
      case '$connect':
        console.log('WebSocket $connect for connection', connectionId);
        console.log('Query params:', requestContext?.queryStringParameters);
        return { statusCode: 200, body: 'Connected' };

      case '$disconnect':
        console.log('WebSocket $disconnect for connection', connectionId);
        return { statusCode: 200, body: 'Disconnected' };

      case '$default':
        console.log('WebSocket message for connection', connectionId, 'body:', event.body);
        return { statusCode: 200, body: 'Message received' };

      default:
        console.log('Unknown route:', routeKey);
        return { statusCode: 400, body: 'Unknown route' };
    }
  } catch (error) {
    console.error('WebSocket Handler Error:', error);
    return { statusCode: 500, body: 'Internal Server Error' };
  }
};
