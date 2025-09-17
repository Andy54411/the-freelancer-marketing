# Firebase Service Account Setup für Chat Monitoring Lambda

## Übersicht
Die Chat-Monitoring Lambda-Funktion benötigt Zugriff auf Firebase Firestore, um Chat-Daten zu lesen. Dafür wird ein Firebase Service Account Key benötigt.

## Setup-Schritte

### 1. Firebase Service Account Key erstellen

1. Gehe zur **Firebase Console**: https://console.firebase.google.com/
2. Wähle das Taskilo-Projekt aus
3. Gehe zu **Projekteinstellungen** (Zahnrad-Symbol) → **Dienstkonten**
4. Klicke auf **Neuen privaten Schlüssel generieren**
5. Lade die JSON-Datei herunter (z.B. `taskilo-firebase-adminsdk.json`)

### 2. Service Account Key als Umgebungsvariable setzen

**Option A: AWS Lambda Environment Variable**
```bash
# JSON-Inhalt als String (für Deploy-Script)
export FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"taskilo-app",...}'
```

**Option B: AWS Systems Manager Parameter Store** (Empfohlen)
```bash
# Service Account Key in Parameter Store speichern
aws ssm put-parameter \
  --name "/taskilo/chat-monitoring/firebase-service-account" \
  --value file://taskilo-firebase-adminsdk.json \
  --type "SecureString" \
  --description "Firebase service account for chat monitoring" \
  --region eu-central-1

# Lambda-Funktion anpassen, um Parameter zu lesen
```

### 3. Lambda IAM-Rolle erweitern (für Option B)

```bash
# SSM Parameter Read-Berechtigung hinzufügen
ADDITIONAL_POLICY='{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ssm:GetParameter",
        "ssm:GetParameters"
      ],
      "Resource": "arn:aws:ssm:eu-central-1:*:parameter/taskilo/chat-monitoring/*"
    }
  ]
}'

aws iam put-role-policy \
    --role-name TaskiloChatAggregatorRole \
    --policy-name TaskiloSSMParameterAccess \
    --policy-document "$ADDITIONAL_POLICY"
```

### 4. Lambda-Code für Parameter Store anpassen

```javascript
// In lambda/chat-aggregator/index.js
const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');

let firebaseServiceAccount = null;

async function getFirebaseServiceAccount() {
  if (firebaseServiceAccount) return firebaseServiceAccount;
  
  try {
    const ssmClient = new SSMClient({ region: process.env.AWS_REGION });
    const command = new GetParameterCommand({
      Name: '/taskilo/chat-monitoring/firebase-service-account',
      WithDecryption: true
    });
    
    const result = await ssmClient.send(command);
    firebaseServiceAccount = JSON.parse(result.Parameter.Value);
    return firebaseServiceAccount;
  } catch (error) {
    console.error('Failed to get Firebase service account from Parameter Store:', error);
    // Fallback to environment variable
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
  }
}

// Firebase Admin initialisieren
if (!admin.apps.length) {
  const serviceAccount = await getFirebaseServiceAccount();
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
}
```

## Deployment

### Schnelle Lösung (Environment Variable)
```bash
# Service Account Key in Variable setzen
export FIREBASE_SERVICE_ACCOUNT='$(cat taskilo-firebase-adminsdk.json | jq -c .)'

# Lambda deployen
./lambda/deploy-chat-monitoring.sh
```

### Sichere Lösung (Parameter Store)
```bash
# 1. Service Account in Parameter Store speichern
aws ssm put-parameter \
  --name "/taskilo/chat-monitoring/firebase-service-account" \
  --value file://taskilo-firebase-adminsdk.json \
  --type "SecureString" \
  --region eu-central-1

# 2. Lambda-Code anpassen (siehe oben)

# 3. Lambda deployen
./lambda/deploy-chat-monitoring.sh

# 4. IAM-Rolle erweitern
aws iam put-role-policy \
    --role-name TaskiloChatAggregatorRole \
    --policy-name TaskiloSSMParameterAccess \
    --policy-document file://ssm-policy.json
```

## Test

```bash
# Lambda-Funktion manuell testen
aws lambda invoke \
  --function-name taskilo-chat-aggregator \
  --payload '{"action":"aggregate-all","triggerType":"manual"}' \
  --region eu-central-1 \
  response.json

# Logs prüfen
aws logs describe-log-groups --log-group-name-prefix '/aws/lambda/taskilo-chat-aggregator'
aws logs get-log-events \
  --log-group-name '/aws/lambda/taskilo-chat-aggregator' \
  --log-stream-name 'LATEST' \
  --limit 50
```

## Troubleshooting

### Firebase Permission Errors
- Überprüfe, ob Service Account die nötigen Firestore-Berechtigungen hat
- Teste Firebase-Verbindung lokal: `node -e "const admin = require('firebase-admin'); const serviceAccount = require('./serviceAccount.json'); admin.initializeApp({credential: admin.credential.cert(serviceAccount)}); console.log('Firebase connected');"`

### Lambda Environment Issues
- Checke Environment Variables: `aws lambda get-function-configuration --function-name taskilo-chat-aggregator`
- Validiere JSON Format: `echo $FIREBASE_SERVICE_ACCOUNT | jq .`

### DynamoDB Access Issues
- Prüfe IAM-Berechtigungen für DynamoDB-Tabellen
- Teste DynamoDB-Zugriff: `aws dynamodb scan --table-name TaskiloChatStats --limit 1`

## Security Best Practices

1. **Parameter Store verwenden** statt Environment Variables für sensitive Daten
2. **IAM-Berechtigungen minimal halten** - nur notwendige DynamoDB/Firebase-Zugriffe
3. **Service Account Key rotieren** regelmäßig (empfohlen: alle 90 Tage)
4. **CloudWatch Logs überwachen** auf verdächtige Aktivitäten
5. **VPC-Isolation** für Lambda-Funktion (optional)

## Monitoring

```bash
# CloudWatch Dashboard für Chat Monitoring
aws cloudwatch put-dashboard \
  --dashboard-name "TaskiloChatMonitoring" \
  --dashboard-body file://chat-monitoring-dashboard.json

# Alarms für kritische Fehler
aws cloudwatch put-metric-alarm \
  --alarm-name "TaskiloChatAggregatorErrors" \
  --alarm-description "Chat aggregator Lambda errors" \
  --metric-name "Errors" \
  --namespace "AWS/Lambda" \
  --statistic "Sum" \
  --period 300 \
  --threshold 5 \
  --comparison-operator "GreaterThanThreshold" \
  --dimensions Name=FunctionName,Value=taskilo-chat-aggregator
```