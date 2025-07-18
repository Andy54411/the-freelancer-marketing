// GTM Event Tracking Utilities für TASKILO

export interface GTMEvent {
  event: string;
  [key: string]: any;
}

export interface GTMItem {
  item_id: string;
  item_name: string;
  category: string;
  quantity: number;
  price: number;
}

export interface GTMUserProperties {
  user_id?: string;
  user_type?: string;
  user_ltv?: number;
  customer_type?: string;
  signup_date?: string;
  region?: string;
}

declare global {
  interface Window {
    dataLayer: any[];
  }
}

/**
 * Basis-Funktion zum Senden von GTM-Events
 */
export const sendGTMEvent = (event: GTMEvent) => {
  if (typeof window !== 'undefined') {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(event);
  }
};

/**
 * Page View Event
 */
export const trackPageView = (page?: string) => {
  sendGTMEvent({
    event: 'page_view',
    page_location: window.location.href,
    page_title: document.title,
    page_path: page || window.location.pathname
  });
};

/**
 * Form Submit Event
 */
export const trackFormSubmit = (formName: string, formId?: string, formAction?: string) => {
  sendGTMEvent({
    event: 'form_submit',
    form_name: formName,
    form_id: formId,
    form_action: formAction
  });
};

/**
 * Button Click Event
 */
export const trackButtonClick = (buttonText: string, buttonId?: string, buttonClass?: string) => {
  sendGTMEvent({
    event: 'button_click',
    button_text: buttonText,
    button_id: buttonId,
    button_class: buttonClass
  });
};

/**
 * Cookie Consent Event
 */
export const trackCookieConsent = (
  consentType: 'accept_all' | 'accept_selected' | 'reject_all',
  analyticsConsent: boolean,
  marketingConsent: boolean,
  functionalConsent: boolean
) => {
  sendGTMEvent({
    event: 'cookie_consent',
    consent_type: consentType,
    analytics_consent: analyticsConsent,
    marketing_consent: marketingConsent,
    functional_consent: functionalConsent
  });
};

/**
 * Purchase Event
 */
export const trackPurchase = (
  transactionId: string,
  value: number,
  currency: string = 'EUR',
  items: GTMItem[]
) => {
  sendGTMEvent({
    event: 'purchase',
    transaction_id: transactionId,
    value: value,
    currency: currency,
    items: items
  });
};

/**
 * Add to Cart Event
 */
export const trackAddToCart = (
  value: number,
  currency: string = 'EUR',
  items: GTMItem[]
) => {
  sendGTMEvent({
    event: 'add_to_cart',
    currency: currency,
    value: value,
    items: items
  });
};

/**
 * Begin Checkout Event
 */
export const trackBeginCheckout = (
  value: number,
  currency: string = 'EUR',
  items: GTMItem[]
) => {
  sendGTMEvent({
    event: 'begin_checkout',
    currency: currency,
    value: value,
    items: items
  });
};

/**
 * Custom Event
 */
export const trackCustomEvent = (
  eventName: string,
  eventCategory?: string,
  eventAction?: string,
  eventLabel?: string,
  value?: number
) => {
  sendGTMEvent({
    event: eventName,
    event_category: eventCategory,
    event_action: eventAction,
    event_label: eventLabel,
    value: value
  });
};

/**
 * User Properties Event
 */
export const trackUserProperties = (userProperties: GTMUserProperties) => {
  sendGTMEvent({
    event: 'user_properties',
    user_id: userProperties.user_id,
    user_type: userProperties.user_type,
    user_ltv: userProperties.user_ltv,
    user_properties: {
      customer_type: userProperties.customer_type,
      signup_date: userProperties.signup_date,
      region: userProperties.region
    }
  });
};

/**
 * Service Booking Event (TASKILO-spezifisch)
 */
export const trackServiceBooking = (
  serviceId: string,
  serviceName: string,
  serviceCategory: string,
  servicePrice: number,
  providerId?: string,
  providerName?: string
) => {
  sendGTMEvent({
    event: 'service_booking',
    service_id: serviceId,
    service_name: serviceName,
    service_category: serviceCategory,
    service_price: servicePrice,
    provider_id: providerId,
    provider_name: providerName
  });
};

/**
 * Provider Registration Event (TASKILO-spezifisch)
 */
export const trackProviderRegistration = (
  providerId: string,
  providerCategory: string,
  providerRegion: string
) => {
  sendGTMEvent({
    event: 'provider_registration',
    provider_id: providerId,
    provider_category: providerCategory,
    provider_region: providerRegion
  });
};

/**
 * Search Event (TASKILO-spezifisch)
 */
export const trackSearch = (
  searchTerm: string,
  searchCategory?: string,
  searchLocation?: string,
  resultsCount?: number
) => {
  sendGTMEvent({
    event: 'search',
    search_term: searchTerm,
    search_category: searchCategory,
    search_location: searchLocation,
    results_count: resultsCount
  });
};

/**
 * Chat Event (TASKILO-spezifisch)
 */
export const trackChatInteraction = (
  chatType: 'bot' | 'human',
  messageType: 'question' | 'answer',
  chatCategory?: string
) => {
  sendGTMEvent({
    event: 'chat_interaction',
    chat_type: chatType,
    message_type: messageType,
    chat_category: chatCategory
  });
};

/**
 * Video Play Event
 */
export const trackVideoPlay = (
  videoTitle: string,
  videoDuration?: number,
  videoCategory?: string
) => {
  sendGTMEvent({
    event: 'video_play',
    video_title: videoTitle,
    video_duration: videoDuration,
    video_category: videoCategory
  });
};

/**
 * File Download Event
 */
export const trackFileDownload = (
  fileName: string,
  fileType: string,
  fileSize?: number
) => {
  sendGTMEvent({
    event: 'file_download',
    file_name: fileName,
    file_type: fileType,
    file_size: fileSize
  });
};

/**
 * Newsletter Signup Event
 */
export const trackNewsletterSignup = (
  email: string,
  source?: string
) => {
  sendGTMEvent({
    event: 'newsletter_signup',
    email: email,
    source: source
  });
};

/**
 * Social Share Event
 */
export const trackSocialShare = (
  platform: string,
  contentType: string,
  contentId?: string
) => {
  sendGTMEvent({
    event: 'social_share',
    platform: platform,
    content_type: contentType,
    content_id: contentId
  });
};
