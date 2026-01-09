/**
 * Meta API Setup Route
 * 
 * Generiert OAuth URL für Admin-Login um System User Token zu bekommen
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(_request: NextRequest) {
  const appId = process.env.META_APP_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/meta/callback`;
  
  // Alle nötigen Permissions für WhatsApp Business API Setup
  const scopes = [
    'business_management',
    'whatsapp_business_management', 
    'whatsapp_business_messaging',
    'pages_manage_metadata',
  ].join(',');
  
  const loginUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
    `client_id=${appId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `scope=${scopes}&` +
    `response_type=code`;
  
  return NextResponse.json({
    success: true,
    message: 'Öffne diese URL im Browser um dich als Admin einzuloggen',
    loginUrl,
    instructions: [
      '1. Öffne die loginUrl im Browser',
      '2. Logge dich mit deinem Meta-Admin-Account ein',
      '3. Erlaube alle Berechtigungen',
      '4. Du wirst zu /api/meta/callback weitergeleitet',
      '5. Der Access Token wird gespeichert',
    ],
  });
}
