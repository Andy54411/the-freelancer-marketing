// /Users/andystaudinger/Tasko/firebase_functions/src/shared/cors.ts
import cors from "cors";
import { logger } from "firebase-functions/v2";

// CORS-Konfiguration für verschiedene Umgebungen
// Allow local dev, Vercel previews and any subdomain of taskilo.de (including www)
const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://tasko-rho.vercel.app',
    'https://tasko-zh8k.vercel.app',
    'https://tilvo-f142f.web.app',
];

export const corsHandler = cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl requests, or server-to-server)
        if (!origin) {
            callback(null, true);
            return;
        }

        try {
            const normalized = origin.toString().toLowerCase();
            // Allow explicit allowedOrigins
            if (allowedOrigins.includes(normalized)) {
                callback(null, true);
                return;
            }

            // Allow any subdomain of taskilo.de (e.g. www.taskilo.de, preview.taskilo.de)
            if (normalized === 'https://taskilo.de' || normalized.endsWith('.taskilo.de')) {
                callback(null, true);
                return;
            }

            logger.warn(`[CORS] Blocked origin: ${origin}`);
            // Explicitly deny with no CORS headers (client will see CORS error)
            callback(new Error('Not allowed by CORS'));
        } catch (err) {
            logger.error('[CORS] Error while checking origin', err);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'Cache-Control',
        'X-HTTP-Method-Override'
    ],
    preflightContinue: false,
    optionsSuccessStatus: 204
});
