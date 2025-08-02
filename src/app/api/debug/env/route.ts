import { NextResponse } from 'next/server';

export async function GET() {
  // Debug-Route um Environment Variables zu prüfen
  const envCheck = {
    FINAPI_SANDBOX_CLIENT_ID: process.env.FINAPI_SANDBOX_CLIENT_ID ? 'SET' : 'NOT SET',
    FINAPI_SANDBOX_CLIENT_SECRET: process.env.FINAPI_SANDBOX_CLIENT_SECRET ? 'SET' : 'NOT SET',
    FINAPI_ADMIN_CLIENT_ID: process.env.FINAPI_ADMIN_CLIENT_ID ? 'SET' : 'NOT SET',
    FINAPI_ADMIN_CLIENT_SECRET: process.env.FINAPI_ADMIN_CLIENT_SECRET ? 'SET' : 'NOT SET',
    FINAPI_ENVIRONMENT: process.env.FINAPI_ENVIRONMENT ? 'SET' : 'NOT SET',
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL ? 'SET' : 'NOT SET',
  };

  return NextResponse.json(envCheck);
}
