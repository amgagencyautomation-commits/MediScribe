# Dockerfile pour MediScribe - Production Ready
# Multi-stage build pour optimiser la taille de l'image

# Stage 1: Prepare API dependencies
FROM node:18-alpine AS builder

# Installer les dépendances système nécessaires
RUN apk add --no-cache python3 make g++

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer uniquement les dépendances de production (API)
RUN npm ci --only=production && \
    npm cache clean --force

# Copier le code source nécessaire pour l'API
COPY server.mjs ./
COPY src/lib ./src/lib

# Stage 2: Production
FROM node:18-alpine AS production

# Installer dumb-init pour gérer les signaux correctement
RUN apk add --no-cache dumb-init

# Créer un utilisateur non-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S mediscribe -u 1001

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers nécessaires depuis le builder
COPY --from=builder --chown=mediscribe:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=mediscribe:nodejs /app/package*.json ./
COPY --from=builder --chown=mediscribe:nodejs /app/server.mjs ./
COPY --from=builder --chown=mediscribe:nodejs /app/src/lib ./src/lib

# Variables d'environnement par défaut
ENV NODE_ENV=production
ENV PORT=3001

# Exposer le port
EXPOSE 3001

# Utiliser l'utilisateur non-root
USER mediscribe

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Utiliser dumb-init pour gérer les processus
ENTRYPOINT ["dumb-init", "--"]

# Démarrer le serveur
CMD ["node", "server.mjs"]

# Métadonnées
LABEL maintainer="MediScribe Team"
LABEL version="1.0.0"
LABEL description="MediScribe - Assistant IA pour Comptes Rendus Médicaux"
