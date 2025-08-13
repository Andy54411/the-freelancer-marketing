#!/bin/bash

# Taskilo Ticket Classifier Lambda Deployment Script
echo "🚀 Deploying Taskilo Ticket Classifier Lambda..."

# Wechsel zum Lambda-Verzeichnis
cd "$(dirname "$0")"

# Lambda-Funktion Name
FUNCTION_NAME="taskilo-ticket-classifier"
REGION="eu-central-1"
ROLE_ARN="arn:aws:iam::319629020205:role/lambda-execution-role"

# 1. Dependencies installieren
echo "📦 Installing Lambda dependencies..."
npm install --production

# 2. Deployment-Package erstellen
echo "🗜️ Creating deployment package..."
zip -r deployment.zip . -x "*.sh" "*.md" "deployment.zip"

# 3. Prüfen ob Lambda-Funktion existiert
echo "🔍 Checking if Lambda function exists..."
if aws lambda get-function --function-name $FUNCTION_NAME --region $REGION 2>/dev/null; then
    echo "📝 Updating existing Lambda function..."
    aws lambda update-function-code \
        --function-name $FUNCTION_NAME \
        --zip-file fileb://deployment.zip \
        --region $REGION
        
    # Update Konfiguration
    aws lambda update-function-configuration \
        --function-name $FUNCTION_NAME \
        --runtime nodejs18.x \
        --handler index.handler \
        --timeout 30 \
        --memory-size 256 \
        --environment Variables='{AWS_REGION=eu-central-1,TABLE_NAME=taskilo-tickets}' \
        --region $REGION
else
    echo "🆕 Creating new Lambda function..."
    aws lambda create-function \
        --function-name $FUNCTION_NAME \
        --runtime nodejs18.x \
        --role $ROLE_ARN \
        --handler index.handler \
        --zip-file fileb://deployment.zip \
        --timeout 30 \
        --memory-size 256 \
        --environment Variables='{REGION=eu-central-1,TABLE_NAME=taskilo-tickets}' \
        --region $REGION
fi

# 4. Test-Event senden
echo "🧪 Testing Lambda function..."
aws lambda invoke \
    --function-name $FUNCTION_NAME \
    --payload '{
        "ticketId": "test_ticket_123",
        "title": "Test Ticket für Lambda",
        "description": "Dies ist ein Test um zu prüfen ob die Lambda-Funktion korrekt funktioniert",
        "customerEmail": "test@taskilo.de"
    }' \
    --region $REGION \
    response.json

echo "📋 Lambda Response:"
cat response.json
echo ""

# 5. Cleanup
rm deployment.zip
rm response.json

echo "✅ Lambda deployment completed!"
echo "🔧 Function Name: $FUNCTION_NAME"
echo "🌍 Region: $REGION"
echo "📊 You can monitor the function in AWS CloudWatch Logs"
