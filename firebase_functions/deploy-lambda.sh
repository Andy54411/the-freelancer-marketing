#!/bin/bash

# AWS Lambda Deployment Script für Taskilo OCR Handler
# Basiert auf bestehender Infrastruktur
# Verwendung: ./deploy-lambda.sh [environment]

set -e

ENVIRONMENT=${1:-production}
REGION="eu-central-1"
FUNCTION_NAME="taskilo-ocr-processor-${ENVIRONMENT}"

echo "🚀 Deploying Taskilo OCR Lambda to AWS..."
echo "Environment: $ENVIRONMENT"
echo "Function: $FUNCTION_NAME"
echo "Region: $REGION"

# 1. Build Lambda Package
echo "📦 Building Lambda deployment package..."
node lambda-build.js

# 2. Navigate to build directory
cd lambda-build

# 3. Install production dependencies
echo "📥 Installing production dependencies..."
npm install --production --silent

# 4. Compile TypeScript
echo "🔨 Compiling TypeScript..."
npx tsc -p tsconfig.lambda.json

# 5. Create deployment ZIP
echo "📦 Creating deployment ZIP..."
zip -r lambda-deployment.zip dist/ node_modules/ package.json > /dev/null

# 6. Move ZIP to parent directory
mv lambda-deployment.zip ../

# 7. Return to parent directory
cd ..

# 8. Check if Lambda function exists and deploy
echo "📤 Deploying to AWS Lambda..."

# Check if function exists
if aws lambda get-function --function-name $FUNCTION_NAME --region $REGION &>/dev/null; then
    echo "♻️  Updating existing Lambda function..."
    aws lambda update-function-code \
        --function-name $FUNCTION_NAME \
        --zip-file fileb://lambda-deployment.zip \
        --region $REGION
    
    # Update environment variables (AWS_REGION wird automatisch gesetzt)
    aws lambda update-function-configuration \
        --function-name $FUNCTION_NAME \
        --environment Variables="{
            NODE_ENV=$ENVIRONMENT,
            FIREBASE_PROJECT_ID=tilvo-f142f,
            OCR_DOCUMENTS_BUCKET=taskilo-file-storage,
            USER_UPLOADS_BUCKET=taskilo-file-storage,
            GEMINI_API_KEY=AIzaSyAZIoSAiKeG9uRj7X45FiFldzLjibbjjdY
        }" \
        --region $REGION
else
    echo "🆕 Creating new Lambda function..."
    
    # Use existing Lambda execution role
    ROLE_ARN="arn:aws:iam::319629020205:role/lambda-execution-role"
    
    aws lambda create-function \
        --function-name $FUNCTION_NAME \
        --runtime nodejs20.x \
        --role $ROLE_ARN \
        --handler dist/handler/lambda-ocr-handler.handler \
        --zip-file fileb://lambda-deployment.zip \
        --timeout 300 \
        --memory-size 1024 \
        --environment Variables="{
            NODE_ENV=$ENVIRONMENT,
            FIREBASE_PROJECT_ID=tilvo-f142f,
            OCR_DOCUMENTS_BUCKET=taskilo-file-storage,
            USER_UPLOADS_BUCKET=taskilo-file-storage,
            GEMINI_API_KEY=AIzaSyAZIoSAiKeG9uRj7X45FiFldzLjibbjjdY
        }" \
        --region $REGION
fi

# Test the function
echo "🧪 Testing Lambda function..."
aws lambda invoke \
    --function-name $FUNCTION_NAME \
    --payload '{"httpMethod":"POST","path":"/ocr","body":"{\"test\":true}"}' \
    --region $REGION \
    test-response.json

if [ -f test-response.json ]; then
    echo "📋 Test Response:"
    cat test-response.json
    rm test-response.json
fi

# Cleanup
echo "🧹 Cleaning up build artifacts..."
rm -rf lambda-build/
rm -f lambda-deployment.zip

echo "✅ Deployment script completed!"