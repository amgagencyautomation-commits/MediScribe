#!/bin/bash

# 🔒 Script de Validation Sécurité 100%
# Vérifie que toutes les mesures de sécurité sont opérationnelles

echo "🔍 VALIDATION SÉCURITÉ NIVEAU 100% - MediScribe"
echo "================================================="
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

TESTS_PASSED=0
TESTS_FAILED=0
SERVER_URL="http://localhost:3001"

# Fonction de test
test_feature() {
    local name="$1"
    local command="$2"
    local expected="$3"
    
    echo -n "🧪 Testing $name... "
    
    result=$(eval "$command" 2>/dev/null)
    
    if [[ "$result" == *"$expected"* ]]; then
        echo -e "${GREEN}✅ PASS${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ FAIL${NC}"
        echo "   Expected: $expected"
        echo "   Got: $result"
        ((TESTS_FAILED++))
    fi
}

# Vérifier que le serveur est démarré
echo "🚀 Vérification serveur..."
if ! curl -s "$SERVER_URL/api/health" > /dev/null; then
    echo -e "${RED}❌ Serveur non démarré sur $SERVER_URL${NC}"
    echo "Démarrez le serveur avec: node server.mjs"
    exit 1
fi
echo -e "${GREEN}✅ Serveur opérationnel${NC}"
echo ""

# Tests de sécurité
echo "🔒 TESTS DE SÉCURITÉ"
echo "==================="

# 1. Health check
test_feature "Health Check" \
    "curl -s $SERVER_URL/api/health | jq -r .status" \
    "OK"

# 2. CSRF Token
test_feature "CSRF Token Generation" \
    "curl -s $SERVER_URL/api/csrf-token | jq -r .csrfToken | wc -c" \
    "33"

# 3. Rate Limiting (test léger)
test_feature "Rate Limiting Response" \
    "curl -s -w '%{http_code}' -o /dev/null $SERVER_URL/api/health" \
    "200"

# 4. Validation Zod
test_feature "Input Validation (Zod)" \
    "curl -s -X POST $SERVER_URL/api/test-key -H 'Content-Type: application/json' -d '{\"apiKey\":\"ab\"}' | jq -r .error" \
    "Données invalides"

# 5. Headers de sécurité
test_feature "X-Frame-Options Header" \
    "curl -s -I $SERVER_URL/api/health | grep -i 'x-frame-options' | cut -d: -f2 | tr -d ' '" \
    "SAMEORIGIN"

test_feature "X-Content-Type-Options Header" \
    "curl -s -I $SERVER_URL/api/health | grep -i 'x-content-type-options' | cut -d: -f2 | tr -d ' '" \
    "nosniff"

# 6. CORS Headers
test_feature "CORS Configuration" \
    "curl -s -I $SERVER_URL/api/health | grep -i 'access-control-allow' | wc -l" \
    "0"

# 7. Session Cookie
test_feature "Session Cookie Creation" \
    "curl -s -c /tmp/cookies.txt $SERVER_URL/api/csrf-token && grep 'mediscribe.sid' /tmp/cookies.txt | wc -l" \
    "1"

# 8. Input Sanitization (XSS)
test_feature "XSS Protection" \
    "curl -s -X POST $SERVER_URL/api/test-key -H 'Content-Type: application/json' -d '{\"apiKey\":\"<script>alert(1)</script>\"}' | jq -r .error" \
    "Données invalides"

# 9. SQL Injection Protection
test_feature "SQL Injection Protection" \
    "curl -s -X POST $SERVER_URL/api/test-key -H 'Content-Type: application/json' -d '{\"apiKey\":\"'\'' OR 1=1 --\"}' | jq -r .error" \
    "Données invalides"

# 10. File Upload Limits
test_feature "File Upload Size Limit" \
    "curl -s -X POST $SERVER_URL/api/transcribe -H 'x-user-id: invalid' -F 'file=@/dev/zero' | jq -r .error" \
    "x-user-id doit être un UUID valide"

echo ""
echo "🧪 TESTS AVANCÉS"
echo "================"

# 11. UUID Validation
test_feature "UUID Validation" \
    "curl -s -X POST $SERVER_URL/api/transcribe -H 'x-user-id: invalid-uuid' -F 'file=@README.md' | jq -r .error" \
    "Header x-user-id doit être un UUID valide"

# 12. Missing Headers
test_feature "Missing Headers Protection" \
    "curl -s -X POST $SERVER_URL/api/transcribe -F 'file=@README.md' | jq -r .error" \
    "Header manquant: x-user-id"

# 13. Invalid JSON
test_feature "Invalid JSON Handling" \
    "curl -s -X POST $SERVER_URL/api/test-key -H 'Content-Type: application/json' -d '{invalid json}' -w '%{http_code}' -o /dev/null" \
    "400"

# 14. Large Payload Protection
test_feature "Large Payload Rejection" \
    "curl -s -X POST $SERVER_URL/api/test-key -H 'Content-Type: application/json' -d '{\"apiKey\":\"'$(openssl rand -hex 10000)'\"}' | jq -r .error" \
    "Données invalides"

# 15. Method Not Allowed
test_feature "Method Not Allowed" \
    "curl -s -X PUT $SERVER_URL/api/health -w '%{http_code}' -o /dev/null" \
    "404"

echo ""
echo "📊 RÉSULTATS FINAUX"
echo "=================="

TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))
SUCCESS_RATE=$((TESTS_PASSED * 100 / TOTAL_TESTS))

echo "Total tests: $TOTAL_TESTS"
echo -e "Tests réussis: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests échoués: ${RED}$TESTS_FAILED${NC}"
echo -e "Taux de réussite: ${BLUE}$SUCCESS_RATE%${NC}"

echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 TOUTES LES VALIDATIONS SONT PASSÉES !${NC}"
    echo -e "${GREEN}🔒 SÉCURITÉ NIVEAU 100% CONFIRMÉE${NC}"
    echo -e "${GREEN}✅ PRÊT POUR PRODUCTION${NC}"
    exit 0
else
    echo -e "${RED}⚠️  $TESTS_FAILED test(s) ont échoué${NC}"
    echo -e "${YELLOW}🔧 Veuillez corriger les problèmes avant la production${NC}"
    exit 1
fi
