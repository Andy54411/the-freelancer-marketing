"use strict";
// /Users/andystaudinger/Tasko/firebase_functions/src/index.ts
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
const admin = __importStar(require("firebase-admin")); // Admin importieren
const v2_1 = require("firebase-functions/v2"); // logger importieren für Initialisierungs-Logs
const options_1 = require("firebase-functions/v2/options"); // <- setGlobalOptions importieren
// --- Globale Optionen für alle 2nd Gen Funktionen setzen ---
// Diese müssen vor admin.initializeApp() gesetzt werden, wenn sie global wirken sollen
(0, options_1.setGlobalOptions)({
    timeoutSeconds: 540, // Max. 9 Minuten für den Start/Initialisierung
    memory: '512MiB', // Mehr Speicher, könnte bei komplexer Initialisierung helfen
    cpu: 1 // Standard ist 1. Kann auf 2 erhöht werden, wenn der Start komplex ist.
});
// --- WICHTIG: Initialisierung des Firebase Admin SDK NUR HIER EINMAL ---
try {
    admin.initializeApp();
    v2_1.logger.info("Firebase Admin SDK erfolgreich initialisiert in index.ts."); // Zusätzliches Log
}
catch (error) {
    v2_1.logger.error("SCHWERER FEHLER BEI DER INITIALISIERUNG DES ADMIN SDK IN index.ts!", { error: error.message, stack: error.stack });
    throw error;
}
// --- Export-Deklarationen für alle deine Funktionen (MÜSSEN auf oberster Ebene stehen) ---
// DIESE ZEILEN MÜSSEN AUSSERHALB des try-catch-Blocks sein.
__exportStar(require("./callable_stripe"), exports);
__exportStar(require("./callable_general"), exports);
__exportStar(require("./http_general"), exports);
__exportStar(require("./http_webhooks"), exports);
__exportStar(require("./http_file_uploads"), exports);
__exportStar(require("./triggers_firestore"), exports);
//# sourceMappingURL=index.js.map