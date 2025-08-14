#!/bin/bash

# Admin Workspace Lambda Deployment für Taskilo
echo "🚀 Deploying Admin Workspace Lambda..."

cd "$(dirname "$0")/admin-workspace"

# Lambda-Funktion Name (bereits existierend)
FUNCTION_NAME="TaskiloAdminWorkspace"
REGION="eu-central-1"

echo "📦 Installing dependencies..."
npm install --production

echo "🗜️ Creating deployment package..."
zip -r deployment.zip . -x "*.sh" "*.md" "deployment.zip" "node_modules/.cache/*"

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
            "httpMethod": "GET",
            "path": "/admin/workspaces",
            "queryStringParameters": {
                "limit": "10"
            },
            "headers": {
                "Content-Type": "application/json"
            }
        }' \
        --region $REGION \
        test-response.json
    
    echo "📋 Test Response:"
    cat test-response.json | jq . 2>/dev/null || cat test-response.json
    echo ""
    
    # Cleanup
    rm deployment.zip test-response.json
    
    echo "🎉 Admin Workspace Lambda deployment completed!"
    echo "🔗 API Gateway Endpoint: https://b14ia0e93d.execute-api.eu-central-1.amazonaws.com/prod/admin/workspaces"
else
    echo "❌ Lambda deployment failed!"
    rm deployment.zip
    exit 1
fi
