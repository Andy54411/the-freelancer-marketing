import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

const dynamoClient = new DynamoDBClient({
  region: 'eu-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const TABLES = {
  SENSITIVE_DATA_ALERTS: 'TaskiloSensitiveDataAlerts',
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('chatId');

    console.log('Debug: chatId parameter:', chatId);

    const scanParams: any = {
      TableName: TABLES.SENSITIVE_DATA_ALERTS,
      Limit: 10,
    };

    if (chatId) {
      scanParams.FilterExpression = 'chatId = :chatId';
      scanParams.ExpressionAttributeValues = {
        ':chatId': { S: chatId },
      };
    }

    console.log('Debug: DynamoDB scan params:', JSON.stringify(scanParams, null, 2));

    const result = await dynamoClient.send(new ScanCommand(scanParams));

    console.log('Debug: DynamoDB raw result:', JSON.stringify(result, null, 2));

    const alerts =
      result.Items?.map(item => {
        const unmarshalled = unmarshall(item);
        console.log('Debug: Unmarshalled item:', unmarshalled);
        return unmarshalled;
      }) || [];

    console.log('Debug: Final alerts array:', alerts);

    return NextResponse.json({
      success: true,
      debug: {
        chatId,
        scanParams,
        rawResultCount: result.Items?.length || 0,
        processedAlertsCount: alerts.length,
      },
      alerts,
    });
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json(
      {
        error: 'Debug failed',
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
