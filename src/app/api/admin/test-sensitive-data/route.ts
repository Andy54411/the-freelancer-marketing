import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { messageId, senderId, text, chatId, chatType, timestamp } = await request.json();

    // Simulate sending data to Lambda for analysis
    const lambdaUrl = 'https://tqhc7vxlga.execute-api.eu-central-1.amazonaws.com/default/taskilo-chat-aggregator';
    
    const lambdaPayload = {
      Records: [
        {
          eventName: 'INSERT',
          dynamodb: {
            NewImage: {
              messageId: { S: messageId },
              senderId: { S: senderId },
              text: { S: text },
              chatId: { S: chatId },
              chatType: { S: chatType },
              timestamp: { S: timestamp }
            }
          }
        }
      ]
    };

    console.log('Sending test data to Lambda:', JSON.stringify(lambdaPayload, null, 2));

    const response = await fetch(lambdaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(lambdaPayload)
    });

    const result = await response.text();
    console.log('Lambda response:', result);

    return NextResponse.json({
      success: true,
      message: 'Test message sent to Lambda for sensitive data analysis',
      lambdaResponse: result
    });

  } catch (error) {
    console.error('Error testing sensitive data:', error);
    return NextResponse.json(
      { error: 'Failed to test sensitive data analysis' },
      { status: 500 }
    );
  }
}