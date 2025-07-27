// src/app/api/stripe-error-monitor/route.ts
import { NextRequest, NextResponse } from 'next/server';

// Rate limiting monitoring for Stripe errors
const errorLogStats = new Map<string, { count: number; lastSeen: number }>();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const reset = searchParams.get('reset') === 'true';

  if (reset) {
    errorLogStats.clear();
    return NextResponse.json({
      message: 'Error monitoring stats reset',
      timestamp: new Date().toISOString(),
    });
  }

  const now = Date.now();
  const stats = Array.from(errorLogStats.entries()).map(([key, data]) => ({
    errorType: key,
    count: data.count,
    lastSeen: new Date(data.lastSeen).toISOString(),
    ageMinutes: Math.round((now - data.lastSeen) / 60000),
  }));

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    totalErrorTypes: stats.length,
    recentErrors: stats.filter(s => s.ageMinutes < 60), // Errors in last hour
    allErrors: stats.sort(
      (a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime()
    ),
    recommendations: {
      highFrequencyErrors: stats.filter(s => s.count > 10),
      actionNeeded:
        stats.filter(s => s.count > 10).length > 0
          ? 'Consider investigating high frequency errors'
          : 'Error rates are within normal limits',
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const { errorType } = await req.json();

    if (!errorType) {
      return NextResponse.json({ error: 'errorType required' }, { status: 400 });
    }

    const now = Date.now();
    const current = errorLogStats.get(errorType) || { count: 0, lastSeen: 0 };

    errorLogStats.set(errorType, {
      count: current.count + 1,
      lastSeen: now,
    });

    return NextResponse.json({
      recorded: true,
      errorType,
      newCount: current.count + 1,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
