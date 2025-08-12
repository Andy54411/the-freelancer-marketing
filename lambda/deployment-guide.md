# Taskilo AWS Lambda Email System Deployment Guide

## Schnelle Implementierung (3-5 Tage)

### Schritt 1: Lambda Function erstellen (Tag 1)

```bash
# 1. Lambda Function Package erstellen
cd lambda/email-processor
npm install
npm run build

# 2. ZIP für AWS Lambda erstellen
zip -r email-processor.zip index.js node_modules/

# 3. Lambda Function via AWS CLI deployen
aws lambda create-function \
  --function-name taskilo-email-processor \
  --runtime nodejs18.x \
  --role arn:aws:iam::319629020205:role/lambda-execution-role \
  --handler index.handler \
  --zip-file fileb://email-processor.zip \
  --timeout 300 \
  --memory-size 512 \
  --environment Variables='{
    "DYNAMODB_ADMIN_EMAILS_TABLE":"TaskiloAdminEmails",
    "AWS_REGION":"eu-central-1"
  }'
```

### Schritt 2: SES Integration konfigurieren (Tag 2)

```bash
# SES Rule für Lambda Trigger
aws ses put-configuration-set-rule \
  --configuration-set-name taskilo-email-config \
  --rule Name=lambda-processor,Enabled=true,Actions=[{
    "LambdaAction": {
      "FunctionArn": "arn:aws:lambda:eu-central-1:319629020205:function:taskilo-email-processor"
    }
  }]
```

### Schritt 3: API Gateway Setup (Tag 3)

```typescript
// Ersetze /api/admin/emails Routes durch Lambda
const API_GATEWAY_URL = 'https://api.taskilo.de/admin/emails';

// Frontend API Calls ändern von:
fetch('/api/admin/emails/inbox')
// zu:
fetch('https://api.taskilo.de/admin/emails')
```

### Schritt 4: Testing & Monitoring (Tag 4)

```bash
# CloudWatch Logs für Monitoring
aws logs describe-log-groups --log-group-name-prefix /aws/lambda/taskilo

# Test Email senden
aws ses send-email \
  --source support@taskilo.de \
  --destination ToAddresses=support@taskilo.de \
  --message Subject={Data="Test Lambda Email"},Body={Text={Data="Test message"}}
```

### Schritt 5: Go-Live (Tag 5)

1. DNS/Routing auf Lambda umstellen
2. Vercel API Routes deaktivieren
3. Monitoring aktivieren
4. Performance messen

## Erwartete Verbesserungen:

### Kosten:
- **Vercel API Calls:** ~€20-30/Monat
- **Lambda Email Processing:** ~€2-5/Monat
- **Einsparung:** 80-90%

### Performance:
- **Vercel Cold Start:** 200-500ms
- **Lambda Warm:** 50-100ms
- **Native SES Integration:** 10-20ms Processing

### Reliability:
- **Vercel Timeout:** 30 Sekunden
- **Lambda Timeout:** 15 Minuten
- **Retry Logic:** Native AWS Retry

## Next Steps nach Email Migration:

1. **Background Jobs** (PDF Generation, Data Export)
2. **Webhook Processing** (Stripe, Payment Events)
3. **Scheduled Tasks** (Daily Payouts, Reports)
4. **API Route Migration** (Admin, Payment, Integration APIs)
