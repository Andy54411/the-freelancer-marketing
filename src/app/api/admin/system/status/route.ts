// System Status API
import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient, DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import { SESClient, GetSendStatisticsCommand } from '@aws-sdk/client-ses';

const dynamodb = new DynamoDBClient({
  region: process.env.AWS_REGION || 'eu-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const sesClient = new SESClient({
  region: process.env.AWS_REGION || 'eu-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function GET(_request: NextRequest) {
  try {
    const status = {
      dynamodb: 'healthy' as 'healthy' | 'warning' | 'error',
      ses: 'healthy' as 'healthy' | 'warning' | 'error',
      cognito: 'healthy' as 'healthy' | 'warning' | 'error',
      lastCheck: new Date().toLocaleString('de-DE'),
    };

    // Test DynamoDB
    try {
      const dbCommand = new DescribeTableCommand({
        TableName: 'taskilo-admin-data',
      });
      await dynamodb.send(dbCommand);
    } catch (error) {
      console.error('DynamoDB check failed:', error);
      status.dynamodb = 'error';
    }

    // Test SES
    try {
      const sesCommand = new GetSendStatisticsCommand({});
      await sesClient.send(sesCommand);
    } catch (error) {
      console.error('SES check failed:', error);
      status.ses = 'error';
    }

    return NextResponse.json(status);
  } catch (error) {
    console.error('System status check error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Überprüfen des System-Status' },
      { status: 500 }
    );
  }
}
