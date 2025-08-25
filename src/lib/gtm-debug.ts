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

    });
    console.groupEnd();
  }

  static logEventsByName(eventName: string): void {
    const events = this.getEventsByName(eventName);
    console.group(`GTM ${eventName} Events`);
    events.forEach((event, index) => {

    });
    console.groupEnd();
  }

  static clearDataLayer(): void {
    if (window.dataLayer) {
      window.dataLayer.length = 0;

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

    }
  }

  static validateEvent(event: any): boolean {
    if (!event.event) {

      return false;
    }

    if (typeof event.event !== 'string') {

      return false;
    }

    return true;
  }

  static monitorDataLayer(): void {
    const originalPush = window.dataLayer.push;

    window.dataLayer.push = function(...args) {

      return originalPush.apply(this, args);
    };

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

      } else {

      }
    } catch (error) {

    }
  }
}

/**
 * GTM Test Suite
 */
export class GTMTestSuite {
  static testPageView(): void {

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'page_view',
      page_location: 'https://test.com/page',
      page_title: 'Test Page',
      page_path: '/page'
    });

  }

  static testFormSubmit(): void {

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'form_submit',
      form_name: 'test_form',
      form_id: 'test_form_id',
      form_action: '/submit'
    });

  }

  static testCookieConsent(): void {

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'cookie_consent',
      consent_type: 'accept_all',
      analytics_consent: true,
      marketing_consent: true,
      functional_consent: true
    });

  }

  static testCustomEvent(): void {

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'custom_test_event',
      event_category: 'test',
      event_action: 'test_action',
      event_label: 'test_label',
      value: 1
    });

  }

  static runAllTests(): void {
    console.group('GTM Test Suite');

    this.testPageView();
    this.testFormSubmit();
    this.testCookieConsent();
    this.testCustomEvent();

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

  }

  static stopMonitoring(): void {
    const endTime = performance.now();
    const totalDuration = endTime - this.startTime;

    console.group('GTM Performance Report');

    this.events.forEach((event, index) => {

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
