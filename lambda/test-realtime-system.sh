#!/bin/bash

# Test-Script für AWS Realtime System
# Überprüft alle Komponenten des Systems

echo "🧪 AWS Realtime System Test"
echo "=============================="

# 1. AWS Services Check
echo "1️⃣ AWS Services Status Check..."
echo ""

# EventBridge Bus Check
echo "📋 EventBridge Bus Status:"
aws events describe-event-bus --name taskilo-events-production --region eu-central-1 --query 'Arn' --output text 2>/dev/null || echo "❌ EventBridge Bus not found"

# Lambda Functions Check
echo "🔧 Lambda Functions Status:"
aws lambda get-function --function-name taskilo-websocket-manager-production --region eu-central-1 --query 'Configuration.State' --output text 2>/dev/null || echo "❌ WebSocket Manager not found"
aws lambda get-function --function-name taskilo-realtime-broadcaster-production --region eu-central-1 --query 'Configuration.State' --output text 2>/dev/null || echo "❌ Realtime Broadcaster not found"

# WebSocket API Check
echo "🌐 WebSocket API Status:"
aws apigatewayv2 get-api --api-id 8aji54ovpg --region eu-central-1 --query 'Name' --output text 2>/dev/null || echo "❌ WebSocket API not found"

# DynamoDB Table Check
echo "💾 DynamoDB Table Status:"
aws dynamodb describe-table --table-name TaskiloWebSocketConnections-production --region eu-central-1 --query 'Table.TableStatus' --output text 2>/dev/null || echo "❌ DynamoDB Table not found"

echo ""
echo "2️⃣ Environment Configuration Check..."
echo ""

# .env.local Check
if grep -q "AWS_EVENTBRIDGE_BUS=taskilo-events-production" .env.local; then
    echo "✅ EventBridge Bus configured"
else
    echo "❌ EventBridge Bus not configured"
fi

if grep -q "NEXT_PUBLIC_AWS_WEBSOCKET_URL=wss://8aji54ovpg.execute-api.eu-central-1.amazonaws.com/production" .env.local; then
    echo "✅ WebSocket URL configured"
else
    echo "❌ WebSocket URL not configured"
fi

if grep -q "AWS_LAMBDA_REALTIME_FUNCTION=taskilo-realtime-broadcaster-production" .env.local; then
    echo "✅ Lambda Function configured"
else
    echo "❌ Lambda Function not configured"
fi

echo ""
echo "3️⃣ Code Integration Check..."
echo ""

# TypeScript Compilation Check
echo "📝 TypeScript Compilation:"
if pnpm build > /dev/null 2>&1; then
    echo "✅ TypeScript compilation successful"
else
    echo "❌ TypeScript compilation failed"
fi

# Service Files Check
if [ -f "src/services/AWSRealtimeService.ts" ]; then
    echo "✅ AWSRealtimeService exists"
else
    echo "❌ AWSRealtimeService missing"
fi

if [ -f "src/hooks/useRealtimeWorkspace.ts" ]; then
    echo "✅ useRealtimeWorkspace hook exists"
else
    echo "❌ useRealtimeWorkspace hook missing"
fi

echo ""
echo "4️⃣ Lambda Function Logs Check..."
echo ""

# Recent Lambda Logs
echo "📊 Recent Lambda Logs (last 10 minutes):"
aws logs filter-log-events \
    --log-group-name "/aws/lambda/taskilo-websocket-manager-production" \
    --start-time $(date -d '10 minutes ago' +%s)000 \
    --region eu-central-1 \
    --query 'events[*].message' \
    --output text 2>/dev/null | head -5 || echo "No recent WebSocket Manager logs"

aws logs filter-log-events \
    --log-group-name "/aws/lambda/taskilo-realtime-broadcaster-production" \
    --start-time $(date -d '10 minutes ago' +%s)000 \
    --region eu-central-1 \
    --query 'events[*].message' \
    --output text 2>/dev/null | head -5 || echo "No recent Broadcaster logs"

echo ""
echo "5️⃣ Performance Test..."
echo ""

# WebSocket Connection Test (nur simulation)
echo "🚀 WebSocket Connection Simulation:"
echo "wscat -c 'wss://8aji54ovpg.execute-api.eu-central-1.amazonaws.com/production?adminId=test123'"
echo "Test message: {\"action\":\"subscribe\",\"workspaceId\":\"test-workspace\"}"

echo ""
echo "=============================="
echo "✅ AWS Realtime System Test Complete"
echo ""
echo "🔄 Next: Open https://taskilo.de/dashboard/admin/workspace to test live"
echo "💡 Monitor: aws logs tail /aws/lambda/taskilo-websocket-manager-production --follow"
