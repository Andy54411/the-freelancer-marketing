/**
 * DEBUGGING TOOL: CustomerApprovalInterface Button Problem
 *
 * Dieses Script identifiziert warum der "JETZT BEZAHLEN" Button nicht funktioniert
 */

// 1. Prüfe ob der Button überhaupt angezeigt wird
function checkButtonVisibility() {
  const buttons = document.querySelectorAll('button');
  let paymentButton = null;

  buttons.forEach(button => {
    if (button.textContent?.includes('JETZT BEZAHLEN')) {
      paymentButton = button;
    }
  });

  if (paymentButton) {
    console.log('✅ JETZT BEZAHLEN Button gefunden:', paymentButton);
    console.log('Button disabled:', paymentButton.disabled);
    console.log('Button onclick:', paymentButton.onclick);
    console.log('Button eventListeners:', getEventListeners(paymentButton));
    return paymentButton;
  } else {
    console.log('❌ JETZT BEZAHLEN Button NICHT gefunden');
    return null;
  }
}

// 2. Prüfe die React-Component State
function checkReactState() {
  // Suche nach React Fiber Nodes
  const reactElement =
    document.querySelector('[data-reactroot]') || document.querySelector('#__next');

  if (reactElement && reactElement._reactInternalFiber) {
    console.log('React Fiber gefunden:', reactElement._reactInternalFiber);
  } else if (reactElement && reactElement._reactInternalInstance) {
    console.log('React Instance gefunden:', reactElement._reactInternalInstance);
  } else {
    console.log('React State debugging nicht verfügbar');
  }
}

// 3. Prüfe Console Errors
function checkConsoleErrors() {
  // Überwache console.error
  const originalError = console.error;
  const errors = [];

  console.error = function (...args) {
    errors.push(args);
    originalError.apply(console, args);
  };

  setTimeout(() => {
    if (errors.length > 0) {
      console.log('🚨 Console Errors detected:', errors);
    } else {
      console.log('✅ No console errors detected');
    }
    console.error = originalError; // Restore
  }, 1000);
}

// 4. Prüfe Network Requests
function checkNetworkRequests() {
  // Überwache fetch requests
  const originalFetch = window.fetch;

  window.fetch = function (...args) {
    console.log('🌐 Fetch Request:', args[0]);
    return originalFetch
      .apply(this, args)
      .then(response => {
        console.log('🌐 Fetch Response:', response.status, response.url);
        return response;
      })
      .catch(error => {
        console.log('🌐 Fetch Error:', error);
        throw error;
      });
  };
}

// 5. Prüfe ob TimeTracker verfügbar ist
function checkTimeTracker() {
  if (typeof window !== 'undefined' && window.TimeTracker) {
    console.log('✅ TimeTracker verfügbar:', window.TimeTracker);
  } else {
    console.log('❌ TimeTracker NICHT verfügbar');
  }
}

// 6. Simuliere Button Click
function simulateButtonClick() {
  const button = checkButtonVisibility();
  if (button) {
    console.log('🖱️ Simuliere Button Click...');
    try {
      button.click();
      console.log('✅ Button Click ausgeführt');
    } catch (error) {
      console.log('❌ Button Click Fehler:', error);
    }
  }
}

// 7. Main Debug Function
function debugPaymentButton() {
  console.log('🔍 DEBUGGING: CustomerApprovalInterface Payment Button');
  console.log('='.repeat(60));

  checkConsoleErrors();
  checkNetworkRequests();
  checkTimeTracker();
  checkButtonVisibility();
  checkReactState();

  console.log('='.repeat(60));
  console.log('Manual Actions:');
  console.log('- simulateButtonClick() - Simuliert Button-Klick');
  console.log('- checkButtonVisibility() - Prüft Button-Sichtbarkeit');
}

// Export für Browser Console
if (typeof window !== 'undefined') {
  window.debugPaymentButton = debugPaymentButton;
  window.simulateButtonClick = simulateButtonClick;
  window.checkButtonVisibility = checkButtonVisibility;
}

console.log('🛠️ Debug Tools geladen. Verwende: debugPaymentButton()');
