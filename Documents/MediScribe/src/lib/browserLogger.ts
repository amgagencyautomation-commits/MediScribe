/**
 * Logger léger pour le browser
 * Remplace Winston qui est conçu pour Node.js
 */

import config from '@/config';

const isDev = config.app.environment === 'development';
const enableDebug = config.features.enableDebugLogs;

/**
 * Logger principal pour le browser
 */
export const logger = {
  debug: (message: string, meta?: any) => {
    if (isDev && enableDebug) {
      console.log(`[DEBUG] ${message}`, meta || '');
    }
  },

  info: (message: string, meta?: any) => {
    if (isDev) {
      console.info(`[INFO] ${message}`, meta || '');
    }
  },

  warn: (message: string, meta?: any) => {
    console.warn(`[WARN] ${message}`, meta || '');
  },

  error: (message: string, error?: Error | any, meta?: any) => {
    console.error(`[ERROR] ${message}`, error, meta || '');
  },
};

/**
 * Logger système
 */
export const systemLogger = {
  startup: (meta?: any) => {
    logger.info('Application démarrée', meta);
  },

  shutdown: (meta?: any) => {
    logger.info('Application arrêtée', meta);
  },

  configLoaded: (meta?: any) => {
    logger.debug('Configuration chargée', meta);
  },
};

/**
 * Logger utilisateur
 */
export const userLogger = {
  login: (userId: string, meta?: any) => {
    logger.info('Utilisateur connecté', { userId, ...meta });
  },

  logout: (userId: string, meta?: any) => {
    logger.info('Utilisateur déconnecté', { userId, ...meta });
  },

  signup: (userId: string, meta?: any) => {
    logger.info('Nouvel utilisateur inscrit', { userId, ...meta });
  },

  apiKeyConfigured: (userId: string, keyType: string) => {
    logger.info('Clé API configurée', { userId, keyType });
  },
};

/**
 * Logger API
 */
export const apiLogger = {
  request: (method: string, url: string, meta?: any) => {
    logger.debug('Requête API', { method, url, ...meta });
  },

  response: (method: string, url: string, status: number, duration: number) => {
    logger.debug('Réponse API', { method, url, status, duration: `${duration}ms` });
  },

  error: (method: string, url: string, error: Error, meta?: any) => {
    logger.error('Erreur API', error, { method, url, ...meta });
  },

  transcription: (userId: string, duration: number, textLength: number) => {
    logger.info('Transcription effectuée', { userId, duration: `${duration}ms`, textLength });
  },

  reportGeneration: (userId: string, duration: number, reportLength: number, tokensUsed?: number) => {
    logger.info('Rapport généré', { 
      userId, 
      duration: `${duration}ms`, 
      reportLength,
      tokensUsed 
    });
  },
};

/**
 * Logger sécurité
 */
export const securityLogger = {
  invalidApiKey: (userId: string, keyType: string) => {
    logger.warn('Tentative avec clé API invalide', { userId, keyType });
  },

  rateLimitExceeded: (userId: string, endpoint: string) => {
    logger.warn('Rate limit dépassé', { userId, endpoint });
  },

  unauthorizedAccess: (userId?: string, resource?: string) => {
    logger.warn('Accès non autorisé', { userId, resource });
  },

  suspiciousActivity: (userId: string, activity: string, meta?: any) => {
    logger.warn('Activité suspecte détectée', { userId, activity, ...meta });
  },
};
