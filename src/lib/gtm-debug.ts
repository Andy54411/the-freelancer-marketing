// GTM Debugging und Testing Utilities

declare global {
  interface Window {
    dataLayer: any[];
    google_tag_manager: any;
  }
}

/**
 * GTM Debug Helper
 */
export class GTMDebugger {
  static isDebugMode(): boolean {
    return window.location.search.includes('gtm_debug=1');
  }

  static isGTMLoaded(): boolean {
    return typeof window.google_tag_manager !== 'undefined';
  }

  static getDataLayer(): any[] {
    return window.dataLayer || [];
  }

  static getLastDataLayerEvent(): any {
    const dataLayer = this.getDataLayer();
    return dataLayer.length > 0 ? dataLayer[dataLayer.length - 1] : null;
  }

  static getAllEvents(): any[] {
    return this.getDataLayer().filter(item => item.event);
  }

  static getEventsByName(eventName: string): any[] {
    return this.getAllEvents().filter(item => item.event === eventName);
  }

  static logAllEvents(): void {
    console.group('GTM DataLayer Events');
    this.getAllEvents().forEach((event, index) => {
      console.log(`${index + 1}. ${event.event}:`, event);
    });
    console.groupEnd();
  }

  static logEventsByName(eventName: string): void {
    const events = this.getEventsByName(eventName);
    console.group(`GTM ${eventName} Events`);
    events.forEach((event, index) => {
      console.log(`${index + 1}:`, event);
    });
    console.groupEnd();
  }

  static clearDataLayer(): void {
    if (window.dataLayer) {
      window.dataLayer.length = 0;
      console.log('GTM DataLayer cleared');
    }
  }

  static trackDebugEvent(eventName: string, data?: any): void {
    if (this.isDebugMode()) {
      const event = {
        event: eventName,
        debug: true,
        timestamp: new Date().toISOString(),
        ...data
      };
      
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(event);
      
      console.log(`GTM Debug Event: ${eventName}`, event);
    }
  }

  static validateEvent(event: any): boolean {
    if (!event.event) {
      console.error('GTM Event validation failed: Missing event name', event);
      return false;
    }
    
    if (typeof event.event !== 'string') {
      console.error('GTM Event validation failed: Event name must be string', event);
      return false;
    }
    
    console.log('GTM Event validation passed:', event);
    return true;
  }

  static monitorDataLayer(): void {
    const originalPush = window.dataLayer.push;
    
    window.dataLayer.push = function(...args) {
      console.log('GTM DataLayer push:', args);
      return originalPush.apply(this, args);
    };
    
    console.log('GTM DataLayer monitoring enabled');
  }

  static getGTMInfo(): any {
    if (!this.isGTMLoaded()) {
      return { loaded: false, error: 'GTM not loaded' };
    }

    return {
      loaded: true,
      containerId: window.google_tag_manager?.containerId || 'Unknown',
      dataLayerName: window.google_tag_manager?.dataLayerName || 'dataLayer',
      events: this.getAllEvents().length,
      lastEvent: this.getLastDataLayerEvent()
    };
  }

  static exportDataLayer(): string {
    return JSON.stringify(this.getDataLayer(), null, 2);
  }

  static importDataLayer(data: string): void {
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        window.dataLayer = parsed;
        console.log('GTM DataLayer imported successfully');
      } else {
        console.error('GTM DataLayer import failed: Data must be an array');
      }
    } catch (error) {
      console.error('GTM DataLayer import failed:', error);
    }
  }
}

/**
 * GTM Test Suite
 */
export class GTMTestSuite {
  static testPageView(): void {
    console.log('Testing GTM Page View...');
    
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'page_view',
      page_location: 'https://test.com/page',
      page_title: 'Test Page',
      page_path: '/page'
    });
    
    console.log('GTM Page View test completed');
  }

  static testFormSubmit(): void {
    console.log('Testing GTM Form Submit...');
    
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'form_submit',
      form_name: 'test_form',
      form_id: 'test_form_id',
      form_action: '/submit'
    });
    
    console.log('GTM Form Submit test completed');
  }

  static testCookieConsent(): void {
    console.log('Testing GTM Cookie Consent...');
    
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'cookie_consent',
      consent_type: 'accept_all',
      analytics_consent: true,
      marketing_consent: true,
      functional_consent: true
    });
    
    console.log('GTM Cookie Consent test completed');
  }

  static testCustomEvent(): void {
    console.log('Testing GTM Custom Event...');
    
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'custom_test_event',
      event_category: 'test',
      event_action: 'test_action',
      event_label: 'test_label',
      value: 1
    });
    
    console.log('GTM Custom Event test completed');
  }

  static runAllTests(): void {
    console.group('GTM Test Suite');
    
    this.testPageView();
    this.testFormSubmit();
    this.testCookieConsent();
    this.testCustomEvent();
    
    console.log('All GTM tests completed');
    console.groupEnd();
  }
}

/**
 * GTM Performance Monitor
 */
export class GTMPerformanceMonitor {
  private static startTime: number = 0;
  private static events: any[] = [];

  static startMonitoring(): void {
    this.startTime = performance.now();
    this.events = [];
    
    // Monitor dataLayer pushes
    const originalPush = window.dataLayer.push;
    
    window.dataLayer.push = function(...args) {
      const timestamp = performance.now();
      GTMPerformanceMonitor.events.push({
        timestamp: timestamp,
        duration: timestamp - GTMPerformanceMonitor.startTime,
        event: args[0]
      });
      
      return originalPush.apply(this, args);
    };
    
    console.log('GTM Performance monitoring started');
  }

  static stopMonitoring(): void {
    const endTime = performance.now();
    const totalDuration = endTime - this.startTime;
    
    console.group('GTM Performance Report');
    console.log(`Total monitoring duration: ${totalDuration.toFixed(2)}ms`);
    console.log(`Total events: ${this.events.length}`);
    console.log(`Average time per event: ${(totalDuration / this.events.length).toFixed(2)}ms`);
    
    this.events.forEach((event, index) => {
      console.log(`${index + 1}. ${event.event?.event || 'Unknown'} - ${event.duration.toFixed(2)}ms`);
    });
    
    console.groupEnd();
  }

  static getPerformanceData(): any {
    return {
      totalEvents: this.events.length,
      totalDuration: performance.now() - this.startTime,
      events: this.events
    };
  }
}

// Mache die Debugging-Tools global verfügbar im Development-Modus
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).GTMDebugger = GTMDebugger;
  (window as any).GTMTestSuite = GTMTestSuite;
  (window as any).GTMPerformanceMonitor = GTMPerformanceMonitor;
}
