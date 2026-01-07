import { NextRequest, NextResponse } from 'next/server';
import { db, isFirebaseAvailable } from '@/firebase/server';

/**
 * WhatsApp Embedded Signup Callback
 *
 * Wird von Meta nach erfolgreichem Signup aufgerufen.
 * Erhält Authorization Code und tauscht ihn gegen Access Token.
 */
export async function GET(request: NextRequest) {
  try {
    if (!isFirebaseAvailable() || !db) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=firebase_unavailable`
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // companyId
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/company/${state}/whatsapp?error=${error}`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=missing_params`
      );
    }

    // Tausche Authorization Code gegen Access Token
    const tokenResponse = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?` +
        `client_id=${process.env.META_APP_ID}&` +
        `client_secret=${process.env.META_APP_SECRET}&` +
        `code=${code}&` +
        `redirect_uri=${encodeURIComponent(process.env.NEXT_PUBLIC_APP_URL + '/api/whatsapp/callback')}`
    );

    if (!tokenResponse.ok) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/company/${state}/whatsapp?error=token_exchange_failed`
      );
    }

    const tokenData = await tokenResponse.json();
    let accessToken = tokenData.access_token;

    // AUTOMATISCH: Short-Lived Token in Long-Lived Token umtauschen (60 Tage gültig!)
    let tokenType = 'short-lived';
    let tokenExpiresAt = null;
    
    try {
      const longLivedResponse = await fetch(
        `https://graph.facebook.com/v18.0/oauth/access_token?` +
        `grant_type=fb_exchange_token&` +
        `client_id=${process.env.META_APP_ID}&` +
        `client_secret=${process.env.META_APP_SECRET}&` +
        `fb_exchange_token=${accessToken}`
      );
      
      if (longLivedResponse.ok) {
        const longLivedData = await longLivedResponse.json();
        if (longLivedData.access_token) {
          accessToken = longLivedData.access_token;
          tokenType = 'long-lived';
          // Long-lived tokens sind 60 Tage gültig
          tokenExpiresAt = new Date(Date.now() + (longLivedData.expires_in || 5184000) * 1000).toISOString();
        }
      }
    } catch {
      // Token-Upgrade fehlgeschlagen, fahre mit short-lived Token fort
    }

    // Bei Embedded Signup gibt Meta die Daten DIREKT zurück!
    // Siehe: https://developers.facebook.com/docs/whatsapp/embedded-signup/handle-response

    const wabaId = tokenData.granted_scopes?.includes('whatsapp_business_management')
      ? tokenData.id // User ID oder Business ID
      : null;

    // Versuche Phone Number ID aus dem Token Response zu holen
    let phoneNumberId = '';
    let phoneNumber = '';

    // Option 1: Direkt im Token Response (bei manchen Embedded Signups)
    if (tokenData.phone_number_id) {
      phoneNumberId = tokenData.phone_number_id;
      phoneNumber = tokenData.phone_number || '';
    }
    // Option 2: Hole via Graph API (falls nicht direkt enthalten)
    else if (accessToken) {
      try {
        // Hole subscribed WhatsApp Business Accounts
        const wabaResponse = await fetch(
          `https://graph.facebook.com/v18.0/me/businesses?fields=owned_whatsapp_business_accounts{id,phone_numbers{id,display_phone_number,verified_name}}&access_token=${accessToken}`
        );

        if (wabaResponse.ok) {
          const wabaData = await wabaResponse.json();

          // Durchsuche alle Business Accounts nach WABA mit Phone Numbers
          if (wabaData.data && wabaData.data.length > 0) {
            for (const business of wabaData.data) {
              const wabas = business.owned_whatsapp_business_accounts?.data;
              if (wabas && wabas.length > 0) {
                const waba = wabas[0];
                const phoneNumbers = waba.phone_numbers?.data;
                if (phoneNumbers && phoneNumbers.length > 0) {
                  phoneNumberId = phoneNumbers[0].id;
                  phoneNumber =
                    phoneNumbers[0].display_phone_number || phoneNumbers[0].verified_name || '';
                  break;
                }
              }
            }
          }
        }
      } catch {
        // API-Fehler, fahre fort ohne Phone Number
      }
    }

    if (!phoneNumberId) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/company/${state}/whatsapp?error=no_phone_number_found`
      );
    }

    // Speichere Verbindung in Firestore
    await db
      .collection('companies')
      .doc(state)
      .collection('whatsappConnection')
      .doc('current')
      .set({
        companyId: state,
        accessToken,
        phoneNumberId,
        phoneNumber,
        wabaId: wabaId || 'unknown',
        isConnected: true,
        connectedAt: new Date().toISOString(),
        status: 'active',
        tokenType,
        tokenExpiresAt,
        tokenLastUpdated: new Date().toISOString(),
      });

    // Redirect zurück zur WhatsApp-Seite
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/company/${state}/whatsapp?success=true`
    );
  } catch {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=callback_failed`
    );
  }
}

