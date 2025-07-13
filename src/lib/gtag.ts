// Google Analytics configuration
export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_ID;

// https://developers.google.com/analytics/devguides/collection/gtagjs/pages
export const pageview = (url: string) => {
    if (typeof window !== 'undefined' && window.gtag && GA_TRACKING_ID) {
        window.gtag('config', GA_TRACKING_ID, {
            page_path: url,
        });
    }
};

// https://developers.google.com/analytics/devguides/collection/gtagjs/events
export const event = ({
    action,
    category,
    label,
    value,
}: {
    action: string;
    category: string;
    label?: string;
    value?: number;
}) => {
    if (typeof window !== 'undefined' && window.gtag && GA_TRACKING_ID) {
        window.gtag('event', action, {
            event_category: category,
            event_label: label,
            value: value,
        });
    }
};

// Enhanced ecommerce events
export const purchaseEvent = ({
    transactionId,
    value,
    currency = 'EUR',
    items,
}: {
    transactionId: string;
    value: number;
    currency?: string;
    items: Array<{
        item_id: string;
        item_name: string;
        category: string;
        quantity: number;
        price: number;
    }>;
}) => {
    if (typeof window !== 'undefined' && window.gtag && GA_TRACKING_ID) {
        window.gtag('event', 'purchase', {
            transaction_id: transactionId,
            value: value,
            currency: currency,
            items: items,
        });
    }
};

// User engagement events
export const signUpEvent = (method: string) => {
    if (typeof window !== 'undefined' && window.gtag && GA_TRACKING_ID) {
        window.gtag('event', 'sign_up', {
            method: method,
        });
    }
};

export const loginEvent = (method: string) => {
    if (typeof window !== 'undefined' && window.gtag && GA_TRACKING_ID) {
        window.gtag('event', 'login', {
            method: method,
        });
    }
};

// Custom business events for Taskilo
export const taskOrderEvent = ({
    category,
    subcategory,
    value,
}: {
    category: string;
    subcategory: string;
    value: number;
}) => {
    if (typeof window !== 'undefined' && window.gtag && GA_TRACKING_ID) {
        window.gtag('event', 'task_order_created', {
            event_category: 'engagement',
            custom_category: category,
            custom_subcategory: subcategory,
            value: value,
        });
    }
};

export const providerRegistrationEvent = (userType: 'company' | 'employee') => {
    if (typeof window !== 'undefined' && window.gtag && GA_TRACKING_ID) {
        window.gtag('event', 'provider_registration', {
            event_category: 'engagement',
            user_type: userType,
        });
    }
};
