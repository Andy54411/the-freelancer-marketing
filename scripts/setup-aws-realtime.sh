#!/bin/bash

# AWS EventBridge + WebSocket Setup für Taskilo Admin Realtime
echo "🚀 Setting up AWS EventBridge + WebSocket for Taskilo Admin Realtime..."

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials not configured. Please run 'aws configure'"
    exit 1
fi

# Variables
REGION=${AWS_REGION:-eu-central-1}
EVENT_BUS_NAME="taskilo-admin-events"
WEBSOCKET_API_NAME="taskilo-admin-websocket"

echo "📍 Using AWS Region: $REGION"

# 1. Create EventBridge Custom Event Bus
echo "📡 Creating EventBridge Custom Event Bus..."
aws events create-event-bus \
    --name $EVENT_BUS_NAME \
    --region $REGION \
    2>/dev/null || echo "Event bus already exists"

# 2. Create WebSocket API Gateway
echo "🔌 Creating WebSocket API Gateway..."
WEBSOCKET_API_ID=$(aws apigatewayv2 create-api \
    --name $WEBSOCKET_API_NAME \
    --protocol-type WEBSOCKET \
    --route-selection-expression '$request.body.action' \
    --region $REGION \
    --query 'ApiId' \
    --output text 2>/dev/null)

if [ $? -eq 0 ]; then
    echo "✅ WebSocket API created: $WEBSOCKET_API_ID"
    
    # Create Routes
    echo "🛣️ Creating WebSocket routes..."
    
    # $connect route
    aws apigatewayv2 create-route \
        --api-id $WEBSOCKET_API_ID \
        --route-key '$connect' \
        --region $REGION >/dev/null
    
    # $disconnect route
    aws apigatewayv2 create-route \
        --api-id $WEBSOCKET_API_ID \
        --route-key '$disconnect' \
        --region $REGION >/dev/null
    
    # subscribe route
    aws apigatewayv2 create-route \
        --api-id $WEBSOCKET_API_ID \
        --route-key 'subscribe' \
        --region $REGION >/dev/null
    
    echo "✅ WebSocket routes created"
    
    # Create deployment
    echo "🚀 Deploying WebSocket API..."
    aws apigatewayv2 create-deployment \
        --api-id $WEBSOCKET_API_ID \
        --stage-name prod \
        --region $REGION >/dev/null
    
    # Get WebSocket endpoint
    WEBSOCKET_ENDPOINT="wss://$WEBSOCKET_API_ID.execute-api.$REGION.amazonaws.com/prod"
    echo "✅ WebSocket API deployed: $WEBSOCKET_ENDPOINT"
    
else
    echo "⚠️ WebSocket API creation failed or already exists"
fi

# 3. Create EventBridge Rule for Workspace Updates
echo "📋 Creating EventBridge Rule..."
RULE_NAME="taskilo-admin-workspace-updates"

aws events put-rule \
    --name $RULE_NAME \
    --event-pattern '{"source":["taskilo.admin.workspace"],"detail-type":["Workspace Update"]}' \
    --state ENABLED \
    --event-bus-name $EVENT_BUS_NAME \
    --region $REGION 2>/dev/null || echo "Rule already exists"

echo "✅ EventBridge Rule created: $RULE_NAME"

# 4. Output Environment Variables
echo ""
echo "🔧 Add these environment variables to your .env.local:"
echo "AWS_REGION=$REGION"
echo "AWS_EVENTBRIDGE_BUS_NAME=$EVENT_BUS_NAME"
if [ ! -z "$WEBSOCKET_ENDPOINT" ]; then
    echo "AWS_WEBSOCKET_ENDPOINT=$WEBSOCKET_ENDPOINT"
fi
echo ""

# 5. Create Lambda function for WebSocket connection management
echo "⚡ Creating Lambda function for WebSocket management..."

# Create Lambda function code
cat > /tmp/websocket-handler.js << 'EOF'
const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require('@aws-sdk/client-apigatewaymanagementapi');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, DeleteCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = 'taskilo-websocket-connections';

exports.handler = async (event) => {
    const { requestContext } = event;
    const { connectionId, routeKey } = requestContext;
    
    try {
        switch (routeKey) {
            case '$connect':
                await ddb.send(new PutCommand({
                    TableName: TABLE_NAME,
                    Item: {
                        connectionId,
                        timestamp: Date.now()
                    }
                }));
                break;
                
            case '$disconnect':
                await ddb.send(new DeleteCommand({
                    TableName: TABLE_NAME,
                    Key: { connectionId }
                }));
                break;
                
            case 'subscribe':
                const body = JSON.parse(event.body || '{}');
                await ddb.send(new PutCommand({
                    TableName: TABLE_NAME,
                    Item: {
                        connectionId,
                        adminId: body.adminId,
                        subscriptions: body.subscriptions || [],
                        timestamp: Date.now()
                    }
                }));
                break;
        }
        
        return { statusCode: 200 };
    } catch (error) {
        console.error('Error:', error);
        return { statusCode: 500 };
    }
};
EOF

# Create deployment package
cd /tmp
zip websocket-handler.zip websocket-handler.js

# Create Lambda function
aws lambda create-function \
    --function-name taskilo-websocket-handler \
    --runtime nodejs18.x \
    --role arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):role/lambda-execution-role \
    --handler websocket-handler.handler \
    --zip-file fileb://websocket-handler.zip \
    --region $REGION 2>/dev/null || echo "Lambda function may already exist"

echo "✅ Lambda function created: taskilo-websocket-handler"

# 6. Create DynamoDB table for WebSocket connections
echo "💾 Creating DynamoDB table for WebSocket connections..."
aws dynamodb create-table \
    --table-name taskilo-websocket-connections \
    --attribute-definitions AttributeName=connectionId,AttributeType=S \
    --key-schema AttributeName=connectionId,KeyType=HASH \
    --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
    --region $REGION 2>/dev/null || echo "DynamoDB table already exists"

echo "✅ DynamoDB table created: taskilo-websocket-connections"

echo ""
echo "🎉 AWS EventBridge + WebSocket setup completed!"
echo "ℹ️  Please update your .env.local with the environment variables shown above"
echo "ℹ️  Make sure your AWS IAM role has permissions for EventBridge, API Gateway, Lambda, and DynamoDB"
