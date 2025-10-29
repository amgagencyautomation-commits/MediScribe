# 🏥 MediScribe - Assistant IA pour Comptes Rendus Médicaux

MediScribe est une application web moderne qui utilise l'intelligence artificielle pour automatiser la transcription et la génération de comptes rendus médicaux. Conçu spécialement pour les professionnels de santé, il permet d'enregistrer des consultations, de les transcrire automatiquement et de générer des comptes rendus structurés.

## ✨ Fonctionnalités

### 🎙️ Enregistrement et Transcription
- **Enregistrement audio haute qualité** avec suppression du bruit
- **Transcription automatique** via OpenAI Whisper
- **Support multilingue** (français par défaut)
- **Interface intuitive** pour l'enregistrement

### 📝 Génération de Comptes Rendus
- **Génération automatique** de comptes rendus médicaux
- **Adaptation par spécialité** médicale
- **Structure professionnelle** et conforme
- **Édition manuelle** des comptes rendus générés

### 👥 Gestion des Organisations
- **Comptes individuels** (médecins solo)
- **Cabinets médicaux** avec gestion d'équipe
- **Invitation de membres** et gestion des rôles
- **Partage de ressources** et clés API

### 🔐 Sécurité et Confidentialité
- **Chiffrement AES-256** des clés API
- **Row Level Security** avec Supabase
- **Variables d'environnement** sécurisées
- **Conformité RGPD** pour les données médicales

### 📊 Suivi et Analytics
- **Suivi de l'utilisation** des API
- **Calcul des coûts** en temps réel
- **Historique des consultations**
- **Statistiques d'usage**

## 🚀 Technologies Utilisées

- **Frontend**: React 18 + TypeScript + Vite
- **UI**: Tailwind CSS + shadcn/ui + Radix UI
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **IA**: OpenAI (Whisper + GPT-4)
- **État**: React Context + TanStack Query
- **Cryptage**: crypto-js (AES-256)

## 📋 Prérequis

- Node.js 18+ et npm
- Compte Supabase
- Clé API OpenAI
- Navigateur moderne avec support WebRTC

## 🛠️ Installation

### 1. Cloner le projet
```bash
git clone <votre-repo>
cd mediScribe
```

### 2. Installer les dépendances
```bash
npm install
```

### 3. Configuration Supabase

#### Créer un projet Supabase
1. Allez sur [supabase.com](https://supabase.com)
2. Créez un nouveau projet
3. Récupérez l'URL et la clé anonyme

#### Configurer la base de données
1. Ouvrez l'éditeur SQL de Supabase
2. Copiez et exécutez le contenu du fichier `supabase-schema.sql`
3. Créez un bucket de stockage nommé `audio-files` avec les permissions publiques

### 4. Configuration des variables d'environnement

Créez un fichier `.env.local` à la racine du projet :

```env
# Configuration Supabase
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-clé-anonyme-supabase

# Clé de cryptage (générez une clé sécurisée de 32+ caractères)
VITE_ENCRYPTION_KEY=votre-clé-de-cryptage-sécurisée-32-caractères-minimum

# Configuration OpenAI (optionnel pour les tests)
VITE_OPENAI_API_KEY=votre-clé-openai

# Configuration de l'application
VITE_APP_NAME=MediScribe
VITE_APP_VERSION=1.0.0
```

### 5. Générer une clé de cryptage sécurisée
```bash
# Utilisez cette commande pour générer une clé sécurisée
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 6. Démarrer l'application
```bash
npm run dev
```

L'application sera accessible sur `http://localhost:8080`

## 📖 Guide d'utilisation

### Première configuration

1. **Créez un compte** via la page d'inscription
2. **Configurez votre profil** avec votre spécialité médicale
3. **Ajoutez votre clé API OpenAI** dans les paramètres
4. **Testez la connexion** avec le bouton de validation

### Créer une consultation

1. **Accédez à la page Consultations**
2. **Cliquez sur "Nouvelle consultation"**
3. **Remplissez les informations** du patient
4. **Enregistrez l'audio** de la consultation
5. **Laissez l'IA traiter** automatiquement :
   - Transcription de l'audio
   - Génération du compte rendu
6. **Révisez et validez** le compte rendu généré

### Gestion des organisations

#### Créer un cabinet médical
1. **Accédez aux paramètres** depuis le dashboard
2. **Cliquez sur "Créer un cabinet"**
3. **Configurez le cabinet** (nom, nombre de membres)
4. **Invitez des collègues** par email

#### Gérer les membres
- **Inviter des utilisateurs** existants
- **Gérer les rôles** (admin/membre)
- **Partager les clés API** du cabinet
- **Suivre l'utilisation** collective

## 🔧 Configuration avancée

### Personnalisation des comptes rendus

Modifiez le prompt dans `src/lib/services.ts` pour adapter la génération :

```typescript
const prompt = `
Tu es un assistant médical spécialisé en ${specialty}. 
Génère un compte rendu médical professionnel basé sur cette transcription...

// Personnalisez selon vos besoins
`;
```

### Ajout de nouvelles spécialités

Modifiez la liste dans `src/pages/Signup.tsx` :

```typescript
const SPECIALTIES = [
  'Médecine générale',
  'Cardiologie',
  'Dermatologie',
  // Ajoutez vos spécialités
];
```

### Configuration du stockage audio

Dans Supabase, configurez le bucket `audio-files` :
- **Politique de lecture** : Publique
- **Politique d'écriture** : Authentifiés uniquement
- **Taille maximale** : 100MB par fichier

## 🚀 Démarrage rapide

### 🎯 Démarrage automatique (Recommandé)

```bash
# 1. Cloner le projet
git clone <votre-repo>
cd mediScribe

# 2. Configurer les variables d'environnement
cp env.example .env.local
# Éditer .env.local avec vos clés API

# 3. Démarrer l'application complète
./start-app.sh
```

### 🔧 Démarrage manuel

```bash
# Terminal 1 - Serveur API
cd api-server
npm install
OPENAI_API_KEY="votre-clé" node server.js

# Terminal 2 - Frontend
npm install
npm run dev
```

## 🚀 Déploiement

### Vercel (Recommandé)

1. **Connectez votre repo** à Vercel
2. **Ajoutez les variables d'environnement**
3. **Déployez automatiquement**

### Netlify

1. **Build command** : `npm run build`
2. **Publish directory** : `dist`
3. **Ajoutez les variables d'environnement**

### Docker
### Render (API + Frontend)

Un blueprint `render.yaml` est fourni à la racine pour déployer l'API (Web Service) et le frontend (Static Site) sur Render.

1. Poussez votre repo avec `render.yaml`
2. Sur Render, créez un nouveau Blueprint à partir du repo
3. Renseignez les variables d'environnement requises:
   - Service API (Web): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ENCRYPTION_KEY`, `ALLOWED_ORIGINS` (URL du frontend), `SENTRY_DSN` (optionnel)
   - Frontend (Static): `VITE_API_URL` (URL de l'API Render), `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
4. Déployez. Le health check de l'API est sur `/api/health`.


```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 8080
CMD ["npm", "run", "preview"]
```

## 🔒 Sécurité

### Bonnes pratiques

- **Ne commitez jamais** vos fichiers `.env.local`
- **Utilisez des clés API** différentes pour chaque environnement
- **Activez 2FA** sur vos comptes Supabase et OpenAI
- **Surveillez l'utilisation** des API régulièrement
- **Sauvegardez régulièrement** votre base de données

### Conformité RGPD

- **Consentement explicite** pour l'enregistrement audio
- **Droit à l'effacement** des données patients
- **Chiffrement** des données sensibles
- **Audit trail** des accès aux données

## 🐛 Dépannage

### Problèmes courants

#### Erreur de configuration Supabase
```
Configuration Supabase manquante
```
**Solution** : Vérifiez vos variables d'environnement dans `.env.local`

#### Erreur de clé de cryptage
```
Clé de cryptage manquante
```
**Solution** : Générez une nouvelle clé avec la commande Node.js

#### Problème d'enregistrement audio
```
Impossible d'accéder au microphone
```
**Solution** : Vérifiez les permissions du navigateur et utilisez HTTPS

#### Erreur OpenAI
```
Erreur OpenAI: 401 Unauthorized
```
**Solution** : Vérifiez votre clé API OpenAI et vos crédits

### Logs et debugging

Activez les logs détaillés :
```env
VITE_DEBUG=true
```

## 🤝 Contribution

1. **Forkez le projet**
2. **Créez une branche** pour votre fonctionnalité
3. **Commitez vos changements**
4. **Poussez vers la branche**
5. **Ouvrez une Pull Request**

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 🆘 Support

- **Documentation** : [Wiki du projet](https://github.com/votre-repo/wiki)
- **Issues** : [GitHub Issues](https://github.com/votre-repo/issues)
- **Email** : support@mediscribe.fr

## 🙏 Remerciements

- **OpenAI** pour les API Whisper et GPT-4
- **Supabase** pour l'infrastructure backend
- **shadcn/ui** pour les composants UI
- **La communauté React** pour l'écosystème

---

**⚠️ Avertissement médical** : MediScribe est un outil d'assistance. Les comptes rendus générés doivent toujours être révisés et validés par un professionnel de santé qualifié.
