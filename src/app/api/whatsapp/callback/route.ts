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
      console.error('[WhatsApp Callback] Error:', error);
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
      const errorData = await tokenResponse.json();
      console.error('[WhatsApp Callback] Token exchange failed:', errorData);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/company/${state}/whatsapp?error=token_exchange_failed`
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    console.log('[WhatsApp Callback] Token data received:', JSON.stringify(tokenData, null, 2));

    // Bei Embedded Signup gibt Meta die Daten DIREKT zurück!
    // Keine verschachtelten API Calls nötig!
    // Siehe: https://developers.facebook.com/docs/whatsapp/embedded-signup/handle-response

    const wabaId = tokenData.granted_scopes?.includes('whatsapp_business_management')
      ? tokenData.id // User ID oder Business ID
      : null;

    // Versuche Phone Number ID aus dem Token Response zu holen
    let phoneNumberId = '';
    let phoneNumber = '';

    // Debug: Zeige vollständigen Token Response
    console.log('[WhatsApp Callback] Full token response:', tokenData);

    // Option 1: Direkt im Token Response (bei manchen Embedded Signups)
    if (tokenData.phone_number_id) {
      phoneNumberId = tokenData.phone_number_id;
      phoneNumber = tokenData.phone_number || '';
    }
    // Option 2: Hole via Graph API (falls nicht direkt enthalten)
    else if (accessToken) {
      try {
        // Verwende /me/accounts für WhatsApp Business Accounts
        const debugResponse = await fetch(
          `https://graph.facebook.com/v18.0/me?fields=id,name&access_token=${accessToken}`
        );
        const debugData = await debugResponse.json();
        console.log('[WhatsApp Callback] Debug user data:', debugData);

        // Hole subscribed WhatsApp Business Accounts
        const wabaResponse = await fetch(
          `https://graph.facebook.com/v18.0/me/businesses?fields=owned_whatsapp_business_accounts{id,phone_numbers{id,display_phone_number,verified_name}}&access_token=${accessToken}`
        );

        if (wabaResponse.ok) {
          const wabaData = await wabaResponse.json();
          console.log('[WhatsApp Callback] WABA Response:', JSON.stringify(wabaData, null, 2));

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
                  console.log(
                    '[WhatsApp Callback] Found phone number:',
                    phoneNumber,
                    'ID:',
                    phoneNumberId
                  );
                  break;
                }
              }
            }
          }
        }
      } catch (apiError) {
        console.error('[WhatsApp Callback] API error:', apiError);
      }
    }

    if (!phoneNumberId) {
      console.error('[WhatsApp Callback] No phone number found in token response or Graph API');
      console.error('[WhatsApp Callback] Token data keys:', Object.keys(tokenData));
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/company/${state}/whatsapp?error=no_phone_number_found&debug=check_logs`
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
      });

    console.log(
      `[WhatsApp Callback] Successfully connected for company ${state}, phone: ${phoneNumber}, phoneNumberId: ${phoneNumberId}`
    );

    // Redirect zurück zur WhatsApp-Seite
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/company/${state}/whatsapp?success=true`
    );
  } catch (error) {
    console.error('[WhatsApp Callback] Error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=callback_failed`
    );
  }
}
