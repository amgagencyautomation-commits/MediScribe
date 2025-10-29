#!/bin/bash

# Script de démarrage complet de MediScribe

echo "🏥 Démarrage de MediScribe - Assistant IA pour Comptes Rendus Médicaux"
echo "=================================================================="

# Vérifier les prérequis
echo "🔍 Vérification des prérequis..."

# Vérifier Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé. Veuillez installer Node.js d'abord."
    exit 1
fi

# Vérifier npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm n'est pas installé. Veuillez installer npm d'abord."
    exit 1
fi

# Vérifier les variables d'environnement
echo "🔧 Vérification de la configuration..."

if [ ! -f ".env.local" ]; then
    echo "⚠️  Fichier .env.local manquant."
    echo "📋 Création d'un fichier .env.local à partir de env.example..."
    cp env.example .env.local
    echo "✅ Fichier .env.local créé. Veuillez le configurer avec vos clés API."
    echo ""
    echo "🔑 Variables à configurer dans .env.local:"
    echo "   - VITE_SUPABASE_URL: URL de votre projet Supabase"
    echo "   - VITE_SUPABASE_ANON_KEY: Clé anonyme Supabase"
    echo "   - VITE_ENCRYPTION_KEY: Clé de cryptage (32+ caractères)"
    echo "   - SUPABASE_SERVICE_ROLE_KEY: Clé Service Role Supabase (serveur)"
    echo ""
    echo "⏸️  Veuillez configurer .env.local puis relancer ce script."
    exit 1
fi

# Charger les variables d'environnement depuis .env.local
set -a
source ./.env.local
set +a

# Installer les dépendances si nécessaire
if [ ! -d "node_modules" ]; then
    echo "📦 Installation des dépendances du frontend..."
    npm install
fi

echo "✅ Prérequis vérifiés!"
echo ""

# Démarrer le serveur API (server.mjs) en arrière-plan
echo "🚀 Démarrage du serveur API (server.mjs)..."
nohup node server.mjs > api-server.log 2>&1 &
API_PID=$!

# Attendre que le serveur API démarre
echo "⏳ Attente du démarrage du serveur API..."
sleep 3

# Vérifier que le serveur API fonctionne
if curl -s http://localhost:3001/api/health > /dev/null; then
    echo "✅ Serveur API démarré avec succès!"
else
    echo "⚠️  Serveur API non accessible. Vérifiez les logs dans api-server.log"
fi

echo ""
echo "🎯 Démarrage de l'application frontend..."
echo "🌐 L'application sera accessible sur http://localhost:8080"
echo "📡 API disponible sur http://localhost:3001"
echo ""
echo "🛑 Pour arrêter l'application:"
echo "   - Appuyez sur Ctrl+C pour arrêter le frontend"
echo "   - Puis exécutez: kill $API_PID pour arrêter l'API"
echo ""

# Démarrer l'application frontend
npm run dev
