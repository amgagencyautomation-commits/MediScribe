import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import config from '@/config';

/**
 * Champs sensibles à masquer dans les logs
 */
const SENSITIVE_FIELDS = [
  'password',
  'apiKey',
  'api_key',
  'token',
  'secret',
  'authorization',
  'encrypted_key',
  'patient_name',
  'patientName',
  'full_name',
  'fullName',
  'email',
  'phone',
  'address',
  'ssn',
  'medical_record',
];

/**
 * Sanitize les données pour le logging en masquant les champs sensibles
 * @param data - Données à sanitizer
 * @returns Données sanitizées
 */
export function sanitizeForLogging(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeForLogging(item));
  }

  const sanitized: any = {};
  
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    
    // Vérifier si le champ est sensible
    const isSensitive = SENSITIVE_FIELDS.some(field => 
      lowerKey.includes(field.toLowerCase())
    );

    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeForLogging(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Format personnalisé pour les logs
 */
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'label'] }),
  winston.format.json()
);

/**
 * Format pour la console (développement)
 */
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    
    if (metadata && Object.keys(metadata).length > 0) {
      msg += `\n${JSON.stringify(sanitizeForLogging(metadata), null, 2)}`;
    }
    
    return msg;
  })
);

/**
 * Transport pour les erreurs uniquement
 */
const errorFileTransport = new DailyRotateFile({
  filename: 'logs/error-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  level: 'error',
  maxSize: '20m',
  maxFiles: '14d', // Garder 14 jours d'historique
  format: customFormat,
});

/**
 * Transport pour tous les logs
 */
const combinedFileTransport = new DailyRotateFile({
  filename: 'logs/combined-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
  format: customFormat,
});

/**
 * Transport console (uniquement en développement)
 */
const consoleTransport = new winston.transports.Console({
  format: consoleFormat,
});

/**
 * Créer le logger Winston
 */
const winstonLogger = winston.createLogger({
  level: config.features.enableDebugLogs ? 'debug' : 'info',
  format: customFormat,
  transports: [
    errorFileTransport,
    combinedFileTransport,
  ],
  // Ne pas quitter sur erreur
  exitOnError: false,
});

// Ajouter console transport uniquement en développement
if (config.app.environment === 'development') {
  winstonLogger.add(consoleTransport);
}

/**
 * Interface pour le logger avec méthodes typées
 */
export interface Logger {
  debug(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, error?: Error | any, meta?: any): void;
}

/**
 * Wrapper du logger Winston avec sanitization automatique
 */
export const logger: Logger = {
  /**
   * Log de niveau debug (uniquement en développement)
   */
  debug(message: string, meta?: any): void {
    winstonLogger.debug(message, { metadata: sanitizeForLogging(meta) });
  },

  /**
   * Log de niveau info (événements importants)
   */
  info(message: string, meta?: any): void {
    winstonLogger.info(message, { metadata: sanitizeForLogging(meta) });
  },

  /**
   * Log de niveau warning (situations anormales non critiques)
   */
  warn(message: string, meta?: any): void {
    winstonLogger.warn(message, { metadata: sanitizeForLogging(meta) });
  },

  /**
   * Log de niveau error (erreurs critiques)
   */
  error(message: string, error?: Error | any, meta?: any): void {
    const errorData: any = {
      metadata: sanitizeForLogging(meta),
    };

    if (error instanceof Error) {
      errorData.error = {
        message: error.message,
        stack: error.stack,
        name: error.name,
      };
    } else if (error) {
      errorData.error = sanitizeForLogging(error);
    }

    winstonLogger.error(message, errorData);
  },
};

/**
 * Logger pour les événements système
 */
export const systemLogger = {
  startup(meta?: any): void {
    logger.info('Application démarrée', {
      ...meta,
      environment: config.app.environment,
      version: config.app.version,
    });
  },

  shutdown(meta?: any): void {
    logger.info('Application arrêtée', meta);
  },

  configLoaded(meta?: any): void {
    logger.debug('Configuration chargée', meta);
  },
};

/**
 * Logger pour les événements utilisateur
 */
export const userLogger = {
  login(userId: string, meta?: any): void {
    logger.info('Utilisateur connecté', { userId, ...meta });
  },

  logout(userId: string, meta?: any): void {
    logger.info('Utilisateur déconnecté', { userId, ...meta });
  },

  signup(userId: string, meta?: any): void {
    logger.info('Nouvel utilisateur inscrit', { userId, ...meta });
  },

  apiKeyConfigured(userId: string, keyType: string): void {
    logger.info('Clé API configurée', { userId, keyType });
  },
};

/**
 * Logger pour les événements API
 */
export const apiLogger = {
  request(method: string, url: string, meta?: any): void {
    logger.debug('Requête API', { method, url, ...meta });
  },

  response(method: string, url: string, status: number, duration: number): void {
    logger.debug('Réponse API', { method, url, status, duration: `${duration}ms` });
  },

  error(method: string, url: string, error: Error, meta?: any): void {
    logger.error('Erreur API', error, { method, url, ...meta });
  },

  transcription(userId: string, duration: number, textLength: number): void {
    logger.info('Transcription effectuée', { userId, duration: `${duration}ms`, textLength });
  },

  reportGeneration(userId: string, duration: number, reportLength: number, tokensUsed?: number): void {
    logger.info('Rapport généré', { 
      userId, 
      duration: `${duration}ms`, 
      reportLength,
      tokensUsed 
    });
  },
};

/**
 * Logger pour les événements de sécurité
 */
export const securityLogger = {
  invalidApiKey(userId: string, keyType: string): void {
    logger.warn('Tentative avec clé API invalide', { userId, keyType });
  },

  rateLimitExceeded(userId: string, endpoint: string): void {
    logger.warn('Rate limit dépassé', { userId, endpoint });
  },

  unauthorizedAccess(userId?: string, resource?: string): void {
    logger.warn('Accès non autorisé', { userId, resource });
  },

  suspiciousActivity(userId: string, activity: string, meta?: any): void {
    logger.warn('Activité suspecte détectée', { userId, activity, ...meta });
  },
};

// Export du logger Winston brut pour cas spéciaux
export { winstonLogger };

// Log de démarrage
if (config.app.environment === 'development') {
  logger.info('Logger Winston initialisé', {
    level: config.features.enableDebugLogs ? 'debug' : 'info',
    environment: config.app.environment,
  });
}
