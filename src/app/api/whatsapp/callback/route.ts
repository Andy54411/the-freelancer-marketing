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

    console.log('[WhatsApp Callback] Access token received');

    // Hole WhatsApp Business Accounts des Users
    const accountsResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/businesses?access_token=${accessToken}`
    );

    let phoneNumberId = '';
    let wabaId = '';
    let phoneNumber = '';

    if (accountsResponse.ok) {
      const accountsData = await accountsResponse.json();
      console.log('[WhatsApp Callback] Business accounts:', accountsData);

      // Hole WABA IDs
      if (accountsData.data && accountsData.data.length > 0) {
        const businessId = accountsData.data[0].id;
        
        // Hole WhatsApp Business Accounts
        const wabaResponse = await fetch(
          `https://graph.facebook.com/v18.0/${businessId}/owned_whatsapp_business_accounts?access_token=${accessToken}`
        );

        if (wabaResponse.ok) {
          const wabaData = await wabaResponse.json();
          console.log('[WhatsApp Callback] WABA data:', wabaData);

          if (wabaData.data && wabaData.data.length > 0) {
            wabaId = wabaData.data[0].id;

            // Hole Phone Numbers
            const phoneResponse = await fetch(
              `https://graph.facebook.com/v18.0/${wabaId}/phone_numbers?access_token=${accessToken}`
            );

            if (phoneResponse.ok) {
              const phoneData = await phoneResponse.json();
              console.log('[WhatsApp Callback] Phone numbers:', phoneData);

              if (phoneData.data && phoneData.data.length > 0) {
                phoneNumberId = phoneData.data[0].id;
                phoneNumber = phoneData.data[0].display_phone_number;
              }
            }
          }
        }
      }
    }

    if (!phoneNumberId || !wabaId) {
      console.error('[WhatsApp Callback] Could not retrieve phone number info');
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
        wabaId,
        isConnected: true,
        connectedAt: new Date().toISOString(),
        status: 'active'
      });

    console.log(`[WhatsApp Callback] Successfully connected for company ${state}, phone: ${phoneNumber}`);

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
