// Test Script für die neue Projects API
// Führe dies in der Browser-Konsole auf https://taskilo.de aus

async function testProjectsAPI() {
  const companyId = 'LLc8PX1VYHfpoFknk8o51LAOfSA2'; // Deine Company ID

  console.log('🧪 Testing Projects API...');
  console.log('📍 Company ID:', companyId);

  try {
    // Test 1: GET - Alle Projekte laden
    console.log('\n1️⃣ Testing GET /api/company/{uid}/projects');
    const response = await fetch(`/api/company/${companyId}/projects`);

    console.log('📊 Response Status:', response.status);
    console.log('📊 Response OK:', response.ok);

    const data = await response.json();
    console.log('📋 Response Data:', data);

    if (data.success) {
      console.log('✅ API GET Test erfolgreich!');
      console.log(`📊 ${data.count} Projekte gefunden`);
      console.log('📋 Projekte:', data.projects);

      // Test einzelnes Projekt wenn vorhanden
      if (data.projects.length > 0) {
        const firstProject = data.projects[0];
        console.log('\n2️⃣ Testing GET einzelnes Projekt');
        console.log('🎯 Testing project ID:', firstProject.id);

        const singleResponse = await fetch(`/api/company/${companyId}/projects/${firstProject.id}`);
        const singleData = await singleResponse.json();

        console.log('📊 Single Project Response:', singleData);

        if (singleData.success) {
          console.log('✅ Einzelnes Projekt erfolgreich geladen!');
          console.log('📋 Projekt Details:', singleData.project);
        } else {
          console.error('❌ Einzelnes Projekt konnte nicht geladen werden:', singleData.error);
        }
      }
    } else {
      console.error('❌ API GET Test fehlgeschlagen:', data.error);
    }
  } catch (error) {
    console.error('🚨 API Test Error:', error);
  }
}

// Test starten
testProjectsAPI();
