// 📊 Système de Logs Structurés Avancé
// Winston avec rotation, niveaux, et intégrations monitoring

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';

class AdvancedLogger {
  constructor() {
    this.setupDirectories();
    this.logger = this.createLogger();
    this.metricsBuffer = [];
    this.alertThresholds = this.initializeAlertThresholds();
  }

  /**
   * Créer les répertoires de logs
   */
  setupDirectories() {
    const logDirs = ['logs', 'logs/app', 'logs/security', 'logs/business', 'logs/performance'];
    logDirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Configuration du logger principal
   */
  createLogger() {
    const logFormat = winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss.SSS'
      }),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf(({ timestamp, level, message, service, userId, action, duration, ...meta }) => {
        const logEntry = {
          '@timestamp': timestamp,
          level,
          message,
          service: service || 'mediscribe-api',
          environment: process.env.NODE_ENV || 'development',
          ...(userId && { userId }),
          ...(action && { action }),
          ...(duration && { duration }),
          ...meta
        };
        return JSON.stringify(logEntry);
      })
    );

    const transports = [
      // Console en développement
      ...(process.env.NODE_ENV !== 'production' ? [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, action, userId }) => {
              const userInfo = userId ? ` [${userId.substring(0, 8)}]` : '';
              const actionInfo = action ? ` (${action})` : '';
              return `${timestamp} ${level}${userInfo}${actionInfo}: ${message}`;
            })
          )
        })
      ] : []),

      // Logs généraux avec rotation
      new DailyRotateFile({
        filename: 'logs/app/application-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxFiles: '30d',
        maxSize: '100m',
        format: logFormat
      }),

      // Logs d'erreurs séparés
      new DailyRotateFile({
        filename: 'logs/app/errors-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        maxFiles: '90d',
        maxSize: '100m',
        format: logFormat
      }),

      // Logs de sécurité
      new DailyRotateFile({
        filename: 'logs/security/security-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxFiles: '365d', // Garder 1 an pour conformité
        maxSize: '100m',
        format: logFormat
      }),

      // Logs business (métriques)
      new DailyRotateFile({
        filename: 'logs/business/metrics-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxFiles: '90d',
        maxSize: '50m',
        format: logFormat
      }),

      // Logs performance
      new DailyRotateFile({
        filename: 'logs/performance/performance-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxFiles: '30d',
        maxSize: '50m',
        format: logFormat
      })
    ];

    return winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: logFormat,
      transports,
      exceptionHandlers: [
        new DailyRotateFile({
          filename: 'logs/app/exceptions-%DATE%.log',
          datePattern: 'YYYY-MM-DD'
        })
      ],
      rejectionHandlers: [
        new DailyRotateFile({
          filename: 'logs/app/rejections-%DATE%.log',
          datePattern: 'YYYY-MM-DD'
        })
      ]
    });
  }

  /**
   * Seuils d'alerte
   */
  initializeAlertThresholds() {
    return {
      errorRate: 10, // 10 erreurs/minute
      responseTime: 5000, // 5 secondes
      memoryUsage: 80, // 80% RAM
      diskSpace: 90, // 90% disque
      transcriptionFailures: 5 // 5 échecs/heure
    };
  }

  /**
   * Log application standard
   */
  info(message, meta = {}) {
    this.logger.info(message, meta);
  }

  warn(message, meta = {}) {
    this.logger.warn(message, meta);
    this.checkAlertConditions('warn', message, meta);
  }

  error(message, meta = {}) {
    this.logger.error(message, meta);
    this.checkAlertConditions('error', message, meta);
  }

  debug(message, meta = {}) {
    this.logger.debug(message, meta);
  }

  /**
   * Log de sécurité spécialisé
   */
  security(action, details = {}) {
    const securityLog = {
      level: 'warn',
      message: `Security Event: ${action}`,
      action,
      category: 'security',
      severity: details.severity || 'medium',
      ip: details.ip,
      userId: details.userId,
      userAgent: details.userAgent,
      endpoint: details.endpoint,
      details: details.extra || {}
    };

    this.logger.warn(securityLog.message, securityLog);
    
    // Alertes critiques immédiates
    if (details.severity === 'critical') {
      this.sendAlert('security', securityLog);
    }
  }

  /**
   * Métriques business
   */
  business(event, metrics = {}) {
    const businessLog = {
      level: 'info',
      message: `Business Event: ${event}`,
      category: 'business',
      event,
      metrics,
      timestamp: new Date().toISOString()
    };

    this.logger.info(businessLog.message, businessLog);
    this.updateBusinessMetrics(event, metrics);
  }

  /**
   * Métriques de performance
   */
  performance(operation, duration, details = {}) {
    const perfLog = {
      level: duration > this.alertThresholds.responseTime ? 'warn' : 'info',
      message: `Performance: ${operation} took ${duration}ms`,
      category: 'performance',
      operation,
      duration,
      ...details
    };

    this.logger.info(perfLog.message, perfLog);

    // Alerte si trop lent
    if (duration > this.alertThresholds.responseTime) {
      this.sendAlert('performance', perfLog);
    }
  }

  /**
   * Middleware Express pour logging automatique
   */
  requestMiddleware() {
    return (req, res, next) => {
      const startTime = Date.now();
      const originalSend = res.send;

      // Capturer les détails de la requête
      const requestInfo = {
        method: req.method,
        url: req.url,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        userId: req.headers['x-user-id'],
        contentLength: req.get('Content-Length') || 0
      };

      res.send = function(body) {
        const duration = Date.now() - startTime;
        const responseSize = Buffer.isBuffer(body) ? body.length : 
                           typeof body === 'string' ? Buffer.byteLength(body) : 
                           JSON.stringify(body).length;

        // Log de la requête
        const logData = {
          ...requestInfo,
          statusCode: res.statusCode,
          duration,
          responseSize,
          action: req.url.split('/').pop()
        };

        if (res.statusCode >= 400) {
          advancedLogger.error(`HTTP ${res.statusCode}: ${req.method} ${req.url}`, logData);
        } else {
          advancedLogger.info(`HTTP ${res.statusCode}: ${req.method} ${req.url}`, logData);
        }

        // Métriques de performance
        advancedLogger.performance(`${req.method} ${req.url}`, duration, {
          statusCode: res.statusCode,
          responseSize
        });

        originalSend.call(this, body);
      };

      next();
    };
  }

  /**
   * Métriques en temps réel
   */
  updateBusinessMetrics(event, metrics) {
    const timestamp = new Date();
    this.metricsBuffer.push({
      timestamp,
      event,
      ...metrics
    });

    // Garder seulement les métriques des dernières 24h
    const oneDayAgo = new Date(timestamp.getTime() - 24 * 60 * 60 * 1000);
    this.metricsBuffer = this.metricsBuffer.filter(m => m.timestamp > oneDayAgo);
  }

  /**
   * Générer dashboard métriques
   */
  generateDashboard() {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const recentMetrics = this.metricsBuffer.filter(m => m.timestamp > oneHourAgo);
    const dailyMetrics = this.metricsBuffer.filter(m => m.timestamp > oneDayAgo);

    const dashboard = {
      timestamp: now.toISOString(),
      period: {
        lastHour: this.analyzeMetrics(recentMetrics),
        last24Hours: this.analyzeMetrics(dailyMetrics)
      },
      alerts: this.getActiveAlerts(),
      systemHealth: this.getSystemHealth()
    };

    this.business('dashboard_generated', dashboard);
    return dashboard;
  }

  /**
   * Analyser les métriques
   */
  analyzeMetrics(metrics) {
    const events = metrics.reduce((acc, m) => {
      acc[m.event] = (acc[m.event] || 0) + 1;
      return acc;
    }, {});

    return {
      totalEvents: metrics.length,
      eventBreakdown: events,
      transcriptions: events.transcription_completed || 0,
      reports: events.report_generated || 0,
      errors: events.error_occurred || 0,
      loginAttempts: events.user_login || 0
    };
  }

  /**
   * Vérifier conditions d'alerte
   */
  checkAlertConditions(level, message, meta) {
    // Compter erreurs récentes
    if (level === 'error') {
      const recentErrors = this.metricsBuffer.filter(m => 
        m.event === 'error_occurred' && 
        new Date() - m.timestamp < 60000 // 1 minute
      ).length;

      if (recentErrors >= this.alertThresholds.errorRate) {
        this.sendAlert('error_rate', {
          level: 'critical',
          message: `High error rate: ${recentErrors} errors in 1 minute`,
          threshold: this.alertThresholds.errorRate,
          current: recentErrors
        });
      }
    }
  }

  /**
   * Envoyer alertes (email/Slack)
   */
  async sendAlert(type, data) {
    const alert = {
      type,
      severity: data.severity || 'high',
      message: data.message,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      service: 'mediscribe-api',
      data
    };

    // Log l'alerte
    this.error(`ALERT [${type.toUpperCase()}]: ${data.message}`, alert);

    // Envoyer vers Slack si configuré
    if (process.env.SLACK_WEBHOOK_URL) {
      await this.sendSlackAlert(alert);
    }

    // Envoyer email si configuré
    if (process.env.ALERT_EMAIL) {
      await this.sendEmailAlert(alert);
    }

    // Envoyer vers Sentry
    if (process.env.SENTRY_DSN) {
      const Sentry = await import('@sentry/node');
      Sentry.captureMessage(`Alert: ${alert.message}`, 'error');
    }
  }

  /**
   * Alerte Slack
   */
  async sendSlackAlert(alert) {
    try {
      const color = alert.severity === 'critical' ? '#ff0000' : 
                   alert.severity === 'high' ? '#ff8800' : '#ffaa00';

      const payload = {
        text: `🚨 MediScribe Alert: ${alert.type}`,
        attachments: [{
          color,
          fields: [
            { title: 'Severity', value: alert.severity, short: true },
            { title: 'Environment', value: alert.environment, short: true },
            { title: 'Message', value: alert.message, short: false },
            { title: 'Time', value: alert.timestamp, short: true }
          ]
        }]
      };

      const response = await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Slack webhook failed: ${response.status}`);
      }
    } catch (error) {
      // Ne pas créer une boucle d'erreurs
      console.error('Failed to send Slack alert:', error);
    }
  }

  /**
   * Alerte Email (peut être étendu avec SendGrid, SES, etc.)
   */
  async sendEmailAlert(alert) {
    // Placeholder pour intégration email
    // En production, utiliser SendGrid, AWS SES, ou autre service
    console.log(`📧 Email alert would be sent to: ${process.env.ALERT_EMAIL}`);
    console.log(`Subject: [${alert.severity.toUpperCase()}] MediScribe Alert: ${alert.type}`);
    console.log(`Body: ${alert.message}`);
  }

  /**
   * Santé du système
   */
  getSystemHealth() {
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();

    return {
      uptime: Math.floor(uptime),
      memory: {
        used: Math.round(memUsage.heapUsed / 1024 / 1024),
        total: Math.round(memUsage.heapTotal / 1024 / 1024),
        percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
      },
      pid: process.pid,
      nodeVersion: process.version,
      platform: process.platform
    };
  }

  /**
   * Alertes actives
   */
  getActiveAlerts() {
    // Retourner les alertes des dernières 24h
    // En production, stocker dans une base de données
    return [];
  }

  /**
   * Cleanup à l'arrêt
   */
  async shutdown() {
    return new Promise((resolve) => {
      this.logger.on('finish', resolve);
      this.logger.end();
    });
  }
}

// Instance singleton
const advancedLogger = new AdvancedLogger();

// Auto-générer dashboard toutes les heures
setInterval(() => {
  advancedLogger.generateDashboard();
}, 3600000);

export default advancedLogger;
