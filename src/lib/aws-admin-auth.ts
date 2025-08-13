// src/lib/aws-admin-auth.ts
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AuthFlowType,
} from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  UpdateCommand,
  QueryCommand as DocQueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { createHmac } from 'crypto';

// AWS Configuration
const AWS_REGION = 'eu-central-1';
const USER_POOL_ID = 'eu-central-1_UIUz2NGEz';
const CLIENT_ID = '2sm1hq8pdrs8foit5ck4djivsu';
const CLIENT_SECRET = '1pt4pj2asoujfsbjapdhl61qrg9leull7riqmjr0sn7shnck0u84';
const DYNAMODB_TABLE = 'taskilo-admin-users';

// AWS Clients
const cognitoClient = new CognitoIdentityProviderClient({
  region: AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const dynamoClient = new DynamoDBClient({
  region: AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const docClient = DynamoDBDocumentClient.from(dynamoClient);

// Types
export interface AdminUser {
  userId: string;
  email: string;
  name: string;
  role: 'master' | 'admin' | 'support';
  departments: string[];
  permissions: string[];
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
  loginCount: number;
  metadata: {
    createdBy: string;
    notes?: string;
  };
}

export interface AuthResult {
  success: boolean;
  user?: AdminUser;
  tokens?: {
    AccessToken: string;
    RefreshToken: string;
    IdToken: string;
    ExpiresIn: number;
  };
  error?: string;
}

export interface AuthActivity {
  timestamp: string;
  userId: string;
  email: string;
  action: 'LOGIN' | 'LOGOUT' | 'FAILED_LOGIN' | 'PASSWORD_RESET' | 'USER_CREATED';
  ip: string;
  userAgent: string;
  success: boolean;
  errorMessage?: string;
  sessionId: string;
  metadata: {
    department?: string;
    role?: string;
    permissions?: string[];
  };
}

/**
 * AWS Admin Authentication Service
 */
export class AWSAdminAuthService {
  /**
   * Authenticate admin user with Cognito
   */
  async login(
    email: string,
    password: string,
    metadata: { ip: string; userAgent: string }
  ): Promise<AuthResult> {
    try {
      console.log(`🔐 AWS Cognito Login Attempt: ${email}`);

      // Cognito Authentication
      const authCommand = new InitiateAuthCommand({
        AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
        ClientId: CLIENT_ID,
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
          SECRET_HASH: this.generateSecretHash(email),
        },
      });

      const authResult = await cognitoClient.send(authCommand);

      if (!authResult.AuthenticationResult) {
        throw new Error('Authentication failed - no auth result');
      }

      // Get user details from DynamoDB
      const userDetails = await this.getUserByEmail(email);

      if (!userDetails) {
        throw new Error('User not found in admin database');
      }

      if (!userDetails.isActive) {
        throw new Error('User account is deactivated');
      }

      // Update last login
      await this.updateLastLogin(userDetails.userId);

      // Log successful login
      await this.logAuthActivity({
        timestamp: new Date().toISOString(),
        userId: userDetails.userId,
        email: userDetails.email,
        action: 'LOGIN',
        ip: metadata.ip,
        userAgent: metadata.userAgent,
        success: true,
        sessionId: authResult.AuthenticationResult.AccessToken!.substring(0, 20),
        metadata: {
          department: userDetails.departments.join(','),
          role: userDetails.role,
          permissions: userDetails.permissions,
        },
      });

      console.log(`✅ AWS Cognito Login Success: ${email} (${userDetails.role})`);

      return {
        success: true,
        user: userDetails,
        tokens: {
          AccessToken: authResult.AuthenticationResult.AccessToken!,
          RefreshToken: authResult.AuthenticationResult.RefreshToken!,
          IdToken: authResult.AuthenticationResult.IdToken!,
          ExpiresIn: authResult.AuthenticationResult.ExpiresIn!,
        },
      };
    } catch (error: unknown) {
      console.error(`❌ AWS Cognito Login Failed: ${email}`, error);

      // Log failed login attempt
      await this.logAuthActivity({
        timestamp: new Date().toISOString(),
        userId: 'unknown',
        email: email,
        action: 'FAILED_LOGIN',
        ip: metadata.ip,
        userAgent: metadata.userAgent,
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        sessionId: 'failed',
        metadata: {},
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
      };
    }
  }

  /**
   * Create new admin user
   */
  async createUser(
    userData: Omit<AdminUser, 'userId' | 'createdAt' | 'loginCount'>
  ): Promise<AuthResult> {
    try {
      console.log(`👤 Creating AWS Cognito User: ${userData.email}`);

      // Generate temporary password
      const tempPassword = this.generateTempPassword();

      // Create user in Cognito
      const createUserCommand = new AdminCreateUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: userData.email,
        UserAttributes: [
          { Name: 'email', Value: userData.email },
          { Name: 'name', Value: userData.name },
          { Name: 'email_verified', Value: 'true' },
        ],
        TemporaryPassword: tempPassword,
        MessageAction: 'SUPPRESS', // Don't send email, we'll handle that
      });

      const cognitoResult = await cognitoClient.send(createUserCommand);
      const userId = cognitoResult.User!.Username!;

      // Set permanent password
      const setPasswordCommand = new AdminSetUserPasswordCommand({
        UserPoolId: USER_POOL_ID,
        Username: userId,
        Password: tempPassword,
        Permanent: true,
      });
      await cognitoClient.send(setPasswordCommand);

      // Save user details to DynamoDB
      const adminUser: AdminUser = {
        ...userData,
        userId,
        createdAt: new Date().toISOString(),
        loginCount: 0,
      };

      await this.saveUserToDynamoDB(adminUser);

      console.log(`✅ AWS Admin User Created: ${userData.email}`);

      return {
        success: true,
        user: adminUser,
      };
    } catch (error: unknown) {
      console.error(`❌ Failed to create AWS admin user: ${userData.email}`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create user',
      };
    }
  }

  /**
   * Get user by email from DynamoDB
   */
  async getUserByEmail(email: string): Promise<AdminUser | null> {
    try {
      const queryCommand = new DocQueryCommand({
        TableName: DYNAMODB_TABLE,
        IndexName: 'EmailIndex',
        KeyConditionExpression: 'email = :email',
        ExpressionAttributeValues: {
          ':email': email,
        },
      });

      const result = await docClient.send(queryCommand);

      if (result.Items && result.Items.length > 0) {
        return result.Items[0] as AdminUser;
      }

      return null;
    } catch (error) {
      console.error('Error getting user by email:', error);
      return null;
    }
  }

  /**
   * Save user to DynamoDB
   */
  private async saveUserToDynamoDB(user: AdminUser): Promise<void> {
    const putCommand = new PutCommand({
      TableName: DYNAMODB_TABLE,
      Item: user,
    });

    await docClient.send(putCommand);
  }

  /**
   * Update last login timestamp
   */
  private async updateLastLogin(userId: string): Promise<void> {
    const updateCommand = new UpdateCommand({
      TableName: DYNAMODB_TABLE,
      Key: { userId },
      UpdateExpression: 'SET lastLogin = :lastLogin, loginCount = loginCount + :inc',
      ExpressionAttributeValues: {
        ':lastLogin': new Date().toISOString(),
        ':inc': 1,
      },
    });

    await docClient.send(updateCommand);
  }

  /**
   * Log authentication activity to CloudWatch
   */
  private async logAuthActivity(activity: AuthActivity): Promise<void> {
    try {
      // For now, just console log. In production, send to CloudWatch
      console.log(`🔍 AUTH ACTIVITY:`, JSON.stringify(activity, null, 2));

      // TODO: Implement CloudWatch logging
      // const logEvent = {
      //   logGroupName: '/aws/lambda/taskilo-admin-auth',
      //   logStreamName: `auth-${new Date().toISOString().split('T')[0]}`,
      //   logEvents: [{
      //     timestamp: Date.now(),
      //     message: JSON.stringify(activity)
      //   }]
      // };
    } catch (error) {
      console.error('Failed to log auth activity:', error);
    }
  }

  /**
   * Generate Cognito secret hash
   */
  private generateSecretHash(username: string): string {
    return createHmac('SHA256', CLIENT_SECRET)
      .update(username + CLIENT_ID)
      .digest('base64');
  }

  /**
   * Generate temporary password
   */
  private generateTempPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  /**
   * Validate JWT token from Cognito
   */
  async validateToken(token: string): Promise<AdminUser | null> {
    try {
      // In production, properly verify JWT with Cognito public keys
      // For now, simple decode and lookup
      const payload = token.split('.')[1];
      const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
      const email = decoded.email;

      if (!email) {
        return null;
      }

      return await this.getUserByEmail(email);
    } catch (error) {
      console.error('Token validation failed:', error);
      return null;
    }
  }
}

// Export singleton instance
export const awsAdminAuth = new AWSAdminAuthService();
