# 🛡️ Git Safety Guide - Verhindere Datenverlust

## 🚨 Was ist passiert?
Deine Dateien wurden durch das **pre-commit Hook System** gelöscht:
1. `git commit` → husky pre-commit → lint-staged → ESLint-Fehler → **Automatic Stash + Revert**

## 🔒 Neue Sicherheitsmaßnahmen (Implementiert):

### 1. Verbesserter Pre-Commit Hook
- **Automatisches Safety-Backup** vor jedem Lint-Check
- **Intelligente Wiederherstellung** bei Fehlern  
- **Klare Fehlermeldungen** mit Lösungshinweisen

### 2. Notfall-Kommandos

```bash
# Bei Problemen: Sofortiger Commit ohne Linting
git commit --no-verify -m "urgent fix"

# Alle Stashes anzeigen (falls was verloren geht)
git stash list

# Spezifischen Stash wiederherstellen
git stash apply stash@{0}

# Safety-Backup vor größeren Änderungen
git stash push -m "MANUAL_BACKUP_$(date +%Y%m%d_%H%M%S)" --include-untracked
```

### 3. Workflow-Empfehlungen

**Vor großen Commits:**
1. `git add .` 
2. `git status` (prüfen was committed wird)
3. `git stash push -m "SAFETY_$(date +%Y%m%d_%H%M%S)"` (manuelles Backup)
4. `git commit` (mit neuen Sicherheitsmaßnahmen)

**Bei ESLint-Fehlern:**
- **Option 1:** Fehler beheben und normal committen
- **Option 2:** `git commit --no-verify` für dringende Deployments
- **Option 3:** Einzelne Dateien committen: `git commit path/to/file.ts`

## 🚀 Recovery-Strategien

### Wenn Dateien "verschwinden":
```bash
# 1. Stash-Liste prüfen
git stash list

# 2. Neueste Stashes ansehen
git stash show stash@{0}
git stash show stash@{1}

# 3. Stash wiederherstellen (ohne zu löschen)
git stash apply stash@{0}

# 4. Falls nötig: Git-Reflog checken
git reflog --all
```

### Präventive Backups:
```bash
# Tägliche automatische Backups
echo "git stash push -m 'DAILY_BACKUP_$(date)'" >> ~/.zshrc

# Vor jeder Session
alias gsafe='git stash push -m "SESSION_BACKUP_$(date +%Y%m%d_%H%M%S)" --include-untracked'
```

## ⚠️ Wichtige Erkenntnisse:
1. **Husky + lint-staged** können destruktiv sein
2. **Immer manuelle Backups** vor großen Änderungen
3. **git commit --no-verify** ist dein Freund in Notfällen
4. **git stash list** zeigt alle verfügbaren Backups

## 🎯 Diese Konfiguration verhindert zukünftigen Datenverlust!