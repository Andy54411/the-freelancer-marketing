// Temporäre SES Status Check API - OHNE Authentifizierung
import { NextRequest, NextResponse } from 'next/server';
import {
  SESClient,
  GetSendQuotaCommand,
  ListVerifiedEmailAddressesCommand,
  GetAccountSendingEnabledCommand,
} from '@aws-sdk/client-ses';

const sesClient = new SESClient({
  region: process.env.AWS_REGION || 'eu-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function GET(_request: NextRequest) {
  try {
    // SES Send-Quota prüfen (zeigt Sandbox-Status)
    const quotaCommand = new GetSendQuotaCommand({});
    const quotaResult = await sesClient.send(quotaCommand);

    // Verifizierte E-Mail-Adressen abrufen
    const verifiedEmailsCommand = new ListVerifiedEmailAddressesCommand({});
    const verifiedEmailsResult = await sesClient.send(verifiedEmailsCommand);

    // Account-Sending-Status prüfen
    const sendingEnabledCommand = new GetAccountSendingEnabledCommand({});
    const sendingEnabledResult = await sesClient.send(sendingEnabledCommand);

    // Sandbox-Status bestimmen
    const isSandbox = quotaResult.Max24HourSend === 200 && quotaResult.MaxSendRate === 1;

    return NextResponse.json({
      status: 'success',
      sesConfig: {
        region: process.env.AWS_REGION || 'eu-central-1',
        isSandbox: isSandbox,
        quotaInfo: {
          max24HourSend: quotaResult.Max24HourSend,
          maxSendRate: quotaResult.MaxSendRate,
          sentLast24Hours: quotaResult.SentLast24Hours,
        },
        verifiedEmails: verifiedEmailsResult.VerifiedEmailAddresses || [],
        sendingEnabled: sendingEnabledResult.Enabled,
        sandboxWarning: isSandbox
          ? 'SES ist im Sandbox-Modus. Sie können nur an verifizierte E-Mail-Adressen senden.'
          : null,
      },
      recommendations: isSandbox
        ? [
            'Verifizieren Sie zusätzliche E-Mail-Adressen über die AWS SES Console',
            'Beantragen Sie Production Access über die AWS SES Console',
            'Senden Sie nur an verifizierte E-Mail-Adressen',
          ]
        : ['SES ist produktionsbereit', 'Sie können an alle gültigen E-Mail-Adressen senden'],
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Fehler beim Prüfen des SES-Status',
        details: error.message,
        region: process.env.AWS_REGION || 'eu-central-1',
      },
      { status: 500 }
    );
  }
}
