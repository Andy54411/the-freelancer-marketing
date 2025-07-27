// Debug Script für Modal State Tracking
// Führe dieses Script in der Browser-Konsole aus

function debugModalState() {
  console.log('🔍 === MODAL STATE DEBUG ===');
  
  // 1. React State prüfen (falls zugänglich)
  const paymentButtons = document.querySelectorAll('button[class*="bg-red-600"]');
  console.log('💰 Payment Buttons gefunden:', paymentButtons.length);
  
  // 2. Modal DOM Elemente suchen
  const modals = {
    inlinePayment: document.querySelector('.fixed.inset-0.bg-black.bg-opacity-50'),
    zIndexModal: document.querySelector('[style*="z-index: 9999"]'),
    paymentModal: document.querySelector('[data-testid="payment-modal"]'),
    stripeElements: document.querySelectorAll('[class*="stripe"]'),
    anyFixedOverlay: document.querySelectorAll('.fixed.inset-0')
  };
  
  console.log('🎭 Modal DOM Elements:');
  Object.entries(modals).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      console.log(`  ${key}:`, value.length, 'elements');
    } else {
      console.log(`  ${key}:`, value ? 'FOUND' : 'NOT FOUND');
      if (value) {
        const computedStyle = getComputedStyle(value);
        console.log(`    Display: ${computedStyle.display}`);
        console.log(`    Z-Index: ${computedStyle.zIndex}`);
        console.log(`    Opacity: ${computedStyle.opacity}`);
        console.log(`    Position: ${computedStyle.position}`);
      }
    }
  });
  
  // 3. Body Styles prüfen
  const bodyStyle = getComputedStyle(document.body);
  console.log('🦴 Body Styles:');
  console.log('  Overflow:', bodyStyle.overflow);
  console.log('  Position:', bodyStyle.position);
  console.log('  Width:', bodyStyle.width);
  
  // 4. Alle High Z-Index Elemente
  const highZElements = [];
  document.querySelectorAll('*').forEach(el => {
    const zIndex = getComputedStyle(el).zIndex;
    if (zIndex !== 'auto' && parseInt(zIndex) >= 1000) {
      highZElements.push({
        element: el.tagName + '.' + (el.className || 'no-class'),
        zIndex: parseInt(zIndex),
        display: getComputedStyle(el).display,
        position: getComputedStyle(el).position
      });
    }
  });
  
  console.log('🔝 High Z-Index Elements (>=1000):');
  highZElements
    .sort((a, b) => b.zIndex - a.zIndex)
    .forEach(item => {
      console.log(`  Z:${item.zIndex} - ${item.element} (${item.display}, ${item.position})`);
    });
  
  // 5. React Component State versuchen zu finden
  console.log('⚛️ Versuche React State zu finden...');
  const reactElements = document.querySelectorAll('[data-reactroot], #__next');
  if (reactElements.length > 0) {
    console.log('React Root gefunden, aber State nicht direkt zugänglich');
    console.log('Tipp: Verwende React DevTools für State-Debugging');
  }
  
  return {
    modals,
    bodyStyle: {
      overflow: bodyStyle.overflow,
      position: bodyStyle.position,
      width: bodyStyle.width
    },
    highZElements
  };
}

// Auto-Execute und globale Funktion bereitstellen
const modalState = debugModalState();
window.debugModalState = debugModalState;

console.log('✅ Debug-Funktionen verfügbar:');
console.log('  - debugModalState() - Vollständige Modal-Analyse');
console.log('  - window.debugModalState - Globale Funktion');
