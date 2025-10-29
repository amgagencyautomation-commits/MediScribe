#!/bin/bash

# Script de démarrage du serveur API MediScribe

echo "🚀 Démarrage du serveur API MediScribe..."

# Vérifier si Node.js est installé
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé. Veuillez installer Node.js d'abord."
    exit 1
fi

# Vérifier si npm est installé
if ! command -v npm &> /dev/null; then
    echo "❌ npm n'est pas installé. Veuillez installer npm d'abord."
    exit 1
fi

# Vérifier les dépendances (au niveau racine)
if [ ! -d "node_modules" ]; then
    echo "📦 Installation des dépendances (racine)..."
    npm install
fi

# Vérifier les variables d'environnement essentielles
MISSING=false
if [ -z "$VITE_SUPABASE_URL" ]; then
  echo "⚠️  VITE_SUPABASE_URL manquante"; MISSING=true
fi
if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "⚠️  SUPABASE_SERVICE_ROLE_KEY manquante (requise côté serveur)"; MISSING=true
fi
if [ -z "$VITE_ENCRYPTION_KEY" ]; then
  echo "⚠️  VITE_ENCRYPTION_KEY manquante (32+ caractères requis)"; MISSING=true
fi
if [ "$MISSING" = true ]; then
  echo "❌ Configuration incomplète. Veuillez définir les variables ci-dessus."
  exit 1
fi

# Démarrer le serveur
echo "🎯 Démarrage du serveur (server.mjs) sur le port 3001..."
echo "📡 Endpoints disponibles:"
echo "   POST http://localhost:3001/api/transcribe"
echo "   POST http://localhost:3001/api/generate-report"
echo "   POST http://localhost:3001/api/test-key"
echo "   GET  http://localhost:3001/api/health"
echo ""
echo "🛑 Pour arrêter le serveur, appuyez sur Ctrl+C"
echo ""

node server.mjs
