#!/usr/bin/env node
// GTM API Upload Script für DSGVO-konforme Trigger mit Service Account Authentication

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
        'https://www.googleapis.com/auth/tagmanager.publish'
      ]
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
  accountId: process.env.GTM_ACCOUNT_ID || '1022290879475',
  containerId: process.env.GTM_CONTAINER_ID || 'GTM-TG3H7QHX',
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || 'tilvo-f142f'
};

const GTM_API_BASE = 'https://www.googleapis.com/tagmanager/v2';

/**
 * GTM API Client mit Service Account Authentication
 */
class GTMAPIClient {
  constructor(config) {
    this.config = config;
    this.baseUrl = `${GTM_API_BASE}/accounts/${config.accountId}/containers/${config.containerId}`;
    this.serviceAuth = new GTMServiceAccountClient();
  }

  /**
   * Macht API-Request an GTM mit Service Account Auth
   */
  async makeRequest(endpoint, method = 'GET', data = null) {
    const accessToken = await this.serviceAuth.getAccessToken();
    
    return new Promise((resolve, reject) => {
      const url = `${this.baseUrl}/${endpoint}`;
      const urlObj = new URL(url);
      
      const options = {
        hostname: urlObj.hostname,
        port: 443,
        path: urlObj.pathname + urlObj.search,
        method: method,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'GTM-VS-Code-Integration/1.0'
        }
      };

      if (data) {
        const jsonData = JSON.stringify(data);
        options.headers['Content-Length'] = Buffer.byteLength(jsonData);
      }

      const req = https.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          try {
            const jsonResponse = JSON.parse(responseData);
            
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(jsonResponse);
            } else {
              reject(new Error(`API Error ${res.statusCode}: ${jsonResponse.error?.message || responseData}`));
            }
          } catch (parseError) {
            reject(new Error(`Parse Error: ${parseError.message}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      if (data) {
        req.write(JSON.stringify(data));
      }
      
      req.end();
    });
  }

  /**
   * Listet alle Trigger im Container auf
   */
  async listTriggers() {
    try {
      const response = await this.makeRequest('triggers');
      return response.trigger || [];
    } catch (error) {
      console.error('❌ Fehler beim Auflisten der Trigger:', error);
      return [];
    }
  }

  /**
   * Erstellt einen neuen Trigger
   */
  async createTrigger(triggerData) {
    try {
      const response = await this.makeRequest('triggers', 'POST', triggerData);
      return response;
    } catch (error) {
      console.error('❌ Fehler beim Erstellen des Triggers:', error);
      throw error;
    }
  }

  /**
   * Erstellt eine neue Variable
   */
  async createVariable(variableData) {
    try {
      const response = await this.makeRequest('variables', 'POST', variableData);
      return response;
    } catch (error) {
      console.error('❌ Fehler beim Erstellen der Variable:', error);
      throw error;
    }
  }

  /**
   * Listet alle Variablen im Container auf
   */
  async listVariables() {
    try {
      const response = await this.makeRequest('variables');
      return response.variable || [];
    } catch (error) {
      console.error('❌ Fehler beim Auflisten der Variablen:', error);
      return [];
    }
  }

  /**
   * Lädt die komplette GTM Konfiguration hoch
   */
  async uploadConfiguration(configPath, dryRun = false) {
    try {
      console.log('📋 Lade GTM Konfiguration...');
      
      const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      
      if (dryRun) {
        console.log('🔍 DRY RUN - Keine Änderungen werden vorgenommen');
        console.log('📊 Konfiguration zu hochladen:');
        console.log(`   - ${configData.variables?.length || 0} Variablen`);
        console.log(`   - ${configData.triggers?.length || 0} Trigger`);
        return;
      }

      console.log('🔄 Service Account Authentication...');
      await this.serviceAuth.getAccessToken();
      console.log('✅ Authentication erfolgreich');

      // Variablen erstellen
      if (configData.variables) {
        console.log(`📊 Erstelle ${configData.variables.length} Variablen...`);
        
        for (const variable of configData.variables) {
          try {
            const result = await this.createVariable(variable);
            console.log(`   ✅ Variable "${variable.name}" erstellt (ID: ${result.variableId})`);
          } catch (error) {
            console.log(`   ❌ Fehler bei Variable "${variable.name}": ${error.message}`);
          }
        }
      }

      // Trigger erstellen
      if (configData.triggers) {
        console.log(`🎯 Erstelle ${configData.triggers.length} Trigger...`);
        
        for (const trigger of configData.triggers) {
          try {
            const result = await this.createTrigger(trigger);
            console.log(`   ✅ Trigger "${trigger.name}" erstellt (ID: ${result.triggerId})`);
          } catch (error) {
            console.log(`   ❌ Fehler bei Trigger "${trigger.name}": ${error.message}`);
          }
        }
      }

      console.log('🎉 GTM Konfiguration erfolgreich hochgeladen!');
      console.log('💡 Vergessen Sie nicht, die Änderungen in GTM zu veröffentlichen');
      
    } catch (error) {
      console.error('❌ Fehler beim Hochladen der Konfiguration:', error);
      throw error;
    }
  }
}

/**
 * Hauptfunktion
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const configPath = args.find(arg => arg.endsWith('.json')) || 'gtm-dsgvo-triggers.json';

  console.log('🚀 GTM API Upload mit Service Account');
  console.log('=====================================');
  console.log(`📁 Konfigurationsdatei: ${configPath}`);
  console.log(`🔧 Container: ${GTM_CONFIG.containerId}`);
  console.log(`🏢 Account: ${GTM_CONFIG.accountId}`);
  
  if (dryRun) {
    console.log('🔍 DRY RUN Modus aktiviert');
  }

  if (!fs.existsSync(configPath)) {
    console.error(`❌ Konfigurationsdatei nicht gefunden: ${configPath}`);
    process.exit(1);
  }

  try {
    const client = new GTMAPIClient(GTM_CONFIG);
    await client.uploadConfiguration(configPath, dryRun);
  } catch (error) {
    console.error('❌ Upload fehlgeschlagen:', error);
    process.exit(1);
  }
}

// Script ausführen
if (require.main === module) {
  main();
}

module.exports = { GTMAPIClient, GTMServiceAccountClient };
