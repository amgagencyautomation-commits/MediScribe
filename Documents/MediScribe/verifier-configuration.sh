#!/bin/bash

echo "🔍 Vérification de la configuration MediScribe"
echo "================================================"
echo ""

# Vérifier les fichiers essentiels
echo "📋 Vérification des fichiers..."
if [ -f "supabase-schema.sql" ]; then
    echo "✅ Fichier supabase-schema.sql trouvé"
else
    echo "❌ Fichier supabase-schema.sql manquant"
    exit 1
fi

if [ -f ".env.local" ]; then
    echo "✅ Fichier .env.local trouvé"
    
    # Vérifier les variables Supabase
    if grep -q "VITE_SUPABASE_URL=https://bsuldpawzcqhicozxcwq" .env.local; then
        echo "✅ Configuration Supabase détectée"
    else
        echo "⚠️  Configuration Supabase introuvable"
    fi
else
    echo "⚠️  Fichier .env.local manquant"
fi

echo ""
echo "📦 Vérification des dépendances..."
if [ -d "node_modules" ]; then
    echo "✅ node_modules trouvé"
else
    echo "⚠️  Installation des dépendances..."
    npm install
fi

if [ -d "api-server/node_modules" ]; then
    echo "✅ Dépendances serveur API installées"
else
    echo "⚠️  Installation des dépendances serveur..."
    cd api-server && npm install && cd ..
fi

echo ""
echo "🧪 Test de connexion à Supabase..."
if [ -f ".env.local" ]; then
    # Extraire les variables d'environnement
    source .env.local 2>/dev/null
    
    # Test simple avec curl
    if [ -n "$VITE_SUPABASE_URL" ]; then
        echo "✅ URL Supabase configurée : $VITE_SUPABASE_URL"
        echo ""
        echo "📝 PROCHAINES ÉTAPES :"
        echo "1. Allez sur https://supabase.com/dashboard/project/bsuldpawzcqhicozxcwq"
        echo "2. Cliquez sur 'SQL Editor' dans le menu de gauche"
        echo "3. Exécutez cette commande ici : open supabase-schema.sql"
        echo "4. Copiez TOUT le contenu du fichier qui s'ouvre"
        echo "5. Collez-le dans l'éditeur SQL de Supabase"
        echo "6. Cliquez sur 'RUN'"
        echo ""
        echo "⏳ Attendez que je vérifie que le schéma est exécuté..."
        
        # Demander à l'utilisateur s'il a exécuté le schéma
        echo ""
        read -p "Avez-vous exécuté le schéma SQL dans Supabase ? (oui/non) " response
        
        if [ "$response" = "oui" ] || [ "$response" = "Oui" ] || [ "$response" = "o" ] || [ "$response" = "O" ]; then
            echo ""
            echo "✅ Parfait ! Maintenant, créons le bucket de stockage..."
            echo ""
            echo "1. Allez dans 'Storage' dans Supabase"
            echo "2. Cliquez sur 'New bucket'"
            echo "3. Nom : audio-files"
            echo "4. Cochez 'Public bucket'"
            echo "5. Cliquez sur 'Create bucket'"
            echo ""
            read -p "Avez-vous créé le bucket 'audio-files' ? (oui/non) " response2
            
            if [ "$response2" = "oui" ] || [ "$response2" = "Oui" ] || [ "$response2" = "o" ] || [ "$response2" = "O" ]; then
                echo ""
                echo "🎉 PARFAIT ! Tout est configuré !"
                echo ""
                echo "Pour démarrer l'application :"
                echo "  ./start-avec-nettoyage.sh"
                echo ""
            else
                echo "⚠️  Créez le bucket puis relancez ce script"
            fi
        else
            echo "⚠️  Exécutez le schéma SQL d'abord"
        fi
    else
        echo "❌ URL Supabase non configurée"
    fi
else
    echo "❌ Fichier .env.local manquant"
fi

