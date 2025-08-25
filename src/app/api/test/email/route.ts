import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/lib/resend-email-service';

/**
 * Test API für E-Mail-Service
 * GET /api/test/email
 */
export async function GET(request: NextRequest) {
  try {

    // Test-Daten
    const testData = {
      customerEmail: 'info@the-freelancer-marketing.com',
      projectTitle: 'Test Projekt - API Test',
      providerName: 'Test Anbieter API',
      proposalAmount: 1500,
    };

    const result = await emailService.sendNewProposalEmail(
      testData.customerEmail,
      testData.projectTitle,
      testData.providerName,
      testData.proposalAmount
    );

    return NextResponse.json({
      success: true,
      message: 'Email test completed',
      emailResult: result,
      testData,
      environment: {
        hasResendKey: !!process.env.RESEND_API_KEY,
        nodeEnv: process.env.NODE_ENV,
      },
    });
  } catch (error) {

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        environment: {
          hasResendKey: !!process.env.RESEND_API_KEY,
          nodeEnv: process.env.NODE_ENV,
        },
      },
      { status: 500 }
    );
  }
}
