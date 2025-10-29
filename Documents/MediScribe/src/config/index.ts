/**
 * Configuration centralisée de l'application MediScribe
 * Toutes les variables d'environnement sont validées au démarrage
 */

// Types pour la configuration
export interface AppConfig {
  readonly supabase: {
    readonly url: string;
    readonly anonKey: string;
  };
  readonly api: {
    readonly baseUrl: string;
    readonly timeout: number;
    readonly endpoints: {
      readonly transcribe: string;
      readonly generateReport: string;
      readonly testKey: string;
      readonly health: string;
    };
  };
  readonly app: {
    readonly name: string;
    readonly version: string;
    readonly environment: 'development' | 'staging' | 'production';
  };
  readonly security: {
    readonly encryptionKey: string;
  };
  readonly features: {
    readonly enableAnalytics: boolean;
    readonly enableSentry: boolean;
    readonly enableDebugLogs: boolean;
  };
  readonly files: {
    readonly maxAudioFileSize: number;
    readonly allowedAudioMimetypes: readonly string[];
  };
}

/**
 * Récupère une variable d'environnement obligatoire
 * Lance une erreur si la variable n'est pas définie
 */
function getRequiredEnv(key: string): string {
  const value = import.meta.env[key];
  if (!value) {
    throw new Error(
      `❌ Variable d'environnement manquante: ${key}\n` +
      `Veuillez définir cette variable dans votre fichier .env.development ou .env.local\n` +
      `Consultez le fichier env.example pour plus d'informations.`
    );
  }
  return value;
}

/**
 * Récupère une variable d'environnement optionnelle avec valeur par défaut
 */
function getOptionalEnv(key: string, defaultValue: string): string {
  return import.meta.env[key] || defaultValue;
}

/**
 * Récupère une variable d'environnement booléenne
 */
function getBooleanEnv(key: string, defaultValue: boolean): boolean {
  const value = import.meta.env[key];
  if (value === undefined || value === '') return defaultValue;
  return value === 'true' || value === '1';
}

/**
 * Récupère une variable d'environnement numérique
 */
function getNumberEnv(key: string, defaultValue: number): number {
  const value = import.meta.env[key];
  if (value === undefined || value === '') return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`❌ Variable d'environnement ${key} doit être un nombre valide`);
  }
  return parsed;
}

/**
 * Valide la clé de cryptage
 */
function validateEncryptionKey(key: string): void {
  if (key.length < 32) {
    throw new Error(
      `❌ La clé de cryptage (VITE_ENCRYPTION_KEY) doit contenir au moins 32 caractères pour la sécurité AES-256.\n` +
      `Longueur actuelle: ${key.length} caractères`
    );
  }
}

/**
 * Valide l'URL de l'API
 */
function validateApiUrl(url: string): void {
  try {
    new URL(url);
  } catch {
    throw new Error(
      `❌ URL de l'API invalide (VITE_API_URL): ${url}\n` +
      `L'URL doit être au format: http://localhost:3001 ou https://api.example.com`
    );
  }
}

/**
 * Configuration de l'application
 * Toutes les valeurs sont readonly pour l'immutabilité
 */
const config: AppConfig = {
  supabase: {
    url: getRequiredEnv('VITE_SUPABASE_URL'),
    anonKey: getRequiredEnv('VITE_SUPABASE_ANON_KEY'),
  },
  api: {
    baseUrl: (() => {
      const url = getRequiredEnv('VITE_API_URL');
      validateApiUrl(url);
      return url;
    })(),
    timeout: getNumberEnv('VITE_API_TIMEOUT', 30000),
    endpoints: {
      transcribe: '/api/transcribe',
      generateReport: '/api/generate-report',
      testKey: '/api/test-key',
      health: '/api/health',
    } as const,
  },
  app: {
    name: getOptionalEnv('VITE_APP_NAME', 'MediScribe'),
    version: getOptionalEnv('VITE_APP_VERSION', '1.0.0'),
    environment: getOptionalEnv('VITE_APP_ENV', 'development') as AppConfig['app']['environment'],
  },
  security: {
    encryptionKey: (() => {
      const key = getRequiredEnv('VITE_ENCRYPTION_KEY');
      validateEncryptionKey(key);
      return key;
    })(),
  },
  features: {
    enableAnalytics: getBooleanEnv('VITE_ENABLE_ANALYTICS', false),
    enableSentry: getBooleanEnv('VITE_ENABLE_SENTRY', false),
    enableDebugLogs: getBooleanEnv('VITE_ENABLE_DEBUG_LOGS', true),
  },
  files: {
    maxAudioFileSize: getNumberEnv('VITE_MAX_AUDIO_FILE_SIZE', 26214400), // 25MB par défaut
    allowedAudioMimetypes: Object.freeze(
      getOptionalEnv('VITE_ALLOWED_AUDIO_MIMETYPES', 'audio/mpeg,audio/wav,audio/webm,audio/m4a')
        .split(',')
        .map(type => type.trim())
    ),
  },
};

// Freeze l'objet de configuration pour l'immutabilité complète
Object.freeze(config);
Object.freeze(config.supabase);
Object.freeze(config.api);
Object.freeze(config.api.endpoints);
Object.freeze(config.app);
Object.freeze(config.security);
Object.freeze(config.features);
Object.freeze(config.files);

/**
 * Logger temporaire pour la configuration (avant Winston)
 * Winston sera importé après pour éviter les dépendances circulaires
 */
const configLogger = {
  info: (message: string, data?: any) => {
    if (config.app.environment === 'development') {
      console.log(`[CONFIG] ${message}`, data || '');
    }
  },
};

// Log de la configuration au démarrage (uniquement en développement)
if (config.app.environment === 'development' && config.features.enableDebugLogs) {
  configLogger.info('Configuration chargée', {
    environment: config.app.environment,
    apiUrl: config.api.baseUrl,
    features: config.features,
  });
}

// Note: Le logger principal (Winston) est exporté depuis src/lib/winstonLogger.ts
// Import: import { logger } from '@/lib/winstonLogger';

export default config;
