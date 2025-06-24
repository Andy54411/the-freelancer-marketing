"use strict";
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// /Users/andystaudinger/Tasko/firebase_functions/src/index.ts
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const options_1 = require("firebase-functions/v2/options");
(0, options_1.setGlobalOptions)({
    timeoutSeconds: 540,
    memory: '512MiB',
    cpu: 1,
    concurrency: 1, // <-- NEU: Jede Instanz bearbeitet nur eine Anfrage gleichzeitig.
});
// KEIN admin.initializeApp() mehr hier!
__exportStar(require("./callable_stripe"), exports);
__exportStar(require("./callable_general"), exports);
__exportStar(require("./http_general"), exports);
__exportStar(require("./http_webhooks"), exports);
__exportStar(require("./http_file_uploads"), exports);
__exportStar(require("./triggers_firestore"), exports);
__exportStar(require("./getUserOrders"), exports);
//# sourceMappingURL=index.js.map