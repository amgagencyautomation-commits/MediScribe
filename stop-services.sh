#!/bin/bash

echo "🛑 Arrêt des services MediScribe..."

# Arrêter le serveur API
if [ -f .api_server.pid ]; then
    API_PID=$(cat .api_server.pid)
    if kill -0 $API_PID 2>/dev/null; then
        kill $API_PID
        echo "✅ Serveur API arrêté"
    fi
    rm .api_server.pid
fi

# Arrêter le service de nettoyage
if [ -f .cleanup_service.pid ]; then
    CLEANUP_PID=$(cat .cleanup_service.pid)
    if kill -0 $CLEANUP_PID 2>/dev/null; then
        kill $CLEANUP_PID
        echo "✅ Service de nettoyage arrêté"
    fi
    rm .cleanup_service.pid
fi

# Arrêter tous les processus node liés aux services
pkill -f "node server.js"
pkill -f "node cleanup-audio.js"

echo "✅ Tous les services ont été arrêtés"

