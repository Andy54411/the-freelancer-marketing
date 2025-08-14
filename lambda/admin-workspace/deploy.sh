#!/bin/bash

# Taskilo Admin Workspace Lambda Deployment Script
echo "🚀 Deploying Taskilo Admin Workspace Lambda..."

# Wechsel zum Lambda-Verzeichnis
cd "$(dirname "$0")"

# AWS Configuration
AWS_REGION="eu-central-1"
ACCOUNT_ID="319629020205"
FUNCTION_NAME="TaskiloAdminWorkspace"
ROLE_NAME="TaskiloAdminWorkspaceLambdaRole"

echo "📦 Installing Lambda dependencies..."
npm install --production

echo "🗜️ Creating deployment package..."
zip -r admin-workspace.zip . -x "*.sh" "*.md" "admin-workspace.zip"

echo "🛠️ Creating IAM Role for Lambda..."

# IAM Trust Policy für Lambda
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
    
    # Create custom policy for DynamoDB
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
            "dynamodb:DeleteItem",
            "dynamodb:CreateTable",
            "dynamodb:DescribeTable"
          ],
          "Resource": [
            "arn:aws:dynamodb:'$AWS_REGION':'$ACCOUNT_ID':table/TaskiloAdminWorkspaces",
            "arn:aws:dynamodb:'$AWS_REGION':'$ACCOUNT_ID':table/TaskiloWorkspaceTasks",
            "arn:aws:dynamodb:'$AWS_REGION':'$ACCOUNT_ID':table/TaskiloWorkspaceMembers", 
            "arn:aws:dynamodb:'$AWS_REGION':'$ACCOUNT_ID':table/TaskiloWorkspaceBoards",
            "arn:aws:dynamodb:'$AWS_REGION':'$ACCOUNT_ID':table/TaskiloWorkspaceActivity",
            "arn:aws:dynamodb:'$AWS_REGION':'$ACCOUNT_ID':table/TaskiloAdminWorkspaces/index/*",
            "arn:aws:dynamodb:'$AWS_REGION':'$ACCOUNT_ID':table/TaskiloWorkspaceTasks/index/*",
            "arn:aws:dynamodb:'$AWS_REGION':'$ACCOUNT_ID':table/TaskiloWorkspaceMembers/index/*",
            "arn:aws:dynamodb:'$AWS_REGION':'$ACCOUNT_ID':table/TaskiloWorkspaceBoards/index/*",
            "arn:aws:dynamodb:'$AWS_REGION':'$ACCOUNT_ID':table/TaskiloWorkspaceActivity/index/*"
          ]
        },
        {
          "Effect": "Allow",
          "Action": [
            "sns:Publish"
          ],
          "Resource": "arn:aws:sns:'$AWS_REGION':'$ACCOUNT_ID':*"
        },
        {
          "Effect": "Allow", 
          "Action": [
            "logs:CreateLogGroup",
            "logs:CreateLogStream",
            "logs:PutLogEvents"
          ],
          "Resource": "arn:aws:logs:'$AWS_REGION':'$ACCOUNT_ID':*"
        }
      ]
    }'
    
    aws iam put-role-policy \
        --role-name $ROLE_NAME \
        --policy-name TaskiloAdminWorkspacePolicy \
        --policy-document "$CUSTOM_POLICY"
    
    echo "Waiting for IAM role propagation..."
    sleep 15
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
        --zip-file fileb://admin-workspace.zip \
        --region $AWS_REGION
else
    echo "Creating new Lambda function..."
    aws lambda create-function \
        --function-name $FUNCTION_NAME \
        --runtime nodejs20.x \
        --role $ROLE_ARN \
        --handler index.handler \
        --zip-file fileb://admin-workspace.zip \
        --timeout 30 \
        --memory-size 512 \
        --region $AWS_REGION \
        --environment Variables='{
            "AWS_REGION":"'$AWS_REGION'",
            "ADMIN_WORKSPACES_TABLE":"TaskiloAdminWorkspaces",
            "WORKSPACE_TASKS_TABLE":"TaskiloWorkspaceTasks",
            "WORKSPACE_MEMBERS_TABLE":"TaskiloWorkspaceMembers",
            "WORKSPACE_BOARDS_TABLE":"TaskiloWorkspaceBoards",
            "WORKSPACE_ACTIVITY_TABLE":"TaskiloWorkspaceActivity"
        }'
fi

echo "🗄️ Creating DynamoDB Tables..."

# Array der zu erstellenden Tabellen
TABLES=(
    "TaskiloAdminWorkspaces:workspaceId"
    "TaskiloWorkspaceTasks:taskId"
    "TaskiloWorkspaceMembers:memberId"
    "TaskiloWorkspaceBoards:boardId"
    "TaskiloWorkspaceActivity:activityId"
)

for TABLE_INFO in "${TABLES[@]}"; do
    IFS=':' read -r TABLE_NAME KEY_NAME <<< "$TABLE_INFO"
    
    if ! aws dynamodb describe-table --table-name $TABLE_NAME --region $AWS_REGION >/dev/null 2>&1; then
        echo "Creating DynamoDB table: $TABLE_NAME"
        
        aws dynamodb create-table \
            --table-name $TABLE_NAME \
            --attribute-definitions \
                AttributeName=$KEY_NAME,AttributeType=S \
                AttributeName=workspaceId,AttributeType=S \
            --key-schema \
                AttributeName=$KEY_NAME,KeyType=HASH \
            --global-secondary-indexes \
                IndexName=WorkspaceIndex,KeySchema=[{AttributeName=workspaceId,KeyType=HASH}],Projection='{ProjectionType=ALL}',ProvisionedThroughput='{ReadCapacityUnits=5,WriteCapacityUnits=5}' \
            --billing-mode PROVISIONED \
            --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
            --region $AWS_REGION
            
        echo "Waiting for table $TABLE_NAME to be ready..."
        aws dynamodb wait table-exists --table-name $TABLE_NAME --region $AWS_REGION
    else
        echo "DynamoDB table $TABLE_NAME already exists."
    fi
done

echo "🌐 Setting up API Gateway integration..."

# Check if API Gateway exists
API_NAME="taskilo-admin-workspace-api"
API_ID=$(aws apigateway get-rest-apis --region $AWS_REGION --query "items[?name=='$API_NAME'].id" --output text)

if [ -z "$API_ID" ] || [ "$API_ID" == "None" ]; then
    echo "Creating API Gateway..."
    API_ID=$(aws apigateway create-rest-api \
        --name $API_NAME \
        --description "Taskilo Admin Workspace API" \
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
    
    # Create /admin/workspaces resource
    WORKSPACES_RESOURCE_ID=$(aws apigateway create-resource \
        --rest-api-id $API_ID \
        --parent-id $ADMIN_RESOURCE_ID \
        --path-part workspaces \
        --region $AWS_REGION \
        --query 'id' --output text)
    
    # Create ANY method for workspaces resource
    aws apigateway put-method \
        --rest-api-id $API_ID \
        --resource-id $WORKSPACES_RESOURCE_ID \
        --http-method ANY \
        --authorization-type NONE \
        --region $AWS_REGION
    
    # Set up Lambda integration
    LAMBDA_URI="arn:aws:apigateway:$AWS_REGION:lambda:path/2015-03-31/functions/arn:aws:lambda:$AWS_REGION:$ACCOUNT_ID:function:$FUNCTION_NAME/invocations"
    
    aws apigateway put-integration \
        --rest-api-id $API_ID \
        --resource-id $WORKSPACES_RESOURCE_ID \
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
        --region $AWS_REGION 2>/dev/null || echo "Permission already exists"
    
    # Deploy API
    aws apigateway create-deployment \
        --rest-api-id $API_ID \
        --stage-name prod \
        --region $AWS_REGION
    
    echo "API Gateway created with ID: $API_ID"
else
    echo "API Gateway already exists with ID: $API_ID"
fi

echo "🧪 Testing Lambda function..."

# Test-Event erstellen
cat > test-event.json << EOF
{
    "httpMethod": "GET",
    "path": "/workspaces",
    "queryStringParameters": {
        "limit": "10"
    },
    "body": null
}
EOF

# Lambda-Funktion testen
aws lambda invoke \
    --function-name $FUNCTION_NAME \
    --payload file://test-event.json \
    --region $AWS_REGION \
    response.json

echo "📋 Lambda Response:"
cat response.json | jq .
echo ""

# Cleanup
rm admin-workspace.zip
rm test-event.json
rm response.json

echo "✅ Admin Workspace Lambda deployment completed!"
echo ""
echo "📊 Infrastructure:"
echo "   - Lambda Function: $FUNCTION_NAME"
echo "   - API Gateway: $API_ID"
echo "   - API Endpoint: https://$API_ID.execute-api.$AWS_REGION.amazonaws.com/prod/admin/workspaces"
echo "   - DynamoDB Tables: TaskiloAdminWorkspaces, TaskiloWorkspaceTasks, TaskiloWorkspaceMembers, TaskiloWorkspaceBoards, TaskiloWorkspaceActivity"
echo ""
echo "🔧 Next Steps:"
echo "   1. Update your Next.js app to use the new API endpoint"
echo "   2. Test workspace creation and management"
echo "   3. Configure authentication for the API"
echo "   4. Set up monitoring in CloudWatch"
