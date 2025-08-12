#!/bin/bash

# Taskilo AWS Lambda Email System Deployment Script
# Ersetzt Firebase mit nativen AWS Services

set -e  # Exit on any error

echo "🚀 Deploying Taskilo Email System to AWS Lambda..."

# AWS Configuration
AWS_REGION="eu-central-1"
ACCOUNT_ID="319629020205"
FUNCTION_NAME="TaskiloEmailOperations"

echo "📦 Building Lambda Function..."

# Build TypeScript Lambda Function
cd /Users/andystaudinger/Tasko/lambda/email-operations
npm install
npm run build

echo "📋 Creating deployment package..."

# Create deployment package
zip -r email-operations.zip dist/ node_modules/ package.json

echo "🛠️ Creating IAM Role for Lambda..."

# Create IAM Role for Lambda (if not exists)
ROLE_NAME="TaskiloEmailLambdaRole"
TRUST_POLICY='{
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
}'

# Check if role exists
if ! aws iam get-role --role-name $ROLE_NAME >/dev/null 2>&1; then
    echo "Creating IAM Role..."
    aws iam create-role \
        --role-name $ROLE_NAME \
        --assume-role-policy-document "$TRUST_POLICY" \
        --region $AWS_REGION
    
    # Attach basic Lambda execution policy
    aws iam attach-role-policy \
        --role-name $ROLE_NAME \
        --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
    
    # Create custom policy for DynamoDB and SES
    CUSTOM_POLICY='{
      "Version": "2012-10-17",
      "Statement": [
        {
          "Effect": "Allow",
          "Action": [
            "dynamodb:Query",
            "dynamodb:Scan",
            "dynamodb:GetItem",
            "dynamodb:PutItem",
            "dynamodb:UpdateItem",
            "dynamodb:DeleteItem"
          ],
          "Resource": "arn:aws:dynamodb:'$AWS_REGION':'$ACCOUNT_ID':table/Taskilo*"
        },
        {
          "Effect": "Allow",
          "Action": [
            "ses:SendEmail",
            "ses:SendRawEmail",
            "ses:GetSendQuota",
            "ses:GetSendStatistics"
          ],
          "Resource": "*"
        },
        {
          "Effect": "Allow",
          "Action": [
            "sns:Publish"
          ],
          "Resource": "arn:aws:sns:'$AWS_REGION':'$ACCOUNT_ID':*"
        }
      ]
    }'
    
    aws iam put-role-policy \
        --role-name $ROLE_NAME \
        --policy-name TaskiloEmailPolicy \
        --policy-document "$CUSTOM_POLICY"
    
    echo "Waiting for IAM role propagation..."
    sleep 10
else
    echo "IAM Role already exists."
fi

echo "⚡ Creating/Updating Lambda Function..."

ROLE_ARN="arn:aws:iam::$ACCOUNT_ID:role/$ROLE_NAME"

# Check if function exists
if aws lambda get-function --function-name $FUNCTION_NAME --region $AWS_REGION >/dev/null 2>&1; then
    echo "Updating existing Lambda function..."
    aws lambda update-function-code \
        --function-name $FUNCTION_NAME \
        --zip-file fileb://email-operations.zip \
        --region $AWS_REGION
else
    echo "Creating new Lambda function..."
    aws lambda create-function \
        --function-name $FUNCTION_NAME \
        --runtime nodejs20.x \
        --role $ROLE_ARN \
        --handler dist/index.handler \
        --zip-file fileb://email-operations.zip \
        --timeout 30 \
        --memory-size 256 \
        --region $AWS_REGION \
        --environment Variables='{
            "AWS_REGION":"'$AWS_REGION'",
            "ADMIN_EMAILS_TABLE":"TaskiloAdminEmails",
            "EMAIL_TEMPLATES_TABLE":"TaskiloEmailTemplates",
            "CONTACTS_TABLE":"TaskiloContacts",
            "EMAIL_MESSAGES_TABLE":"TaskiloEmailMessages",
            "SNS_TOPIC_ARN":"arn:aws:sns:'$AWS_REGION':'$ACCOUNT_ID':TaskiloEmailNotifications"
        }'
fi

echo "🌐 Creating API Gateway..."

# Create API Gateway (if not exists)
API_NAME="taskilo-email-api"

# Check if API exists
API_ID=$(aws apigateway get-rest-apis --region $AWS_REGION --query "items[?name=='$API_NAME'].id" --output text)

if [ -z "$API_ID" ] || [ "$API_ID" = "None" ]; then
    echo "Creating new API Gateway..."
    API_ID=$(aws apigateway create-rest-api \
        --name $API_NAME \
        --description "Taskilo Email Management API" \
        --region $AWS_REGION \
        --query 'id' --output text)
    
    # Get root resource ID
    ROOT_RESOURCE_ID=$(aws apigateway get-resources \
        --rest-api-id $API_ID \
        --region $AWS_REGION \
        --query 'items[?path==`/`].id' --output text)
    
    # Create /admin resource
    ADMIN_RESOURCE_ID=$(aws apigateway create-resource \
        --rest-api-id $API_ID \
        --parent-id $ROOT_RESOURCE_ID \
        --path-part admin \
        --region $AWS_REGION \
        --query 'id' --output text)
    
    # Create /admin/emails resource
    EMAILS_RESOURCE_ID=$(aws apigateway create-resource \
        --rest-api-id $API_ID \
        --parent-id $ADMIN_RESOURCE_ID \
        --path-part emails \
        --region $AWS_REGION \
        --query 'id' --output text)
    
    # Create ANY method for emails resource
    aws apigateway put-method \
        --rest-api-id $API_ID \
        --resource-id $EMAILS_RESOURCE_ID \
        --http-method ANY \
        --authorization-type NONE \
        --region $AWS_REGION
    
    # Set up Lambda integration
    LAMBDA_URI="arn:aws:apigateway:$AWS_REGION:lambda:path/2015-03-31/functions/arn:aws:lambda:$AWS_REGION:$ACCOUNT_ID:function:$FUNCTION_NAME/invocations"
    
    aws apigateway put-integration \
        --rest-api-id $API_ID \
        --resource-id $EMAILS_RESOURCE_ID \
        --http-method ANY \
        --type AWS_PROXY \
        --integration-http-method POST \
        --uri $LAMBDA_URI \
        --region $AWS_REGION
    
    # Give API Gateway permission to invoke Lambda
    aws lambda add-permission \
        --function-name $FUNCTION_NAME \
        --statement-id apigateway-invoke \
        --action lambda:InvokeFunction \
        --principal apigateway.amazonaws.com \
        --source-arn "arn:aws:execute-api:$AWS_REGION:$ACCOUNT_ID:$API_ID/*/*" \
        --region $AWS_REGION
    
    # Deploy API
    aws apigateway create-deployment \
        --rest-api-id $API_ID \
        --stage-name prod \
        --region $AWS_REGION
    
    echo "API Gateway created with ID: $API_ID"
else
    echo "API Gateway already exists with ID: $API_ID"
fi

echo "🗄️ Creating DynamoDB Tables..."

# Create DynamoDB Tables
TABLES=("TaskiloAdminEmails" "TaskiloEmailTemplates" "TaskiloContacts" "TaskiloEmailMessages")

for TABLE in "${TABLES[@]}"; do
    if ! aws dynamodb describe-table --table-name $TABLE --region $AWS_REGION >/dev/null 2>&1; then
        echo "Creating DynamoDB table: $TABLE"
        
        case $TABLE in
            "TaskiloAdminEmails")
                aws dynamodb create-table \
                    --table-name $TABLE \
                    --attribute-definitions \
                        AttributeName=emailId,AttributeType=S \
                    --key-schema \
                        AttributeName=emailId,KeyType=HASH \
                    --billing-mode PAY_PER_REQUEST \
                    --region $AWS_REGION
                ;;
            "TaskiloEmailTemplates")
                aws dynamodb create-table \
                    --table-name $TABLE \
                    --attribute-definitions \
                        AttributeName=templateId,AttributeType=S \
                    --key-schema \
                        AttributeName=templateId,KeyType=HASH \
                    --billing-mode PAY_PER_REQUEST \
                    --region $AWS_REGION
                ;;
            "TaskiloContacts")
                aws dynamodb create-table \
                    --table-name $TABLE \
                    --attribute-definitions \
                        AttributeName=contactId,AttributeType=S \
                    --key-schema \
                        AttributeName=contactId,KeyType=HASH \
                    --billing-mode PAY_PER_REQUEST \
                    --region $AWS_REGION
                ;;
            "TaskiloEmailMessages")
                aws dynamodb create-table \
                    --table-name $TABLE \
                    --attribute-definitions \
                        AttributeName=emailId,AttributeType=S \
                    --key-schema \
                        AttributeName=emailId,KeyType=HASH \
                    --billing-mode PAY_PER_REQUEST \
                    --region $AWS_REGION
                ;;
        esac
    else
        echo "DynamoDB table $TABLE already exists."
    fi
done

echo "📢 Creating SNS Topic..."

# Create SNS Topic
TOPIC_NAME="TaskiloEmailNotifications"
if ! aws sns get-topic-attributes --topic-arn "arn:aws:sns:$AWS_REGION:$ACCOUNT_ID:$TOPIC_NAME" --region $AWS_REGION >/dev/null 2>&1; then
    echo "Creating SNS topic: $TOPIC_NAME"
    aws sns create-topic \
        --name $TOPIC_NAME \
        --region $AWS_REGION
else
    echo "SNS topic $TOPIC_NAME already exists."
fi

# Clean up
rm -f email-operations.zip

echo "✅ Deployment completed successfully!"
echo "🌐 API Gateway URL: https://$API_ID.execute-api.$AWS_REGION.amazonaws.com/prod"
echo "⚡ Lambda Function: $FUNCTION_NAME"
echo "🗄️ DynamoDB Tables: ${TABLES[*]}"
echo ""
echo "🔧 Next steps:"
echo "1. Configure SES domain verification"
echo "2. Update Vercel environment variables with API Gateway URL"
echo "3. Test email operations on https://taskilo.de"
