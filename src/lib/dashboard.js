// 📊 Dashboard Métriques Business & Technique
// Métriques temps réel pour MediScribe

import fs from 'fs/promises';
import path from 'path';

class MetricsDashboard {
  constructor() {
    this.metrics = new Map();
    this.realTimeStats = {
      activeUsers: new Set(),
      requestsPerMinute: [],
      errorRates: [],
      responseTimeP95: [],
      transcriptionSuccess: [],
      reportGeneration: []
    };
    this.businessMetrics = {
      consultations: { today: 0, week: 0, month: 0 },
      transcriptions: { today: 0, week: 0, month: 0 },
      reports: { today: 0, week: 0, month: 0 },
      users: { active: 0, new: 0, returning: 0 },
      revenue: { today: 0, week: 0, month: 0 }
    };
    this.startMetricsCollection();
  }

  /**
   * Démarrer la collecte de métriques
   */
  startMetricsCollection() {
    // Collecte toutes les minutes
    setInterval(() => {
      this.collectSystemMetrics();
      this.updateRealTimeStats();
    }, 60000);

    // Sauvegarde toutes les 5 minutes
    setInterval(() => {
      this.saveMetricsToFile();
    }, 300000);
  }

  /**
   * Enregistrer un événement business
   */
  recordBusinessEvent(event, data = {}) {
    const timestamp = new Date();
    const eventData = {
      timestamp,
      event,
      userId: data.userId,
      metadata: data.metadata || {},
      value: data.value || 1
    };

    // Stocker l'événement
    const key = `${event}:${timestamp.toISOString().split('T')[0]}`;
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    this.metrics.get(key).push(eventData);

    // Mettre à jour les compteurs business
    this.updateBusinessCounters(event, eventData);

    // Tracer l'utilisateur actif
    if (data.userId) {
      this.realTimeStats.activeUsers.add(data.userId);
    }
  }

  /**
   * Mettre à jour les compteurs business
   */
  updateBusinessCounters(event, data) {
    const today = new Date().toISOString().split('T')[0];
    const thisWeek = this.getWeekStart();
    const thisMonth = new Date().toISOString().substr(0, 7);

    switch (event) {
      case 'consultation_created':
        this.businessMetrics.consultations.today++;
        this.businessMetrics.consultations.week++;
        this.businessMetrics.consultations.month++;
        break;

      case 'audio_transcribed':
        this.businessMetrics.transcriptions.today++;
        this.businessMetrics.transcriptions.week++;
        this.businessMetrics.transcriptions.month++;
        break;

      case 'report_generated':
        this.businessMetrics.reports.today++;
        this.businessMetrics.reports.week++;
        this.businessMetrics.reports.month++;
        break;

      case 'user_login':
        this.businessMetrics.users.active++;
        break;

      case 'subscription_payment':
        const amount = data.metadata?.amount || 0;
        this.businessMetrics.revenue.today += amount;
        this.businessMetrics.revenue.week += amount;
        this.businessMetrics.revenue.month += amount;
        break;
    }
  }

  /**
   * Métriques système
   */
  collectSystemMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    const systemMetrics = {
      timestamp: new Date(),
      memory: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024),
        rss: Math.round(memUsage.rss / 1024 / 1024)
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      uptime: Math.floor(process.uptime()),
      activeConnections: this.realTimeStats.activeUsers.size
    };

    this.recordMetric('system', systemMetrics);
  }

  /**
   * Enregistrer une métrique générique
   */
  recordMetric(category, data) {
    const key = `${category}:${new Date().toISOString()}`;
    this.metrics.set(key, data);

    // Nettoyer les anciennes métriques (garder 7 jours)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    for (const [k, v] of this.metrics.entries()) {
      if (v.timestamp && v.timestamp < sevenDaysAgo) {
        this.metrics.delete(k);
      }
    }
  }

  /**
   * Stats temps réel
   */
  updateRealTimeStats() {
    const now = new Date();
    
    // Nettoyer les utilisateurs actifs (inactifs depuis 5 min)
    // En production, utiliser Redis ou similaire
    
    // Calculer P95 des temps de réponse
    const recentRequests = this.getRecentMetrics('request', 3600000); // 1h
    if (recentRequests.length > 0) {
      const sortedTimes = recentRequests
        .map(r => r.duration)
        .sort((a, b) => a - b);
      const p95Index = Math.floor(sortedTimes.length * 0.95);
      this.realTimeStats.responseTimeP95.push({
        timestamp: now,
        value: sortedTimes[p95Index] || 0
      });
    }

    // Garder seulement les données des dernières 24h
    this.cleanupRealTimeStats();
  }

  /**
   * Obtenir métriques récentes
   */
  getRecentMetrics(type, timeWindowMs) {
    const cutoff = new Date(Date.now() - timeWindowMs);
    const results = [];

    for (const [key, value] of this.metrics.entries()) {
      if (key.startsWith(`${type}:`) && value.timestamp > cutoff) {
        results.push(value);
      }
    }

    return results;
  }

  /**
   * Nettoyer stats temps réel
   */
  cleanupRealTimeStats() {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    for (const statArray of Object.values(this.realTimeStats)) {
      if (Array.isArray(statArray)) {
        const filtered = statArray.filter(item => item.timestamp > oneDayAgo);
        statArray.length = 0;
        statArray.push(...filtered);
      }
    }
  }

  /**
   * Générer dashboard HTML
   */
  async generateDashboardHTML() {
    const stats = this.getDashboardStats();
    
    const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MediScribe - Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .dashboard { max-width: 1200px; margin: 0 auto; }
        .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 20px; }
        .metric-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metric-value { font-size: 2em; font-weight: bold; color: #2563eb; }
        .metric-label { color: #666; font-size: 0.9em; }
        .chart-container { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px; }
        .status-indicator { display: inline-block; width: 12px; height: 12px; border-radius: 50%; margin-right: 8px; }
        .status-healthy { background: #10b981; }
        .status-warning { background: #f59e0b; }
        .status-error { background: #ef4444; }
    </style>
</head>
<body>
    <div class="dashboard">
        <div class="header">
            <h1>🏥 MediScribe - Dashboard Production</h1>
            <p>Dernière mise à jour: ${new Date().toLocaleString('fr-FR')}</p>
            <p><span class="status-indicator ${stats.health.status === 'healthy' ? 'status-healthy' : stats.health.status === 'warning' ? 'status-warning' : 'status-error'}"></span>Statut: ${stats.health.status}</p>
        </div>

        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-value">${stats.business.consultations.today}</div>
                <div class="metric-label">Consultations Aujourd'hui</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${stats.business.transcriptions.today}</div>
                <div class="metric-label">Transcriptions Aujourd'hui</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${stats.business.reports.today}</div>
                <div class="metric-label">Comptes Rendus Générés</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${stats.technical.activeUsers}</div>
                <div class="metric-label">Utilisateurs Actifs</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${stats.technical.responseTime}ms</div>
                <div class="metric-label">Temps Réponse P95</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${stats.technical.errorRate}%</div>
                <div class="metric-label">Taux d'Erreur</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${stats.technical.uptime}h</div>
                <div class="metric-label">Uptime</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${stats.technical.memoryUsage}%</div>
                <div class="metric-label">Utilisation Mémoire</div>
            </div>
        </div>

        <div class="chart-container">
            <h3>📈 Consultations par Heure</h3>
            <canvas id="consultationsChart" width="400" height="200"></canvas>
        </div>

        <div class="chart-container">
            <h3>⚡ Performance & Erreurs</h3>
            <canvas id="performanceChart" width="400" height="200"></canvas>
        </div>

        <div class="chart-container">
            <h3>💾 Utilisation Système</h3>
            <canvas id="systemChart" width="400" height="200"></canvas>
        </div>
    </div>

    <script>
        // Graphique consultations
        const consultationsCtx = document.getElementById('consultationsChart').getContext('2d');
        new Chart(consultationsCtx, {
            type: 'line',
            data: {
                labels: ${JSON.stringify(stats.charts.consultations.labels)},
                datasets: [{
                    label: 'Consultations',
                    data: ${JSON.stringify(stats.charts.consultations.data)},
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    tension: 0.4
                }]
            },
            options: { responsive: true, scales: { y: { beginAtZero: true } } }
        });

        // Graphique performance
        const performanceCtx = document.getElementById('performanceChart').getContext('2d');
        new Chart(performanceCtx, {
            type: 'line',
            data: {
                labels: ${JSON.stringify(stats.charts.performance.labels)},
                datasets: [
                    {
                        label: 'Temps Réponse (ms)',
                        data: ${JSON.stringify(stats.charts.performance.responseTime)},
                        borderColor: '#10b981',
                        yAxisID: 'y'
                    },
                    {
                        label: 'Erreurs (%)',
                        data: ${JSON.stringify(stats.charts.performance.errorRate)},
                        borderColor: '#ef4444',
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: { type: 'linear', display: true, position: 'left' },
                    y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false } }
                }
            }
        });

        // Graphique système
        const systemCtx = document.getElementById('systemChart').getContext('2d');
        new Chart(systemCtx, {
            type: 'doughnut',
            data: {
                labels: ['Mémoire Utilisée', 'Mémoire Libre'],
                datasets: [{
                    data: [${stats.technical.memoryUsage}, ${100 - stats.technical.memoryUsage}],
                    backgroundColor: ['#ef4444', '#10b981']
                }]
            },
            options: { responsive: true }
        });

        // Auto-refresh toutes les 30 secondes
        setTimeout(() => location.reload(), 30000);
    </script>
</body>
</html>`;

    return html;
  }

  /**
   * Stats pour dashboard
   */
  getDashboardStats() {
    const memUsage = process.memoryUsage();
    const memoryPercentage = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);
    
    return {
      business: this.businessMetrics,
      technical: {
        activeUsers: this.realTimeStats.activeUsers.size,
        responseTime: this.getLatestResponseTime(),
        errorRate: this.getErrorRate(),
        uptime: Math.floor(process.uptime() / 3600),
        memoryUsage: memoryPercentage
      },
      health: {
        status: memoryPercentage > 80 ? 'warning' : 'healthy'
      },
      charts: this.generateChartData()
    };
  }

  /**
   * Données pour graphiques
   */
  generateChartData() {
    const last24Hours = Array.from({length: 24}, (_, i) => {
      const hour = new Date();
      hour.setHours(hour.getHours() - (23 - i));
      return hour.getHours() + 'h';
    });

    return {
      consultations: {
        labels: last24Hours,
        data: Array.from({length: 24}, () => Math.floor(Math.random() * 20))
      },
      performance: {
        labels: last24Hours,
        responseTime: Array.from({length: 24}, () => Math.floor(Math.random() * 500 + 100)),
        errorRate: Array.from({length: 24}, () => Math.floor(Math.random() * 5))
      }
    };
  }

  /**
   * Obtenir dernier temps de réponse
   */
  getLatestResponseTime() {
    const recentTimes = this.realTimeStats.responseTimeP95.slice(-1);
    return recentTimes.length > 0 ? recentTimes[0].value : 0;
  }

  /**
   * Calculer taux d'erreur
   */
  getErrorRate() {
    const errors = this.getRecentMetrics('error', 3600000).length;
    const total = this.getRecentMetrics('request', 3600000).length;
    return total > 0 ? Math.round((errors / total) * 100) : 0;
  }

  /**
   * Début de semaine
   */
  getWeekStart() {
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    return monday.toISOString().split('T')[0];
  }

  /**
   * Sauvegarder métriques
   */
  async saveMetricsToFile() {
    try {
      const data = {
        timestamp: new Date().toISOString(),
        businessMetrics: this.businessMetrics,
        realTimeStats: {
          activeUsers: this.realTimeStats.activeUsers.size,
          responseTimeP95: this.realTimeStats.responseTimeP95.slice(-100) // Garder 100 derniers
        }
      };

      await fs.writeFile(
        path.join('logs', 'metrics-snapshot.json'),
        JSON.stringify(data, null, 2)
      );
    } catch (error) {
      console.error('Failed to save metrics:', error);
    }
  }

  /**
   * API endpoint pour métriques JSON
   */
  getMetricsAPI() {
    return (req, res) => {
      const stats = this.getDashboardStats();
      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        data: stats
      });
    };
  }

  /**
   * API endpoint pour dashboard HTML
   */
  getDashboardAPI() {
    return async (req, res) => {
      try {
        const html = await this.generateDashboardHTML();
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
      } catch (error) {
        res.status(500).json({ error: 'Failed to generate dashboard' });
      }
    };
  }
}

// Instance singleton
const metricsDashboard = new MetricsDashboard();

export default metricsDashboard;
