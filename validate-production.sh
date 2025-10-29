#!/bin/bash

# Script de validation pre-production pour MediScribe
# Ce script vérifie que le projet est prêt pour le déploiement

echo "🔍 VALIDATION PRE-PRODUCTION - MediScribe"
echo "=========================================="
echo ""

# Compteur d'erreurs
ERRORS=0
WARNINGS=0

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Vérifier les variables d'environnement critiques
echo "1️⃣  Vérification des variables d'environnement..."

if [ -f ".env.local" ]; then
    echo -e "${GREEN}✓${NC} Fichier .env.local trouvé"
    
    # Vérifier SUPABASE_URL
    if grep -q "VITE_SUPABASE_URL=" .env.local && ! grep -q "VITE_SUPABASE_URL=https://your-project.supabase.co" .env.local; then
        echo -e "${GREEN}✓${NC} VITE_SUPABASE_URL configuré"
    else
        echo -e "${RED}✗${NC} VITE_SUPABASE_URL non configuré ou avec valeur par défaut"
        ERRORS=$((ERRORS + 1))
    fi
    
    # Vérifier ENCRYPTION_KEY
    if grep -q "VITE_ENCRYPTION_KEY=" .env.local && ! grep -q "VITE_ENCRYPTION_KEY=your-secure" .env.local; then
        KEY_LENGTH=$(grep "VITE_ENCRYPTION_KEY=" .env.local | cut -d'=' -f2 | wc -c)
        if [ $KEY_LENGTH -ge 32 ]; then
            echo -e "${GREEN}✓${NC} VITE_ENCRYPTION_KEY configuré (longueur: $KEY_LENGTH caractères)"
        else
            echo -e "${YELLOW}⚠${NC} VITE_ENCRYPTION_KEY trop court (minimum 32 caractères)"
            WARNINGS=$((WARNINGS + 1))
        fi
    else
        echo -e "${RED}✗${NC} VITE_ENCRYPTION_KEY non configuré"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "${YELLOW}⚠${NC} Fichier .env.local non trouvé (OK pour déploiement platform)"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""

# 2. Vérifier la version du projet
echo "2️⃣  Vérification de la version..."
VERSION=$(grep '"version"' package.json | cut -d'"' -f4)
if [ "$VERSION" != "0.0.0" ]; then
    echo -e "${GREEN}✓${NC} Version du projet: $VERSION"
else
    echo -e "${YELLOW}⚠${NC} Version du projet toujours à 0.0.0"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""

# 3. Vérifier les dépendances
echo "3️⃣  Vérification des dépendances..."
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓${NC} node_modules présent"
else
    echo -e "${RED}✗${NC} node_modules manquant - exécuter 'npm install'"
    ERRORS=$((ERRORS + 1))
fi

# Vérifier les vulnérabilités
echo "   Audit de sécurité des dépendances..."
AUDIT_OUTPUT=$(npm audit --production 2>&1)
CRITICAL=$(echo "$AUDIT_OUTPUT" | grep -o "[0-9]* critical" | cut -d' ' -f1)
HIGH=$(echo "$AUDIT_OUTPUT" | grep -o "[0-9]* high" | cut -d' ' -f1)

if [ -z "$CRITICAL" ]; then CRITICAL=0; fi
if [ -z "$HIGH" ]; then HIGH=0; fi

if [ $CRITICAL -gt 0 ] || [ $HIGH -gt 0 ]; then
    echo -e "${YELLOW}⚠${NC} Vulnérabilités détectées: $CRITICAL critical, $HIGH high"
    WARNINGS=$((WARNINGS + 1))
else
    echo -e "${GREEN}✓${NC} Aucune vulnérabilité critique"
fi

echo ""

# 4. Tester la compilation
echo "4️⃣  Test de compilation..."
if npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Build réussi"
    
    # Vérifier la taille du build
    if [ -d "dist" ]; then
        SIZE=$(du -sh dist | cut -f1)
        echo -e "${GREEN}✓${NC} Taille du build: $SIZE"
    fi
else
    echo -e "${RED}✗${NC} Échec du build"
    ERRORS=$((ERRORS + 1))
fi

echo ""

# 5. Vérifier les tests
echo "5️⃣  Vérification des tests..."
if command -v npm &> /dev/null; then
    if npm run test -- --run > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Tests passés"
    else
        echo -e "${YELLOW}⚠${NC} Certains tests ont échoué"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${YELLOW}⚠${NC} npm non disponible pour exécuter les tests"
fi

echo ""

# 6. Vérifier les fichiers de configuration de déploiement
echo "6️⃣  Vérification des configurations de déploiement..."

if [ -f "vercel.json" ]; then
    echo -e "${GREEN}✓${NC} vercel.json présent"
else
    echo -e "${YELLOW}⚠${NC} vercel.json manquant"
    WARNINGS=$((WARNINGS + 1))
fi

if [ -f "netlify.toml" ]; then
    echo -e "${GREEN}✓${NC} netlify.toml présent"
else
    echo -e "${YELLOW}⚠${NC} netlify.toml manquant"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""

# 7. Vérifier les fichiers sensibles non commités
echo "7️⃣  Vérification des fichiers sensibles..."
SENSITIVE_FILES=0

if [ -f ".env" ] && ! grep -q ".env" .gitignore; then
    echo -e "${RED}✗${NC} .env présent mais pas dans .gitignore"
    ERRORS=$((ERRORS + 1))
    SENSITIVE_FILES=$((SENSITIVE_FILES + 1))
fi

if [ -f "cookies.txt" ]; then
    echo -e "${YELLOW}⚠${NC} cookies.txt présent (devrait être ignoré)"
    WARNINGS=$((WARNINGS + 1))
fi

if [ -f ".api_server.pid" ] || [ -f ".cleanup_service.pid" ]; then
    echo -e "${YELLOW}⚠${NC} Fichiers PID présents (devrait être ignorés)"
    WARNINGS=$((WARNINGS + 1))
fi

if [ $SENSITIVE_FILES -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Aucun fichier sensible détecté hors .gitignore"
fi

echo ""

# 8. Vérifier le server.mjs
echo "8️⃣  Vérification du serveur backend..."
if [ -f "server.mjs" ]; then
    echo -e "${GREEN}✓${NC} server.mjs présent"
    
    # Vérifier les imports de sécurité
    if grep -q "helmet" server.mjs && grep -q "rateLimit" server.mjs; then
        echo -e "${GREEN}✓${NC} Mesures de sécurité détectées"
    else
        echo -e "${YELLOW}⚠${NC} Certaines mesures de sécurité manquantes"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${RED}✗${NC} server.mjs manquant"
    ERRORS=$((ERRORS + 1))
fi

echo ""

# Résumé final
echo "=========================================="
echo "📊 RÉSUMÉ"
echo "=========================================="

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ PARFAIT !${NC} Le projet est prêt pour la production"
    echo ""
    echo "🚀 Vous pouvez déployer en toute sécurité"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  ATTENTION${NC} - $WARNINGS avertissement(s)"
    echo ""
    echo "Le projet peut être déployé mais certains points méritent attention"
    exit 0
else
    echo -e "${RED}❌ ERREURS DÉTECTÉES${NC} - $ERRORS erreur(s), $WARNINGS avertissement(s)"
    echo ""
    echo "⛔ Corrigez les erreurs avant de déployer"
    exit 1
fi
