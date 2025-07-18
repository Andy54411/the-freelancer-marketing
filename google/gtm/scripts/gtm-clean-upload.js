// GTM Clean & Upload Script - Löscht alle Variablen/Trigger und lädt neu hoch
// google/gtm/scripts/gtm-clean-upload.js

const { JWT } = require('google-auth-library');
const https = require('https');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.gtm') });

class GTMCleanUploader {
  constructor() {
    this.accountId = process.env.GTM_ACCOUNT_ID;
    this.containerId = process.env.GTM_CONTAINER_ID;
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    this.serviceAccountPath = path.join(__dirname, '..', 'firebase-service-account-key.json');
    this.workspaceId = null;
    this.auth = null;
  }

  async authenticate() {
    console.log('🔄 Service Account Authentication...');
    
    const serviceAccount = JSON.parse(fs.readFileSync(this.serviceAccountPath, 'utf8'));
    this.auth = new JWT({
      email: serviceAccount.client_email,
      key: serviceAccount.private_key,
      scopes: ['https://www.googleapis.com/auth/tagmanager.edit.containers']
    });

    await this.auth.authorize();
    console.log('✅ Authentication erfolgreich');
  }

  async makeRequest(method, path, data = null) {
    const accessToken = await this.auth.getAccessToken();
    
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'tagmanager.googleapis.com',
        port: 443,
        path: path,
        method: method,
        headers: {
          'Authorization': `Bearer ${accessToken.token}`,
          'Content-Type': 'application/json'
        }
      };

      const req = https.request(options, (res) => {
        let responseData = '';
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const jsonData = JSON.parse(responseData);
              resolve(jsonData);
            } catch (e) {
              resolve(responseData);
            }
          } else {
            reject(new Error(`API Error ${res.statusCode}: ${responseData}`));
          }
        });
      });

      req.on('error', (err) => {
        reject(err);
      });

      if (data) {
        req.write(JSON.stringify(data));
      }
      req.end();
    });
  }

  async findWorkspace() {
    console.log('📁 Suche Default Workspace...');
    const response = await this.makeRequest('GET', `/tagmanager/v2/accounts/${this.accountId}/containers/${this.containerId}/workspaces`);
    
    if (response.workspace && response.workspace.length > 0) {
      this.workspaceId = response.workspace[0].workspaceId;
      console.log(`✅ Workspace gefunden: ${this.workspaceId}`);
    } else {
      throw new Error('Kein Workspace gefunden');
    }
  }

  async deleteAllTags() {
    console.log('🗑️ Lösche alle Tags...');
    
    try {
      const response = await this.makeRequest('GET', `/tagmanager/v2/accounts/${this.accountId}/containers/${this.containerId}/workspaces/${this.workspaceId}/tags`);
      
      if (response.tag && response.tag.length > 0) {
        for (const tag of response.tag) {
          try {
            await this.makeRequest('DELETE', `/tagmanager/v2/accounts/${this.accountId}/containers/${this.containerId}/workspaces/${this.workspaceId}/tags/${tag.tagId}`);
            console.log(`   ✅ Tag "${tag.name}" gelöscht`);
          } catch (error) {
            console.log(`   ❌ Fehler beim Löschen des Tags "${tag.name}": ${error.message}`);
          }
        }
      } else {
        console.log('   ℹ️  Keine Tags zum Löschen gefunden');
      }
    } catch (error) {
      console.log(`   ❌ Fehler beim Laden der Tags: ${error.message}`);
    }
  }

  async deleteAllVariables() {
    console.log('🗑️ Lösche alle Variablen...');
    
    try {
      const response = await this.makeRequest('GET', `/tagmanager/v2/accounts/${this.accountId}/containers/${this.containerId}/workspaces/${this.workspaceId}/variables`);
      
      if (response.variable && response.variable.length > 0) {
        for (const variable of response.variable) {
          try {
            await this.makeRequest('DELETE', `/tagmanager/v2/accounts/${this.accountId}/containers/${this.containerId}/workspaces/${this.workspaceId}/variables/${variable.variableId}`);
            console.log(`   ✅ Variable "${variable.name}" gelöscht`);
          } catch (error) {
            console.log(`   ❌ Fehler beim Löschen der Variable "${variable.name}": ${error.message}`);
          }
        }
      } else {
        console.log('   ℹ️  Keine Variablen zum Löschen gefunden');
      }
    } catch (error) {
      console.log(`   ❌ Fehler beim Laden der Variablen: ${error.message}`);
    }
  }

  async deleteAllTriggers() {
    console.log('🗑️ Lösche alle Trigger...');
    
    try {
      const response = await this.makeRequest('GET', `/tagmanager/v2/accounts/${this.accountId}/containers/${this.containerId}/workspaces/${this.workspaceId}/triggers`);
      
      if (response.trigger && response.trigger.length > 0) {
        for (const trigger of response.trigger) {
          try {
            await this.makeRequest('DELETE', `/tagmanager/v2/accounts/${this.accountId}/containers/${this.containerId}/workspaces/${this.workspaceId}/triggers/${trigger.triggerId}`);
            console.log(`   ✅ Trigger "${trigger.name}" gelöscht`);
          } catch (error) {
            console.log(`   ❌ Fehler beim Löschen des Triggers "${trigger.name}": ${error.message}`);
          }
        }
      } else {
        console.log('   ℹ️  Keine Trigger zum Löschen gefunden');
      }
    } catch (error) {
      console.log(`   ❌ Fehler beim Laden der Trigger: ${error.message}`);
    }
  }

  async createVariable(variable) {
    try {
      const response = await this.makeRequest('POST', `/tagmanager/v2/accounts/${this.accountId}/containers/${this.containerId}/workspaces/${this.workspaceId}/variables`, variable);
      console.log(`   ✅ Variable "${variable.name}" erstellt (ID: ${response.variableId})`);
      return response;
    } catch (error) {
      console.log(`   ❌ Fehler bei Variable "${variable.name}": ${error.message}`);
      throw error;
    }
  }

  async createTrigger(trigger) {
    try {
      const response = await this.makeRequest('POST', `/tagmanager/v2/accounts/${this.accountId}/containers/${this.containerId}/workspaces/${this.workspaceId}/triggers`, trigger);
      console.log(`   ✅ Trigger "${trigger.name}" erstellt (ID: ${response.triggerId})`);
      return response;
    } catch (error) {
      console.log(`   ❌ Fehler bei Trigger "${trigger.name}": ${error.message}`);
      throw error;
    }
  }

  async uploadConfig(configPath) {
    console.log(`📋 Lade Konfiguration: ${configPath}`);
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    // Erstelle Variablen
    if (config.variables && config.variables.length > 0) {
      console.log(`📊 Erstelle ${config.variables.length} Variablen...`);
      for (const variable of config.variables) {
        await this.createVariable(variable);
      }
    }

    // Erstelle Trigger
    if (config.triggers && config.triggers.length > 0) {
      console.log(`🎯 Erstelle ${config.triggers.length} Trigger...`);
      for (const trigger of config.triggers) {
        await this.createTrigger(trigger);
      }
    }
  }

  async publishWorkspace() {
    console.log('🚀 Veröffentliche Workspace...');
    
    try {
      const versionData = {
        name: `Clean Upload - ${new Date().toISOString()}`,
        notes: 'Automatisch erstellte Version nach Clean Upload'
      };

      const response = await this.makeRequest('POST', `/tagmanager/v2/accounts/${this.accountId}/containers/${this.containerId}/workspaces/${this.workspaceId}/create_version`, versionData);
      
      if (response.containerVersion) {
        console.log(`✅ Version ${response.containerVersion.containerVersionId} erstellt`);
        
        // Veröffentliche Version
        const publishResponse = await this.makeRequest('POST', `/tagmanager/v2/accounts/${this.accountId}/containers/${this.containerId}/versions/${response.containerVersion.containerVersionId}/publish`);
        console.log('✅ Version erfolgreich veröffentlicht');
      }
    } catch (error) {
      console.log(`❌ Fehler beim Veröffentlichen: ${error.message}`);
    }
  }

  async run(configPath) {
    try {
      console.log('🚀 GTM Clean & Upload');
      console.log('======================');
      console.log(`📁 Konfigurationsdatei: ${configPath}`);
      console.log(`🔧 Container: ${this.containerId}`);
      console.log(`🏢 Account: ${this.accountId}`);

      await this.authenticate();
      await this.findWorkspace();
      
      // Lösche alles in der richtigen Reihenfolge
      await this.deleteAllTags();
      await this.deleteAllTriggers();
      await this.deleteAllVariables();
      
      // Lade neue Konfiguration
      await this.uploadConfig(configPath);
      
      // Veröffentliche
      await this.publishWorkspace();
      
      console.log('🎉 GTM Clean & Upload erfolgreich abgeschlossen!');
      
    } catch (error) {
      console.error('❌ Fehler:', error);
      process.exit(1);
    }
  }
}

// Script ausführen
const configFile = process.argv[2];
if (!configFile) {
  console.error('❌ Bitte geben Sie eine Konfigurationsdatei an:');
  console.error('   node gtm-clean-upload.js configs/gtm-config.json');
  process.exit(1);
}

const configPath = path.resolve(configFile);
if (!fs.existsSync(configPath)) {
  console.error(`❌ Konfigurationsdatei nicht gefunden: ${configPath}`);
  process.exit(1);
}

const uploader = new GTMCleanUploader();
uploader.run(configPath);
