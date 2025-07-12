// /Users/andystaudinger/Tasko/firebase_functions/src/shared/cors.ts
import cors from "cors";
import { logger } from "firebase-functions/v2";

// CORS-Konfiguration für verschiedene Umgebungen
const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://tasko-rho.vercel.app',
    'https://tasko-zh8k.vercel.app',
    'https://tilvo-f142f.web.app',
    'https://taskilo.de'  // Hauptdomain hinzugefügt
];

export const corsHandler = cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) {
            callback(null, true);
            return;
        }
        
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            logger.warn(`[CORS] Blocked origin: ${origin}`);
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
