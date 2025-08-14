// AWS WorkMail SSO Integration API
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

// JWT Secret für Admin-Tokens
const JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || 'taskilo-admin-secret-key-2024'
);

// WorkMail Admin User Mapping
const WORKMAIL_ADMIN_MAPPING = {
  'andy.staudinger@taskilo.de': {
    email: 'andy.staudinger@taskilo.de',
    password: process.env.WORKMAIL_ANDY_PASSWORD || 'temp_password',
    role: 'master_admin',
  },
  'admin@taskilo.de': {
    email: 'support@taskilo.de',
    password: process.env.WORKMAIL_SUPPORT_PASSWORD || 'temp_password',
    role: 'admin',
  },
  'support@taskilo.de': {
    email: 'support@taskilo.de',
    password: process.env.WORKMAIL_SUPPORT_PASSWORD || 'temp_password',
    role: 'admin',
  },
};

async function verifyAdminAuth(): Promise<any> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('taskilo-admin-token')?.value;

    if (!token) {
      return null;
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch (error) {
    console.error('Auth verification error:', error);
    return null;
  }
}

export async function GET() {
  try {
    const adminUser = await verifyAdminAuth();

    if (!adminUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'Admin-Authentifizierung erforderlich',
        },
        { status: 401 }
      );
    }

    // WorkMail Credentials für den eingeloggten Admin abrufen
    const adminEmail = adminUser.email as string;
    const workmailCredentials = WORKMAIL_ADMIN_MAPPING[adminEmail];

    if (!workmailCredentials) {
      return NextResponse.json(
        {
          success: false,
          error: 'Keine WorkMail-Berechtigung für diesen Admin',
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      workmail: {
        organization: 'taskilo-org',
        domain: 'taskilo.de',
        webInterface: 'https://taskilo-org.awsapps.com/mail',
        email: workmailCredentials.email,
        role: workmailCredentials.role,
        smtp: {
          host: 'smtp.mail.us-east-1.awsapps.com',
          port: 465,
          secure: true,
        },
        imap: {
          host: 'imap.mail.us-east-1.awsapps.com',
          port: 993,
          secure: true,
        },
      },
      admin: {
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role,
      },
    });
  } catch (error) {
    console.error('WorkMail SSO error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'WorkMail SSO fehlgeschlagen',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminUser = await verifyAdminAuth();

    if (!adminUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'Admin-Authentifizierung erforderlich',
        },
        { status: 401 }
      );
    }

    const { action } = await request.json();

    switch (action) {
      case 'get_workmail_token':
        // Generiere temporären WorkMail Access Token
        const adminEmail = adminUser.email as string;
        const workmailCredentials = WORKMAIL_ADMIN_MAPPING[adminEmail];

        if (!workmailCredentials) {
          return NextResponse.json(
            {
              success: false,
              error: 'Keine WorkMail-Berechtigung',
            },
            { status: 403 }
          );
        }

        // Erstelle temporären Token für WorkMail-Zugriff
        const workmailToken = Buffer.from(
          JSON.stringify({
            email: workmailCredentials.email,
            password: workmailCredentials.password,
            timestamp: Date.now(),
            adminUser: adminUser.email,
          })
        ).toString('base64');

        return NextResponse.json({
          success: true,
          workmailToken,
          credentials: {
            email: workmailCredentials.email,
            smtp: 'smtp.mail.us-east-1.awsapps.com:465',
            imap: 'imap.mail.us-east-1.awsapps.com:993',
          },
        });

      case 'open_workmail_interface':
        // Öffne WorkMail Web Interface mit SSO
        return NextResponse.json({
          success: true,
          redirectUrl: 'https://taskilo-org.awsapps.com/mail',
          message: 'WorkMail Interface wird geöffnet. Verwenden Sie Ihre Admin-E-Mail zum Login.',
        });

      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Unbekannte Aktion',
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('WorkMail SSO POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Aktion fehlgeschlagen',
      },
      { status: 500 }
    );
  }
}
