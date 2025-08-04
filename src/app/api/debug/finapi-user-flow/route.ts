// src/app/api/debug/finapi-user-flow/route.ts
import { NextRequest, NextResponse } from 'next/server';

const FINAPI_API_URL = 'https://sandbox.finapi.io';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 finAPI User Flow Debug - Teste kompletten User-Workflow...');

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
        },
        { status: 500 }
      );
    }

    const results: any = {
      timestamp: new Date().toISOString(),
      steps: {},
      recommendation: null as string | null,
    };

    console.log('📋 finAPI User Flow Test:');
    console.log('- Default Client ID:', defaultClientId.substring(0, 8) + '...');

    // SCHRITT 1: Default Client Access Token generieren
    console.log('🔑 SCHRITT 1: Default Client Access Token...');
    try {
      const clientTokenResponse = await fetch(`${FINAPI_API_URL}/oauth/token`, {
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
      console.log('📡 Client Token Response:', clientTokenText);

      if (clientTokenResponse.ok) {
        const clientTokenData = JSON.parse(clientTokenText);
        const clientAccessToken = clientTokenData.access_token;

        results.steps['1_client_token'] = {
          success: true,
          status: clientTokenResponse.status,
          token_preview: clientAccessToken ? `${clientAccessToken.substring(0, 20)}...` : null,
        };

        // SCHRITT 2: User erstellen mit Client Access Token
        console.log('👤 SCHRITT 2: User erstellen...');
        try {
          const createUserResponse = await fetch(`${FINAPI_API_URL}/api/v1/users`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${clientAccessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              id: `taskilo_test_user_${Date.now()}`,
              password: 'TestPassword123!',
              email: `test+${Date.now()}@taskilo.de`,
              phone: '+4915112345678',
              isAutoUpdateEnabled: true,
            }),
          });

          const createUserText = await createUserResponse.text();
          console.log('📡 Create User Status:', createUserResponse.status);
          console.log('📡 Create User Response:', createUserText);

          if (createUserResponse.ok || createUserResponse.status === 422) {
            // 422 = User already exists, das ist OK für Test
            const userData = createUserResponse.ok ? JSON.parse(createUserText) : null;

            results.steps['2_create_user'] = {
              success: true,
              status: createUserResponse.status,
              message:
                createUserResponse.status === 422
                  ? 'User already exists (OK for test)'
                  : 'User created successfully',
              user_id: userData?.id || 'existing_user',
            };

            // SCHRITT 3: User Access Token generieren
            console.log('🔐 SCHRITT 3: User Access Token...');
            const testUserId = userData?.id || `taskilo_test_user_${Date.now()}`;

            try {
              const userTokenResponse = await fetch(`${FINAPI_API_URL}/oauth/token`, {
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
              console.log('📡 User Token Response:', userTokenText);

              if (userTokenResponse.ok) {
                const userTokenData = JSON.parse(userTokenText);
                const userAccessToken = userTokenData.access_token;

                results.steps['3_user_token'] = {
                  success: true,
                  status: userTokenResponse.status,
                  token_preview: userAccessToken ? `${userAccessToken.substring(0, 20)}...` : null,
                };

                // SCHRITT 4: Banken auflisten mit User Access Token
                console.log('🏦 SCHRITT 4: Banken auflisten...');
                try {
                  const banksResponse = await fetch(
                    `${FINAPI_API_URL}/api/v1/banks?page=1&perPage=10`,
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
                  console.log('📡 Banks Response (first 200 chars):', banksText.substring(0, 200));

                  if (banksResponse.ok) {
                    const banksData = JSON.parse(banksText);
                    results.steps['4_list_banks'] = {
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

                    results.recommendation =
                      '✅ ERFOLG: Kompletter finAPI User-Flow funktioniert!\n\n🎯 Nächste Schritte:\n1. Diese User-basierte Authentifizierung in der Banking-Integration implementieren\n2. WebForm 2.0 für Bankverbindungen verwenden\n3. User Access Token für alle API-Calls nutzen';
                  } else {
                    results.steps['4_list_banks'] = {
                      success: false,
                      status: banksResponse.status,
                      error: banksText,
                    };
                  }
                } catch (error) {
                  results.steps['4_list_banks'] = {
                    success: false,
                    error: error instanceof Error ? error.message : String(error),
                  };
                }
              } else {
                results.steps['3_user_token'] = {
                  success: false,
                  status: userTokenResponse.status,
                  error: userTokenText,
                };
              }
            } catch (error) {
              results.steps['3_user_token'] = {
                success: false,
                error: error instanceof Error ? error.message : String(error),
              };
            }
          } else {
            results.steps['2_create_user'] = {
              success: false,
              status: createUserResponse.status,
              error: createUserText,
            };
          }
        } catch (error) {
          results.steps['2_create_user'] = {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      } else {
        results.steps['1_client_token'] = {
          success: false,
          status: clientTokenResponse.status,
          error: clientTokenText,
        };
      }
    } catch (error) {
      results.steps['1_client_token'] = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }

    // Fallback recommendation
    if (!results.recommendation) {
      const failedSteps = Object.entries(results.steps).filter(
        ([_, step]: [string, any]) => !step.success
      );
      if (failedSteps.length > 0) {
        results.recommendation = `❌ finAPI User-Flow fehlgeschlagen bei: ${failedSteps.map(([name]) => name).join(', ')}\n\n🔧 Lösungsansätze:\n1. finAPI Credentials im Developer Portal überprüfen\n2. User-Erstellung und Password-Grant Flow testen\n3. finAPI Support mit spezifischen Fehlermeldungen kontaktieren`;
      }
    }

    console.log('✅ finAPI User Flow Debug abgeschlossen');
    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error('❌ finAPI User Flow Debug Fehler:', error);
    return NextResponse.json(
      {
        error: 'User Flow Debug fehlgeschlagen',
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
