"use strict";
/**
 * Automatisches Service-Update Script für Firestore Migration
 * Aktualisiert alle Services von globalen Collections zu Subcollections
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceUpdater = void 0;
exports.runServiceUpdate = runServiceUpdate;
var fs_1 = require("fs");
var path_1 = require("path");
var SERVICE_REPLACEMENTS = [
    // CUSTOMERS COLLECTION
    {
        oldPattern: /collection\(db,\s*['"]\s*customers\s*['"]\)/g,
        newPattern: function () { return "collection(db, 'companies', companyId, 'customers')"; },
        description: 'customers → companies/[id]/customers'
    },
    // INVENTORY COLLECTION  
    {
        oldPattern: /collection\(db,\s*['"]\s*inventory\s*['"]\)/g,
        newPattern: function () { return "collection(db, 'companies', companyId, 'inventory')"; },
        description: 'inventory → companies/[id]/inventory'
    },
    // STOCK MOVEMENTS COLLECTION
    {
        oldPattern: /collection\(db,\s*['"]\s*stockMovements\s*['"]\)/g,
        newPattern: function () { return "collection(db, 'companies', companyId, 'stockMovements')"; },
        description: 'stockMovements → companies/[id]/stockMovements'
    },
    // TIME ENTRIES COLLECTION
    {
        oldPattern: /collection\(db,\s*['"]\s*timeEntries\s*['"]\)/g,
        newPattern: function () { return "collection(db, 'companies', companyId, 'timeEntries')"; },
        description: 'timeEntries → companies/[id]/timeEntries'
    },
    // QUOTES COLLECTION
    {
        oldPattern: /collection\(db,\s*['"]\s*quotes\s*['"]\)/g,
        newPattern: function () { return "collection(db, 'companies', companyId, 'quotes')"; },
        description: 'quotes → companies/[id]/quotes'
    },
    // EXPENSES COLLECTION
    {
        oldPattern: /collection\(db,\s*['"]\s*expenses\s*['"]\)/g,
        newPattern: function () { return "collection(db, 'companies', companyId, 'expenses')"; },
        description: 'expenses → companies/[id]/expenses'
    },
    // ORDER TIME TRACKING COLLECTION
    {
        oldPattern: /collection\(db,\s*['"]\s*orderTimeTracking\s*['"]\)/g,
        newPattern: function () { return "collection(db, 'companies', companyId, 'orderTimeTracking')"; },
        description: 'orderTimeTracking → companies/[id]/orderTimeTracking'
    },
    // DOC REFERENCES - CUSTOMERS
    {
        oldPattern: /doc\(db,\s*['"]\s*customers\s*['"],\s*([^)]+)\)/g,
        newPattern: function (match, customerId) { return "doc(db, 'companies', companyId, 'customers', ".concat(customerId, ")"); },
        description: 'doc(db, customers, id) → doc(db, companies, companyId, customers, id)'
    },
    // DOC REFERENCES - INVENTORY
    {
        oldPattern: /doc\(db,\s*['"]\s*inventory\s*['"],\s*([^)]+)\)/g,
        newPattern: function (match, itemId) { return "doc(db, 'companies', companyId, 'inventory', ".concat(itemId, ")"); },
        description: 'doc(db, inventory, id) → doc(db, companies, companyId, inventory, id)'
    },
    // DOC REFERENCES - STOCK MOVEMENTS
    {
        oldPattern: /doc\(db,\s*['"]\s*stockMovements\s*['"],\s*([^)]+)\)/g,
        newPattern: function (match, movementId) { return "doc(db, 'companies', companyId, 'stockMovements', ".concat(movementId, ")"); },
        description: 'doc(db, stockMovements, id) → doc(db, companies, companyId, stockMovements, id)'
    },
    // DOC REFERENCES - TIME ENTRIES
    {
        oldPattern: /doc\(db,\s*['"]\s*timeEntries\s*['"],\s*([^)]+)\)/g,
        newPattern: function (match, entryId) { return "doc(db, 'companies', companyId, 'timeEntries', ".concat(entryId, ")"); },
        description: 'doc(db, timeEntries, id) → doc(db, companies, companyId, timeEntries, id)'
    },
    // DOC REFERENCES - QUOTES
    {
        oldPattern: /doc\(db,\s*['"]\s*quotes\s*['"],\s*([^)]+)\)/g,
        newPattern: function (match, quoteId) { return "doc(db, 'companies', companyId, 'quotes', ".concat(quoteId, ")"); },
        description: 'doc(db, quotes, id) → doc(db, companies, companyId, quotes, id)'
    },
    // DOC REFERENCES - EXPENSES
    {
        oldPattern: /doc\(db,\s*['"]\s*expenses\s*['"],\s*([^)]+)\)/g,
        newPattern: function (match, expenseId) { return "doc(db, 'companies', companyId, 'expenses', ".concat(expenseId, ")"); },
        description: 'doc(db, expenses, id) → doc(db, companies, companyId, expenses, id)'
    },
    // WHERE CLAUSES - Remove companyId filters (no longer needed in subcollections)
    {
        oldPattern: /,\s*where\(['"]companyId['"],\s*[']==]+,\s*companyId\)/g,
        newPattern: function () { return ''; },
        description: 'Remove companyId where clauses (implicit in subcollections)'
    }
];
var ServiceUpdater = /** @class */ (function () {
    function ServiceUpdater(dryRun, logResults) {
        if (dryRun === void 0) { dryRun = true; }
        if (logResults === void 0) { logResults = true; }
        this.dryRun = dryRun;
        this.logResults = logResults;
    }
    ServiceUpdater.prototype.updateFile = function (filePath) {
        return __awaiter(this, void 0, void 0, function () {
            var content, hasChanges, appliedReplacements, _i, SERVICE_REPLACEMENTS_1, replacement, originalContent;
            return __generator(this, function (_a) {
                if (!fs_1.default.existsSync(filePath)) {
                    console.warn("\u26A0\uFE0F  File not found: ".concat(filePath));
                    return [2 /*return*/];
                }
                content = fs_1.default.readFileSync(filePath, 'utf8');
                hasChanges = false;
                appliedReplacements = [];
                // Apply all replacements
                for (_i = 0, SERVICE_REPLACEMENTS_1 = SERVICE_REPLACEMENTS; _i < SERVICE_REPLACEMENTS_1.length; _i++) {
                    replacement = SERVICE_REPLACEMENTS_1[_i];
                    originalContent = content;
                    if (typeof replacement.newPattern === 'function') {
                        content = content.replace(replacement.oldPattern, replacement.newPattern);
                    }
                    else {
                        content = content.replace(replacement.oldPattern, replacement.newPattern);
                    }
                    if (content !== originalContent) {
                        hasChanges = true;
                        appliedReplacements.push(replacement.description);
                    }
                }
                if (hasChanges) {
                    if (this.logResults) {
                        console.log("\n\uD83D\uDCDD ".concat(path_1.default.basename(filePath), ":"));
                        appliedReplacements.forEach(function (desc) { return console.log("  \u2705 ".concat(desc)); });
                    }
                    if (!this.dryRun) {
                        fs_1.default.writeFileSync(filePath, content, 'utf8');
                        console.log("  \uD83D\uDCBE File updated: ".concat(filePath));
                    }
                    else {
                        console.log("  \uD83E\uDDEA DRY RUN: Would update ".concat(filePath));
                    }
                }
                return [2 /*return*/];
            });
        });
    };
    ServiceUpdater.prototype.updateServices = function () {
        return __awaiter(this, void 0, void 0, function () {
            var serviceFiles, componentFiles, _i, serviceFiles_1, file, _a, componentFiles_1, file;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        console.log("\uD83D\uDE80 Starting Service Update (DRY RUN: ".concat(this.dryRun, ")"));
                        console.log("\uD83D\uDCC5 ".concat(new Date().toISOString(), "\n"));
                        serviceFiles = [
                            'src/services/customerService.ts',
                            'src/services/inventoryService.ts',
                            'src/services/timeTrackingService.ts',
                            'src/services/quoteService.ts',
                            'src/services/financeService.ts',
                            'src/services/warehouseService.ts',
                            'src/services/quoteInventoryService.ts'
                        ];
                        componentFiles = [
                            'src/components/finance/CustomerManager.tsx',
                            'src/components/finance/CustomerDetailModal.tsx',
                            'src/components/finance/SupplierManager.tsx',
                            'src/components/finance/ProjectsComponent.tsx',
                            'src/components/finance/ProjectDetailView.tsx',
                            'src/components/chart-expenses-interactive.tsx',
                            'src/components/chart-area-interactive.tsx',
                            'src/components/section-cards.tsx',
                            'src/components/chat/QuoteChat.tsx'
                        ];
                        // Update Services
                        console.log('🔧 Updating Services:');
                        _i = 0, serviceFiles_1 = serviceFiles;
                        _b.label = 1;
                    case 1:
                        if (!(_i < serviceFiles_1.length)) return [3 /*break*/, 4];
                        file = serviceFiles_1[_i];
                        return [4 /*yield*/, this.updateFile(file)];
                    case 2:
                        _b.sent();
                        _b.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4:
                        // Update Components  
                        console.log('\n🎨 Updating Components:');
                        _a = 0, componentFiles_1 = componentFiles;
                        _b.label = 5;
                    case 5:
                        if (!(_a < componentFiles_1.length)) return [3 /*break*/, 8];
                        file = componentFiles_1[_a];
                        return [4 /*yield*/, this.updateFile(file)];
                    case 6:
                        _b.sent();
                        _b.label = 7;
                    case 7:
                        _a++;
                        return [3 /*break*/, 5];
                    case 8:
                        console.log("\n\u2705 Service update completed!");
                        if (this.dryRun) {
                            console.log("\n\u26A0\uFE0F  This was a DRY RUN. To apply changes, run with dryRun = false");
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    ServiceUpdater.prototype.findAllFirestoreUsages = function () {
        return __awaiter(this, void 0, void 0, function () {
            var findInFile, patterns, filesToScan, _i, filesToScan_1, file, _a, patterns_1, pattern, matches;
            return __generator(this, function (_b) {
                console.log('🔍 Scanning for Firestore usage patterns...\n');
                findInFile = function (filePath, pattern) {
                    if (!fs_1.default.existsSync(filePath))
                        return [];
                    var content = fs_1.default.readFileSync(filePath, 'utf8');
                    var matches = content.match(pattern) || [];
                    return matches;
                };
                patterns = [
                    /collection\(db,\s*['"][^'"]*['"]\)/g,
                    /doc\(db,\s*['"][^'"]*['"],\s*[^)]+\)/g,
                    /where\(['"]companyId['"],\s*['==]+,\s*[^)]+\)/g
                ];
                filesToScan = __spreadArray(__spreadArray([], fs_1.default.readdirSync('src/services').filter(function (f) { return f.endsWith('.ts'); }).map(function (f) { return "src/services/".concat(f); }), true), this.findFilesRecursive('src/components', /\.(tsx|ts)$/), true);
                for (_i = 0, filesToScan_1 = filesToScan; _i < filesToScan_1.length; _i++) {
                    file = filesToScan_1[_i];
                    for (_a = 0, patterns_1 = patterns; _a < patterns_1.length; _a++) {
                        pattern = patterns_1[_a];
                        matches = findInFile(file, pattern);
                        if (matches.length > 0) {
                            console.log("\uD83D\uDCC4 ".concat(file, ":"));
                            matches.forEach(function (match) { return console.log("  ".concat(match)); });
                            console.log('');
                        }
                    }
                }
                return [2 /*return*/];
            });
        });
    };
    ServiceUpdater.prototype.findFilesRecursive = function (dir, pattern) {
        var results = [];
        if (!fs_1.default.existsSync(dir))
            return results;
        var files = fs_1.default.readdirSync(dir);
        for (var _i = 0, files_1 = files; _i < files_1.length; _i++) {
            var file = files_1[_i];
            var filePath = path_1.default.join(dir, file);
            var stat = fs_1.default.statSync(filePath);
            if (stat.isDirectory()) {
                results = results.concat(this.findFilesRecursive(filePath, pattern));
            }
            else if (pattern.test(file)) {
                results.push(filePath);
            }
        }
        return results;
    };
    return ServiceUpdater;
}());
exports.ServiceUpdater = ServiceUpdater;
// Usage
function runServiceUpdate() {
    return __awaiter(this, void 0, void 0, function () {
        var updater, shouldProceed, realUpdater;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    updater = new ServiceUpdater(true, true);
                    // 1. Scan for current usage
                    return [4 /*yield*/, updater.findAllFirestoreUsages()];
                case 1:
                    // 1. Scan for current usage
                    _a.sent();
                    // 2. Show what would be updated
                    return [4 /*yield*/, updater.updateServices()];
                case 2:
                    // 2. Show what would be updated
                    _a.sent();
                    shouldProceed = confirm('\nDRY RUN completed. Proceed with actual updates?');
                    if (!shouldProceed) return [3 /*break*/, 4];
                    realUpdater = new ServiceUpdater(false, true);
                    return [4 /*yield*/, realUpdater.updateServices()];
                case 3:
                    _a.sent();
                    _a.label = 4;
                case 4: return [2 /*return*/];
            }
        });
    });
}
// Run if called directly
if (typeof window !== 'undefined') {
    console.log('Service Updater loaded. Call runServiceUpdate() to start.');
}
