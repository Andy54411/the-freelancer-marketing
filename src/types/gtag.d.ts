// Type definitions for Google Analytics gtag
declare global {
    interface Window {
        gtag: (
            command: 'config' | 'event',
            targetId: string,
            config?: {
                [key: string]: any;
                page_path?: string;
                event_category?: string;
                event_label?: string;
                value?: number;
                transaction_id?: string;
                currency?: string;
                items?: Array<{
                    item_id: string;
                    item_name: string;
                    category: string;
                    quantity: number;
                    price: number;
                }>;
                method?: string;
                custom_category?: string;
                custom_subcategory?: string;
                user_type?: string;
            }
        ) => void;
        dataLayer: Array<any>;
    }
}

export { };
