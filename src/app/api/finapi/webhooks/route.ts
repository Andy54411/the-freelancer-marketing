import { NextRequest, NextResponse } from 'next/server';
import { getFinApiBaseUrl } from '@/lib/finapi-config';

interface FinAPIWebhookEvent {
  type: string;
  timestamp: string;
  data: {
    userId?: string;
    accountId?: number;
    bankConnectionId?: number;
    transactionId?: number;
    eventType?: string;
  };
}

/**
 * finAPI WebHook Handler
 * Handles real-time updates from finAPI when accounts or transactions change
 * Also handles Web Form 2.0 callbacks
 */
export async function POST(req: NextRequest) {
  try {

    // Check if this is a Web Form 2.0 callback
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const userId = searchParams.get('userId');

    if (type && userId) {
      // This is a Web Form 2.0 callback
      return handleWebFormCallback(req, type, userId);
    }

    // Parse webhook payload
    const webhookEvent: FinAPIWebhookEvent = await req.json();

    // Verify webhook signature (in production, you should verify the signature)
    // const signature = req.headers.get('X-finAPI-Signature');
    // if (!verifyWebhookSignature(body, signature)) {
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    // }

    switch (webhookEvent.type) {
      case 'BANK_CONNECTION_UPDATE':
        await handleBankConnectionUpdate(webhookEvent);
        break;

      case 'ACCOUNT_UPDATE':
        await handleAccountUpdate(webhookEvent);
        break;

      case 'TRANSACTION_UPDATE':
        await handleTransactionUpdate(webhookEvent);
        break;

      case 'USER_UPDATE':
        await handleUserUpdate(webhookEvent);
        break;

      default:

    }

    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
      eventType: webhookEvent.type,
    });
  } catch (error) {

    return NextResponse.json(
      {
        error: 'Failed to process webhook',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

async function handleBankConnectionUpdate(event: FinAPIWebhookEvent) {

  // In a real implementation, you would:
  // 1. Update your database with new bank connection status
  // 2. Notify the user via WebSocket or push notification
  // 3. Trigger account data refresh if connection is successful

  if (event.data.bankConnectionId) {

    // TODO: Update database
    // await updateBankConnectionStatus(event.data.bankConnectionId, event.data.eventType);

    // TODO: Notify frontend via WebSocket
    // await notifyUser(event.data.userId, 'bank_connection_updated', event.data);
  }
}

async function handleAccountUpdate(event: FinAPIWebhookEvent) {

  // In a real implementation, you would:
  // 1. Refresh account data from finAPI
  // 2. Update your database
  // 3. Notify the user about balance changes

  if (event.data.accountId) {

    // TODO: Refresh account data
    // await refreshAccountData(event.data.accountId);

    // TODO: Update database
    // await updateAccountInDatabase(event.data.accountId);

    // TODO: Notify user
    // await notifyUser(event.data.userId, 'account_updated', event.data);
  }
}

async function handleTransactionUpdate(event: FinAPIWebhookEvent) {

  // In a real implementation, you would:
  // 1. Fetch new transactions from finAPI
  // 2. Categorize transactions with AI/ML
  // 3. Update financial reports
  // 4. Send notifications for important transactions

  if (event.data.transactionId) {

    // TODO: Fetch and process new transaction
    // await processNewTransaction(event.data.transactionId);

    // TODO: Update financial analytics
    // await updateFinancialReports(event.data.userId);

    // TODO: Check for important transactions (large amounts, unusual patterns)
    // await checkTransactionAlerts(event.data.transactionId);
  }
}

async function handleUserUpdate(event: FinAPIWebhookEvent) {

  // In a real implementation, you would:
  // 1. Update user preferences
  // 2. Refresh user permissions
  // 3. Update authentication tokens if needed

  if (event.data.userId) {

    // TODO: Update user data
    // await updateUserInDatabase(event.data.userId);
  }
}

/**
 * Handle Web Form 2.0 callbacks
 */
async function handleWebFormCallback(req: NextRequest, type: string, userId: string) {
  try {
    const webhookData = await req.json();

    if (type === 'success') {
      // Bank connection was successful
      const { payload } = webhookData;

      if (payload?.bankConnectionId) {

        // TODO: Store bank connection in Firestore
        // await storeBankConnection(userId, payload.bankConnectionId, payload);
      }
    } else if (type === 'error') {
      // Bank connection failed

    }

    return NextResponse.json({
      success: true,
      message: 'Web Form callback processed',
      type,
      userId,
    });

  } catch (error) {

    return NextResponse.json(
      { error: 'Web Form callback processing failed' },
      { status: 500 }
    );
  }
}

// Helper function to verify webhook signatures (implement in production)
function verifyWebhookSignature(payload: string, signature: string): boolean {
  // In production, implement proper signature verification using your webhook secret
  // Example with crypto:
  // const crypto = require('crypto');
  // const expectedSignature = crypto
  //   .createHmac('sha256', process.env.FINAPI_WEBHOOK_SECRET)
  //   .update(payload)
  //   .digest('hex');
  // return crypto.timingSafeEqual(
  //   Buffer.from(signature, 'hex'),
  //   Buffer.from(expectedSignature, 'hex')
  // );

  return true; // Skip verification for demo
}

// GET endpoint for webhook verification (some services require this)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const challenge = searchParams.get('challenge');

  if (challenge) {
    // Echo back the challenge for webhook verification
    return NextResponse.json({ challenge });
  }

  return NextResponse.json({
    message: 'finAPI WebHook endpoint is active',
    timestamp: new Date().toISOString(),
  });
}
