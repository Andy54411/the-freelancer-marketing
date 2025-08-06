#!/bin/bash

echo "🔍 DATEV API Error Git Analysis"
echo "================================"

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📊 Git History Analysis für DATEV API Routes${NC}"

# 1. Suche nach letzten Commits mit DATEV organization Änderungen
echo -e "\n${YELLOW}🔍 Letzte Commits mit DATEV organization Änderungen:${NC}"
git log --oneline --grep="datev" --grep="organization" -i -n 10

echo -e "\n${YELLOW}🔍 Dateien mit organization im Namen:${NC}"
git ls-files | grep -i organization

echo -e "\n${YELLOW}🔍 Letzte Änderungen an DATEV API Dateien:${NC}"
git log --oneline --follow -- "**/api/datev/**" -n 15

# 2. Suche nach gelöschten Dateien
echo -e "\n${YELLOW}🔍 Kürzlich gelöschte DATEV Dateien:${NC}"
git log --diff-filter=D --summary --oneline | grep datev

# 3. Aktuelle Staging Area und Uncommitted Changes
echo -e "\n${YELLOW}🔍 Aktuelle Git Status:${NC}"
git status --porcelain | grep -E "(datev|organization)" || echo "Keine DATEV-bezogenen Änderungen in Working Directory"

# 4. Suche in allen Git-tracked Dateien nach problematischen Patterns
echo -e "\n${YELLOW}🔍 Suche in Git-tracked Dateien nach '/api/datev/organization':${NC}"
git grep -n "api/datev/organization" -- '*.ts' '*.tsx' '*.js' '*.jsx' 2>/dev/null || echo "Keine direkten API-Aufrufe gefunden"

# 5. Differenz zu letztem Commit
echo -e "\n${YELLOW}🔍 Änderungen seit letztem Commit:${NC}"
git diff HEAD --name-only | grep -E "(datev|organization)" || echo "Keine DATEV-bezogenen Änderungen"

# 6. Suche nach versteckten Zeichen oder Cache-Dateien
echo -e "\n${YELLOW}🔍 Verdächtige Cache-Dateien:${NC}"
find . -name "*.cache" -o -name ".next" -o -name "dist" -o -name "build" | head -10

# 7. Suche nach DATEV in aktuell getrackten Dateien
echo -e "\n${YELLOW}🔍 Alle DATEV-Referenzen in getrackten Dateien:${NC}"
git grep -l "datev" -- '*.ts' '*.tsx' '*.js' '*.jsx' | wc -l | xargs echo "Dateien mit DATEV-Referenzen:"

# 8. Network Request Pattern in Code
echo -e "\n${YELLOW}🔍 POST Requests in TypeScript/JavaScript Dateien:${NC}"
git grep -n "method.*POST\|POST.*method" -- '*.ts' '*.tsx' '*.js' '*.jsx' | grep -i datev || echo "Keine DATEV POST-Requests gefunden"

# 9. Überprüfung auf Browser Cache relevante Dateien
echo -e "\n${YELLOW}🔍 Service Worker und Manifest Dateien:${NC}"
git ls-files | grep -E "(sw\.js|service-worker|manifest\.json|_next)" | head -5

echo -e "\n${GREEN}✅ Git-Analyse abgeschlossen!${NC}"

# 10. Empfehlungen basierend auf Findings
echo -e "\n${BLUE}💡 Empfohlene nächste Schritte:${NC}"
echo "1. Führe das Node.js Debug-Skript aus: node debug-datev-error.js"
echo "2. Leere den Next.js Cache: rm -rf .next"
echo "3. Prüfe Browser DevTools Network Tab nach phantom requests"
echo "4. Starte Development Server neu"
echo "5. Teste in Incognito Mode ohne Browser Cache"
