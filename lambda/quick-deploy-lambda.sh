#!/bin/bash

# Quick Lambda-only Deployment für Taskilo Ticket Classifier
echo "🚀 Quick Lambda Deployment für Ticket Classifier..."

cd "$(dirname "$0")/ticket-classifier"

# Lambda-Funktion Name (muss bereits existieren)
FUNCTION_NAME="taskilo-ticket-classifier-prod"
REGION="eu-central-1"

echo "📦 Installing dependencies..."
npm install --production

echo "🗜️ Creating deployment package..."
zip -r deployment.zip . -x "*.sh" "*.md" "deployment.zip"

echo "📤 Uploading to Lambda..."
aws lambda update-function-code \
    --function-name $FUNCTION_NAME \
    --zip-file fileb://deployment.zip \
    --region $REGION

if [ $? -eq 0 ]; then
    echo "✅ Lambda function updated successfully!"
    
    echo "🧪 Testing function..."
    aws lambda invoke \
        --function-name $FUNCTION_NAME \
        --payload '{
            "ticketId": "quick_test_'$(date +%s)'",
            "title": "Quick Test Ticket",
            "description": "Schneller Test nach Lambda-Update",
            "customerEmail": "test@taskilo.de"
        }' \
        --region $REGION \
        test-response.json
    
    echo "📋 Test Response:"
    cat test-response.json | jq . 2>/dev/null || cat test-response.json
    echo ""
    
    # Cleanup
    rm deployment.zip test-response.json
    
    echo "🎉 Quick deployment completed!"
else
    echo "❌ Lambda deployment failed!"
    rm deployment.zip
    exit 1
fi
