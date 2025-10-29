#!/bin/bash

# 🎯 MediScribe - Production Readiness Check
# Validation rapide de l'état production

echo "🔍 VÉRIFICATION PRODUCTION READINESS - MediScribe"
echo "=============================================="
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCORE=0
TOTAL_CHECKS=10

# Fonction de check
check_item() {
    local name="$1"
    local condition="$2"
    
    echo -n "🔍 $name... "
    
    if eval "$condition" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ OK${NC}"
        ((SCORE++))
    else
        echo -e "${RED}❌ MANQUANT${NC}"
    fi
}

echo "📦 FICHIERS CORE"
echo "==============="
check_item "Server.mjs (Backend)" "[ -f server.mjs ]"
check_item "Package.json" "[ -f package.json ]"
check_item "Frontend built" "[ -d dist ] || [ -f src/main.tsx ]"
check_item "Logs structurés" "[ -f src/lib/logger.js ]"

echo ""
echo "🔒 SÉCURITÉ"
echo "==========="
check_item "Validation Zod" "grep -q 'z.object' server.mjs"
check_item "Rate limiting" "grep -q 'express-rate-limit' server.mjs"
check_item "CSRF protection" "grep -q 'csrfToken' server.mjs"
check_item "Helmet headers" "grep -q 'helmet' server.mjs"

echo ""
echo "📊 MONITORING"
echo "============"
check_item "Dashboard métriques" "grep -q '/dashboard' server.mjs"
check_item "Audit logs" "grep -q 'auditLog' server.mjs"

echo ""
echo "📊 RÉSULTAT FINAL"
echo "================"

PERCENTAGE=$((SCORE * 100 / TOTAL_CHECKS))

echo "Score: $SCORE/$TOTAL_CHECKS ($PERCENTAGE%)"

if [ $PERCENTAGE -ge 90 ]; then
    echo -e "${GREEN}🎉 PRODUCTION READY ! 🚀${NC}"
    echo "✅ Votre application peut être déployée"
elif [ $PERCENTAGE -ge 80 ]; then
    echo -e "${YELLOW}⚠️  PRESQUE PRÊT${NC}"
    echo "🔧 Quelques ajustements nécessaires"
else
    echo -e "${RED}❌ DÉVELOPPEMENT REQUIS${NC}"
    echo "🛠️ Corrections majeures nécessaires"
fi

echo ""
echo "📚 PROCHAINES ÉTAPES RECOMMANDÉES"
echo "================================"
echo "1. 🚀 Déployer sur Railway/Render"
echo "2. 🔑 Configurer variables d'environnement"
echo "3. 🌐 Tester en staging"
echo "4. 📊 Monitorer le dashboard : /dashboard"
echo "5. 🔒 Configurer Sentry DSN"

echo ""
echo "📍 LIENS UTILES"
echo "=============="
echo "• Health check: http://localhost:3001/api/health"
echo "• Dashboard: http://localhost:3001/dashboard"  
echo "• Métriques: http://localhost:3001/api/metrics"
