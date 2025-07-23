#!/usr/bin/env node

const puppeteer = require('puppeteer');

async function createOAuthCredentialsAutomated() {
  console.log('🤖 Automatisierte OAuth-Credentials-Erstellung...');

  try {
    const browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      args: ['--start-maximized'],
    });

    const page = await browser.newPage();

    // Navigate to Google Cloud Console
    console.log('📍 Navigiere zu Google Cloud Console...');
    await page.goto('https://console.cloud.google.com/apis/credentials?project=tilvo-f142f');

    // Wait for page to load
    await page.waitForTimeout(3000);

    // Check if already logged in or need to login
    const loginButton = await page.$('input[type="email"]');
    if (loginButton) {
      console.log('🔐 Login erforderlich - bitte manuell einloggen...');
      await page.waitForTimeout(10000); // Wait for manual login
    }

    // Click "Create Credentials" button
    console.log('➕ Klicke auf "Anmeldedaten erstellen"...');
    await page.waitForSelector('button[aria-label*="Anmeldedaten"]', { timeout: 10000 });
    await page.click('button[aria-label*="Anmeldedaten"]');

    // Select OAuth client ID
    console.log('🎯 Wähle "OAuth-Client-ID"...');
    await page.waitForTimeout(2000);
    const oauthOption = await page.$x('//span[contains(text(), "OAuth-Client-ID")]');
    if (oauthOption.length > 0) {
      await oauthOption[0].click();
    }

    // Fill in application type
    console.log('⚙️ Konfiguriere Anwendungstyp...');
    await page.waitForTimeout(2000);
    const webAppOption = await page.$x('//span[contains(text(), "Webanwendung")]');
    if (webAppOption.length > 0) {
      await webAppOption[0].click();
    }

    // Fill name field
    console.log('📝 Setze Namen...');
    await page.waitForSelector('input[aria-label*="Name"]', { timeout: 5000 });
    await page.type('input[aria-label*="Name"]', 'Taskilo Newsletter');

    // Add authorized origins
    console.log('🌐 Füge autorisierte Ursprünge hinzu...');
    const originsInput = await page.$('input[placeholder*="http"]');
    if (originsInput) {
      await originsInput.type('https://taskilo.vercel.app');
      await page.keyboard.press('Enter');
      await originsInput.type('http://localhost:3000');
    }

    // Add redirect URIs
    console.log('🔗 Füge Weiterleitungs-URIs hinzu...');
    const redirectInput = await page.$('input[placeholder*="redirect"]');
    if (redirectInput) {
      await redirectInput.type('https://taskilo.vercel.app/api/auth/google-workspace/callback');
      await page.keyboard.press('Enter');
      await redirectInput.type('http://localhost:3000/api/auth/google-workspace/callback');
    }

    // Click create
    console.log('✨ Erstelle OAuth-Client...');
    const createButton = await page.$x('//span[contains(text(), "Erstellen")]');
    if (createButton.length > 0) {
      await createButton[0].click();
    }

    // Wait for credentials to be created
    console.log('⏳ Warte auf Credentials...');
    await page.waitForTimeout(5000);

    // Try to extract credentials from the page
    const clientId = await page.evaluate(() => {
      const elements = document.querySelectorAll('input, span, div');
      for (let el of elements) {
        if (el.textContent && el.textContent.includes('.apps.googleusercontent.com')) {
          return el.textContent.trim();
        }
      }
      return null;
    });

    if (clientId) {
      console.log('✅ Client-ID gefunden:', clientId);
    }

    console.log('🎉 OAuth-Credentials erstellt! Prüfe die Console für Details.');

    // Keep browser open for manual verification
    console.log('⏸️ Browser bleibt offen für manuelle Verifikation...');
    await page.waitForTimeout(30000);

    await browser.close();
  } catch (error) {
    console.error('❌ Automatisierung fehlgeschlagen:', error.message);
    console.log('\n📋 Fallback: Manuelle Erstellung erforderlich');
    console.log(
      '👉 Gehe zu: https://console.cloud.google.com/apis/credentials?project=tilvo-f142f'
    );
  }
}

createOAuthCredentialsAutomated();
