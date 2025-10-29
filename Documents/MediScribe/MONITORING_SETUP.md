# 📊 Guide de Configuration Monitoring & Alertes

## 🎯 **VUE D'ENSEMBLE**

Système de monitoring professionnel avec :
- 📊 **Logs structurés** (Winston + rotation quotidienne)
- 📈 **Dashboard temps réel** avec métriques business
- 🚨 **Alertes automatiques** (Slack + Email + Sentry)
- 📋 **Métriques détaillées** (système + business + performance)
- 🔍 **Détection d'anomalies** et patterns d'attaque

---

## 🚀 **CONFIGURATION RAPIDE**

### **1. Variables d'Environnement**

Ajouter dans `.env.server` :

```bash
# Monitoring & Alertes
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX
ALERT_EMAIL=admin@mediscribe.com
LOG_LEVEL=info

# Configuration avancée (optionnel)
NODE_ENV=production
ENABLE_DASHBOARD_AUTH=true
DASHBOARD_USERNAME=admin
DASHBOARD_PASSWORD=secure-password-123
```

### **2. Démarrage avec Monitoring**

```bash
# Avec toutes les variables configurées
SENTRY_DSN=... SLACK_WEBHOOK_URL=... node server.mjs
```

---

## 📊 **FONCTIONNALITÉS IMPLÉMENTÉES**

### **Logs Structurés**
```javascript
✅ Rotation quotidienne automatique
✅ Séparation par catégorie (app/security/business/performance)
✅ Format JSON pour ingestion (ELK, Datadog, etc.)
✅ Rétention configurée (app: 30j, security: 365j, business: 90j)
✅ Exception et rejection handlers
```

### **Dashboard Temps Réel**
```javascript
✅ URL: http://localhost:3001/dashboard
✅ Métriques business (consultations, transcriptions, revenus)
✅ Métriques techniques (mémoire, CPU, temps réponse)
✅ Graphiques interactifs (Chart.js)
✅ Auto-refresh 30 secondes
✅ Indicateurs de santé visuels
```

### **API Métriques**
```javascript
✅ GET /api/metrics - Données JSON pour intégrations
✅ GET /api/system-health - Santé système détaillée
✅ GET /api/logs/recent - Logs récents pour debug
✅ GET /api/alerts - Alertes actives
✅ POST /api/test-alert - Test alertes (dev only)
```

### **Alertes Automatiques**
```javascript
✅ Taux d'erreur élevé (>10 erreurs/minute)
✅ Temps de réponse lent (>5 secondes)
✅ Utilisation mémoire élevée (>80%)
✅ Événements de sécurité critiques
✅ Échecs de transcription répétés
```

---

## 🔧 **CONFIGURATION DÉTAILLÉE**

### **1. Sentry (Error Tracking)**

1. **Créer projet Sentry** :
   - Aller sur https://sentry.io
   - Créer compte gratuit
   - Nouveau projet → Node.js
   - Copier le DSN

2. **Configuration** :
   ```bash
   SENTRY_DSN=https://examplePublicKey@sentry.io/0123456789
   ```

3. **Features activées** :
   - Error tracking automatique
   - Performance monitoring
   - Release tracking
   - Filtrage infos sensibles

### **2. Slack (Alertes Instant)**

1. **Créer Webhook Slack** :
   - Aller dans votre workspace Slack
   - Apps → Incoming Webhooks
   - Activer et créer webhook
   - Choisir le canal (#alerts recommandé)

2. **Configuration** :
   ```bash
   SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX
   ```

3. **Types d'alertes Slack** :
   - 🔴 Critiques : Sécurité, système down
   - 🟠 Importantes : Performance, taux d'erreur
   - 🟡 Warnings : Utilisation ressources

### **3. Email (Alertes Backup)**

1. **Configuration simple** :
   ```bash
   ALERT_EMAIL=admin@mediscribe.com
   ```

2. **Intégration SendGrid (production)** :
   ```bash
   SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxx
   ALERT_EMAIL_FROM=alerts@mediscribe.com
   ALERT_EMAIL_TO=admin@mediscribe.com
   ```

3. **Intégration AWS SES** :
   ```bash
   AWS_ACCESS_KEY_ID=AKIAXXXXXXXXX
   AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxx
   AWS_REGION=us-east-1
   ```

### **4. Dashboard Authentication (Production)**

```bash
ENABLE_DASHBOARD_AUTH=true
DASHBOARD_USERNAME=admin
DASHBOARD_PASSWORD=VotreMo1De2PASse3Securise!
```

---

## 📈 **MÉTRIQUES COLLECTÉES**

### **Business Metrics**
```javascript
// Automatiquement collectées
- consultations_created
- audio_transcribed  
- report_generated
- user_login
- subscription_payment
- api_key_tested
- error_occurred

// Dashboard affiche
- Consultations aujourd'hui/semaine/mois
- Transcriptions réussies
- Comptes rendus générés
- Revenus (si intégration paiement)
- Utilisateurs actifs
```

### **Technical Metrics**
```javascript
// Système
- Mémoire (heap used/total, RSS, external)
- CPU (user, system)
- Uptime
- Connexions actives

// Performance
- Temps de réponse P95
- Taux d'erreur
- Requêtes par minute
- Taille des réponses

// Sécurité
- Violations rate limiting
- Tentatives d'attaque
- Échecs d'authentification
```

---

## 🚨 **CONFIGURATION ALERTES**

### **Seuils par Défaut**
```javascript
const alertThresholds = {
  errorRate: 10,        // 10 erreurs/minute
  responseTime: 5000,   // 5 secondes
  memoryUsage: 80,      // 80% RAM
  diskSpace: 90,        // 90% disque
  transcriptionFailures: 5  // 5 échecs/heure
};
```

### **Personnaliser les Seuils**
```bash
# Variables d'environnement (optionnel)
ALERT_ERROR_RATE=15
ALERT_RESPONSE_TIME=3000
ALERT_MEMORY_THRESHOLD=85
```

### **Types de Notifications**
```javascript
// Severity levels
- 'critical' : Slack + Email + Sentry (immédiat)
- 'high'     : Slack + Sentry (5 min delay)  
- 'medium'   : Logs seulement (sauf accumulation)
- 'low'      : Logs seulement
```

---

## 📊 **INTÉGRATIONS EXTERNES**

### **Datadog (Optionnel)**
```javascript
// Installer agent Datadog
npm install @datadog/datadog-ci

// Configuration
DD_API_KEY=your-datadog-api-key
DD_SITE=datadoghq.eu  # ou datadoghq.com
DD_SERVICE=mediscribe-api
DD_ENV=production
```

### **New Relic (Optionnel)**
```javascript
// Installer agent
npm install newrelic

// Configuration
NEW_RELIC_LICENSE_KEY=your-license-key
NEW_RELIC_APP_NAME=MediScribe API
NEW_RELIC_LOG_LEVEL=info
```

### **ELK Stack (Logs Centralisés)**
```javascript
// Les logs JSON sont prêts pour Elasticsearch
// Format compatible Logstash/Filebeat

// Exemple configuration Filebeat
filebeat.inputs:
- type: log
  paths:
    - /path/to/mediscribe/logs/app/*.log
  json.keys_under_root: true
  json.add_error_key: true
```

---

## 🔍 **MONITORING EN PRODUCTION**

### **Endpoints de Monitoring**

1. **Dashboard Principal** :
   ```
   https://your-domain.com/dashboard
   ```

2. **Health Check** :
   ```
   https://your-domain.com/api/system-health
   ```

3. **Métriques API** :
   ```
   https://your-domain.com/api/metrics
   ```

### **Surveillance Automatique**

```bash
# Script de monitoring externe (crontab)
*/5 * * * * curl -f https://your-domain.com/api/system-health || echo "API down" | mail -s "MediScribe Alert" admin@domain.com
```

### **UptimeRobot (Gratuit)**
1. Créer compte https://uptimerobot.com
2. Monitor HTTP(s) : `https://your-domain.com/api/health`
3. Interval: 5 minutes
4. Alertes: Email + SMS

---

## 🧪 **TESTS & VALIDATION**

### **Tester les Alertes**
```bash
# Test alerte Slack (dev seulement)
curl -X POST http://localhost:3001/api/test-alert \
  -H "Content-Type: application/json" \
  -d '{"type":"test","severity":"high","message":"Test alert from dev"}'

# Simuler charge (rate limiting)
for i in {1..25}; do curl http://localhost:3001/api/health; done

# Test erreur 500
curl -X POST http://localhost:3001/api/test-key \
  -H "Content-Type: application/json" \
  -d '{"apiKey":"invalid-key-that-will-fail"}'
```

### **Vérifier Dashboard**
1. Ouvrir http://localhost:3001/dashboard
2. Vérifier métriques temps réel
3. Tester auto-refresh
4. Vérifier graphiques

### **Vérifier Logs**
```bash
# Structure des logs
ls -la logs/
# app/        - Logs généraux
# security/   - Logs sécurité  
# business/   - Métriques business
# performance/ - Métriques performance

# Exemples de logs
tail -f logs/app/application-2025-10-29.log
tail -f logs/business/metrics-2025-10-29.log
```

---

## 🚀 **DÉPLOIEMENT PRODUCTION**

### **1. Variables d'Environnement**
```bash
# Minimales pour production
SENTRY_DSN=https://...
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
ALERT_EMAIL=admin@domain.com
LOG_LEVEL=info
NODE_ENV=production

# Optionnelles mais recommandées
ENABLE_DASHBOARD_AUTH=true
DASHBOARD_USERNAME=admin
DASHBOARD_PASSWORD=SecurePass123!
```

### **2. Commandes de Démarrage**
```bash
# Render/Railway (automatique avec variables d'env)
node server.mjs

# Docker (exemple)
docker run -e SENTRY_DSN=... -e SLACK_WEBHOOK_URL=... mediscribe-api

# PM2 (pour VPS)
pm2 start server.mjs --name mediscribe-api --env production
```

### **3. Vérification Post-Déploiement**
```bash
# 1. Health check
curl https://your-domain.com/api/system-health

# 2. Dashboard accessible
open https://your-domain.com/dashboard

# 3. Test alerte (seulement si SLACK configuré)
curl -X POST https://your-domain.com/api/test-alert \
  -H "Content-Type: application/json" \
  -d '{"type":"deployment","severity":"info","message":"Deployment successful"}'
```

---

## 📚 **DOCUMENTATION API**

### **GET /dashboard**
Dashboard HTML interactif avec métriques temps réel.

### **GET /api/metrics**
```json
{
  "success": true,
  "timestamp": "2025-10-29T15:30:00.000Z",
  "data": {
    "business": {
      "consultations": {"today": 15, "week": 89, "month": 347},
      "transcriptions": {"today": 23, "week": 156, "month": 892},
      "reports": {"today": 18, "week": 134, "month": 756}
    },
    "technical": {
      "activeUsers": 5,
      "responseTime": 245,
      "errorRate": 2,
      "uptime": 72,
      "memoryUsage": 45
    },
    "health": {
      "status": "healthy"
    }
  }
}
```

### **GET /api/system-health**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-29T15:30:00.000Z",
  "system": {
    "uptime": 259200,
    "uptimeFormatted": "72h 0m",
    "memory": {
      "heapUsed": 89,
      "heapTotal": 134,
      "percentage": 66
    },
    "process": {
      "pid": 1234,
      "nodeVersion": "v18.17.0",
      "platform": "linux"
    }
  },
  "services": {
    "supabase": "connected",
    "mistralAI": "available",
    "logging": "active",
    "monitoring": "active"
  }
}
```

---

## 🎯 **RÉSUMÉ**

### **✅ Implémenté**
- 📊 Logs structurés avec rotation
- 📈 Dashboard temps réel
- 🚨 Alertes Slack/Email/Sentry  
- 📋 Métriques business détaillées
- 🔍 Détection anomalies
- 🧪 Tests automatisés

### **📈 Métriques Collectées**
- Business : consultations, transcriptions, revenus
- Techniques : mémoire, CPU, temps réponse
- Sécurité : attaques, violations rate limit

### **🚨 Alertes Configurées**
- Erreurs critiques → Slack + Email
- Performance dégradée → Slack
- Sécurité → Toutes les alertes
- Auto-recovery et cleanup

### **🎛️ Dashboard Production**
- Visualisation temps réel
- Graphiques interactifs
- Indicateurs santé
- Auto-refresh

---

**🎉 Votre système de monitoring niveau entreprise est prêt !**

**Prochaine étape : Configurer vos webhooks Slack et Sentry DSN pour alertes en temps réel.**
