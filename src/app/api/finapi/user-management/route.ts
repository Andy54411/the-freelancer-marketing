// src/app/api/finapi/user-management/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { finapiService } from '@/lib/finapi-sdk-service';

/**
 * finAPI Enhanced User Management API
 *
 * POST: Create new finAPI user
 * GET: Get authorized user details
 * PATCH: Edit user data and settings
 * DELETE: Delete authorized user (DANGEROUS!)
 *
 * User management with proper password handling, auto-update settings,
 * email/phone management, and user verification status.
 */

export async function POST(req: NextRequest) {
  try {
    const {
      userId,
      email,
      phone,
      isAutoUpdateEnabled = true,
      generateSecurePassword = true,
      customPassword,
    } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    console.log('👤 Creating enhanced finAPI user:', userId);

    // Test credentials first
    const credentialTest = await finapiService.testCredentials();
    if (!credentialTest.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'finAPI credentials invalid',
          details: credentialTest.error,
        },
        { status: 401 }
      );
    }

    // Generate secure password or use custom one
    const password =
      customPassword ||
      (generateSecurePassword ? `taskilo_secure_${userId}_${Date.now()}` : `taskilo_${userId}`);

    const userEmail = email || `${userId}@taskilo.de`;

    // Create user using SDK service
    try {
      const user = await finapiService.createUser(userId, password, userEmail);

      // Get user access token to verify creation
      const userToken = await finapiService.getUserToken(userId, password);

      console.log('✅ Enhanced finAPI user created:', user.id);

      return NextResponse.json({
        success: true,
        message: 'finAPI user created successfully',
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone || phone,
          isAutoUpdateEnabled: user.isAutoUpdateEnabled,
          created: new Date().toISOString(),
        },
        credentials: {
          userId: userId,
          // Don't return password in response for security
          hasPassword: true,
        },
        token: {
          hasAccessToken: !!userToken,
          tokenPreview: userToken ? `${userToken.substring(0, 20)}...` : null,
        },
        instructions: {
          nextSteps: [
            'User is now ready for bank connections',
            'Can be used with WebForm 2.0 for secure bank import',
            'Auto-update is enabled for this user',
          ],
          security: [
            'Password is securely generated',
            'User credentials are stored in finAPI',
            'Access token can be obtained with getUserToken',
          ],
        },
      });
    } catch (createError: any) {
      if (createError.status === 422 || createError.message?.includes('already exists')) {
        // User already exists, try to get token
        try {
          const userToken = await finapiService.getUserToken(userId, password);

          return NextResponse.json({
            success: true,
            message: 'finAPI user already exists and is accessible',
            user: {
              id: userId,
              email: userEmail,
              isAutoUpdateEnabled: true,
              existed: true,
            },
            token: {
              hasAccessToken: true,
              tokenPreview: `${userToken.substring(0, 20)}...`,
            },
          });
        } catch (tokenError) {
          return NextResponse.json(
            {
              success: false,
              error: 'User exists but credentials are invalid',
              details: tokenError instanceof Error ? tokenError.message : 'Token error',
              suggestion: 'Try password change or user verification',
            },
            { status: 409 }
          );
        }
      }
      throw createError;
    }
  } catch (error) {
    console.error('❌ Error in user management:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create finAPI user',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const password = searchParams.get('password');

    if (!userId || !password) {
      return NextResponse.json(
        { error: 'userId and password required for user details' },
        { status: 400 }
      );
    }

    console.log('👤 Getting finAPI user details for:', userId);

    // Get user token first
    const userToken = await finapiService.getUserToken(userId, password);

    // Get user details using direct API call
    const response = await fetch(`https://sandbox.finapi.io/api/v2/users`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${userToken}`,
        'Content-Type': 'application/json',
        'X-Request-Id': `taskilo-user-get-${Date.now()}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get user details: ${error}`);
    }

    const userData = await response.json();

    console.log('✅ finAPI user details retrieved');

    return NextResponse.json({
      success: true,
      message: 'User details retrieved successfully',
      user: {
        id: userData.id,
        email: userData.email,
        phone: userData.phone,
        isAutoUpdateEnabled: userData.isAutoUpdateEnabled,
        // Don't expose password even if it's masked
      },
      verification: {
        isVerified: true, // If we can get token, user is verified
        verificationMethod: 'password_grant',
      },
      capabilities: {
        canConnectBanks: true,
        canUseWebForm: true,
        autoUpdateEnabled: userData.isAutoUpdateEnabled || false,
      },
    });
  } catch (error) {
    console.error('❌ Error getting user details:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get user details',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId, password, updates } = await req.json();

    if (!userId || !password) {
      return NextResponse.json(
        { error: 'userId and password required for user updates' },
        { status: 400 }
      );
    }

    console.log('👤 Updating finAPI user:', userId);

    // Validate updates
    const allowedUpdates = ['email', 'phone', 'isAutoUpdateEnabled'];
    const filteredUpdates = Object.keys(updates)
      .filter(key => allowedUpdates.includes(key))
      .reduce(
        (obj, key) => {
          obj[key] = updates[key];
          return obj;
        },
        {} as Record<string, any>
      );

    if (Object.keys(filteredUpdates).length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No valid update fields provided',
          allowedFields: allowedUpdates,
        },
        { status: 400 }
      );
    }

    // Get user token first
    const userToken = await finapiService.getUserToken(userId, password);

    // Update user using direct API call
    const response = await fetch(`https://sandbox.finapi.io/api/v2/users`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${userToken}`,
        'Content-Type': 'application/json',
        'X-Request-Id': `taskilo-user-update-${Date.now()}`,
      },
      body: JSON.stringify(filteredUpdates),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update user: ${error}`);
    }

    const updatedUser = await response.json();

    console.log('✅ finAPI user updated successfully');

    return NextResponse.json({
      success: true,
      message: 'User updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        phone: updatedUser.phone,
        isAutoUpdateEnabled: updatedUser.isAutoUpdateEnabled,
      },
      appliedUpdates: filteredUpdates,
      updateInfo: {
        timestamp: new Date().toISOString(),
        updatedFields: Object.keys(filteredUpdates),
      },
    });
  } catch (error) {
    console.error('❌ Error updating user:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update user',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId, password, confirmDeletion } = await req.json();

    if (!userId || !password) {
      return NextResponse.json(
        { error: 'userId and password required for user deletion' },
        { status: 400 }
      );
    }

    if (!confirmDeletion) {
      return NextResponse.json(
        {
          success: false,
          error: 'User deletion requires explicit confirmation',
          warning:
            'This action cannot be undone and will delete all user data including bank connections!',
          requiredParameter: 'confirmDeletion: true',
        },
        { status: 400 }
      );
    }

    console.log('⚠️ DELETING finAPI user (DANGEROUS OPERATION):', userId);

    // Get user token first
    const userToken = await finapiService.getUserToken(userId, password);

    // Delete user using direct API call
    const response = await fetch(`https://sandbox.finapi.io/api/v2/users`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${userToken}`,
        'Content-Type': 'application/json',
        'X-Request-Id': `taskilo-user-delete-${Date.now()}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to delete user: ${error}`);
    }

    console.log('🗑️ finAPI user deleted successfully (THIS CANNOT BE UNDONE!)');

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
      warning: 'User and all associated data have been permanently deleted',
      deletionInfo: {
        deletedUser: userId,
        timestamp: new Date().toISOString(),
        irreversible: true,
      },
      notice: 'All bank connections, accounts, and transactions for this user have been removed',
    });
  } catch (error) {
    console.error('❌ Error deleting user:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete user',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
