// 📊 Système de Monitoring et Alertes Sécurité
// Monitoring avancé pour détecter les menaces et incidents de sécurité

import * as Sentry from '@sentry/node';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

class SecurityMonitoring {
  constructor() {
    this.setupSentry();
    this.setupLogger();
    this.attackPatterns = this.initializeAttackPatterns();
    this.suspiciousActivities = new Map();
    this.rateLimitViolations = new Map();
  }

  /**
   * Configuration Sentry pour monitoring des erreurs
   */
  setupSentry() {
    if (process.env.SENTRY_DSN) {
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
        integrations: [
          new Sentry.Integrations.Http({ tracing: true }),
          new Sentry.Integrations.Express({ app: express }),
        ],
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        beforeSend(event, hint) {
          // Filtrer les informations sensibles
          if (event.request) {
            delete event.request.headers?.authorization;
            delete event.request.headers?.[('x-api-key')];
          }
          return event;
        }
      });
      
      console.log('📊 Sentry monitoring initialisé');
    } else {
      console.log('⚠️ Sentry DSN non configuré');
    }
  }

  /**
   * Configuration du logger sécurisé
   */
  setupLogger() {
    const logFormat = winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        return JSON.stringify({
          timestamp,
          level,
          message,
          ...meta
        });
      })
    );

    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: logFormat,
      transports: [
        // Console en développement
        ...(process.env.NODE_ENV !== 'production' ? [
          new winston.transports.Console({
            format: winston.format.combine(
              winston.format.colorize(),
              winston.format.simple()
            )
          })
        ] : []),
        
        // Fichiers en production
        new DailyRotateFile({
          filename: 'logs/app-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxFiles: '30d',
          maxSize: '100m'
        }),
        
        // Logs de sécurité séparés
        new DailyRotateFile({
          filename: 'logs/security-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxFiles: '90d', // Garder plus longtemps
          maxSize: '100m',
          level: 'warn' // Seulement warnings et errors
        })
      ]
    });
  }

  /**
   * Patterns d'attaques connus
   */
  initializeAttackPatterns() {
    return {
      sqlInjection: [
        /['"]?\s*;\s*drop\s+table/i,
        /union\s+select/i,
        /1'\s*=\s*'1/i,
        /or\s+1\s*=\s*1/i
      ],
      xss: [
        /<script[^>]*>/i,
        /javascript:/i,
        /on\w+\s*=/i,
        /<iframe[^>]*>/i
      ],
      pathTraversal: [
        /\.\.[\/\\]/,
        /\/etc\/passwd/i,
        /\/windows\/system32/i
      ],
      commandInjection: [
        /;\s*cat\s+/i,
        /\|\s*nc\s+/i,
        /&&\s*curl/i,
        /`.*`/
      ]
    };
  }

  /**
   * Analyse une requête pour détecter des patterns d'attaque
   */
  analyzeRequest(req) {
    const risks = [];
    const payload = JSON.stringify({ 
      body: req.body, 
      query: req.query, 
      params: req.params 
    });

    // Détecter les patterns d'attaque
    for (const [attackType, patterns] of Object.entries(this.attackPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(payload)) {
          risks.push({
            type: attackType,
            pattern: pattern.source,
            severity: this.getAttackSeverity(attackType)
          });
        }
      }
    }

    return risks;
  }

  /**
   * Détermine la sévérité d'une attaque
   */
  getAttackSeverity(attackType) {
    const severityMap = {
      sqlInjection: 'critical',
      commandInjection: 'critical',
      xss: 'high',
      pathTraversal: 'high'
    };
    return severityMap[attackType] || 'medium';
  }

  /**
   * Log un événement de sécurité
   */
  logSecurityEvent(event, details = {}) {
    const securityEvent = {
      type: 'security_event',
      event,
      timestamp: new Date().toISOString(),
      severity: details.severity || 'info',
      ip: details.ip,
      userAgent: details.userAgent,
      userId: details.userId,
      endpoint: details.endpoint,
      method: details.method,
      details: details.extra || {}
    };

    // Log local
    this.logger.warn('🚨 SECURITY EVENT', securityEvent);

    // Sentry pour événements critiques
    if (details.severity === 'critical' || details.severity === 'high') {
      Sentry.addBreadcrumb({
        message: `Security Event: ${event}`,
        level: 'warning',
        data: securityEvent
      });
      
      Sentry.captureMessage(`Security Alert: ${event}`, 'warning');
    }

    return securityEvent;
  }

  /**
   * Middleware de monitoring des requêtes
   */
  requestMonitoring() {
    return (req, res, next) => {
      const startTime = Date.now();
      
      // Analyser la requête
      const risks = this.analyzeRequest(req);
      
      if (risks.length > 0) {
        this.logSecurityEvent('attack_attempt', {
          severity: Math.max(...risks.map(r => r.severity === 'critical' ? 4 : r.severity === 'high' ? 3 : 2)) >= 4 ? 'critical' : 'high',
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          userId: req.headers['x-user-id'],
          endpoint: req.path,
          method: req.method,
          extra: { risks, payload: req.body }
        });
      }

      // Tracker les violations de rate limit
      const originalSend = res.send;
      res.send = function(body) {
        const responseTime = Date.now() - startTime;
        
        // Détecter les violations de rate limit
        if (res.statusCode === 429) {
          securityMonitoring.trackRateLimitViolation(req);
        }
        
        // Log les requêtes lentes (potentiel DoS)
        if (responseTime > 5000) {
          securityMonitoring.logSecurityEvent('slow_request', {
            severity: 'medium',
            ip: req.ip,
            endpoint: req.path,
            responseTime,
            extra: { method: req.method }
          });
        }
        
        originalSend.call(this, body);
      };

      next();
    };
  }

  /**
   * Tracker les violations de rate limit
   */
  trackRateLimitViolation(req) {
    const ip = req.ip;
    const now = Date.now();
    
    if (!this.rateLimitViolations.has(ip)) {
      this.rateLimitViolations.set(ip, []);
    }
    
    const violations = this.rateLimitViolations.get(ip);
    violations.push(now);
    
    // Nettoyer les anciennes violations (> 1 heure)
    const recentViolations = violations.filter(time => now - time < 3600000);
    this.rateLimitViolations.set(ip, recentViolations);
    
    // Alerter si trop de violations
    if (recentViolations.length > 10) {
      this.logSecurityEvent('persistent_rate_limit_violation', {
        severity: 'high',
        ip,
        violationCount: recentViolations.length,
        extra: { endpoint: req.path, userAgent: req.get('User-Agent') }
      });
    }
  }

  /**
   * Analyser les patterns d'activité suspecte
   */
  analyzeSuspiciousActivity(userId, action, metadata = {}) {
    const key = `${userId}:${action}`;
    const now = Date.now();
    
    if (!this.suspiciousActivities.has(key)) {
      this.suspiciousActivities.set(key, []);
    }
    
    const activities = this.suspiciousActivities.get(key);
    activities.push({ timestamp: now, metadata });
    
    // Nettoyer les anciennes activités (> 24h)
    const recentActivities = activities.filter(a => now - a.timestamp < 86400000);
    this.suspiciousActivities.set(key, recentActivities);
    
    // Détecter les patterns suspects
    this.detectSuspiciousPatterns(userId, action, recentActivities);
  }

  /**
   * Détecter les patterns suspects
   */
  detectSuspiciousPatterns(userId, action, activities) {
    const count = activities.length;
    const timeWindow = 3600000; // 1 heure
    const recentCount = activities.filter(a => Date.now() - a.timestamp < timeWindow).length;
    
    // Activité anormalement élevée
    if (action === 'login_attempt' && recentCount > 20) {
      this.logSecurityEvent('suspicious_login_activity', {
        severity: 'high',
        userId,
        attemptCount: recentCount,
        extra: { action, timeWindow: '1h' }
      });
    }
    
    // Tentatives de transcription excessive
    if (action === 'transcribe_audio' && recentCount > 50) {
      this.logSecurityEvent('excessive_transcription_attempts', {
        severity: 'medium',
        userId,
        attemptCount: recentCount,
        extra: { action, timeWindow: '1h' }
      });
    }
    
    // Tests de clé API répétés
    if (action === 'test_api_key' && recentCount > 100) {
      this.logSecurityEvent('api_key_bruteforce', {
        severity: 'critical',
        userId,
        attemptCount: recentCount,
        extra: { action, timeWindow: '1h' }
      });
    }
  }

  /**
   * Générer un rapport de sécurité
   */
  generateSecurityReport() {
    const report = {
      timestamp: new Date().toISOString(),
      rateLimitViolations: this.rateLimitViolations.size,
      suspiciousActivities: this.suspiciousActivities.size,
      topViolatingIPs: this.getTopViolatingIPs(),
      topSuspiciousUsers: this.getTopSuspiciousUsers(),
      recommendations: this.generateRecommendations()
    };
    
    this.logger.info('📊 Security Report Generated', report);
    return report;
  }

  /**
   * IPs avec le plus de violations
   */
  getTopViolatingIPs() {
    return Array.from(this.rateLimitViolations.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 10)
      .map(([ip, violations]) => ({ ip, count: violations.length }));
  }

  /**
   * Utilisateurs avec activité suspecte
   */
  getTopSuspiciousUsers() {
    const userActivity = new Map();
    
    for (const [key, activities] of this.suspiciousActivities.entries()) {
      const [userId] = key.split(':');
      if (!userActivity.has(userId)) {
        userActivity.set(userId, 0);
      }
      userActivity.set(userId, userActivity.get(userId) + activities.length);
    }
    
    return Array.from(userActivity.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([userId, count]) => ({ userId, activityCount: count }));
  }

  /**
   * Recommandations de sécurité
   */
  generateRecommendations() {
    const recommendations = [];
    
    if (this.rateLimitViolations.size > 100) {
      recommendations.push('Considérer un WAF pour filtrer le trafic malveillant');
    }
    
    if (this.suspiciousActivities.size > 50) {
      recommendations.push('Renforcer la surveillance des comptes utilisateurs');
    }
    
    return recommendations;
  }

  /**
   * Nettoyer les données anciennes (à exécuter périodiquement)
   */
  cleanup() {
    const now = Date.now();
    const oneDay = 86400000;
    
    // Nettoyer les violations de rate limit > 24h
    for (const [ip, violations] of this.rateLimitViolations.entries()) {
      const recent = violations.filter(time => now - time < oneDay);
      if (recent.length === 0) {
        this.rateLimitViolations.delete(ip);
      } else {
        this.rateLimitViolations.set(ip, recent);
      }
    }
    
    // Nettoyer les activités suspectes > 24h
    for (const [key, activities] of this.suspiciousActivities.entries()) {
      const recent = activities.filter(a => now - a.timestamp < oneDay);
      if (recent.length === 0) {
        this.suspiciousActivities.delete(key);
      } else {
        this.suspiciousActivities.set(key, recent);
      }
    }
    
    this.logger.info('🧹 Security monitoring data cleaned');
  }
}

// Instance singleton
const securityMonitoring = new SecurityMonitoring();

// Nettoyer toutes les heures
setInterval(() => {
  securityMonitoring.cleanup();
}, 3600000);

// Rapport quotidien
setInterval(() => {
  securityMonitoring.generateSecurityReport();
}, 86400000);

export default securityMonitoring;
