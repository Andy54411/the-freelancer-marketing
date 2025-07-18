#!/usr/bin/env node
// GTM API Debug Script

const { GoogleAuth } = require('google-auth-library');
const https = require('https');
require('dotenv').config({ path: '.env.gtm' });

console.log('🔍 GTM API Debug & Fix');
console.log('=====================');

async function debugGTMAPI() {
  try {
    // Service Account Authentication testen
    console.log('1. Service Account Authentication...');
    const auth = new GoogleAuth({
      keyFilename: './firebase-service-account-key.json',
      scopes: [
        'https://www.googleapis.com/auth/tagmanager.edit.containers',
        'https://www.googleapis.com/auth/tagmanager.publish'
      ]
    });

    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();
    
    console.log('✅ Service Account Authentication erfolgreich');
    console.log(`🔑 Token: ${accessToken.token.substring(0, 50)}...`);

    // GTM API testen
    console.log('\n2. GTM API Connectivity Test...');
    const accountId = process.env.GTM_ACCOUNT_ID || '1022290879475';
    const containerId = process.env.GTM_CONTAINER_ID || 'GTM-TG3H7QHX';
    
    const testUrl = `https://www.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces`;
    
    console.log(`📡 API URL: ${testUrl}`);
    
    const response = await makeHTTPSRequest(testUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken.token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ GTM API Response erhalten');
    console.log('📊 Response:', JSON.stringify(response, null, 2));
    
  } catch (error) {
    console.error('❌ Debug Error:', error);
    
    if (error.message.includes('<!DOCTYPE')) {
      console.log('\n🚨 PROBLEM IDENTIFIZIERT: HTML Response statt JSON');
      console.log('💡 LÖSUNG: GTM API muss aktiviert werden');
      console.log('🔗 Aktivieren Sie die API hier:');
      console.log('   https://console.cloud.google.com/apis/library/tagmanager.googleapis.com?project=tilvo-f142f');
    }
  }
}

function makeHTTPSRequest(url, options) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };
    
    const req = https.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (parseError) {
          reject(new Error(`Parse Error: ${parseError.message}. Response: ${data.substring(0, 200)}...`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.end();
  });
}

// Script ausführen
debugGTMAPI();
