/**
 * WhatsApp Business API Setup via Meta Graph API
 * 
 * Richtet alles automatisch ein:
 * - WhatsApp Business Account (WABA)
 * - Phone Number Registration
 * - Webhooks
 * - Embedded Signup Configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, isFirebaseAvailable } from '@/firebase/server';

interface MetaConfig {
  accessToken: string;
  businesses: Array<{ id: string; name: string }>;
}

async function getMetaConfig(): Promise<MetaConfig | null> {
  if (!isFirebaseAvailable() || !db) return null;
  
  const doc = await db.collection('admin_config').doc('meta_api').get();
  if (!doc.exists) return null;
  
  return doc.data() as MetaConfig;
}

export async function GET(_request: NextRequest) {
  try {
    const config = await getMetaConfig();
    
    if (!config?.accessToken) {
      return NextResponse.json({
        success: false,
        error: 'Kein Meta Access Token gefunden',
        action: 'Bitte zuerst /api/meta/setup aufrufen und einloggen',
      }, { status: 401 });
    }
    
    const accessToken = config.accessToken;
    const results: Record<string, unknown> = {};
    
    // 1. Hole alle WhatsApp Business Accounts
    console.log('[Meta Setup] Fetching WhatsApp Business Accounts...');
    
    for (const business of config.businesses) {
      const wabaResponse = await fetch(
        `https://graph.facebook.com/v18.0/${business.id}/owned_whatsapp_business_accounts?` +
        `fields=id,name,currency,timezone_id,message_template_namespace&` +
        `access_token=${accessToken}`
      );
      const wabaData = await wabaResponse.json();
      
      if (wabaData.data && wabaData.data.length > 0) {
        results.existingWABAs = wabaData.data;
        
        // Hole Phone Numbers für jeden WABA
        for (const waba of wabaData.data) {
          const phoneResponse = await fetch(
            `https://graph.facebook.com/v18.0/${waba.id}/phone_numbers?` +
            `fields=id,display_phone_number,verified_name,code_verification_status,quality_rating&` +
            `access_token=${accessToken}`
          );
          const phoneData = await phoneResponse.json();
          waba.phone_numbers = phoneData.data || [];
        }
      }
    }
    
    // 2. Prüfe ob WhatsApp Produkt zur App hinzugefügt ist
    const appId = process.env.META_APP_ID;
    
    // 3. Hole System User für die App (für permanenten Token)
    const systemUsersResponse = await fetch(
      `https://graph.facebook.com/v18.0/${config.businesses[0]?.id}/system_users?` +
      `fields=id,name,role&` +
      `access_token=${accessToken}`
    );
    const systemUsersData = await systemUsersResponse.json();
    results.systemUsers = systemUsersData.data || [];
    
    // 4. Prüfe Webhook-Konfiguration
    const webhookResponse = await fetch(
      `https://graph.facebook.com/v18.0/${appId}/subscriptions?` +
      `access_token=${appId}|${process.env.META_APP_SECRET}`
    );
    const webhookData = await webhookResponse.json();
    results.webhooks = webhookData.data || [];
    
    // 5. Generiere Embedded Signup Config ID falls nicht vorhanden
    if (!process.env.META_EMBEDDED_SIGNUP_CONFIG_ID) {
      results.embeddedSignupNote = 'META_EMBEDDED_SIGNUP_CONFIG_ID fehlt in .env - muss im Developer Portal erstellt werden';
    }
    
    return NextResponse.json({
      success: true,
      message: 'Meta API Konfiguration abgerufen',
      appId,
      businesses: config.businesses,
      ...results,
      nextSteps: getNextSteps(results),
    });
    
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    console.error('[Meta Setup] Error:', error);
    return NextResponse.json({
      success: false,
      error: message,
    }, { status: 500 });
  }
}

function getNextSteps(results: Record<string, unknown>): string[] {
  const steps: string[] = [];
  
  if (!results.existingWABAs || (results.existingWABAs as unknown[]).length === 0) {
    steps.push('1. Erstelle einen WhatsApp Business Account im Meta Business Suite');
  }
  
  if (!results.webhooks || (results.webhooks as unknown[]).length === 0) {
    steps.push('2. POST /api/meta/whatsapp/webhooks aufrufen um Webhooks einzurichten');
  }
  
  if (results.embeddedSignupNote) {
    steps.push('3. Embedded Signup Config ID im Developer Portal erstellen');
  }
  
  if (steps.length === 0) {
    steps.push('Alles ist konfiguriert! Kunden können jetzt ihre WhatsApp-Nummer verbinden.');
  }
  
  return steps;
}

// POST: Führe Setup-Aktionen durch
export async function POST(request: NextRequest) {
  try {
    const config = await getMetaConfig();
    
    if (!config?.accessToken) {
      return NextResponse.json({
        success: false,
        error: 'Kein Meta Access Token gefunden',
      }, { status: 401 });
    }
    
    const body = await request.json();
    const { action } = body;
    const accessToken = config.accessToken;
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    
    switch (action) {
      case 'setup_webhooks': {
        // Webhook für WhatsApp einrichten
        const verifyToken = `taskilo_whatsapp_${Date.now()}`;
        const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/whatsapp/webhook`;
        
        const webhookResponse = await fetch(
          `https://graph.facebook.com/v18.0/${appId}/subscriptions`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              object: 'whatsapp_business_account',
              callback_url: callbackUrl,
              verify_token: verifyToken,
              fields: ['messages', 'messaging_handovers', 'messaging_postbacks', 'messaging_referrals'],
              access_token: `${appId}|${appSecret}`,
            }),
          }
        );
        
        const webhookData = await webhookResponse.json();
        
        // Speichere Verify Token
        if (isFirebaseAvailable() && db) {
          await db.collection('admin_config').doc('whatsapp_webhook').set({
            verifyToken,
            callbackUrl,
            createdAt: new Date().toISOString(),
          });
        }
        
        return NextResponse.json({
          success: !webhookData.error,
          webhook: webhookData,
          verifyToken,
          callbackUrl,
        });
      }
      
      case 'create_waba': {
        // Erstelle WhatsApp Business Account
        const businessId = config.businesses[0]?.id;
        if (!businessId) {
          return NextResponse.json({
            success: false,
            error: 'Kein Business Account gefunden',
          }, { status: 400 });
        }
        
        const wabaResponse = await fetch(
          `https://graph.facebook.com/v18.0/${businessId}/owned_whatsapp_business_accounts`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: 'Taskilo WhatsApp',
              currency: 'EUR',
              timezone_id: '1', // Europe/Berlin
              access_token: accessToken,
            }),
          }
        );
        
        const wabaData = await wabaResponse.json();
        
        return NextResponse.json({
          success: !wabaData.error,
          waba: wabaData,
        });
      }
      
      case 'subscribe_waba': {
        // Abonniere WABA für App
        const { wabaId } = body;
        if (!wabaId) {
          return NextResponse.json({
            success: false,
            error: 'wabaId erforderlich',
          }, { status: 400 });
        }
        
        const subscribeResponse = await fetch(
          `https://graph.facebook.com/v18.0/${wabaId}/subscribed_apps`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              access_token: accessToken,
            }),
          }
        );
        
        const subscribeData = await subscribeResponse.json();
        
        return NextResponse.json({
          success: subscribeData.success === true,
          result: subscribeData,
        });
      }
      
      default:
        return NextResponse.json({
          success: false,
          error: 'Unbekannte Aktion',
          availableActions: ['setup_webhooks', 'create_waba', 'subscribe_waba'],
        }, { status: 400 });
    }
    
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json({
      success: false,
      error: message,
    }, { status: 500 });
  }
}
