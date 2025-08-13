// src/app/api/admin/auth/aws/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { awsAdminAuth } from '@/lib/aws-admin-auth';

// POST /api/admin/auth/aws - AWS Cognito Login
export async function POST(request: NextRequest) {
  try {
    console.log('\n=== AWS ADMIN AUTH REQUEST ===');

    const body = await request.json();
    const { action, email, password } = body;

    console.log(`🔐 Action: ${action}`);
    console.log(`📧 Email: ${email}`);

    // Request metadata
    const ip =
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    if (action === 'login') {
      // Validate input
      if (!email || !password) {
        console.log('❌ Missing credentials');
        return NextResponse.json(
          { success: false, error: 'Email and password required' },
          { status: 400 }
        );
      }

      // AWS Cognito Authentication
      const authResult = await awsAdminAuth.login(email, password, { ip, userAgent });

      if (!authResult.success) {
        console.log(`❌ AWS LOGIN FAILED: ${authResult.error}`);
        return NextResponse.json({ success: false, error: authResult.error }, { status: 401 });
      }

      // Set secure cookie with Cognito tokens
      const cookieStore = await cookies();
      cookieStore.set(
        'taskilo_admin_aws_session',
        JSON.stringify({
          accessToken: authResult.tokens!.AccessToken,
          refreshToken: authResult.tokens!.RefreshToken,
          idToken: authResult.tokens!.IdToken,
          expiresAt: Date.now() + authResult.tokens!.ExpiresIn * 1000,
          userId: authResult.user!.userId,
          email: authResult.user!.email,
        }),
        {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: authResult.tokens!.ExpiresIn,
          path: '/',
        }
      );

      console.log(`✅ AWS LOGIN SUCCESSFUL:`);
      console.log(`   👤 User: ${authResult.user!.name} (${authResult.user!.email})`);
      console.log(`   🏷️  Role: ${authResult.user!.role}`);
      console.log(`   🏢 Departments: ${authResult.user!.departments.join(', ')}`);
      console.log(`   🔑 Permissions: ${authResult.user!.permissions.join(', ')}`);
      console.log(`   📅 Last Login: ${authResult.user!.lastLogin || 'First login'}`);
      console.log(`   🎟️  Access Token: ${authResult.tokens!.AccessToken.substring(0, 20)}...`);
      console.log(`=== END AWS AUTH LOG ===\n`);

      return NextResponse.json({
        success: true,
        user: {
          id: authResult.user!.userId,
          name: authResult.user!.name,
          email: authResult.user!.email,
          role: authResult.user!.role,
          departments: authResult.user!.departments,
          permissions: authResult.user!.permissions,
          lastLogin: authResult.user!.lastLogin,
          loginCount: authResult.user!.loginCount,
        },
        aws: true, // Flag to indicate AWS auth
      });
    } else if (action === 'create_user') {
      // TODO: Implement user creation endpoint
      return NextResponse.json(
        { success: false, error: 'User creation not yet implemented' },
        { status: 501 }
      );
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: unknown) {
    console.error('Login failed:', error);
    let errorMessage = 'Authentication failed';

    if (error && typeof error === 'object' && 'name' in error) {
      switch ((error as { name: string }).name) {
        case 'NotAuthorizedException':
          errorMessage = 'Invalid email or password';
          break;
        case 'UserNotFoundException':
          errorMessage = 'User not found';
          break;
        case 'UserNotConfirmedException':
          errorMessage = 'Account not confirmed';
          break;
        default:
          errorMessage = 'Authentication failed';
      }
    }

    return NextResponse.json({ success: false, error: errorMessage }, { status: 401 });
  }
}

// GET /api/admin/auth/aws - Validate AWS Session
export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('taskilo_admin_aws_session');

    if (!sessionCookie) {
      console.log('❌ AWS Session: No cookie found');
      return NextResponse.json({ success: false, error: 'No session found' }, { status: 401 });
    }

    try {
      const sessionData = JSON.parse(sessionCookie.value);

      // Check if session is expired
      if (Date.now() > sessionData.expiresAt) {
        console.log('❌ AWS Session: Expired');
        return NextResponse.json({ success: false, error: 'Session expired' }, { status: 401 });
      }

      // Get fresh user data from DynamoDB
      const user = await awsAdminAuth.getUserByEmail(sessionData.email);

      if (!user) {
        console.log('❌ AWS Session: User not found in database');
        return NextResponse.json({ success: false, error: 'User not found' }, { status: 401 });
      }

      console.log(`✅ AWS Session: Valid for ${user.name} (${user.email})`);

      return NextResponse.json({
        success: true,
        user: {
          id: user.userId,
          name: user.name,
          email: user.email,
          role: user.role,
          departments: user.departments,
          permissions: user.permissions,
          lastLogin: user.lastLogin,
          loginCount: user.loginCount,
        },
        aws: true,
      });
    } catch {
      console.log('❌ AWS Session: Invalid cookie format');
      return NextResponse.json({ success: false, error: 'Invalid session' }, { status: 401 });
    }
  } catch (error: unknown) {
    console.error('Session validation failed:', error);
    return NextResponse.json(
      { success: false, error: 'Session validation failed' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/auth/aws - Logout
export async function DELETE() {
  try {
    const cookieStore = await cookies();

    // Clear AWS session cookie
    cookieStore.delete('taskilo_admin_aws_session');

    console.log('✅ AWS Logout: Session cleared');

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error: unknown) {
    console.error('Logout failed:', error);
    return NextResponse.json({ success: false, error: 'Logout failed' }, { status: 500 });
  }
}
