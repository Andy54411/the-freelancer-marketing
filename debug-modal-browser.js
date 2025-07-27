// Debug Script für Modal State Tracking - BROWSER ONLY
// Kopiere diesen Code in die Browser-Konsole auf https://taskilo.de

(function() {
  console.log('🔍 === MODAL STATE DEBUG - BROWSER VERSION ===');
  
  function debugModalState() {
    console.log('🚀 Starte Modal State Debugging...');
    
    // 1. Payment Buttons prüfen
    const paymentButtons = document.querySelectorAll('button');
    const paymentButtonsFound = [];
    paymentButtons.forEach(btn => {
      if (btn.textContent?.includes('JETZT BEZAHLEN') || btn.textContent?.includes('BEZAHLEN')) {
        paymentButtonsFound.push({
          text: btn.textContent,
          disabled: btn.disabled,
          classes: btn.className,
          element: btn
        });
      }
    });
    
    console.log('💰 Payment Buttons gefunden:', paymentButtonsFound.length);
    paymentButtonsFound.forEach((btn, i) => {
      console.log(`  ${i+1}. "${btn.text}" - Disabled: ${btn.disabled}`);
    });
    
    // 2. Modal DOM Elemente suchen
    const modalSelectors = {
      'InlinePayment Fixed Overlay': '.fixed.inset-0.bg-black.bg-opacity-50',
      'Z-Index 9999 Elements': '[style*="z-index: 9999"]',
      'Payment Modal Data Attribute': '[data-testid="payment-modal"]',
      'Stripe Elements': '[class*="stripe"]',
      'All Fixed Overlays': '.fixed.inset-0',
      'Modal Class': '.modal',
      'Dialog Elements': 'dialog',
      'React Modal': '[class*="Modal"]'
    };
    
    console.log('🎭 Modal DOM Elements Suche:');
    Object.entries(modalSelectors).forEach(([name, selector]) => {
      const elements = document.querySelectorAll(selector);
      console.log(`  ${name}: ${elements.length} gefunden`);
      
      if (elements.length > 0) {
        elements.forEach((el, i) => {
          const style = getComputedStyle(el);
          console.log(`    [${i}] Display: ${style.display}, Z-Index: ${style.zIndex}, Opacity: ${style.opacity}`);
          console.log(`        Position: ${style.position}, Visibility: ${style.visibility}`);
          console.log(`        Classes: ${el.className}`);
        });
      }
    });
    
    // 3. Body und HTML Styles
    const bodyStyle = getComputedStyle(document.body);
    const htmlStyle = getComputedStyle(document.documentElement);
    
    console.log('🦴 Document Styles:');
    console.log('  Body:');
    console.log(`    Overflow: ${bodyStyle.overflow}`);
    console.log(`    Position: ${bodyStyle.position}`);
    console.log(`    Width: ${bodyStyle.width}`);
    console.log(`    Height: ${bodyStyle.height}`);
    console.log('  HTML:');
    console.log(`    Overflow: ${htmlStyle.overflow}`);
    console.log(`    Position: ${htmlStyle.position}`);
    
    // 4. High Z-Index Elements
    const highZElements = [];
    document.querySelectorAll('*').forEach(el => {
      const style = getComputedStyle(el);
      const zIndex = style.zIndex;
      if (zIndex !== 'auto' && parseInt(zIndex) >= 50) {
        highZElements.push({
          element: el,
          tagName: el.tagName,
          className: el.className,
          zIndex: parseInt(zIndex),
          display: style.display,
          position: style.position,
          opacity: style.opacity
        });
      }
    });
    
    console.log('🔝 High Z-Index Elements (>=50):');
    highZElements
      .sort((a, b) => b.zIndex - a.zIndex)
      .slice(0, 10) // Nur Top 10
      .forEach(item => {
        console.log(`  Z:${item.zIndex} - ${item.tagName}.${item.className.split(' ')[0] || 'no-class'}`);
        console.log(`    Display: ${item.display}, Position: ${item.position}, Opacity: ${item.opacity}`);
      });
    
    // 5. InlinePaymentComponent spezifisch suchen
    console.log('💳 InlinePaymentComponent spezifische Suche:');
    
    // Suche nach typischen InlinePayment Mustern
    const inlinePaymentPatterns = [
      'div[style*="z-index: 9999"]',
      'div[style*="z-index: 10000"]',
      '.bg-black.bg-opacity-50',
      '.bg-white.rounded-lg.shadow-xl'
    ];
    
    inlinePaymentPatterns.forEach(pattern => {
      const elements = document.querySelectorAll(pattern);
      console.log(`  Pattern "${pattern}": ${elements.length} gefunden`);
      elements.forEach((el, i) => {
        const style = getComputedStyle(el);
        console.log(`    [${i}] ${style.display}, ${style.position}, Z:${style.zIndex}`);
      });
    });
    
    // 6. React Component Debugging (falls möglich)
    console.log('⚛️ React Debugging Versuch:');
    const reactElements = document.querySelectorAll('[data-reactroot], #__next, #root');
    console.log(`  React Root Elements: ${reactElements.length} gefunden`);
    
    // 7. Event Listeners auf Payment Button
    if (paymentButtonsFound.length > 0) {
      console.log('🎯 Event Listener Check:');
      paymentButtonsFound.forEach((btn, i) => {
        console.log(`  Button ${i+1}:`);
        console.log(`    onClick: ${btn.element.onclick ? 'Present' : 'None'}`);
        console.log(`    EventListeners: Use getEventListeners(element) in DevTools`);
      });
    }
    
    return {
      paymentButtons: paymentButtonsFound,
      highZElements: highZElements.slice(0, 5),
      bodyOverflow: bodyStyle.overflow,
      totalElements: document.querySelectorAll('*').length
    };
  }
  
  // Funktion global verfügbar machen
  window.debugModalState = debugModalState;
  
  // Auto-execute
  const result = debugModalState();
  
  console.log('✅ Debug abgeschlossen. Verwende debugModalState() für erneute Analyse.');
  console.log('📋 Nächste Schritte:');
  console.log('  1. Klicke den JETZT BEZAHLEN Button');
  console.log('  2. Führe debugModalState() erneut aus');
  console.log('  3. Vergleiche die Ergebnisse');
  
  return result;
})();
