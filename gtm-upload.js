#!/usr/bin/env node
// GTM API Upload Script für DSGVO-konforme Trigger mit Service Account

const https = require('https');
const fs = require('fs');
const path = require('path');
const { GoogleAuth } = require('google-auth-library');
require('dotenv').config({ path: '.env.gtm' });

// Service Account Authentication
class GTMServiceAccountClient {
  constructor() {
    this.auth = new GoogleAuth({
      keyFilename: process.env.GOOGLE_SERVICE_ACCOUNT_PATH || './firebase-service-account-key.json',
      scopes: [
        'https://www.googleapis.com/auth/tagmanager.edit.containers',
        'https://www.googleapis.com/auth/tagmanager.publish',
      ],
    });
  }

  async getAccessToken() {
    try {
      const client = await this.auth.getClient();
      const accessToken = await client.getAccessToken();
      return accessToken.token;
    } catch (error) {
      console.error('❌ Service Account Authentication Error:', error);
      throw error;
    }
  }
}

// GTM API Konfiguration
const GTM_CONFIG = {
  accountId: process.env.GTM_ACCOUNT_ID || '6304012978',
  containerId: process.env.GTM_CONTAINER_ID || '224969531',
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || 'tilvo-f142f',
};

const GTM_API_BASE = 'https://www.googleapis.com/tagmanager/v2';

/**
 * GTM API Client
 */
class GTMAPIClient {
  constructor(config) {
    this.config = config;
    this.baseUrl = `${GTM_API_BASE}/accounts/${config.accountId}/containers/${config.containerId}`;
  }

  /**
   * Macht API-Request an GTM
   */
  async makeRequest(endpoint, method = 'GET', data = null) {
    const url = `${this.baseUrl}${endpoint}`;
    const options = {
      method: method,
      headers: {
        Authorization: `Bearer ${this.config.authToken}`,
        'Content-Type': 'application/json',
      },
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    return new Promise((resolve, reject) => {
      const req = https.request(url, options, res => {
        let responseData = '';

        res.on('data', chunk => {
          responseData += chunk;
        });

        res.on('end', () => {
          try {
            const parsed = JSON.parse(responseData);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(parsed);
            } else {
              reject(
                new Error(`API Error ${res.statusCode}: ${parsed.error?.message || responseData}`)
              );
            }
          } catch (e) {
            reject(new Error(`Failed to parse response: ${responseData}`));
          }
        });
      });

      req.on('error', err => {
        reject(err);
      });

      if (data) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  /**
   * Erstellt einen neuen Trigger
   */
  async createTrigger(triggerData) {
    console.log(`Creating trigger: ${triggerData.name}`);
    try {
      const response = await this.makeRequest('/workspaces/1/triggers', 'POST', triggerData);
      console.log(`✅ Trigger created: ${response.name} (ID: ${response.triggerId})`);
      return response;
    } catch (error) {
      if (error.message.includes('duplicate name')) {
        console.log(`⚠️  Trigger "${triggerData.name}" already exists - skipping`);
        return { name: triggerData.name, status: 'skipped' };
      }
      throw error;
    }
  }

  /**
   * Erstellt eine neue Variable
   */
  async createVariable(variableData) {
    console.log(`Creating variable: ${variableData.name}`);
    try {
      const response = await this.makeRequest('/workspaces/1/variables', 'POST', variableData);
      console.log(`✅ Variable created: ${response.name} (ID: ${response.variableId})`);
      return response;
    } catch (error) {
      if (error.message.includes('duplicate name')) {
        console.log(`⚠️  Variable "${variableData.name}" already exists - skipping`);
        return { name: variableData.name, status: 'skipped' };
      }
      throw error;
    }
  }

  /**
   * Erstellt einen neuen Tag
   */
  async createTag(tagData) {
    console.log(`Creating tag: ${tagData.name}`);
    try {
      const response = await this.makeRequest('/workspaces/1/tags', 'POST', tagData);
      console.log(`✅ Tag created: ${response.name} (ID: ${response.tagId})`);
      return response;
    } catch (error) {
      if (error.message.includes('duplicate name')) {
        console.log(`⚠️  Tag "${tagData.name}" already exists - skipping`);
        return { name: tagData.name, status: 'skipped' };
      }
      throw error;
    }
  }

  /**
   * Veröffentlicht die Workspace-Änderungen
   */
  async publishWorkspace(versionName = 'DSGVO Trigger Upload') {
    console.log('Publishing workspace...');
    const response = await this.makeRequest('/workspaces/1/create_version', 'POST', {
      name: versionName,
      notes: 'Uploaded DSGVO-konforme Trigger über VS Code API',
    });

    const publishResponse = await this.makeRequest(
      `/versions/${response.containerVersionId}/publish`,
      'POST'
    );
    console.log(`✅ Workspace published: ${publishResponse.containerVersionId}`);
    return publishResponse;
  }

  /**
   * Lädt die komplette Konfiguration hoch
   */
  async uploadConfiguration(configPath) {
    try {
      console.log('📁 Loading configuration from:', configPath);
      const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));

      const results = {
        triggers: [],
        variables: [],
        tags: [],
      };

      // 1. Variablen erstellen
      console.log('\n🔧 Creating variables...');
      for (const [key, variable] of Object.entries(configData.variables || {})) {
        try {
          const result = await this.createVariable(this.convertVariableFormat(variable));
          results.variables.push(result);
        } catch (error) {
          console.error(`❌ Failed to create variable ${key}:`, error.message);
        }
      }

      // 2. Trigger erstellen
      console.log('\n🎯 Creating triggers...');
      for (const [key, trigger] of Object.entries(configData.triggers || {})) {
        try {
          const result = await this.createTrigger(this.convertTriggerFormat(trigger));
          results.triggers.push(result);
        } catch (error) {
          console.error(`❌ Failed to create trigger ${key}:`, error.message);
        }
      }

      // 3. Tags erstellen
      console.log('\n🏷️ Creating tags...');
      for (const [key, tag] of Object.entries(configData.tags || {})) {
        try {
          const result = await this.createTag(this.convertTagFormat(tag));
          results.tags.push(result);
        } catch (error) {
          console.error(`❌ Failed to create tag ${key}:`, error.message);
        }
      }

      // 4. Workspace veröffentlichen
      console.log('\n🚀 Publishing workspace...');
      const publishResult = await this.publishWorkspace();

      console.log('\n✅ Upload completed successfully!');
      console.log(
        `📊 Results: ${results.triggers.length} triggers, ${results.variables.length} variables, ${results.tags.length} tags`
      );

      return { ...results, published: publishResult };
    } catch (error) {
      console.error('❌ Upload failed:', error.message);
      throw error;
    }
  }

  /**
   * Konvertiert Variable-Format für GTM API
   */
  convertVariableFormat(variable) {
    return {
      name: variable.name,
      type: variable.type,
      parameter: variable.code
        ? [
            {
              type: 'TEMPLATE',
              key: 'javascript',
              value: variable.code,
            },
          ]
        : undefined,
      notes: variable.description,
    };
  }

  /**
   * Konvertiert Trigger-Format für GTM API
   */
  convertTriggerFormat(trigger) {
    const converted = {
      name: trigger.name,
      type: trigger.type,
      notes: trigger.description,
    };

    // Custom Event Filter
    if (trigger.customEventFilter) {
      converted.customEventFilter = trigger.customEventFilter;
    }

    // Click Element
    if (trigger.clickElement) {
      converted.parameter = [
        {
          type: 'TEMPLATE',
          key: 'elementSelector',
          value: trigger.clickElement,
        },
      ];
    }

    // Filter
    if (trigger.filter) {
      converted.filter = trigger.filter;
    }

    return converted;
  }

  /**
   * Konvertiert Tag-Format für GTM API
   */
  convertTagFormat(tag) {
    const converted = {
      name: tag.name,
      type: tag.type === 'GOOGLE_ANALYTICS_4' ? 'gaawe' : tag.type,
      notes: tag.description,
    };

    // Parameter für GA4
    if (tag.measurementId) {
      converted.parameter = [
        {
          type: 'TEMPLATE',
          key: 'measurementId',
          value: tag.measurementId,
        },
      ];

      if (tag.eventName) {
        converted.parameter.push({
          type: 'TEMPLATE',
          key: 'eventName',
          value: tag.eventName,
        });
      }

      if (tag.parameters) {
        converted.parameter.push({
          type: 'LIST',
          key: 'eventParameters',
          list: Object.entries(tag.parameters).map(([key, value]) => ({
            type: 'MAP',
            map: [
              { type: 'TEMPLATE', key: 'name', value: key },
              { type: 'TEMPLATE', key: 'value', value: value },
            ],
          })),
        });
      }
    }

    // Firing Trigger
    if (tag.firingTriggerId) {
      converted.firingTriggerId = tag.firingTriggerId;
    }

    return converted;
  }
}

/**
 * Main Upload Function
 */
async function uploadToGTM() {
  try {
    // Prüfe ob API-Credentials verfügbar sind
    if (!GTM_CONFIG.authToken) {
      console.error('❌ GTM_AUTH_TOKEN environment variable is required!');
      console.log('💡 Run: export GTM_AUTH_TOKEN="your-oauth-token"');
      process.exit(1);
    }

    const client = new GTMAPIClient(GTM_CONFIG);
    const configPath = path.join(__dirname, 'gtm-dsgvo-triggers.json');

    await client.uploadConfiguration(configPath);

    console.log('\n🎉 All done! Check your GTM container:');
    console.log(
      `🔗 https://tagmanager.google.com/#/container/accounts/${GTM_CONFIG.accountId}/containers/${GTM_CONFIG.containerId}`
    );
  } catch (error) {
    console.error('💥 Upload failed:', error.message);
    process.exit(1);
  }
}

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
GTM DSGVO Trigger Upload Tool

Usage: node gtm-upload.js [options]

Options:
  --help, -h     Show this help message
  --dry-run      Show what would be uploaded without actually uploading
  --config PATH  Use custom config file (default: gtm-dsgvo-triggers.json)

Environment Variables:
  GTM_AUTH_TOKEN  OAuth2 token for GTM API access (required)
  GTM_API_KEY     Google API key (optional)

Examples:
  node gtm-upload.js
  node gtm-upload.js --dry-run
  node gtm-upload.js --config custom-triggers.json
`);
    process.exit(0);
  }

  if (args.includes('--dry-run')) {
    console.log('🔍 Dry run mode - showing what would be uploaded...');
    const configPath = path.join(__dirname, 'gtm-dsgvo-triggers.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    console.log('\nTriggers to upload:');
    Object.keys(config.triggers || {}).forEach(key => {
      console.log(`  - ${config.triggers[key].name}`);
    });

    console.log('\nVariables to upload:');
    Object.keys(config.variables || {}).forEach(key => {
      console.log(`  - ${config.variables[key].name}`);
    });

    console.log('\nTags to upload:');
    Object.keys(config.tags || {}).forEach(key => {
      console.log(`  - ${config.tags[key].name}`);
    });

    process.exit(0);
  }

  uploadToGTM();
}

module.exports = { GTMAPIClient, uploadToGTM };
