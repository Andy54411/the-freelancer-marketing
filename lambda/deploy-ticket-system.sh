#!/bin/bash

# Taskilo AWS Ticket System - Complete Deployment
echo "🚀 Deploying Complete Taskilo AWS Ticket System..."

# Konfiguration
STACK_NAME="taskilo-ticket-system"
REGION="eu-central-1"
ENVIRONMENT="prod"

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

function print_step() {
    echo -e "${BLUE}📋 Step: $1${NC}"
}

function print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

function print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

function print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Wechsel zum Script-Verzeichnis
cd "$(dirname "$0")"

print_step "1. Deploying AWS Infrastructure (CloudFormation)"

# CloudFormation Stack deployen
if aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION 2>/dev/null; then
    print_warning "Stack exists, updating..."
    aws cloudformation update-stack \
        --stack-name $STACK_NAME \
        --template-body file://ticket-system-stack.yaml \
        --parameters ParameterKey=EnvironmentName,ParameterValue=$ENVIRONMENT \
        --capabilities CAPABILITY_NAMED_IAM \
        --region $REGION
else
    print_warning "Creating new stack..."
    aws cloudformation create-stack \
        --stack-name $STACK_NAME \
        --template-body file://ticket-system-stack.yaml \
        --parameters ParameterKey=EnvironmentName,ParameterValue=$ENVIRONMENT \
        --capabilities CAPABILITY_NAMED_IAM \
        --region $REGION
fi

print_step "2. Waiting for CloudFormation deployment..."
aws cloudformation wait stack-update-complete --stack-name $STACK_NAME --region $REGION 2>/dev/null || \
aws cloudformation wait stack-create-complete --stack-name $STACK_NAME --region $REGION

if [ $? -eq 0 ]; then
    print_success "CloudFormation stack deployed successfully"
else
    print_error "CloudFormation deployment failed"
    exit 1
fi

# Stack Outputs abrufen
print_step "3. Retrieving CloudFormation outputs..."
LAMBDA_FUNCTION_NAME=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`LambdaFunctionName`].OutputValue' \
    --output text)

TABLE_NAME=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`TicketsTableName`].OutputValue' \
    --output text)

LAMBDA_ROLE_ARN=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`LambdaRoleArn`].OutputValue' \
    --output text)

print_success "Lambda Function: $LAMBDA_FUNCTION_NAME"
print_success "DynamoDB Table: $TABLE_NAME"
print_success "Lambda Role: $LAMBDA_ROLE_ARN"

print_step "4. Deploying Lambda Function Code"

# Lambda-Code deployen
cd ../ticket-classifier

# Dependencies installieren
print_warning "Installing Lambda dependencies..."
npm install --production

# Deployment-Package erstellen
print_warning "Creating deployment package..."
zip -r deployment.zip . -x "*.sh" "*.md" "deployment.zip" "node_modules/.cache/*"

# Lambda-Code updaten
print_warning "Updating Lambda function code..."
aws lambda update-function-code \
    --function-name $LAMBDA_FUNCTION_NAME \
    --zip-file fileb://deployment.zip \
    --region $REGION

# Environment Variables setzen
aws lambda update-function-configuration \
    --function-name $LAMBDA_FUNCTION_NAME \
    --environment Variables="{AWS_REGION=$REGION,TABLE_NAME=$TABLE_NAME,ENVIRONMENT=$ENVIRONMENT}" \
    --region $REGION

print_success "Lambda function deployed successfully"

print_step "5. Testing the complete system..."

# Test-Event erstellen
cat > test-event.json << EOF
{
    "ticketId": "test_$(date +%s)",
    "title": "Test Ticket für AWS System",
    "description": "Dies ist ein automatischer Test des AWS Ticket Systems. Es testet AI-Klassifizierung, DynamoDB Storage und CloudWatch Logging.",
    "customerEmail": "test@taskilo.de"
}
EOF

# Lambda-Funktion testen
print_warning "Invoking Lambda function with test event..."
aws lambda invoke \
    --function-name $LAMBDA_FUNCTION_NAME \
    --payload file://test-event.json \
    --region $REGION \
    response.json

print_step "6. Test Results"
echo "Lambda Response:"
cat response.json | jq .
echo ""

# Cleanup
rm deployment.zip
rm test-event.json
rm response.json

print_step "7. Deployment Summary"
echo ""
echo "🎉 AWS Ticket System Deployment Complete!"
echo ""
echo "📊 Infrastructure:"
echo "   - CloudFormation Stack: $STACK_NAME"
echo "   - DynamoDB Table: $TABLE_NAME"
echo "   - Lambda Function: $LAMBDA_FUNCTION_NAME"
echo "   - Region: $REGION"
echo ""
echo "🔧 Next Steps:"
echo "   1. Update your .env file with the new resource names"
echo "   2. Test the system with real ticket data"
echo "   3. Monitor CloudWatch logs for any issues"
echo ""
echo "📋 Monitoring:"
echo "   - CloudWatch Logs: /aws/lambda/$LAMBDA_FUNCTION_NAME"
echo "   - DynamoDB Metrics: AWS Console > DynamoDB > $TABLE_NAME"
echo "   - Lambda Metrics: AWS Console > Lambda > $LAMBDA_FUNCTION_NAME"
echo ""
print_success "Deployment completed successfully! 🚀"
