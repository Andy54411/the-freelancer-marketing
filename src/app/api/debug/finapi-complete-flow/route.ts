// src/app/api/debug/finapi-complete-flow/route.ts
import { NextRequest, NextResponse } from 'next/server';

const FINAPI_API_URL = 'https://sandbox.finapi.io';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 finAPI Complete Flow Debug - Teste User + Banking Workflow...');

    // Environment Variables
    const defaultClientId = process.env.FINAPI_SANDBOX_CLIENT_ID;
    const defaultClientSecret = process.env.FINAPI_SANDBOX_CLIENT_SECRET;

    if (!defaultClientId || !defaultClientSecret) {
      return NextResponse.json(
        {
          error: 'Missing finAPI credentials',
          missingVars: {
            FINAPI_SANDBOX_CLIENT_ID: !defaultClientId,
            FINAPI_SANDBOX_CLIENT_SECRET: !defaultClientSecret,
          },
          recommendation:
            '🔧 LÖSUNG: Neue Credentials im finAPI Developer Portal erstellen:\n1. https://finapi.io/ → Login\n2. Applications → Neue Client ID/Secret\n3. Vercel Environment Variables aktualisieren',
        },
        { status: 500 }
      );
    }

    const results: any = {
      timestamp: new Date().toISOString(),
      phase1_user_auth: {},
      phase2_banking: {},
      recommendation: null as string | null,
    };

    console.log('📋 finAPI Complete Flow Test:');
    console.log('- Default Client ID:', defaultClientId.substring(0, 8) + '...');

    // ========== PHASE 1: USER AUTHENTICATION ==========
    console.log('\n🔐 === PHASE 1: USER AUTHENTICATION ===');

    // SCHRITT 1: Default Client Access Token generieren
    console.log('🔑 SCHRITT 1: Default Client Access Token...');
    let clientAccessToken: string | null = null;

    try {
      const clientTokenResponse = await fetch(`${FINAPI_API_URL}/api/v2/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: defaultClientId,
          client_secret: defaultClientSecret,
        }),
      });

      const clientTokenText = await clientTokenResponse.text();
      console.log('📡 Client Token Status:', clientTokenResponse.status);

      if (clientTokenResponse.ok) {
        const clientTokenData = JSON.parse(clientTokenText);
        clientAccessToken = clientTokenData.access_token;

        results.phase1_user_auth['1_client_token'] = {
          success: true,
          status: clientTokenResponse.status,
          token_preview: clientAccessToken ? `${clientAccessToken.substring(0, 20)}...` : null,
        };

        // SCHRITT 2: User erstellen mit Client Access Token
        console.log('👤 SCHRITT 2: User erstellen...');
        const testUserId = `taskilo_test_user_${Date.now()}`;

        try {
          const createUserResponse = await fetch(`${FINAPI_API_URL}/api/v2/users`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${clientAccessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              id: testUserId,
              password: 'TestPassword123!',
              email: `test+${Date.now()}@taskilo.de`,
              phone: '+4915112345678',
              isAutoUpdateEnabled: true,
            }),
          });

          const createUserText = await createUserResponse.text();
          console.log('📡 Create User Status:', createUserResponse.status);

          if (createUserResponse.ok || createUserResponse.status === 422) {
            // 422 = User already exists, das ist OK für Test
            const userData = createUserResponse.ok ? JSON.parse(createUserText) : null;

            results.phase1_user_auth['2_create_user'] = {
              success: true,
              status: createUserResponse.status,
              message:
                createUserResponse.status === 422
                  ? 'User already exists (OK for test)'
                  : 'User created successfully',
              user_id: userData?.id || testUserId,
            };

            // SCHRITT 3: User Access Token generieren
            console.log('🔐 SCHRITT 3: User Access Token...');
            let userAccessToken: string | null = null;

            try {
              const userTokenResponse = await fetch(`${FINAPI_API_URL}/api/v2/oauth/token`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                  grant_type: 'password',
                  client_id: defaultClientId,
                  client_secret: defaultClientSecret,
                  username: testUserId,
                  password: 'TestPassword123!',
                }),
              });

              const userTokenText = await userTokenResponse.text();
              console.log('📡 User Token Status:', userTokenResponse.status);

              if (userTokenResponse.ok) {
                const userTokenData = JSON.parse(userTokenText);
                userAccessToken = userTokenData.access_token;

                results.phase1_user_auth['3_user_token'] = {
                  success: true,
                  status: userTokenResponse.status,
                  token_preview: userAccessToken ? `${userAccessToken.substring(0, 20)}...` : null,
                };

                // ========== PHASE 2: BANKING INTEGRATION ==========
                console.log('\n🏦 === PHASE 2: BANKING INTEGRATION ===');

                // SCHRITT 4: WebForm 2.0 für Bank Connection Import
                console.log('🌐 SCHRITT 4: WebForm 2.0 erstellen...');
                try {
                  const webFormResponse = await fetch(
                    `${FINAPI_API_URL}/api/webForms/bankConnectionImport`,
                    {
                      method: 'POST',
                      headers: {
                        Authorization: `Bearer ${userAccessToken}`,
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        accountTypes: ['CHECKING', 'SAVINGS'], // Nur Giro- und Sparkonten
                        callbacks: {
                          finalResult: 'https://taskilo.de/api/finapi/callback',
                        },
                        branding: {
                          logo: 'https://taskilo.de/logo.png',
                          theme: 'light',
                        },
                      }),
                    }
                  );

                  const webFormText = await webFormResponse.text();
                  console.log('📡 WebForm Status:', webFormResponse.status);
                  console.log(
                    '📡 WebForm Response (first 300 chars):',
                    webFormText.substring(0, 300)
                  );

                  if (webFormResponse.ok) {
                    const webFormData = JSON.parse(webFormText);
                    results.phase2_banking['4_webform_creation'] = {
                      success: true,
                      status: webFormResponse.status,
                      webform_url: webFormData.url,
                      webform_id: webFormData.id,
                    };

                    // SCHRITT 5: Bank List (zur Validierung)
                    console.log('🏛️ SCHRITT 5: Verfügbare Banken auflisten...');
                    try {
                      const banksResponse = await fetch(
                        `${FINAPI_API_URL}/api/v2/banks?page=1&perPage=5`,
                        {
                          method: 'GET',
                          headers: {
                            Authorization: `Bearer ${userAccessToken}`,
                            'Content-Type': 'application/json',
                          },
                        }
                      );

                      const banksText = await banksResponse.text();
                      console.log('📡 Banks Status:', banksResponse.status);

                      if (banksResponse.ok) {
                        const banksData = JSON.parse(banksText);
                        results.phase2_banking['5_list_banks'] = {
                          success: true,
                          status: banksResponse.status,
                          banks_count: banksData.banks?.length || 0,
                          sample_banks:
                            banksData.banks?.slice(0, 3).map((bank: any) => ({
                              id: bank.id,
                              name: bank.name,
                              country: bank.location,
                            })) || [],
                        };

                        results.recommendation = `✅ ERFOLG: Kompletter finAPI Flow funktioniert!\n\n🎯 WebForm URL: ${webFormData.url}\n\n📋 Nächste Schritte:\n1. WebForm 2.0 in Banking-Seite integrieren\n2. User zur Bank-Authentifizierung weiterleiten\n3. Callback-System für automatische Updates implementieren\n4. Konten & Transaktionen nach erfolgreicher Verknüpfung abrufen`;
                      } else {
                        results.phase2_banking['5_list_banks'] = {
                          success: false,
                          status: banksResponse.status,
                          error: banksText,
                        };
                      }
                    } catch (error) {
                      results.phase2_banking['5_list_banks'] = {
                        success: false,
                        error: error instanceof Error ? error.message : String(error),
                      };
                    }
                  } else {
                    results.phase2_banking['4_webform_creation'] = {
                      success: false,
                      status: webFormResponse.status,
                      error: webFormText,
                    };
                  }
                } catch (error) {
                  results.phase2_banking['4_webform_creation'] = {
                    success: false,
                    error: error instanceof Error ? error.message : String(error),
                  };
                }
              } else {
                results.phase1_user_auth['3_user_token'] = {
                  success: false,
                  status: userTokenResponse.status,
                  error: userTokenText,
                };
              }
            } catch (error) {
              results.phase1_user_auth['3_user_token'] = {
                success: false,
                error: error instanceof Error ? error.message : String(error),
              };
            }
          } else {
            results.phase1_user_auth['2_create_user'] = {
              success: false,
              status: createUserResponse.status,
              error: createUserText,
            };
          }
        } catch (error) {
          results.phase1_user_auth['2_create_user'] = {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      } else {
        results.phase1_user_auth['1_client_token'] = {
          success: false,
          status: clientTokenResponse.status,
          error: clientTokenText,
        };
      }
    } catch (error) {
      results.phase1_user_auth['1_client_token'] = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }

    // Fallback recommendation
    if (!results.recommendation) {
      const phase1Failed = Object.values(results.phase1_user_auth).some(
        (step: any) => !step.success
      );
      const phase2Failed = Object.values(results.phase2_banking).some((step: any) => !step.success);

      if (phase1Failed) {
        results.recommendation = `❌ PHASE 1 (User Authentication) fehlgeschlagen!\n\n🔧 SOFORT-LÖSUNG:\n1. Gehe zu https://finapi.io/\n2. Login in Developer Account\n3. Erstelle neue Client Credentials\n4. Update Vercel Environment Variables:\n   - FINAPI_SANDBOX_CLIENT_ID\n   - FINAPI_SANDBOX_CLIENT_SECRET\n\n📧 Referenz: finAPI Support E-Mail von Ramona (04.08.2025)`;
      } else if (phase2Failed) {
        results.recommendation = `❌ PHASE 2 (Banking Integration) fehlgeschlagen!\n\nUser Authentication funktioniert, aber WebForm/Banking API hat Probleme.\n\n🔧 Lösungsansätze:\n1. finAPI Support kontaktieren mit spezifischen Fehlermeldungen\n2. WebForm 2.0 Parameter überprüfen\n3. Callback URLs validieren`;
      }
    }

    console.log('✅ finAPI Complete Flow Debug abgeschlossen');
    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error('❌ finAPI Complete Flow Debug Fehler:', error);
    return NextResponse.json(
      {
        error: 'Complete Flow Debug fehlgeschlagen',
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
