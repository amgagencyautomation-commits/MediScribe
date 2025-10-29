# 🎯 ROADMAP VERS 100% PRODUCTION READY

## 📋 OBJECTIF
Passer de **78% Beta Ready** à **100% Production Ready**

**Temps estimé total: 2-3 semaines**  
**Effort: ~80-100 heures de travail**

---

## 🚀 PHASE 1: TESTS AUTOMATIQUES (5-7 jours)

### **1.1 Tests E2E avec Playwright** (3 jours)

#### Installation
```bash
npm install -D @playwright/test @playwright/experimental-ct-react
npx playwright install
```

#### Configuration `playwright.config.ts`
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
  },
});
```

#### Tests Critiques à Créer

**`tests/e2e/auth.spec.ts`** - Tests Authentification
```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentification', () => {
  test('utilisateur peut créer un compte', async ({ page }) => {
    await page.goto('/signup');
    
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'Test123456!');
    await page.fill('[name="confirmPassword"]', 'Test123456!');
    await page.selectOption('[name="specialty"]', 'Médecine générale');
    
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('text=Bienvenue')).toBeVisible();
  });

  test('utilisateur peut se connecter', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'Test123456!');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('erreur avec mot de passe incorrect', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'WrongPassword');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=/mot de passe incorrect/i')).toBeVisible();
  });
});
```

**`tests/e2e/transcription.spec.ts`** - Tests Transcription
```typescript
import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Transcription Audio', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'Test123456!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('peut uploader et transcrire un fichier audio', async ({ page }) => {
    await page.goto('/consultations');
    await page.click('button:has-text("Nouvelle consultation")');
    
    // Upload fichier audio de test
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(__dirname, 'fixtures/test-audio.mp3'));
    
    await page.click('button:has-text("Transcrire")');
    
    // Attendre la transcription (max 30s)
    await expect(page.locator('text=Transcription terminée')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('[data-testid="transcript-text"]')).not.toBeEmpty();
  });

  test('affiche erreur si fichier trop volumineux', async ({ page }) => {
    await page.goto('/consultations');
    await page.click('button:has-text("Nouvelle consultation")');
    
    // Tenter upload fichier trop gros (mock)
    const fileInput = page.locator('input[type="file"]');
    // Créer un fichier de test > 25MB
    
    await expect(page.locator('text=/fichier trop volumineux/i')).toBeVisible();
  });
});
```

**`tests/e2e/report-generation.spec.ts`** - Tests Génération Rapport
```typescript
import { test, expect } from '@playwright/test';

test.describe('Génération de Rapports', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'Test123456!');
    await page.click('button[type="submit"]');
  });

  test('génère un compte rendu depuis transcription', async ({ page }) => {
    await page.goto('/consultations');
    
    // Sélectionner une consultation avec transcription
    await page.click('[data-testid="consultation-item"]:first-child');
    
    await page.click('button:has-text("Générer compte rendu")');
    
    // Attendre génération
    await expect(page.locator('text=Compte rendu généré')).toBeVisible({ timeout: 60000 });
    
    // Vérifier sections du rapport
    await expect(page.locator('text=MOTIF DE CONSULTATION')).toBeVisible();
    await expect(page.locator('text=ANAMNÈSE')).toBeVisible();
    await expect(page.locator('text=EXAMEN CLINIQUE')).toBeVisible();
  });
});
```

**Commandes de test:**
```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:debug": "playwright test --debug"
  }
}
```

---

### **1.2 Tests Unitaires Backend** (2 jours)

#### Tests API avec Supertest

**Installation:**
```bash
npm install -D supertest @types/supertest
```

**`tests/api/auth.test.js`**
```javascript
import request from 'supertest';
import app from '../../server.mjs';

describe('API Authentication', () => {
  describe('POST /api/test-key', () => {
    it('devrait valider une clé API Mistral valide', async () => {
      const response = await request(app)
        .post('/api/test-key')
        .send({ apiKey: process.env.TEST_MISTRAL_KEY })
        .expect(200);
      
      expect(response.body.valid).toBe(true);
    });

    it('devrait rejeter une clé API invalide', async () => {
      const response = await request(app)
        .post('/api/test-key')
        .send({ apiKey: 'invalid-key' })
        .expect(200);
      
      expect(response.body.valid).toBe(false);
    });

    it('devrait retourner 400 si clé manquante', async () => {
      const response = await request(app)
        .post('/api/test-key')
        .send({})
        .expect(400);
      
      expect(response.body.error).toBeDefined();
    });
  });
});
```

**`tests/api/transcription.test.js`**
```javascript
import request from 'supertest';
import app from '../../server.mjs';
import fs from 'fs';
import path from 'path';

describe('API Transcription', () => {
  const testUserId = 'test-user-uuid';
  
  describe('POST /api/transcribe', () => {
    it('devrait transcrire un fichier audio valide', async () => {
      const audioPath = path.join(__dirname, 'fixtures/test-audio.mp3');
      
      const response = await request(app)
        .post('/api/transcribe')
        .set('x-user-id', testUserId)
        .attach('file', audioPath)
        .expect(200);
      
      expect(response.body.transcript).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.transcript.length).toBeGreaterThan(0);
    }, 30000);

    it('devrait rejeter requête sans userId', async () => {
      const audioPath = path.join(__dirname, 'fixtures/test-audio.mp3');
      
      await request(app)
        .post('/api/transcribe')
        .attach('file', audioPath)
        .expect(400);
    });

    it('devrait respecter rate limiting', async () => {
      const audioPath = path.join(__dirname, 'fixtures/test-audio.mp3');
      
      // Faire 21 requêtes (limite = 20/min)
      for (let i = 0; i < 21; i++) {
        const response = await request(app)
          .post('/api/transcribe')
          .set('x-user-id', testUserId)
          .attach('file', audioPath);
        
        if (i === 20) {
          expect(response.status).toBe(429);
        }
      }
    }, 60000);
  });
});
```

**`tests/api/security.test.js`**
```javascript
import request from 'supertest';
import app from '../../server.mjs';

describe('Security Tests', () => {
  describe('Rate Limiting', () => {
    it('devrait bloquer après trop de requêtes', async () => {
      // Faire 101 requêtes (limite = 100/15min)
      for (let i = 0; i < 101; i++) {
        const response = await request(app).get('/api/health');
        
        if (i === 100) {
          expect(response.status).toBe(429);
          expect(response.body.code).toBe('RATE_LIMIT_EXCEEDED');
        }
      }
    });
  });

  describe('Input Sanitization', () => {
    it('devrait sanitizer les inputs XSS', async () => {
      const response = await request(app)
        .post('/api/test-endpoint')
        .send({
          message: '<script>alert("XSS")</script>Test'
        });
      
      expect(response.body.message).not.toContain('<script>');
    });
  });

  describe('CSRF Protection', () => {
    it('devrait rejeter requête sans CSRF token', async () => {
      await request(app)
        .post('/api/generate-report')
        .send({ transcript: 'test' })
        .expect(403);
    });
  });
});
```

---

## 🤖 PHASE 2: CI/CD PIPELINE (2-3 jours)

### **2.1 GitHub Actions Workflow**

**`.github/workflows/ci.yml`**
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  # Job 1: Tests & Linting
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: mediscribe_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linter
        run: npm run lint
      
      - name: Run unit tests
        run: npm run test
        env:
          NODE_ENV: test
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
      
      - name: Run E2E tests
        run: npm run test:e2e
        env:
          CI: true
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-results
          path: test-results/
      
      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/coverage-final.json

  # Job 2: Build & Verify
  build:
    needs: test
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build frontend
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
      
      - name: Check bundle size
        run: |
          BUNDLE_SIZE=$(du -sm dist | cut -f1)
          echo "Bundle size: ${BUNDLE_SIZE}MB"
          if [ $BUNDLE_SIZE -gt 5 ]; then
            echo "::error::Bundle size too large (${BUNDLE_SIZE}MB > 5MB)"
            exit 1
          fi
      
      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/

  # Job 3: Security Scan
  security:
    needs: test
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Run npm audit
        run: npm audit --audit-level=moderate
      
      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high
      
      - name: OWASP Dependency Check
        uses: dependency-check/Dependency-Check_Action@main
        with:
          project: 'MediScribe'
          path: '.'
          format: 'HTML'

  # Job 4: Deploy to Staging
  deploy-staging:
    needs: [test, build, security]
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Deploy to Vercel (Staging)
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./
      
      - name: Deploy Backend to Railway (Staging)
        run: |
          npm install -g @railway/cli
          railway up --service backend-staging
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
      
      - name: Run smoke tests
        run: npm run test:smoke
        env:
          API_URL: ${{ secrets.STAGING_API_URL }}

  # Job 5: Deploy to Production
  deploy-production:
    needs: [test, build, security]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Download build artifacts
        uses: actions/download-artifact@v4
        with:
          name: dist
          path: dist/
      
      - name: Deploy to Vercel (Production)
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
          working-directory: ./
      
      - name: Deploy Backend to Railway (Production)
        run: |
          npm install -g @railway/cli
          railway up --service backend-production
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
      
      - name: Run production smoke tests
        run: npm run test:smoke:prod
        env:
          API_URL: ${{ secrets.PRODUCTION_API_URL }}
      
      - name: Notify Slack on success
        if: success()
        uses: slackapi/slack-github-action@v1
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK }}
          payload: |
            {
              "text": "✅ Production deployment successful!",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Deployment Status:* ✅ Success\n*Branch:* ${{ github.ref }}\n*Commit:* ${{ github.sha }}"
                  }
                }
              ]
            }
      
      - name: Notify Slack on failure
        if: failure()
        uses: slackapi/slack-github-action@v1
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK }}
          payload: |
            {
              "text": "❌ Production deployment failed!",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Deployment Status:* ❌ Failed\n*Branch:* ${{ github.ref }}\n*Commit:* ${{ github.sha }}"
                  }
                }
              ]
            }
```

### **2.2 Secrets à Configurer**

Dans **GitHub Settings → Secrets and variables → Actions**:

```bash
# Supabase
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

# Vercel
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID

# Railway
RAILWAY_TOKEN

# Monitoring
SENTRY_DSN
SLACK_WEBHOOK

# Security
SNYK_TOKEN

# App
VITE_ENCRYPTION_KEY
SESSION_SECRET
```

---

## 📊 PHASE 3: MONITORING PRODUCTION-GRADE (3-4 jours)

### **3.1 Prometheus + Grafana Stack**

#### **docker-compose.monitoring.yml**
```yaml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/usr/share/prometheus/console_libraries'
      - '--web.console.templates=/usr/share/prometheus/consoles'
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_INSTALL_PLUGINS=grafana-piechart-panel
    volumes:
      - grafana-data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./monitoring/grafana/datasources:/etc/grafana/provisioning/datasources
    restart: unless-stopped

  node-exporter:
    image: prom/node-exporter:latest
    container_name: node-exporter
    ports:
      - "9100:9100"
    restart: unless-stopped

  alertmanager:
    image: prom/alertmanager:latest
    container_name: alertmanager
    ports:
      - "9093:9093"
    volumes:
      - ./monitoring/alertmanager.yml:/etc/alertmanager/alertmanager.yml
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yml'
    restart: unless-stopped

volumes:
  prometheus-data:
  grafana-data:
```

#### **monitoring/prometheus.yml**
```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

rule_files:
  - 'alerts.yml'

scrape_configs:
  - job_name: 'mediscribe-api'
    static_configs:
      - targets: ['host.docker.internal:3001']
    metrics_path: '/api/metrics/prometheus'

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']
```

#### **monitoring/alerts.yml**
```yaml
groups:
  - name: mediscribe_alerts
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors/sec"

      - alert: HighResponseTime
        expr: histogram_quantile(0.95, http_request_duration_seconds) > 5
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High response time"
          description: "95th percentile response time is {{ $value }}s"

      - alert: HighMemoryUsage
        expr: process_resident_memory_bytes / 1024 / 1024 > 500
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"
          description: "Memory usage is {{ $value }}MB"

      - alert: APIDown
        expr: up{job="mediscribe-api"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "MediScribe API is down"
          description: "API has been down for more than 1 minute"
```

#### **Exporter Prometheus pour Express**

**src/lib/prometheusMetrics.js**
```javascript
import promClient from 'prom-client';

// Créer un registre
const register = new promClient.Registry();

// Métriques par défaut
promClient.collectDefaultMetrics({ register });

// Métriques personnalisées
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

const httpRequestTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status']
});

const transcriptionsTotal = new promClient.Counter({
  name: 'transcriptions_total',
  help: 'Total number of transcriptions',
  labelNames: ['status']
});

const reportsGenerated = new promClient.Counter({
  name: 'reports_generated_total',
  help: 'Total number of reports generated',
  labelNames: ['specialty']
});

const activeUsers = new promClient.Gauge({
  name: 'active_users',
  help: 'Number of active users',
});

const mistralApiCalls = new promClient.Counter({
  name: 'mistral_api_calls_total',
  help: 'Total Mistral AI API calls',
  labelNames: ['operation', 'status']
});

const mistralTokensUsed = new promClient.Counter({
  name: 'mistral_tokens_used_total',
  help: 'Total tokens used from Mistral AI',
  labelNames: ['operation']
});

register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(transcriptionsTotal);
register.registerMetric(reportsGenerated);
register.registerMetric(activeUsers);
register.registerMetric(mistralApiCalls);
register.registerMetric(mistralTokensUsed);

// Middleware de métriques
export const metricsMiddleware = () => {
  return (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000;
      const route = req.route ? req.route.path : req.path;
      
      httpRequestDuration.labels(req.method, route, res.statusCode).observe(duration);
      httpRequestTotal.labels(req.method, route, res.statusCode >= 400 ? 'error' : 'success').inc();
    });
    
    next();
  };
};

// Enregistrer métrique transcription
export const recordTranscription = (status) => {
  transcriptionsTotal.labels(status).inc();
};

// Enregistrer métrique rapport
export const recordReport = (specialty) => {
  reportsGenerated.labels(specialty).inc();
};

// Enregistrer appel Mistral AI
export const recordMistralCall = (operation, status, tokens = 0) => {
  mistralApiCalls.labels(operation, status).inc();
  if (tokens > 0) {
    mistralTokensUsed.labels(operation).inc(tokens);
  }
};

// Endpoint métriques Prometheus
export const metricsHandler = async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
};

export default {
  metricsMiddleware,
  metricsHandler,
  recordTranscription,
  recordReport,
  recordMistralCall,
  register
};
```

**Intégrer dans server.mjs:**
```javascript
import prometheusMetrics from './src/lib/prometheusMetrics.js';

// Ajouter middleware
app.use(prometheusMetrics.metricsMiddleware());

// Endpoint Prometheus
app.get('/api/metrics/prometheus', prometheusMetrics.metricsHandler);

// Utiliser dans les endpoints
app.post('/api/transcribe', async (req, res) => {
  try {
    // ... code transcription ...
    prometheusMetrics.recordTranscription('success');
    prometheusMetrics.recordMistralCall('transcription', 'success', result.usage?.total_tokens);
  } catch (error) {
    prometheusMetrics.recordTranscription('error');
    prometheusMetrics.recordMistralCall('transcription', 'error');
  }
});
```

### **3.2 Dashboards Grafana**

**monitoring/grafana/datasources/prometheus.yml**
```yaml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
```

**monitoring/grafana/dashboards/mediscribe.json** (Dashboard personnalisé)
- Graphiques de performance API
- Taux d'erreur en temps réel
- Utilisation mémoire/CPU
- Métriques business (transcriptions/rapports par heure)
- Coûts Mistral AI en temps réel

**Lancer le stack:**
```bash
docker-compose -f docker-compose.monitoring.yml up -d
```

Accès:
- Grafana: http://localhost:3000 (admin/admin)
- Prometheus: http://localhost:9090
- Alertmanager: http://localhost:9093

---

## ⚡ PHASE 4: TESTS DE CHARGE (2-3 jours)

### **4.1 k6 Load Testing**

#### Installation
```bash
# macOS
brew install k6

# Ou via npm
npm install -g k6
```

#### **tests/load/basic-load.js**
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 10 },   // Ramp up à 10 users
    { duration: '5m', target: 10 },   // Stay à 10 users
    { duration: '2m', target: 50 },   // Ramp up à 50 users
    { duration: '5m', target: 50 },   // Stay à 50 users
    { duration: '2m', target: 100 },  // Ramp up à 100 users
    { duration: '5m', target: 100 },  // Stay à 100 users
    { duration: '3m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'], // 95% des requêtes < 5s
    http_req_failed: ['rate<0.01'],    // < 1% d'erreurs
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3001';

export default function () {
  // Test health endpoint
  let res = http.get(`${BASE_URL}/api/health`);
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 1s': (r) => r.timings.duration < 1000,
  });

  sleep(1);
}
```

#### **tests/load/transcription-load.js**
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { FormData } from 'https://jslib.k6.io/formdata/0.0.2/index.js';

export const options = {
  stages: [
    { duration: '1m', target: 5 },
    { duration: '3m', target: 5 },
    { duration: '1m', target: 10 },
    { duration: '3m', target: 10 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<30000'], // Transcription peut être lente
    http_req_failed: ['rate<0.05'],      // < 5% d'erreurs
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3001';
const USER_ID = 'load-test-user-id';

export default function () {
  const formData = new FormData();
  
  // Simuler upload fichier audio (2MB test file)
  const audioData = open('./fixtures/test-audio.mp3', 'b');
  formData.append('file', http.file(audioData, 'test-audio.mp3'));

  const params = {
    headers: {
      'x-user-id': USER_ID,
    },
  };

  const res = http.post(`${BASE_URL}/api/transcribe`, formData.body(), params);
  
  check(res, {
    'transcription successful': (r) => r.status === 200,
    'has transcript': (r) => r.json('transcript') !== undefined,
  });

  sleep(5); // Attendre 5s entre chaque transcription
}
```

#### **tests/load/stress-test.js** (Test de stress)
```javascript
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 200 },
    { duration: '5m', target: 200 },
    { duration: '5m', target: 300 },  // Point de rupture
    { duration: '10m', target: 300 },
    { duration: '3m', target: 0 },
  ],
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3001';

export default function () {
  const res = http.get(`${BASE_URL}/api/health`);
  check(res, { 'status is 200': (r) => r.status === 200 });
}
```

#### **tests/load/spike-test.js** (Test de pic)
```javascript
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '10s', target: 10 },
    { duration: '1m', target: 10 },
    { duration: '10s', target: 500 },  // Spike brutal!
    { duration: '3m', target: 500 },
    { duration: '10s', target: 10 },
    { duration: '1m', target: 10 },
    { duration: '10s', target: 0 },
  ],
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3001';

export default function () {
  http.get(`${BASE_URL}/api/health`);
}
```

#### Commandes de test
```bash
# Test de charge basique
k6 run tests/load/basic-load.js

# Test de charge avec données réelles
k6 run tests/load/transcription-load.js

# Test de stress
k6 run tests/load/stress-test.js

# Test de pic
k6 run tests/load/spike-test.js

# Avec output vers InfluxDB pour Grafana
k6 run --out influxdb=http://localhost:8086/k6 tests/load/basic-load.js
```

### **4.2 Artillery Load Testing (Alternative)**

```bash
npm install -D artillery
```

**tests/load/artillery-config.yml**
```yaml
config:
  target: "http://localhost:3001"
  phases:
    - duration: 120
      arrivalRate: 10
      name: "Warm up"
    - duration: 300
      arrivalRate: 50
      name: "Sustained load"
    - duration: 120
      arrivalRate: 100
      name: "Peak load"
  defaults:
    headers:
      x-user-id: "load-test-user"

scenarios:
  - name: "Health check"
    flow:
      - get:
          url: "/api/health"
          capture:
            - json: "$.status"
              as: "status"
      - think: 1

  - name: "Complete transcription flow"
    weight: 3
    flow:
      - post:
          url: "/api/transcribe"
          beforeRequest: "loadAudioFile"
          capture:
            - json: "$.transcript"
              as: "transcript"
      - think: 5
      - post:
          url: "/api/generate-report"
          json:
            transcript: "{{ transcript }}"
            specialty: "Médecine générale"
            consultationType: "Consultation"
            userId: "load-test-user"
```

**Exécuter:**
```bash
artillery run tests/load/artillery-config.yml

# Avec rapport HTML
artillery run --output report.json tests/load/artillery-config.yml
artillery report report.json
```

### **4.3 Métriques à Surveiller**

Durant les tests de charge, surveiller:

1. **Response Time**
   - P50, P95, P99
   - Objectif: P95 < 5s

2. **Throughput**
   - Requêtes/seconde
   - Objectif: > 50 req/s

3. **Error Rate**
   - % d'erreurs
   - Objectif: < 1%

4. **Resource Usage**
   - CPU: < 80%
   - Mémoire: < 80%
   - Bande passante réseau

5. **Database Performance**
   - Connexions actives
   - Temps de requête
   - Locks/deadlocks

---

## 📋 PHASE 5: INFRASTRUCTURE PRODUCTION (2-3 jours)

### **5.1 Terraform pour Infrastructure as Code**

**infrastructure/terraform/main.tf**
```hcl
terraform {
  required_providers {
    vercel = {
      source  = "vercel/vercel"
      version = "~> 0.15"
    }
  }
}

provider "vercel" {
  api_token = var.vercel_token
}

# Frontend Vercel
resource "vercel_project" "mediscribe_frontend" {
  name      = "mediscribe-frontend"
  framework = "vite"

  git_repository = {
    type = "github"
    repo = var.github_repo
  }

  environment = [
    {
      key    = "VITE_SUPABASE_URL"
      value  = var.supabase_url
      target = ["production", "preview"]
    },
    {
      key    = "VITE_SUPABASE_ANON_KEY"
      value  = var.supabase_anon_key
      target = ["production", "preview"]
    },
    {
      key    = "VITE_ENCRYPTION_KEY"
      value  = var.encryption_key
      target = ["production"]
    }
  ]
}

# Outputs
output "frontend_url" {
  value = vercel_project.mediscribe_frontend.url
}
```

### **5.2 Health Checks Avancés**

**src/lib/healthCheck.js**
```javascript
export async function deepHealthCheck() {
  const checks = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    services: {}
  };

  // Check Supabase
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    checks.services.supabase = error ? 'unhealthy' : 'healthy';
  } catch (e) {
    checks.services.supabase = 'unhealthy';
    checks.status = 'degraded';
  }

  // Check Mistral AI
  try {
    const response = await fetch('https://api.mistral.ai/v1/models', {
      headers: { 'Authorization': `Bearer ${process.env.MISTRAL_KEY}` }
    });
    checks.services.mistralAI = response.ok ? 'healthy' : 'unhealthy';
  } catch (e) {
    checks.services.mistralAI = 'unhealthy';
    checks.status = 'degraded';
  }

  // Check Disk Space
  const diskUsage = await checkDiskSpace();
  checks.services.disk = diskUsage < 90 ? 'healthy' : 'critical';
  
  // Check Memory
  const memUsage = process.memoryUsage();
  const memPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
  checks.services.memory = memPercent < 85 ? 'healthy' : 'warning';

  return checks;
}
```

### **5.3 Backup Automatique**

**scripts/backup-db.sh**
```bash
#!/bin/bash

# Backup Supabase DB
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups"
BACKUP_FILE="$BACKUP_DIR/mediscribe_$TIMESTAMP.sql"

mkdir -p $BACKUP_DIR

# Export depuis Supabase
pg_dump $SUPABASE_DB_URL > $BACKUP_FILE

# Compresser
gzip $BACKUP_FILE

# Upload vers S3/Cloudflare R2
aws s3 cp "$BACKUP_FILE.gz" s3://mediscribe-backups/

# Nettoyer backups > 30 jours
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete

echo "✅ Backup completed: $BACKUP_FILE.gz"
```

**Cronjob (quotidien à 2h du matin):**
```bash
0 2 * * * /path/to/backup-db.sh >> /var/log/mediscribe-backup.log 2>&1
```

---

## 📊 RÉSUMÉ & TIMELINE

### **Timeline Complète: 2-3 semaines**

| Phase | Durée | Priorité | Compléxité |
|-------|-------|----------|------------|
| **Phase 1: Tests E2E + Unit** | 5-7 jours | 🔴 Critique | ⚠️ Moyenne |
| **Phase 2: CI/CD Pipeline** | 2-3 jours | 🔴 Critique | ⚠️ Moyenne |
| **Phase 3: Monitoring Pro** | 3-4 jours | 🟡 Haute | 🔴 Haute |
| **Phase 4: Tests de Charge** | 2-3 jours | 🟡 Haute | ⚠️ Moyenne |
| **Phase 5: Infrastructure** | 2-3 jours | 🟢 Moyenne | 🟢 Faible |

**Total: 14-20 jours** (2-3 semaines avec 1-2 développeurs)

---

## ✅ CHECKLIST FINALE 100% PRODUCTION

### **Tests Automatiques** ✅
- [ ] Tests E2E Playwright (auth, transcription, reports)
