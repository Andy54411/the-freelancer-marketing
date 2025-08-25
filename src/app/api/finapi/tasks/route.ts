import { NextRequest, NextResponse } from 'next/server';
import { getFinApiCredentials, getFinApiBaseUrl } from '@/lib/finapi-config';

/**
 * finAPI Tasks API - Get All Tasks
 *
 * Retrieves all tasks associated with the authorized user.
 * Uses standard OAuth Bearer Token authentication.
 *
 * API Reference: https://docs.finapi.io/#get-/api/tasks
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const credentialType = (searchParams.get('credentialType') as 'sandbox' | 'admin') || 'sandbox';
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('perPage') || '20');
    const order = searchParams.get('order') || 'createdAt,desc';

    // Get finAPI configuration
    const baseUrl = getFinApiBaseUrl(credentialType);
    const credentials = getFinApiCredentials(credentialType);

    if (!credentials.clientId || !credentials.clientSecret) {
      return NextResponse.json({ error: 'finAPI credentials not configured' }, { status: 500 });
    }

    // Step 1: Get client credentials token
    const tokenResponse = await fetch(`${baseUrl}/api/v2/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();

      return NextResponse.json(
        { error: 'Authentication failed', details: errorText },
        { status: 401 }
      );
    }

    const tokenData = await tokenResponse.json();

    // Step 2: Get tasks from finAPI Tasks API
    // According to docs: API Server is https://webform-sandbox.finapi.io/
    const tasksBaseUrl =
      credentialType === 'sandbox'
        ? 'https://webform-sandbox.finapi.io'
        : 'https://webform.finapi.io';

    const tasksUrl = new URL(`${tasksBaseUrl}/api/tasks`);
    tasksUrl.searchParams.set('page', page.toString());
    tasksUrl.searchParams.set('perPage', perPage.toString());
    tasksUrl.searchParams.set('order', order);

    const tasksResponse = await fetch(tasksUrl.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
        'X-Request-Id': `taskilo-tasks-${Date.now()}`,
      },
    });

    if (!tasksResponse.ok) {
      const errorText = await tasksResponse.text();

      // Handle specific error cases
      if (tasksResponse.status === 403) {
        return NextResponse.json(
          {
            error: 'Tasks API access forbidden',
            details: 'Tasks API may require special permissions or user token',
            suggestion: 'Try with user token instead of client credentials',
          },
          { status: 403 }
        );
      }

      return NextResponse.json(
        {
          error: 'Tasks API request failed',
          status: tasksResponse.status,
          details: errorText,
        },
        { status: tasksResponse.status }
      );
    }

    const tasksData = await tasksResponse.json();

    return NextResponse.json({
      success: true,
      tasks: tasksData.items || [],
      paging: tasksData.paging || {
        page: page,
        perPage: perPage,
        pageCount: 0,
        totalCount: 0,
      },
      meta: {
        environment: credentialType,
        server: tasksBaseUrl,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error.message,
        suggestion: 'Check finAPI credentials and network connectivity',
      },
      { status: 500 }
    );
  }
}

/**
 * Create background update task (POST)
 * For triggering bank connection updates
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { bankConnectionIds, credentialType = 'sandbox' } = body;

    // Get finAPI configuration
    const baseUrl = getFinApiBaseUrl(credentialType);
    const credentials = getFinApiCredentials(credentialType);

    if (!credentials.clientId || !credentials.clientSecret) {
      return NextResponse.json({ error: 'finAPI credentials not configured' }, { status: 500 });
    }

    // Get client token
    const tokenResponse = await fetch(`${baseUrl}/api/v2/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      return NextResponse.json(
        { error: 'Authentication failed', details: errorText },
        { status: 401 }
      );
    }

    const tokenData = await tokenResponse.json();

    // Create background update task
    const tasksBaseUrl =
      credentialType === 'sandbox'
        ? 'https://webform-sandbox.finapi.io'
        : 'https://webform.finapi.io';

    const updateResponse = await fetch(`${tasksBaseUrl}/api/tasks/backgroundUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
        'X-Request-Id': `taskilo-bg-update-${Date.now()}`,
      },
      body: JSON.stringify({
        bankConnectionIds: bankConnectionIds || [],
        importNewTransactions: true,
        skipPositionsDownload: false,
        loadOwnerData: true,
      }),
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      return NextResponse.json(
        {
          error: 'Background update creation failed',
          status: updateResponse.status,
          details: errorText,
        },
        { status: updateResponse.status }
      );
    }

    const updateData = await updateResponse.json();

    return NextResponse.json({
      success: true,
      task: updateData,
      meta: {
        environment: credentialType,
        server: tasksBaseUrl,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
