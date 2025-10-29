#!/bin/bash

# Script de démarrage avec nettoyage automatique des fichiers audio

echo "🏥 Démarrage de MediScribe avec nettoyage automatique"
echo "======================================================"

# Vérifier si on est dans le bon répertoire
if [ ! -f "package.json" ]; then
    echo "❌ Veuillez exécuter ce script depuis la racine du projet"
    exit 1
fi

# Démarrer le serveur API
echo ""
echo "🚀 Démarrage du serveur API..."
cd api-server
nohup node server.js > ../api-server.log 2>&1 &
API_PID=$!
echo "✅ Serveur API démarré (PID: $API_PID)"

# Démarrer le service de nettoyage des fichiers audio
echo ""
echo "🧹 Démarrage du service de nettoyage automatique..."
nohup node cleanup-audio.js >> ../cleanup-audio.log 2>&1 &
CLEANUP_PID=$!
echo "✅ Service de nettoyage démarré (PID: $CLEANUP_PID)"

cd ..

# Sauvegarder les PIDs
echo $API_PID > .api_server.pid
echo $CLEANUP_PID > .cleanup_service.pid

echo ""
echo "✅ MediScribe est prêt avec :"
echo "   - Serveur API : http://localhost:3001"
echo "   - Nettoyage automatique : actif (fichiers audio > 5h)"
echo ""
echo "📝 Logs :"
echo "   - API Server : tail -f api-server.log"
echo "   - Cleanup Service : tail -f cleanup-audio.log"
echo ""
echo "⏹️  Pour arrêter : ./stop-services.sh"
echo ""
echo "Démarrage du frontend..."
echo ""

# Attendre un peu pour que les serveurs démarrent
sleep 2

# Démarrer le frontend
npm run dev

