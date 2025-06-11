// /Users/andystaudinger/Tasko/firebase_functions/src/env.d.ts
declare namespace NodeJS {
    interface ProcessEnv {
        // WICHTIG: Variablennamen müssen exakt mit denen in Ihrer .env-Datei übereinstimmen
        STRIPE_SECRET_KEY: string;
        STRIPE_WEBHOOK_SECRET: string;
        SENDGRID_API_KEY: string;
        FRONTEND_URL: string;
        EMULATOR_PUBLIC_FRONTEND_URL: string;
        SERVICE_ACCOUNT_CLIENT_EMAIL: string;
        SERVICE_ACCOUNT_PRIVATE_KEY: string;
        FIREBASE_PROJECT_ID: string;
        FUNCTIONS_EMULATOR?: 'true'; // Diese Variable wird vom Emulator gesetzt
        // Fügen Sie hier alle weiteren process.env-Variablen hinzu, die Sie verwenden
    }
}