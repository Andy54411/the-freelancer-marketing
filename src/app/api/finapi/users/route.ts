import { NextRequest, NextResponse } from 'next/server';
import { getFinApiBaseUrl, getFinApiCredentials } from '@/lib/finapi-config';
import {
  AuthorizationApi,
  UsersApi,
  createConfiguration,
  ServerConfiguration,
} from 'finapi-client';

// Create a new finAPI user
export async function POST(req: NextRequest) {
  try {
    const { email, password, credentialType = 'sandbox' } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Get finAPI configuration
    const baseUrl = getFinApiBaseUrl(credentialType);
    const credentials = getFinApiCredentials(credentialType);

    console.log(`Creating finAPI user with ${credentialType} credentials`);

    if (!credentials.clientId || !credentials.clientSecret) {
      return NextResponse.json({ error: 'finAPI credentials not configured' }, { status: 500 });
    }

    // Step 1: Get client credentials token
    const server = new ServerConfiguration(baseUrl, {});
    const configuration = createConfiguration({
      baseServer: server,
    });

    const authApi = new AuthorizationApi(configuration);

    const clientToken = await authApi.getToken(
      'client_credentials',
      credentials.clientId,
      credentials.clientSecret
    );

    console.log('Client token obtained for user creation');

    // Step 2: Create user with client token
    const userConfiguration = createConfiguration({
      baseServer: server,
      authMethods: {
        finapi_auth: {
          accessToken: clientToken.accessToken,
        },
      },
    });

    const usersApi = new UsersApi(userConfiguration);

    let newUser;
    let userExists = false;

    try {
      newUser = await usersApi.createUser({
        id: email, // Use email as user ID
        password: password,
        email: email,
        phone: undefined, // Optional
        isAutoUpdateEnabled: true, // Enable automatic bank data updates
      });

      console.log('finAPI user created successfully:', { id: newUser.id, email: newUser.email });
    } catch (createError: any) {
      console.error('Error creating user:', createError);

      // Check if user already exists
      if (
        createError.body?.errors?.[0]?.code === 'ENTITY_EXISTS' ||
        createError.message?.includes('already exists') ||
        createError.message?.includes('same identifier')
      ) {
        console.log('User already exists, attempting to authenticate existing user');
        userExists = true;

        // Try to get user token for existing user
        try {
          const userToken = await authApi.getToken(
            'password',
            credentials.clientId,
            credentials.clientSecret,
            email,
            password
          );

          console.log('Authenticated existing user successfully');

          // Get user info to return consistent response
          const userInfoConfig = createConfiguration({
            baseServer: server,
            authMethods: {
              finapi_auth: {
                accessToken: userToken.accessToken,
              },
            },
          });

          const userInfoApi = new UsersApi(userInfoConfig);
          const existingUser = await userInfoApi.getAuthorizedUser();

          return NextResponse.json({
            success: true,
            user: {
              id: existingUser.id,
              email: existingUser.email,
              isAutoUpdateEnabled: existingUser.isAutoUpdateEnabled,
            },
            access_token: userToken.accessToken,
            token_type: userToken.tokenType || 'Bearer',
            expires_in: userToken.expiresIn,
            message: 'Bestehender finAPI-User erfolgreich authentifiziert',
          });
        } catch (authError: any) {
          console.error('Failed to authenticate existing user:', authError);
          return NextResponse.json(
            {
              success: false,
              error: 'User existiert bereits, aber Authentifizierung fehlgeschlagen',
              details:
                'Bitte überprüfen Sie Ihre Anmeldedaten oder verwenden Sie andere Zugangsdaten',
              type: 'EXISTING_USER_AUTH_ERROR',
            },
            { status: 422 }
          );
        }
      } else {
        // Handle other API errors properly
        console.error('finAPI API Error:', createError);
        return NextResponse.json(
          {
            success: false,
            error: 'finAPI User Erstellung fehlgeschlagen',
            details:
              createError.body?.errors?.[0]?.message || createError.message || 'Unbekannter Fehler',
            type: 'USER_CREATION_ERROR',
          },
          { status: createError.status || 500 }
        );
      }
    }

    // Step 3: Get user token for the new user (only if user was newly created)
    if (!userExists) {
      const userToken = await authApi.getToken(
        'password',
        credentials.clientId,
        credentials.clientSecret,
        email,
        password
      );

      console.log('User token obtained for new user');

      return NextResponse.json({
        success: true,
        user: {
          id: newUser!.id,
          email: newUser!.email,
          isAutoUpdateEnabled: newUser!.isAutoUpdateEnabled,
        },
        access_token: userToken.accessToken,
        token_type: userToken.tokenType || 'Bearer',
        expires_in: userToken.expiresIn,
        message: 'Neuer finAPI-User erfolgreich erstellt',
      });
    }
  } catch (error) {
    console.error('finAPI user creation error:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: 'Failed to create finAPI user',
          details: error.message,
          type: 'USER_CREATION_ERROR',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Get user information
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { searchParams } = new URL(req.url);
    const credentialType = (searchParams.get('credentialType') as 'sandbox' | 'admin') || 'sandbox';

    // Get finAPI configuration
    const baseUrl = getFinApiBaseUrl(credentialType);
    const server = new ServerConfiguration(baseUrl, {});

    const configuration = createConfiguration({
      baseServer: server,
      authMethods: {
        finapi_auth: {
          accessToken: token,
        },
      },
    });

    const usersApi = new UsersApi(configuration);
    const userInfo = await usersApi.getAuthorizedUser();

    console.log('User info retrieved:', { id: userInfo.id, email: userInfo.email });

    return NextResponse.json({
      user: {
        id: userInfo.id,
        email: userInfo.email,
        isAutoUpdateEnabled: userInfo.isAutoUpdateEnabled,
      },
    });
  } catch (error) {
    console.error('finAPI get user error:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: 'Failed to get user info',
          details: error.message,
          type: 'USER_INFO_ERROR',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
