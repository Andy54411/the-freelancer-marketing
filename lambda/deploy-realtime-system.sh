#!/bin/bash

# Taskilo AWS Realtime System Deployment Script
# Deploys EventBridge + WebSocket Infrastructure

set -e

echo "🚀 Deploying Taskilo AWS Realtime System..."

# Configuration
STACK_NAME="taskilo-realtime-system"
ENVIRONMENT="production"
REGION="eu-central-1"

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not found. Please install AWS CLI first."
    exit 1
fi

# Check if logged in
aws sts get-caller-identity > /dev/null 2>&1 || {
    echo "❌ Not logged into AWS. Please run: aws configure"
    exit 1
}

echo "✅ AWS CLI configured"

# Create S3 bucket for CloudFormation templates (if needed)
BUCKET_NAME="taskilo-cloudformation-templates-${REGION}"
aws s3 mb s3://${BUCKET_NAME} --region ${REGION} 2>/dev/null || echo "S3 bucket already exists"

echo "📦 Packaging Lambda functions..."

# Package WebSocket Manager
cd lambda/websocket-manager
zip -r websocket-manager.zip . -x "*.git*" "*.DS_Store*"
aws s3 cp websocket-manager.zip s3://${BUCKET_NAME}/lambda/websocket-manager.zip
cd ../..

# Package Realtime Broadcaster
cd lambda/realtime-broadcaster
zip -r realtime-broadcaster.zip . -x "*.git*" "*.DS_Store*"
aws s3 cp realtime-broadcaster.zip s3://${BUCKET_NAME}/lambda/realtime-broadcaster.zip
cd ../..

echo "☁️ Deploying CloudFormation stack..."

# Deploy CloudFormation Stack
aws cloudformation deploy \
    --template-file lambda/cloudformation-template.yaml \
    --stack-name ${STACK_NAME} \
    --capabilities CAPABILITY_IAM \
    --parameter-overrides Environment=${ENVIRONMENT} \
    --region ${REGION}

echo "📋 Getting stack outputs..."

# Get WebSocket URL
WEBSOCKET_URL=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${REGION} \
    --query 'Stacks[0].Outputs[?OutputKey==`WebSocketUrl`].OutputValue' \
    --output text)

# Get EventBridge Bus Name
EVENT_BUS_NAME=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${REGION} \
    --query 'Stacks[0].Outputs[?OutputKey==`EventBusName`].OutputValue' \
    --output text)

# Get DynamoDB Table Name
CONNECTIONS_TABLE=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${REGION} \
    --query 'Stacks[0].Outputs[?OutputKey==`ConnectionsTableName`].OutputValue' \
    --output text)

echo "🔧 Updating Lambda functions with actual code..."

# Update WebSocket Manager Function
aws lambda update-function-code \
    --function-name taskilo-websocket-manager-${ENVIRONMENT} \
    --s3-bucket ${BUCKET_NAME} \
    --s3-key lambda/websocket-manager.zip \
    --region ${REGION}

# Update Realtime Broadcaster Function
aws lambda update-function-code \
    --function-name taskilo-realtime-broadcaster-${ENVIRONMENT} \
    --s3-bucket ${BUCKET_NAME} \
    --s3-key lambda/realtime-broadcaster.zip \
    --region ${REGION}

echo "📝 Updating .env.local with new configuration..."

# Update .env.local file
sed -i.bak "s|AWS_EVENTBRIDGE_BUS=.*|AWS_EVENTBRIDGE_BUS=${EVENT_BUS_NAME}|g" .env.local
sed -i.bak "s|NEXT_PUBLIC_AWS_WEBSOCKET_URL=.*|NEXT_PUBLIC_AWS_WEBSOCKET_URL=${WEBSOCKET_URL}|g" .env.local
sed -i.bak "s|AWS_LAMBDA_REALTIME_FUNCTION=.*|AWS_LAMBDA_REALTIME_FUNCTION=taskilo-realtime-broadcaster-${ENVIRONMENT}|g" .env.local

# Add DynamoDB table if not exists
if ! grep -q "AWS_DYNAMODB_CONNECTIONS_TABLE" .env.local; then
    echo "AWS_DYNAMODB_CONNECTIONS_TABLE=${CONNECTIONS_TABLE}" >> .env.local
fi

echo "✅ Deployment completed successfully!"
echo ""
echo "📊 System Information:"
echo "WebSocket URL: ${WEBSOCKET_URL}"
echo "EventBridge Bus: ${EVENT_BUS_NAME}"
echo "DynamoDB Table: ${CONNECTIONS_TABLE}"
echo ""
echo "🔄 Next Steps:"
echo "1. Build and deploy your Next.js application"
echo "2. Test the admin workspace realtime updates"
echo "3. Monitor CloudWatch logs for any issues"
echo ""
echo "🏥 Health Check:"
echo "aws logs describe-log-groups --log-group-name-prefix '/aws/lambda/taskilo-'"
