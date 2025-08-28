import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('🎯 TEST ROUTE CALLED!');
  return NextResponse.json({ success: true, message: 'Test route works!' });
}
