#!/bin/bash
set -e

echo "=== Erstelle DynamoDB-Tabellen ==="

# TaskiloEmailTemplates
echo "Erstelle TaskiloEmailTemplates..."
aws dynamodb create-table \
  --table-name TaskiloEmailTemplates \
  --attribute-definitions AttributeName=templateId,AttributeType=S \
  --key-schema AttributeName=templateId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region eu-central-1 2>/dev/null || echo "Tabelle existiert bereits"

# TaskiloContacts  
echo "Erstelle TaskiloContacts..."
aws dynamodb create-table \
  --table-name TaskiloContacts \
  --attribute-definitions AttributeName=contactId,AttributeType=S \
  --key-schema AttributeName=contactId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region eu-central-1 2>/dev/null || echo "Tabelle existiert bereits"

# TaskiloEmailMessages
echo "Erstelle TaskiloEmailMessages..."
aws dynamodb create-table \
  --table-name TaskiloEmailMessages \
  --attribute-definitions AttributeName=emailId,AttributeType=S \
  --key-schema AttributeName=emailId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region eu-central-1 2>/dev/null || echo "Tabelle existiert bereits"

echo "=== Erstelle Lambda-Funktion ==="

# Lambda-Funktion erstellen/updaten
if aws lambda get-function --function-name TaskiloEmailOperations --region eu-central-1 2>/dev/null; then
  echo "Updatee Lambda-Funktion..."
  aws lambda update-function-code \
    --function-name TaskiloEmailOperations \
    --zip-file fileb://email-operations.zip \
    --region eu-central-1
else
  echo "Erstelle Lambda-Funktion..."
  aws lambda create-function \
    --function-name TaskiloEmailOperations \
    --runtime nodejs20.x \
    --role arn:aws:iam::319629020205:role/TaskiloEmailLambdaRole \
    --handler dist/index.handler \
    --zip-file fileb://email-operations.zip \
    --timeout 30 \
    --memory-size 256 \
    --region eu-central-1 \
    --environment Variables='{AWS_REGION=eu-central-1,ADMIN_EMAILS_TABLE=TaskiloAdminEmails,EMAIL_TEMPLATES_TABLE=TaskiloEmailTemplates,CONTACTS_TABLE=TaskiloContacts,EMAIL_MESSAGES_TABLE=TaskiloEmailMessages}'
fi

echo "=== Deployment abgeschlossen! ==="
