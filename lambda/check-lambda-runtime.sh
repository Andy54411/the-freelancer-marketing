#!/bin/bash

# Check und Update bestehender Lambda-Funktionen auf Node.js 20
# Bevor das AWS Realtime System deployed wird

echo "🔍 Überprüfung bestehender Lambda-Funktionen auf Node.js 18..."

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI nicht gefunden"
    exit 1
fi

REGION="eu-central-1"

echo "📋 Suche nach Lambda-Funktionen mit Node.js 18 in Region: ${REGION}"

# Liste alle Node.js 18 Funktionen
NODEJS18_FUNCTIONS=$(aws lambda list-functions \
    --region ${REGION} \
    --output text \
    --query "Functions[?Runtime=='nodejs18.x'].FunctionName")

if [ -z "$NODEJS18_FUNCTIONS" ]; then
    echo "✅ Keine Node.js 18 Lambda-Funktionen gefunden"
else
    echo "⚠️  Gefundene Node.js 18 Funktionen:"
    echo "$NODEJS18_FUNCTIONS"
    echo ""
    echo "🔧 Automatisches Update auf Node.js 20..."
    
    for FUNCTION_NAME in $NODEJS18_FUNCTIONS; do
        echo "Updating $FUNCTION_NAME..."
        aws lambda update-function-configuration \
            --function-name "$FUNCTION_NAME" \
            --runtime nodejs20.x \
            --region ${REGION}
        
        if [ $? -eq 0 ]; then
            echo "✅ $FUNCTION_NAME erfolgreich auf Node.js 20 aktualisiert"
        else
            echo "❌ Fehler beim Update von $FUNCTION_NAME"
        fi
    done
fi

echo ""
echo "📊 Aktuelle Lambda-Funktionen Status:"
aws lambda list-functions \
    --region ${REGION} \
    --output table \
    --query "Functions[].{Name:FunctionName,Runtime:Runtime,LastModified:LastModified}"

echo ""
echo "✅ Lambda Runtime Check abgeschlossen!"
echo "💡 Das neue AWS Realtime System wird Node.js 20 verwenden"
