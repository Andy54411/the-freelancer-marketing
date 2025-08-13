// Data Migration Script from Firebase to AWS
// Copies all user data from Firebase users.json to AWS DynamoDB

const { readFileSync } = require('fs');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { marshall } = require('@aws-sdk/util-dynamodb');
const { PutItemCommand } = require('@aws-sdk/client-dynamodb');

const dynamodb = new DynamoDBClient({
  region: 'eu-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const TABLE_NAME = 'taskilo-admin-data';

async function saveToAWS(data) {
  try {
    const command = new PutItemCommand({
      TableName: TABLE_NAME,
      Item: marshall({
        ...data,
        updatedAt: new Date().toISOString(),
      }),
    });

    await dynamodb.send(command);
    return true;
  } catch (error) {
    console.error('[AWS Save Error]:', error);
    return false;
  }
}

async function migrateFirebaseDataToAWS() {
  try {
    console.log('🔄 Starting Firebase to AWS data migration...');

    // Read Firebase export data
    const usersData = JSON.parse(readFileSync('./emulator-exports/users.json', 'utf8'));

    let migratedCount = 0;
    let errorCount = 0;

    console.log(`📊 Found ${Object.keys(usersData).length} users to migrate`);

    for (const [uid, userData] of Object.entries(usersData)) {
      try {
        // Prepare data for AWS DynamoDB
        const awsData = {
          id: uid,
          ...userData,
          migratedFrom: 'firebase',
          migratedAt: new Date().toISOString(),
        };

        // Save to AWS DynamoDB
        const success = await saveToAWS(awsData);

        if (success) {
          migratedCount++;
          console.log(`✅ Migrated user: ${userData.email || userData.companyName || uid}`);
        } else {
          errorCount++;
          console.error(`❌ Failed to migrate user: ${uid}`);
        }

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        errorCount++;
        console.error(`❌ Error migrating user ${uid}:`, error);
      }
    }

    console.log('\n📈 Migration Summary:');
    console.log(`✅ Successfully migrated: ${migratedCount} users`);
    console.log(`❌ Failed migrations: ${errorCount} users`);
    console.log(`📊 Total processed: ${migratedCount + errorCount} users`);

    if (errorCount === 0) {
      console.log('🎉 All data successfully migrated to AWS!');
    } else {
      console.log('⚠️ Some errors occurred during migration. Check logs above.');
    }
  } catch (error) {
    console.error('💥 Migration failed:', error);
  }
}

// Run migration
migrateFirebaseDataToAWS();
