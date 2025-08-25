// API Route für AWS EventBridge Publishing
import { NextRequest, NextResponse } from 'next/server';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';

const eventBridge = new EventBridgeClient({
  region: process.env.AWS_REGION || 'eu-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

export async function POST(request: NextRequest) {
  try {
    const { workspaceId, adminId, updateType, data } = await request.json();

    // EventBridge Event senden
    const command = new PutEventsCommand({
      Entries: [
        {
          Source: 'taskilo.admin.workspace',
          DetailType: updateType,
          Detail: JSON.stringify({
            workspaceId,
            adminId,
            updateType,
            data,
            timestamp: new Date().toISOString(),
          }),
          EventBusName: process.env.AWS_EVENTBRIDGE_BUS || 'taskilo-events-production',
        },
      ],
    });

    const result = await eventBridge.send(command);

    return NextResponse.json({
      success: true,
      eventId: result.Entries?.[0]?.EventId,
    });
  } catch (error) {

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
