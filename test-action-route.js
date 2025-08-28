const fetch = require('node-fetch');

async function testActionRoute() {
  try {
    console.log('🧪 Teste Action Route...');
    
    const url = 'http://localhost:3000/api/company/LLc8PX1VYHfpoFknk8o51LAOfSA2/quotes/received/quote_1756320622873_zuv5lwk04/action';
    
    console.log(`📍 URL: ${url}`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        action: 'accept'
      })
    });
    
    console.log(`📊 Status: ${response.status}`);
    console.log(`📊 Status Text: ${response.statusText}`);
    
    const responseText = await response.text();
    console.log(`📄 Response: ${responseText}`);
    
    if (response.status === 404) {
      console.log('❌ 404 - Route nicht gefunden!');
      console.log('🔍 Das bedeutet, Next.js kennt diese Route nicht.');
    } else if (response.status === 401) {
      console.log('✅ Route gefunden! (401 = Unauthorized ist normal ohne echten Token)');
    } else {
      console.log(`ℹ️ Unerwarteter Status: ${response.status}`);
    }
    
  } catch (error) {
    console.error('❌ Fehler beim Testen:', error.message);
  }
}

testActionRoute();
