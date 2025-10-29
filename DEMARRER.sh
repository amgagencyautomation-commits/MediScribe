#!/bin/bash

echo "🏥 ==============================================="
echo "    MEDISCRIBE - DÉMARRAGE SIMPLE"
echo "================================================"
echo ""
echo "📖 Lisez d'abord : open INSTRUCTIONS_SIMPLES.md"
echo ""
echo "⏸️  PAUSE : Vérifiez que vous avez :"
echo ""
echo "   1. Exécuté le schéma SQL dans Supabase"
echo "   2. Créé le bucket 'audio-files'"
echo ""
read -p "Tout est prêt ? (oui/non) " ready

if [ "$ready" != "oui" ] && [ "$ready" != "Oui" ] && [ "$ready" != "o" ] && [ "$ready" != "O" ]; then
    echo ""
    echo "⚠️  Faites d'abord la configuration dans Supabase !"
    echo "   Commandes: open INSTRUCTIONS_SIMPLES.md"
    exit 1
fi

echo ""
echo "🚀 Démarrage de l'application..."
echo ""

# Démarrer le serveur API
echo "1️⃣  Démarrage du serveur API..."
cd api-server 2>/dev/null || { echo "❌ Dossier api-server introuvable"; exit 1; }

# Vérifier les dépendances
if [ ! -d "node_modules" ]; then
    echo "📦 Installation des dépendances..."
    npm install
fi

# Démarrer le serveur en arrière-plan
echo "🚀 Serveur API sur port 3001..."
nohup node server.js > ../api-server.log 2>&1 &
API_PID=$!
echo "   ✅ Serveur API démarré (PID: $API_PID)"

# Démarrer le nettoyage automatique
echo ""
echo "2️⃣  Service de nettoyage automatique..."
if [ ! -f ".env" ]; then
    echo "   ⚠️  Création du fichier .env..."
    cat > .env << EOF
VITE_SUPABASE_URL=https://bsuldpawzcqhicozxcwq.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzdWxkcGF3emNxaGljb3p4Y3dxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMzQyMzYsImV4cCI6MjA3NjkxMDIzNn0.RsgCYyAYRQvaIMA7oxD3pmUdZCHNOAT110agxrnXYwU
EOF
fi

nohup node cleanup-audio.js > ../cleanup-audio.log 2>&1 &
CLEANUP_PID=$!
echo "   ✅ Nettoyage automatique actif (PID: $CLEANUP_PID)"

cd ..

# Sauvegarder les PIDs
echo "$API_PID" > .api_server.pid
echo "$CLEANUP_PID" > .cleanup_service.pid

# Attendre un peu
echo ""
echo "⏳ Attente du démarrage des services..."
sleep 3

echo ""
echo "3️⃣  Démarrage du frontend..."
echo ""

# Vérifier si vite est installé
if [ ! -d "node_modules" ]; then
    echo "📦 Installation des dépendances frontend..."
    npm install
fi

echo ""
echo "✅ ==============================================="
echo "   APPLICATION DÉMARRÉE AVEC SUCCÈS !"
echo "================================================"
echo ""
echo "🌐 Accédez à : http://localhost:8080"
echo ""
echo "📝 Pour arrêter : ./stop-services.sh"
echo ""
echo "📊 Logs :"
echo "   - API : tail -f api-server.log"
echo "   - Cleanup : tail -f cleanup-audio.log"
echo ""
echo "🚀 Ouverture du navigateur dans 3 secondes..."
sleep 3
open http://localhost:8080 2>/dev/null || xdg-open http://localhost:8080 2>/dev/null || echo "⚠️  Ouvrez manuellement : http://localhost:8080"

# Démarrer vite
npm run dev

