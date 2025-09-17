#!/bin/bash

# Taskilo Chat Monitoring Lambda Deployment Script
# Deploys AWS Lambda function for Firebase chat data aggregation

set -e

echo "🚀 Deploying Taskilo Chat Monitoring Lambda..."

# Configuration
FUNCTION_NAME="taskilo-chat-aggregator"
ROLE_NAME="TaskiloChatAggregatorRole"
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

# Get AWS Account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "📋 AWS Account ID: $ACCOUNT_ID"

# Create IAM Role for Lambda
echo "🔐 Creating IAM Role..."

# Check if role exists
if aws iam get-role --role-name $ROLE_NAME >/dev/null 2>&1; then
    echo "IAM Role already exists."
else
    echo "Creating new IAM role..."
    
    # Create trust policy
    cat > trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

    aws iam create-role \
        --role-name $ROLE_NAME \
        --assume-role-policy-document file://trust-policy.json \
        --description "IAM role for Taskilo Chat Aggregator Lambda function"

    # Create custom policy for DynamoDB, EventBridge and CloudWatch
    CUSTOM_POLICY='{
      "Version": "2012-10-17",
      "Statement": [
        {
          "Effect": "Allow",
          "Action": [
            "dynamodb:GetItem",
            "dynamodb:PutItem",
            "dynamodb:UpdateItem",
            "dynamodb:DeleteItem",
            "dynamodb:Query",
            "dynamodb:Scan"
          ],
          "Resource": [
            "arn:aws:dynamodb:'$REGION':'$ACCOUNT_ID':table/TaskiloChatStats",
            "arn:aws:dynamodb:'$REGION':'$ACCOUNT_ID':table/TaskiloChatMessages", 
            "arn:aws:dynamodb:'$REGION':'$ACCOUNT_ID':table/TaskiloChatParticipants",
            "arn:aws:dynamodb:'$REGION':'$ACCOUNT_ID':table/TaskiloChatStats/index/*",
            "arn:aws:dynamodb:'$REGION':'$ACCOUNT_ID':table/TaskiloChatMessages/index/*",
            "arn:aws:dynamodb:'$REGION':'$ACCOUNT_ID':table/TaskiloChatParticipants/index/*"
          ]
        },
        {
          "Effect": "Allow",
          "Action": [
            "events:PutEvents"
          ],
          "Resource": "arn:aws:events:'$REGION':'$ACCOUNT_ID':event-bus/*"
        },
        {
          "Effect": "Allow", 
          "Action": [
            "logs:CreateLogGroup",
            "logs:CreateLogStream",
            "logs:PutLogEvents"
          ],
          "Resource": "arn:aws:logs:'$REGION':'$ACCOUNT_ID':*"
        }
      ]
    }'
    
    aws iam put-role-policy \
        --role-name $ROLE_NAME \
        --policy-name TaskiloChatAggregatorPolicy \
        --policy-document "$CUSTOM_POLICY"
    
    echo "Waiting for IAM role propagation..."
    sleep 15
fi

# Create DynamoDB Tables
echo "🗄️ Creating DynamoDB Tables..."

TABLES=(
    "TaskiloChatStats"
    "TaskiloChatMessages" 
    "TaskiloChatParticipants"
)

for TABLE_NAME in "${TABLES[@]}"; do
    if aws dynamodb describe-table --table-name $TABLE_NAME --region $REGION >/dev/null 2>&1; then
        echo "DynamoDB table $TABLE_NAME already exists."
    else
        echo "Creating DynamoDB table $TABLE_NAME..."
        
        if [ "$TABLE_NAME" == "TaskiloChatStats" ]; then
            aws dynamodb create-table \
                --table-name $TABLE_NAME \
                --attribute-definitions \
                    AttributeName=id,AttributeType=S \
                    AttributeName=type,AttributeType=S \
                --key-schema \
                    AttributeName=id,KeyType=HASH \
                --global-secondary-indexes \
                    IndexName=TypeIndex,KeySchema=[{AttributeName=type,KeyType=HASH}],Projection='{ProjectionType=ALL}',ProvisionedThroughput='{ReadCapacityUnits=5,WriteCapacityUnits=5}' \
                --billing-mode PROVISIONED \
                --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
                --region $REGION
        elif [ "$TABLE_NAME" == "TaskiloChatMessages" ]; then
            aws dynamodb create-table \
                --table-name $TABLE_NAME \
                --attribute-definitions \
                    AttributeName=id,AttributeType=S \
                    AttributeName=type,AttributeType=S \
                    AttributeName=lastActivity,AttributeType=S \
                    AttributeName=isActive,AttributeType=S \
                --key-schema \
                    AttributeName=id,KeyType=HASH \
                --global-secondary-indexes \
                    IndexName=TypeIndex,KeySchema=[{AttributeName=type,KeyType=HASH},{AttributeName=lastActivity,KeyType=RANGE}],Projection='{ProjectionType=ALL}',ProvisionedThroughput='{ReadCapacityUnits=5,WriteCapacityUnits=5}' \
                    IndexName=ActiveIndex,KeySchema=[{AttributeName=isActive,KeyType=HASH},{AttributeName=lastActivity,KeyType=RANGE}],Projection='{ProjectionType=ALL}',ProvisionedThroughput='{ReadCapacityUnits=5,WriteCapacityUnits=5}' \
                --billing-mode PROVISIONED \
                --provisioned-throughput ReadCapacityUnits=10,WriteCapacityUnits=10 \
                --region $REGION
        else
            aws dynamodb create-table \
                --table-name $TABLE_NAME \
                --attribute-definitions \
                    AttributeName=id,AttributeType=S \
                --key-schema \
                    AttributeName=id,KeyType=HASH \
                --billing-mode PROVISIONED \
                --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
                --region $REGION
        fi
            
        echo "Waiting for table $TABLE_NAME to be ready..."
        aws dynamodb wait table-exists --table-name $TABLE_NAME --region $REGION
    fi
done

echo "📦 Packaging Lambda function..."

# Change to lambda directory
cd lambda/chat-aggregator

# Install dependencies (if needed)
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install --production
fi

# Create deployment package
zip -r chat-aggregator.zip . -x "*.git*" "*.DS_Store*" "deploy.sh" "package-lock.json"

echo "⚡ Creating/Updating Lambda Function..."

ROLE_ARN="arn:aws:iam::$ACCOUNT_ID:role/$ROLE_NAME"

# Check if function exists
if aws lambda get-function --function-name $FUNCTION_NAME --region $REGION >/dev/null 2>&1; then
    echo "Updating existing Lambda function..."
    aws lambda update-function-code \
        --function-name $FUNCTION_NAME \
        --zip-file fileb://chat-aggregator.zip \
        --region $REGION
        
    aws lambda update-function-configuration \
        --function-name $FUNCTION_NAME \
        --runtime nodejs20.x \
        --handler index.handler \
        --timeout 300 \
        --memory-size 512 \
        --environment Variables='{
            "AWS_REGION":"'$REGION'",
            "CHAT_STATS_TABLE":"TaskiloChatStats",
            "CHAT_MESSAGES_TABLE":"TaskiloChatMessages", 
            "CHAT_PARTICIPANTS_TABLE":"TaskiloChatParticipants",
            "FIREBASE_SERVICE_ACCOUNT":"'${FIREBASE_SERVICE_ACCOUNT:-'{}'}'",
            "FIREBASE_DATABASE_URL":"'${FIREBASE_DATABASE_URL:-'https://taskilo-app-default-rtdb.europe-west1.firebasedatabase.app'}''"
        }' \
        --region $REGION
else
    echo "Creating new Lambda function..."
    aws lambda create-function \
        --function-name $FUNCTION_NAME \
        --runtime nodejs20.x \
        --role $ROLE_ARN \
        --handler index.handler \
        --zip-file fileb://chat-aggregator.zip \
        --timeout 300 \
        --memory-size 512 \
        --environment Variables='{
            "AWS_REGION":"'$REGION'",
            "CHAT_STATS_TABLE":"TaskiloChatStats",
            "CHAT_MESSAGES_TABLE":"TaskiloChatMessages",
            "CHAT_PARTICIPANTS_TABLE":"TaskiloChatParticipants", 
            "FIREBASE_SERVICE_ACCOUNT":"'${FIREBASE_SERVICE_ACCOUNT:-'{}'}'",
            "FIREBASE_DATABASE_URL":"'${FIREBASE_DATABASE_URL:-'https://taskilo-app-default-rtdb.europe-west1.firebasedatabase.app'}''"
        }' \
        --region $REGION
fi

echo "🕒 Setting up EventBridge trigger..."

# Create EventBridge rule for periodic execution (every 30 minutes)
RULE_NAME="taskilo-chat-aggregation-schedule"

if aws events describe-rule --name $RULE_NAME --region $REGION >/dev/null 2>&1; then
    echo "EventBridge rule already exists."
else
    echo "Creating EventBridge rule..."
    aws events put-rule \
        --name $RULE_NAME \
        --schedule-expression "rate(30 minutes)" \
        --description "Trigger Taskilo chat aggregation every 30 minutes" \
        --region $REGION
        
    # Add Lambda target
    aws events put-targets \
        --rule $RULE_NAME \
        --targets "Id"="1","Arn"="arn:aws:lambda:$REGION:$ACCOUNT_ID:function:$FUNCTION_NAME","Input"='{"action":"aggregate-recent","triggerType":"scheduled"}' \
        --region $REGION
        
    # Give EventBridge permission to invoke Lambda
    aws lambda add-permission \
        --function-name $FUNCTION_NAME \
        --statement-id eventbridge-invoke \
        --action lambda:InvokeFunction \
        --principal events.amazonaws.com \
        --source-arn "arn:aws:events:$REGION:$ACCOUNT_ID:rule/$RULE_NAME" \
        --region $REGION 2>/dev/null || echo "Permission already exists"
fi

echo "🧪 Testing Lambda function..."

# Test the Lambda function
cat > test-event.json << EOF
{
    "action": "aggregate-all",
    "triggerType": "manual"
}
EOF

aws lambda invoke \
    --function-name $FUNCTION_NAME \
    --payload file://test-event.json \
    --region $REGION \
    response.json

echo "📋 Lambda Response:"
cat response.json | jq . 2>/dev/null || cat response.json
echo ""

# Cleanup
rm chat-aggregator.zip
rm test-event.json
rm response.json
cd ../..
rm trust-policy.json

echo "✅ Chat Monitoring Lambda deployment completed!"
echo ""
echo "📊 Infrastructure:"
echo "   - Lambda Function: $FUNCTION_NAME"
echo "   - DynamoDB Tables: TaskiloChatStats, TaskiloChatMessages, TaskiloChatParticipants"
echo "   - EventBridge Rule: $RULE_NAME (runs every 30 minutes)"
echo ""
echo "🔧 Next Steps:"
echo "   1. Set FIREBASE_SERVICE_ACCOUNT environment variable with Firebase service account JSON"
echo "   2. Test the admin chat monitoring dashboard at /dashboard/admin/chat-monitoring"
echo "   3. Monitor CloudWatch logs for any issues"
echo "   4. Manually trigger aggregation: aws lambda invoke --function-name $FUNCTION_NAME --payload '{\"action\":\"aggregate-all\"}' response.json"
echo ""
echo "🏥 Health Check:"
echo "aws logs describe-log-groups --log-group-name-prefix '/aws/lambda/$FUNCTION_NAME'"