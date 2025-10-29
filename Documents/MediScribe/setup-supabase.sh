#!/bin/bash

# Script de configuration automatique de Supabase pour MediScribe

echo "🚀 =============================================="
echo "   CONFIGURATION AUTOMATIQUE SUPABASE"
echo "================================================"
echo ""

# Variables Supabase
SUPABASE_URL="https://bsuldpawzcqhicozxcwq.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzdWxkcGF3emNxaGljb3p4Y3dxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMzQyMzYsImV4cCI6MjA3NjkxMDIzNn0.RsgCYyAYRQvaIMA7oxD3pmUdZCHNOAT110agxrnXYwU"

echo "📋 Configuration détectée :"
echo "   URL: $SUPABASE_URL"
echo ""
echo "⚠️  IMPORTANT : Je ne peux pas me connecter directement à Supabase"
echo "   depuis le terminal pour des raisons de sécurité."
echo ""
echo "✅ MAIS je peux vous préparer TOUT ce qu'il faut !"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 CE QUE CE SCRIPT VA FAIRE :"
echo ""
echo "   1. ✅ Vérifier votre configuration"
echo "   2. ✅ Préparer le fichier SQL"
echo "   3. ✅ Créer un script d'aide pour Supabase"
echo "   4. ✅ Vous donner les instructions exactes"
echo ""
read -p "Continuer ? (oui/non) " response

if [ "$response" != "oui" ] && [ "$response" != "Oui" ] && [ "$response" != "o" ] && [ "$response" != "O" ]; then
    echo "❌ Annulé"
    exit 1
fi

echo ""
echo "🔍 Vérification des fichiers..."

# Vérifier le schéma SQL
if [ -f "supabase-schema.sql" ]; then
    LINES=$(wc -l < supabase-schema.sql)
    echo "✅ Fichier supabase-schema.sql trouvé ($LINES lignes)"
else
    echo "❌ Fichier supabase-schema.sql manquant !"
    exit 1
fi

# Vérifier .env.local
if [ -f ".env.local" ]; then
    echo "✅ Fichier .env.local trouvé"
else
    echo "⚠️  Création du fichier .env.local..."
    cat > .env.local << EOF
VITE_SUPABASE_URL=$SUPABASE_URL
VITE_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
VITE_ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
VITE_APP_NAME=MediScribe
VITE_APP_VERSION=1.0.0
EOF
    echo "✅ Fichier .env.local créé"
fi

echo ""
echo "📝 Création des instructions automatiques..."

# Créer un script Node.js pour lancer Supabase en une commande
cat > setup-automatique.js << 'SCRIPT'
const readline = require('readline');
const https = require('https');
const fs = require('fs');

const SUPABASE_URL = 'https://bsuldpawzcqhicozxcwq.supabase.co';
const RLS_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzdWxkcGF3emNxaGljb3p4Y3dxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMzQyMzYsImV4cCI6MjA3NjkxMDIzNn0.RsgCYyAYRQvaIMA7oxD3pmUdZCHNOAT110agxrnXYwU';

console.log('🔧 Configuration de Supabase pour MediScribe');
console.log('===========================================');
console.log('');
console.log('⚠️  POUR DES RAISONS DE SÉCURITÉ, JE NE PEUX PAS');
console.log('   exécuter le SQL directement depuis le terminal.');
console.log('');
console.log('MAIS je peux créer un fichier que VOUS pouvez');
console.log('copier-coller directement dans Supabase !');
console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');

// Lire le fichier SQL
let sqlContent = '';
try {
    sqlContent = fs.readFileSync('supabase-schema.sql', 'utf8');
    console.log('✅ Fichier SQL chargé');
} catch (error) {
    console.error('❌ Impossible de lire le fichier SQL');
    process.exit(1);
}

// Créer un fichier ready-to-paste
const readySQL = sqlContent;

fs.writeFileSync('schema-supabase-ready.sql', readySQL);
console.log('✅ Fichier "schema-supabase-ready.sql" créé');
console.log('');

// Créer les instructions
const instructions = `
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║           🎯 CONFIGURATION SUPABASE - GUIDE              ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝

ÉTAPE 1 : EXÉCUTER LE SCHÉMA SQL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Allez sur : https://supabase.com/dashboard/project/bsuldpawzcqhicozxcwq

2. Cliquez sur "SQL Editor" (menu de gauche, 3ème icône)

3. Cliquez sur "New query"

4. Ouvrez le fichier "schema-supabase-ready.sql" ici :

   open schema-supabase-ready.sql

5. Copiez TOUT le contenu (Cmd+A puis Cmd+C)

6. Collez dans l'éditeur SQL de Supabase (Cmd+V)

7. Cliquez sur "RUN" (en bas à droite)

8. Attendez le message "Success"


ÉTAPE 2 : CRÉER LE BUCKET DE STOCKAGE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Toujours dans Supabase, cliquez sur "Storage" (menu de gauche)

2. Cliquez sur "New bucket"

3. Remplissez :
   Name: audio-files
   Public bucket: ✓ (cochez la case)
   File size limit: 100
   Allowed MIME types: audio/*

4. Cliquez sur "Create bucket"


ÉTAPE 3 : CRÉER LA POLICY DE STOCKAGE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Sur le bucket "audio-files", cliquez sur "Policies"

2. Cliquez sur "New policy"

3. Remplissez :
   Name: Allow authenticated uploads
   Allowed operation: INSERT, UPDATE
   Target roles: authenticated

4. Cliquez sur "Create"


ÉTAPE 4 : TERMINÉ !
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Une fois que vous avez fait les 2 étapes ci-dessus,
lancez l'application :

   ./DEMARRER.sh

C'est tout !

═══════════════════════════════════════════════════════
`;

fs.writeFileSync('INSTRUCTIONS-SUPABASE.md', instructions);
console.log('✅ Instructions créées dans "INSTRUCTIONS-SUPABASE.md"');
console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');
console.log('📋 FICHIERS CRÉÉS :');
echo '   ✅ schema-supabase-ready.sql'
echo '   ✅ INSTRUCTIONS-SUPABASE.md'
echo ''
echo '📖 PROCHAINE ÉTAPE :'
echo ''
echo '   open INSTRUCTIONS-SUPABASE.md'
echo ''
echo 'Et suivez les instructions !'
echo ''
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
SCRIPT

# Exécuter le script
node setup-automatique.js

# Nettoyer le fichier temporaire
rm -f setup-automatique.js

echo ""
echo "✅ Configuration terminée !"
echo ""
echo "📝 Prochaines étapes :"
echo "   1. Lisez : open INSTRUCTIONS-SUPABASE.md"
echo "   2. Suivez les 2 étapes dans Supabase"
echo "   3. Lancez : ./DEMARRER.sh"
echo ""

