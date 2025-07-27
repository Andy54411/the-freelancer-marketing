// DOM Check Script für Payment Modal Debugging
// Führe diesen Code in der Browser-Konsole aus

console.log('🔍 Payment Modal DOM Check gestartet...');

// 1. Prüfe Modal State
const modalStateCheck = () => {
  console.log('\n📋 === MODAL STATE CHECK ===');
  
  // Prüfe React State (falls verfügbar)
  const reactFiberNode = document.querySelector('[data-react-root]') || document.querySelector('#__next');
  console.log('React Root gefunden:', !!reactFiberNode);
  
  // Suche nach möglichen Modal Triggern
  const payButtons = document.querySelectorAll('button:contains("Zahlung"), button:contains("€"), button:contains("bezahlen"), button:contains("Payment")');
  console.log('Zahlung Buttons gefunden:', payButtons.length);
  payButtons.forEach((btn, i) => {
    console.log(`Button ${i}:`, btn.textContent?.trim(), btn);
  });
};

// 2. DOM Struktur Check
const domStructureCheck = () => {
  console.log('\n🏗️ === DOM STRUCTURE CHECK ===');
  
  // Prüfe auf Modal Container
  const modalOverlay = document.querySelector('[class*="modal"], [class*="overlay"], [class*="backdrop"]');
  console.log('Modal Overlay gefunden:', !!modalOverlay, modalOverlay);
  
  // Prüfe auf Payment Components
  const paymentComponent = document.querySelector('[class*="payment"], [class*="stripe"], [class*="checkout"]');
  console.log('Payment Component gefunden:', !!paymentComponent, paymentComponent);
  
  // Prüfe Z-Index Hierarchie
  const highZIndexElements = Array.from(document.querySelectorAll('*')).filter(el => {
    const zIndex = window.getComputedStyle(el).zIndex;
    return zIndex !== 'auto' && parseInt(zIndex) > 1000;
  });
  console.log('Elemente mit hohem Z-Index:', highZIndexElements.length);
  highZIndexElements.forEach(el => {
    const zIndex = window.getComputedStyle(el).zIndex;
    console.log(`Z-Index ${zIndex}:`, el.className, el);
  });
};

// 3. InlinePaymentComponent Check
const inlinePaymentCheck = () => {
  console.log('\n💳 === INLINE PAYMENT COMPONENT CHECK ===');
  
  // Suche nach InlinePaymentComponent
  const inlinePayment = document.querySelector('[class*="InlinePayment"], [data-component="InlinePaymentComponent"]');
  console.log('InlinePaymentComponent gefunden:', !!inlinePayment, inlinePayment);
  
  // Prüfe auf Stripe Elements
  const stripeElements = document.querySelectorAll('[class*="StripeElement"], .stripe-element, [data-elements-stable-field-name]');
  console.log('Stripe Elements gefunden:', stripeElements.length);
  stripeElements.forEach((el, i) => {
    console.log(`Stripe Element ${i}:`, el);
  });
  
  // Prüfe auf versteckte Elemente
  const hiddenElements = document.querySelectorAll('[style*="display: none"], [style*="visibility: hidden"], .hidden');
  console.log('Versteckte Elemente:', hiddenElements.length);
  hiddenElements.forEach((el, i) => {
    if (el.textContent?.includes('€') || el.className?.includes('payment') || el.className?.includes('modal')) {
      console.log(`Verstecktes Element ${i}:`, el.className, el.style.cssText, el);
    }
  });
};

// 4. Event Listener Check
const eventListenerCheck = () => {
  console.log('\n🎯 === EVENT LISTENER CHECK ===');
  
  // Suche nach Payment Button Event Listenern
  const clickableElements = document.querySelectorAll('button, [role="button"], [onclick]');
  const paymentButtons = Array.from(clickableElements).filter(el => {
    const text = el.textContent?.toLowerCase() || '';
    const className = el.className?.toLowerCase() || '';
    return text.includes('zahlung') || text.includes('bezahlen') || text.includes('€') || 
           className.includes('payment') || className.includes('pay');
  });
  
  console.log('Payment-relevante Buttons:', paymentButtons.length);
  paymentButtons.forEach((btn, i) => {
    console.log(`Payment Button ${i}:`, btn.textContent?.trim(), btn.className, btn);
  });
};

// 5. Condition Debug
const conditionDebug = () => {
  console.log('\n🧮 === CONDITION DEBUG ===');
  
  // Simuliere die Render-Bedingungen
  console.log('Checking render conditions for InlinePaymentComponent:');
  
  // Suche nach Komponenten-Props oder State
  const reactComponents = document.querySelectorAll('[data-reactroot] *');
  Array.from(reactComponents).forEach(el => {
    if (el._reactInternalFiber || el._reactInternals || el.__reactInternalInstance) {
      console.log('React Component gefunden:', el);
    }
  });
};

// 6. CSS Check
const cssCheck = () => {
  console.log('\n🎨 === CSS VISIBILITY CHECK ===');
  
  // Prüfe alle Elemente auf CSS-bedingte Unsichtbarkeit
  const allElements = document.querySelectorAll('*');
  const invisibleElements = Array.from(allElements).filter(el => {
    const styles = window.getComputedStyle(el);
    return styles.display === 'none' || 
           styles.visibility === 'hidden' || 
           styles.opacity === '0' ||
           parseInt(styles.zIndex) < 0;
  });
  
  const paymentRelated = invisibleElements.filter(el => {
    const text = el.textContent?.toLowerCase() || '';
    const className = el.className?.toLowerCase() || '';
    return text.includes('€') || text.includes('payment') || text.includes('modal') ||
           className.includes('payment') || className.includes('modal') || className.includes('stripe');
  });
  
  console.log('Unsichtbare payment-relevante Elemente:', paymentRelated.length);
  paymentRelated.forEach((el, i) => {
    const styles = window.getComputedStyle(el);
    console.log(`Unsichtbar ${i}:`, {
      element: el,
      className: el.className,
      display: styles.display,
      visibility: styles.visibility,
      opacity: styles.opacity,
      zIndex: styles.zIndex
    });
  });
};

// Alle Checks ausführen
modalStateCheck();
domStructureCheck();
inlinePaymentCheck();
eventListenerCheck();
conditionDebug();
cssCheck();

console.log('\n✅ DOM Check abgeschlossen! Prüfe die Ausgabe für Details.');

// Helper Funktion für kontinuierliches Monitoring
window.startModalMonitoring = () => {
  console.log('🔄 Starte kontinuierliches Modal Monitoring...');
  
  const interval = setInterval(() => {
    const modal = document.querySelector('[class*="modal"], [class*="payment"]');
    if (modal) {
      console.log('🎯 Modal/Payment Element erkannt:', modal);
      clearInterval(interval);
    }
  }, 1000);
  
  // Stoppe nach 30 Sekunden
  setTimeout(() => {
    clearInterval(interval);
    console.log('⏰ Modal Monitoring gestoppt (30s Timeout)');
  }, 30000);
};

console.log('\n💡 Tipp: Führe window.startModalMonitoring() aus für kontinuierliches Monitoring');
