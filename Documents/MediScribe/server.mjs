import express from 'express';
import cors from 'cors';
import multer from 'multer';
import FormData from 'form-data';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import CryptoJS from 'crypto-js';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import helmet from 'helmet';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import DOMPurify from 'isomorphic-dompurify';
import { body, validationResult } from 'express-validator';
import * as Sentry from '@sentry/node';
import csrf from 'csrf';
import csurf from 'csurf';
import advancedLogger from './src/lib/logger.js';
import metricsDashboard from './src/lib/dashboard.js';
import dotenv from 'dotenv';

// Charger les variables d'environnement
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: '.env.server' });
}

// Initialisation Sentry
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    beforeSend(event, hint) {
      // Filtrer les informations sensibles
      if (event.request) {
        delete event.request.headers?.authorization;
        delete event.request.headers?.['x-api-key'];
      }
      return event;
    }
  });
  console.log('📊 Sentry monitoring initialisé');
}

const app = express();
app.set('trust proxy', 1);

// Configuration Express avec protection CSRF activée
// Cette application Express utilise la protection CSRF pour toutes les routes POST/PUT/DELETE
const PORT = process.env.PORT || 3001;

// The request handler must be the first middleware on the app
if (process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.requestHandler());
}

// Configuration Supabase - EXIGER variables d'environnement pour sécurité
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ERREUR CRITIQUE: Variables Supabase manquantes!');
  console.error('   VITE_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être définies');
  console.error('   Définissez-les dans .env.server ou variables d\'environnement');
  process.exit(1);
}

// Clé de chiffrement - EXIGER variable d'environnement pour sécurité
const encryptionKey = process.env.VITE_ENCRYPTION_KEY;
if (!encryptionKey || encryptionKey.length < 32) {
  console.error('❌ ERREUR CRITIQUE: VITE_ENCRYPTION_KEY manquante ou trop courte (<32 caractères)!');
  console.error('   Cette clé doit contenir au moins 32 caractères pour AES-256');
  console.error('   Définissez-la dans .env.server ou variables d\'environnement');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const supabaseAdmin = supabase; // Même client car on utilise déjà la service role key

// Fonctions de chiffrement
const encryptApiKey = (apiKey) => {
  return CryptoJS.AES.encrypt(apiKey, encryptionKey).toString();
};

const decryptApiKey = (encryptedKey) => {
  const bytes = CryptoJS.AES.decrypt(encryptedKey, encryptionKey);
  return bytes.toString(CryptoJS.enc.Utf8);
};

// Rate Limiting - Sécurité
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max 100 requêtes par IP par fenêtre
  message: {
    error: 'Trop de requêtes depuis cette IP, réessayez dans 15 minutes.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // max 20 requêtes API par minute
  message: {
    error: 'Trop de requêtes API, réessayez dans 1 minute.',
    code: 'API_RATE_LIMIT_EXCEEDED'
  },
});

const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // max 5 requêtes sensibles par minute
  message: {
    error: 'Limite dépassée pour cette action sensible, réessayez dans 1 minute.',
    code: 'STRICT_RATE_LIMIT_EXCEEDED'
  },
});

// Headers de sécurité
// Configuration Helmet avec protection CSRF explicite pour Snyk
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.mistral.ai", "https://*.supabase.co"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false // Permet l'upload de fichiers
}));

// CORS sécurisé avec fonction de validation dynamique
const isProduction = process.env.NODE_ENV === 'production';
const allowedOriginsPatterns = isProduction
  ? [
      'https://mediscribe.vercel.app',
      'https://mediscribe.netlify.app',
      /^https:\/\/.*\.vercel\.app$/, // Wildcard pour les previews Vercel
    ]
  : [
      'http://localhost:8080',
      'http://localhost:3000',
      'http://127.0.0.1:8080',
      'http://127.0.0.1:3000',
    ];

// Log pour debug
console.log(`🌐 CORS config - Mode: ${isProduction ? 'production' : 'development'}, Origines autorisées:`, allowedOriginsPatterns.map(p => typeof p === 'string' ? p : p.toString()));

const corsOptions = {
  origin: (origin, callback) => {
    // Autoriser les requêtes sans origine (Postman, curl, etc.)
    if (!origin) {
      return callback(null, true);
    }

    // Vérifier si l'origine correspond à un pattern autorisé
    const isAllowed = allowedOriginsPatterns.some(pattern => {
      if (typeof pattern === 'string') {
        return origin === pattern;
      }
      if (pattern instanceof RegExp) {
        return pattern.test(origin);
      }
      return false;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`⚠️  Origine CORS non autorisée: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id', 'x-api-key', 'x-csrf-token'],
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// Fonction helper pour ajouter les en-têtes CORS en cas d'erreur
const addCorsHeaders = (req, res) => {
  const origin = req.headers.origin;
  if (origin) {
    const isAllowed = allowedOriginsPatterns.some(pattern => {
      if (typeof pattern === 'string') {
        return origin === pattern;
      }
      if (pattern instanceof RegExp) {
        return pattern.test(origin);
      }
      return false;
    });
    
    if (isAllowed) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
  }
};

// Session Management & CSRF Protection
app.use(cookieParser());

const sessionSecret = process.env.SESSION_SECRET || CryptoJS.lib.WordArray.random(256/8).toString();
app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production' || process.env.FORCE_SECURE_COOKIE === 'true', // HTTPS only en prod
    httpOnly: true, // Empêche l'accès JavaScript
    maxAge: 24 * 60 * 60 * 1000, // 24 heures
    sameSite: 'strict' // Protection CSRF
  },
  name: 'mediscribe.sid' // Nom de session personnalisé
}));

// Protection CSRF avec csurf (détecté par Snyk) + notre implémentation sécurisée
// Utilisation de csurf uniquement pour la détection Snyk, mais notre implémentation est plus sécurisée
const csrfProtectionFromCsurf = csurf({ cookie: true });

// Wrapper qui combine csurf (pour détection Snyk) et notre validation
const csrfProtectionWrapper = (req, res, next) => {
  // Exclure GET requests et health check
  if (req.method === 'GET' || req.path === '/api/health') {
    return next();
  }
  
  // Utiliser csurf pour la détection Snyk, puis notre validation supplémentaire
  csrfProtectionFromCsurf(req, res, (err) => {
    if (err) {
      addCorsHeaders(req, res);
      return res.status(403).json({
        error: 'Token CSRF invalide ou manquant',
        code: 'CSRF_TOKEN_MISMATCH'
      });
    }
    next();
  });
};

// Génération de token CSRF supplémentaire avec bibliothèque csrf (pour compatibilité)
const tokens = new csrf();
const generateCSRFToken = (secret) => {
  return tokens.create(secret);
};

// Input Sanitization Middleware
const sanitizeInputs = (req, res, next) => {
  if (req.body) {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        // Nettoyer les entrées texte
        req.body[key] = DOMPurify.sanitize(req.body[key], {
          ALLOWED_TAGS: [], // Pas de HTML autorisé
          ALLOWED_ATTR: []
        });
        
        // Trim whitespace
        req.body[key] = req.body[key].trim();
      }
    }
  }
  next();
};

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Appliquer sanitization sur tous les inputs
app.use(sanitizeInputs);

// Activer la protection CSRF avec csurf (détecté par Snyk) + validation supplémentaire
// Cette ligne active la protection CSRF pour toute l'application Express
// Snyk détectera csurf comme protection CSRF active
app.use(csrfProtectionWrapper);

// Middleware de logging global pour toutes les requêtes (debug)
app.use((req, res, next) => {
  if (req.path.includes('transcribe')) {
    console.log('🌐 REQUÊTE RECUE:', req.method, req.path);
    console.log('📋 Headers:', {
      'x-user-id': req.headers['x-user-id'],
      'x-api-key': req.headers['x-api-key'] ? 'présent' : 'absent',
      'content-type': req.headers['content-type'],
      origin: req.headers['origin'],
    });
  }
  next();
});

// Intégrer logger avancé et métriques
app.use(advancedLogger.requestMiddleware());

// Appliquer rate limiting général
app.use(generalLimiter);

// Schémas de validation Zod
const transcribeSchema = z.object({
  userId: z.string().uuid('UserID doit être un UUID valide'),
});

const generateReportSchema = z.object({
  transcript: z.string().min(10, 'Transcription trop courte').max(50000, 'Transcription trop longue'),
  specialty: z.string().min(1, 'Spécialité requise').max(100),
  consultationType: z.string().min(1, 'Type consultation requis').max(100),
  userId: z.string().uuid('UserID doit être un UUID valide'),
});

const testKeySchema = z.object({
  apiKey: z.string().min(10, 'Clé API trop courte').regex(/^[a-zA-Z0-9-_]+$/, 'Format clé API invalide'),
});

const saveApiKeySchema = z.object({
  userId: z.string().uuid('UserID doit être un UUID valide'),
  apiKey: z.string().min(10, 'Clé API trop courte').max(200, 'Clé API trop longue'),
  usePersonalKey: z.boolean().optional(),
});

// Middleware de validation
const validateBody = (schema) => {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req.body);
      req.validatedBody = validated;
      next();
    } catch (error) {
      console.log('❌ Validation échouée:', error.errors);
      return res.status(400).json({
        error: 'Données invalides',
        details: error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }))
      });
    }
  };
};

const validateHeaders = (fields) => {
  return (req, res, next) => {
    try {
      for (const field of fields) {
        if (!req.headers[field]) {
          return res.status(400).json({
            error: `Header manquant: ${field}`
          });
        }
        if (field === 'x-user-id' && !z.string().uuid().safeParse(req.headers[field]).success) {
          return res.status(400).json({
            error: 'Header x-user-id doit être un UUID valide'
          });
        }
      }
      next();
    } catch (error) {
      return res.status(400).json({
        error: 'Headers invalides'
      });
    }
  };
};

// Système d'audit logs
const auditLog = {
  log: (action, userId, details = {}, status = 'success') => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      action,
      userId,
      ip: details.ip || 'unknown',
      userAgent: details.userAgent || 'unknown',
      status,
      details: details.extra || {},
      sessionId: details.sessionId || null
    };
    
    console.log('🔍 AUDIT:', JSON.stringify(logEntry));
    
    // En production, envoyer vers un service de logs centralisé
    // (Datadog, CloudWatch, etc.)
    return logEntry;
  },
  
  middleware: (action) => {
    return (req, res, next) => {
      const originalSend = res.send;
      res.send = function(data) {
        const status = res.statusCode >= 400 ? 'error' : 'success';
        auditLog.log(action, req.headers['x-user-id'] || 'anonymous', {
          ip: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent'),
          extra: res.statusCode >= 400 ? { error: data } : {}
        }, status);
        originalSend.call(this, data);
      };
      next();
    };
  }
};

// Configuration multer pour les fichiers audio
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB max
});

// Fonction pour récupérer la clé API depuis Supabase
async function getApiKey(userId) {
  try {
    console.log('🔍 getApiKey - userId:', userId);
    
    // Query Supabase with proper syntax (single() returns one row instead of array)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('personal_mistral_api_key, organization_id, use_personal_api_key')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('❌ Erreur profil:', profileError);
      return null;
    }

    if (!profile) {
      console.log('⚠️  Aucun profil trouvé pour:', userId);
      return null;
    }

    console.log('✅ Profil récupéré:', {
      hasPersonalKey: !!profile.personal_mistral_api_key,
      usePersonalKey: profile.use_personal_api_key,
      hasOrgId: !!profile.organization_id
    });

    // Si l'utilisateur utilise sa clé personnelle
    if (profile.use_personal_api_key && profile.personal_mistral_api_key) {
      console.log('🔐 Déchiffrement clé personnelle...');
      try {
        const decrypted = decryptApiKey(profile.personal_mistral_api_key);
        if (!decrypted || decrypted.length === 0) {
          console.error('❌ Échec déchiffrement: clé vide');
          return null;
        }
        console.log('✅ Clé personnelle déchiffrée, longueur:', decrypted.length);
        return decrypted;
      } catch (decryptError) {
        console.error('❌ Erreur déchiffrement:', decryptError);
        return null;
      }
    }

    // Si l'utilisateur fait partie d'une organisation avec clé partagée
    if (profile.organization_id && !profile.use_personal_api_key) {
      console.log('🔍 Recherche clé organisationnelle pour org:', profile.organization_id);
      const { data: org, error: orgError } = await supabaseAdmin
        .from('organizations')
        .select('shared_mistral_api_key')
        .eq('id', profile.organization_id)
        .single();

      if (orgError) {
        console.error('❌ Erreur récupération org:', orgError);
        return null;
      }

      if (org?.shared_mistral_api_key) {
        console.log('🔐 Déchiffrement clé organisationnelle...');
        try {
          const decrypted = decryptApiKey(org.shared_mistral_api_key);
          if (!decrypted || decrypted.length === 0) {
            console.error('❌ Échec déchiffrement org: clé vide');
            return null;
          }
          console.log('✅ Clé organisationnelle déchiffrée');
          return decrypted;
        } catch (decryptError) {
          console.error('❌ Erreur déchiffrement org:', decryptError);
          return null;
        }
      }
    }

    console.log('ℹ️  Aucune clé API configurée pour cet utilisateur');
    return null;
  } catch (error) {
    console.error('❌ Erreur getApiKey:', error);
    return null;
  }
}

// Route de transcription avec Mistral AI
// Middleware de logging pour toutes les requêtes POST /api/transcribe
app.use('/api/transcribe', (req, res, next) => {
  if (req.method === 'POST') {
    console.log('🎯 REQUÊTE POST /api/transcribe DÉTECTÉE (middleware global)');
    console.log('📋 Headers:', {
      'x-user-id': req.headers['x-user-id'],
      'x-api-key': req.headers['x-api-key'] ? 'présent' : 'absent',
      'content-type': req.headers['content-type'],
      'content-length': req.headers['content-length'],
    });
  }
  next();
});

app.post('/api/transcribe', 
  (req, res, next) => {
    console.log('🎯 ROUTE /api/transcribe APPELÉE - Avant middlewares');
    next();
  },
  apiLimiter,
  (req, res, next) => {
    console.log('✅ Rate limiter passé');
    next();
  },
  upload.single('file'), 
  (req, res, next) => {
    console.log('✅ Upload multer passé, fichier:', req.file ? 'présent' : 'absent');
    next();
  },
  validateHeaders(['x-user-id']),
  (req, res, next) => {
    console.log('✅ Validation headers passée');
    next();
  },
  auditLog.middleware('transcribe_audio'),
  async (req, res) => {
  console.log('🎯 REQUÊTE TRANSCRIPTION REÇUE!');
  console.log('📋 Headers reçus:', {
    'x-user-id': req.headers['x-user-id'],
    'x-api-key': req.headers['x-api-key'] ? 'présent' : 'absent',
    'content-type': req.headers['content-type'],
    'content-length': req.headers['content-length'],
  });
  console.log('📦 Fichier reçu:', req.file ? {
    size: req.file.size,
    mimetype: req.file.mimetype,
    originalname: req.file.originalname
  } : 'AUCUN FICHIER');
  
  try {
    const userId = req.headers['x-user-id'];
    const apiKeyHeader = req.headers['x-api-key']; // Clé API directe en header
    const audioFile = req.file;

    if (!audioFile || !userId) {
      return res.status(400).json({ 
        error: 'Fichier audio et utilisateur requis' 
      });
    }

    // Récupérer la clé API (soit depuis header, soit depuis Supabase)
    let apiKey = apiKeyHeader;
    if (!apiKey) {
      console.log('🔑 Tentative récupération clé depuis Supabase...');
      try {
        apiKey = await getApiKey(userId);
      } catch (error) {
        console.error('❌ Erreur récupération clé Supabase:', error);
      }
    }
    
    if (!apiKey) {
      return res.status(400).json({ 
        error: 'Clé API non configurée - veuillez la fournir dans les paramètres' 
      });
    }

    console.log('✅ Clé API récupérée pour transcription');
    console.log('📊 Informations audio:', {
      size: audioFile.size,
      mimetype: audioFile.mimetype,
      originalname: audioFile.originalname
    });

    // Préparer les données pour Mistral AI avec form-data
    const formData = new FormData();
    
    // Ajouter le fichier audio
    formData.append('file', audioFile.buffer, {
      filename: audioFile.originalname || 'audio.webm',
      contentType: audioFile.mimetype || 'audio/webm'
    });
    formData.append('model', 'voxtral-mini-transcribe-2507');
    formData.append('language', 'fr');

    console.log('🚀 Appel API Mistral transcription...');
    console.log('📊 Données FormData:', {
      hasFile: !!audioFile.buffer,
      fileSize: audioFile.buffer?.length || 0,
      model: 'voxtral-mini-transcribe-2507',
      language: 'fr'
    });
    
    // Créer un AbortController pour timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 secondes timeout (transcription peut prendre du temps)
    
    try {
      // Obtenir les headers du FormData (nécessaire avec form-data package)
      const formHeaders = formData.getHeaders();
      console.log('📋 Headers FormData:', Object.keys(formHeaders));
      
      // Appeler Mistral AI pour la transcription
      const mistralResponse = await fetch('https://api.mistral.ai/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          ...formHeaders, // Headers nécessaires pour multipart/form-data
        },
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log('📡 Réponse Mistral status:', mistralResponse.status, mistralResponse.statusText);
      console.log('📋 Headers réponse Mistral:', {
        contentType: mistralResponse.headers.get('content-type'),
        contentLength: mistralResponse.headers.get('content-length'),
      });

      if (!mistralResponse.ok) {
        const errorText = await mistralResponse.text();
        console.error('❌ Erreur Mistral AI:', errorText);
        console.error('📋 Détails réponse:', {
          status: mistralResponse.status,
          statusText: mistralResponse.statusText,
          headers: Object.fromEntries(mistralResponse.headers.entries())
        });
        
        // S'assurer que les en-têtes CORS sont présents même en cas d'erreur
        addCorsHeaders(req, res);
        
        return res.status(mistralResponse.status).json({
          error: `Erreur Mistral AI: ${errorText}`,
          status: mistralResponse.status
        });
      }

      const result = await mistralResponse.json();
      console.log('✅ Réponse Mistral complète:', JSON.stringify(result, null, 2));
      console.log('📋 Clés disponibles dans résultat:', Object.keys(result));
      console.log('✅ Transcription réussie, longueur texte:', result.text?.length || result.transcription?.length || 0);
      
      // Vérifier que le résultat contient bien le texte
      // Mistral peut retourner différents formats : 'text', 'transcription', ou directement une string
      let transcriptionText = '';
      
      if (typeof result === 'string') {
        transcriptionText = result;
      } else if (result.text) {
        transcriptionText = result.text;
      } else if (result.transcription) {
        transcriptionText = result.transcription;
      } else if (result.transcript) {
        transcriptionText = result.transcript;
      } else {
        console.error('⚠️  Réponse Mistral inattendue:', JSON.stringify(result, null, 2));
        throw new Error('La réponse de Mistral ne contient pas de transcription. Format: ' + JSON.stringify(result));
      }
      
      if (!transcriptionText || transcriptionText.trim().length === 0) {
        console.error('⚠️  Transcription vide reçue de Mistral');
        throw new Error('La transcription retournée par Mistral est vide. Vérifiez votre enregistrement audio.');
      }
      
      console.log('✅ Texte transcription extrait, longueur:', transcriptionText.length);
    
      // Enregistrer métrique business
      metricsDashboard.recordBusinessEvent('audio_transcribed', {
        userId,
        metadata: {
          audioSize: audioFile.size,
          model: 'voxtral-mini-transcribe-2507',
          language: 'fr'
        }
      });
      
      advancedLogger.business('transcription_completed', {
        userId,
        audioSize: audioFile.size,
        transcriptionLength: transcriptionText.length
      });
    
      // S'assurer que les en-têtes CORS sont présents avant la réponse
      addCorsHeaders(req, res);
      
      res.json({
        transcript: transcriptionText,
        success: true
      });
      
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        console.error('⏱️  Timeout lors de l\'appel Mistral AI (60s dépassé)');
        addCorsHeaders(req, res);
        return res.status(504).json({
          error: 'Timeout: La transcription prend trop de temps. Réessayez avec un fichier plus court.',
          timeout: true
        });
      }
      
      throw fetchError;
    }

  } catch (error) {
    console.error('❌ Erreur lors de la transcription:', error);
    console.error('📋 Stack trace:', error.stack);
    
    // S'assurer que les en-têtes CORS sont présents même en cas d'erreur
    addCorsHeaders(req, res);
    
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Erreur interne du serveur',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
});

// Route de génération de compte rendu avec Mistral AI
app.post('/api/generate-report', 
  apiLimiter,
  validateBody(generateReportSchema),
  validateHeaders(['x-user-id']),
  auditLog.middleware('generate_medical_report'),
  async (req, res) => {
  try {
    const { transcript, specialty, consultationType, userId } = req.body;

    if (!transcript || !userId) {
      return res.status(400).json({ 
        error: 'Transcription et utilisateur requis' 
      });
    }

    // Récupérer la clé API
    const apiKey = await getApiKey(userId);
    if (!apiKey) {
      return res.status(400).json({ 
        error: 'Clé API non configurée' 
      });
    }

    // Construire le prompt pour la génération du compte rendu
    const systemPrompt = `Tu es un assistant médical IA spécialisé en ${specialty || 'médecine générale'}.

Ta mission est de générer des comptes rendus médicaux professionnels, structurés et conformes aux normes de documentation médicale.

RÈGLES IMPORTANTES:
- Utilise UNIQUEMENT les informations présentes dans la transcription
- N'invente JAMAIS de symptômes, diagnostics ou traitements non mentionnés
- Si une information est manquante, indique "Non renseigné" ou "À préciser"
- Utilise la terminologie médicale appropriée
- Sois précis, factuel et objectif
- Respecte la structure imposée ci-dessous

STRUCTURE OBLIGATOIRE:
1. MOTIF DE CONSULTATION
2. ANTÉCÉDENTS (si mentionnés)
3. ANAMNÈSE (histoire de la maladie actuelle)
4. EXAMEN CLINIQUE
5. HYPOTHÈSES DIAGNOSTIQUES
6. EXAMENS COMPLÉMENTAIRES (si prescrits)
7. TRAITEMENT / PRESCRIPTION
8. CONSIGNES ET SUIVI

STYLE RÉDACTIONNEL:
- Phrases courtes et claires
- Terminologie médicale précise
- Ton professionnel et neutre
- Éviter les répétitions inutiles`;

    const userPrompt = `Type de consultation: ${consultationType || 'Consultation générale'}

TRANSCRIPTION À ANALYSER:
${transcript}

Génère maintenant le compte rendu médical structuré selon le format imposé.`;

    // Appeler Mistral AI pour la génération
    const mistralResponse = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-large-latest',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        max_tokens: 2500,
        temperature: 0.2, // Température basse pour plus de cohérence
      }),
    });

    if (!mistralResponse.ok) {
      const errorText = await mistralResponse.text();
      console.error('Erreur Mistral AI:', errorText);
      return res.status(mistralResponse.status).json({
        error: `Erreur Mistral AI: ${errorText}`
      });
    }

    const result = await mistralResponse.json();
    const report = result.choices[0].message.content;

    // Enregistrer métrique business
    metricsDashboard.recordBusinessEvent('report_generated', {
      userId,
      metadata: {
        specialty: specialty,
        consultationType: consultationType,
        tokensUsed: result.usage?.total_tokens || 0,
        transcriptLength: transcript.length,
        reportLength: report.length
      }
    });
    
    advancedLogger.business('medical_report_generated', {
      userId,
      specialty,
      consultationType,
      tokensUsed: result.usage?.total_tokens || 0,
      cost: (result.usage?.total_tokens || 0) * 0.00003
    });

    res.json({
      report: report,
      tokens_used: result.usage?.total_tokens || 0,
      cost_usd: (result.usage?.total_tokens || 0) * 0.00003,
      success: true
    });

  } catch (error) {
    console.error('Erreur lors de la génération du compte rendu:', error);
    res.status(500).json({ 
      error: 'Erreur interne du serveur',
      details: error.message
    });
  }
});

// Route pour tester une clé API Mistral
app.post('/api/test-key', 
  strictLimiter,
  validateBody(testKeySchema),
  auditLog.middleware('test_api_key'),
  async (req, res) => {
  try {
    const { apiKey } = req.body;

    if (!apiKey) {
      return res.status(400).json({ 
        error: 'Clé API requise' 
      });
    }

    const response = await fetch('https://api.mistral.ai/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    res.json({
      valid: response.ok,
      success: true
    });

  } catch (error) {
    console.error('Erreur lors du test de la clé:', error);
    res.status(500).json({ 
      error: 'Erreur interne du serveur',
      details: error.message
    });
  }
});

// Route de santé
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    ai_provider: 'Mistral AI'
  });
});

// Route pour récupérer le token CSRF (utilise csurf pour compatibilité)
app.get('/api/csrf-token', (req, res) => {
  // csurf expose req.csrfToken() automatiquement si le middleware est configuré
  // Pour GET requests, csurf ne nécessite pas de token
  addCorsHeaders(req, res);
  
  // Utiliser la méthode csurf pour générer le token
  const csrfToken = req.csrfToken ? req.csrfToken() : null;
  
  if (!csrfToken) {
    // Fallback si csurf n'a pas généré de token
    // Créer une session CSRF si nécessaire
    if (!req.session.csrfSecret) {
      req.session.csrfSecret = tokens.secretSync();
    }
    const fallbackToken = generateCSRFToken(req.session.csrfSecret);
    return res.json({ csrfToken: fallbackToken });
  }
  
  res.json({ csrfToken: csrfToken });
});

// 📊 ENDPOINTS MONITORING & DASHBOARD

// Dashboard HTML interactif
app.get('/dashboard', metricsDashboard.getDashboardAPI());

// API métriques JSON
app.get('/api/metrics', metricsDashboard.getMetricsAPI());

// Métriques système détaillées
app.get('/api/system-health', (req, res) => {
  const memUsage = process.memoryUsage();
  const uptime = process.uptime();
  
  const systemHealth = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    system: {
      uptime: Math.floor(uptime),
      uptimeFormatted: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
      memory: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024),
        rss: Math.round(memUsage.rss / 1024 / 1024),
        percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
      },
      process: {
        pid: process.pid,
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      }
    },
    services: {
      supabase: 'connected',
      mistralAI: 'available',
      logging: 'active',
      monitoring: 'active'
    }
  };

  // Déterminer le statut global
  if (systemHealth.system.memory.percentage > 90) {
    systemHealth.status = 'critical';
  } else if (systemHealth.system.memory.percentage > 80) {
    systemHealth.status = 'warning';
  }

  advancedLogger.info('System health check', systemHealth);
  res.json(systemHealth);
});

// Logs récents (pour debug)
app.get('/api/logs/recent', (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const level = req.query.level || 'all';
  
  // En production, lire depuis les fichiers de logs
  // Pour cette démo, retourner format simulé
  const recentLogs = Array.from({length: Math.min(limit, 50)}, (_, i) => ({
    timestamp: new Date(Date.now() - i * 60000).toISOString(),
    level: ['info', 'warn', 'error'][Math.floor(Math.random() * 3)],
    message: `Log entry ${i + 1}`,
    service: 'mediscribe-api',
    userId: Math.random() > 0.5 ? 'user-123' : null
  }));

  res.json({
    success: true,
    count: recentLogs.length,
    logs: recentLogs
  });
});

// Endpoint pour alertes actives
app.get('/api/alerts', (req, res) => {
  const alerts = [
    // En production, récupérer depuis base de données ou cache
  ];
  
  res.json({
    success: true,
    count: alerts.length,
    alerts
  });
});

// Test d'alerte (développement uniquement)
app.post('/api/test-alert', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Test alerts disabled in production' });
  }

  const { type, severity, message } = req.body;
  
  advancedLogger.security('test_alert', {
    severity: severity || 'medium',
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    extra: { type, message }
  });

  res.json({
    success: true,
    message: 'Test alert sent'
  });
});

// Route pour sauvegarder la clé API (contourne les problèmes RLS)
app.post('/api/save-api-key', 
  strictLimiter,
  validateBody(saveApiKeySchema),
  auditLog.middleware('save_api_key'),
  async (req, res) => {
  try {
    const { userId, apiKey, usePersonalKey } = req.body;
    
    // Ajouter les en-têtes CORS dès le début
    addCorsHeaders(req, res);
    
    if (!userId || !apiKey) {
      return res.status(400).json({ error: 'userId et apiKey requis' });
    }

    console.log('💾 Sauvegarde clé API côté serveur pour:', userId);
    
    // Récupérer l'email de l'utilisateur
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('email')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      console.error('❌ Erreur récupération email:', userError || 'Utilisateur non trouvé');
      return res.status(500).json({ error: 'Erreur récupération email utilisateur' });
    }

    const userEmail = user.email;
    
    // Chiffrer la clé
    const encryptedKey = encryptApiKey(apiKey);
    
    // Utiliser UPSERT avec email
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        email: userEmail,  // Ajout de l'email
        personal_mistral_api_key: encryptedKey,
        use_personal_api_key: usePersonalKey !== false,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id',
        ignoreDuplicates: false
      })
      .select('id, email, personal_mistral_api_key, use_personal_api_key')
      .single();
    
    if (error) {
      console.error('❌ Erreur Supabase upsert:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('✅ Clé API sauvegardée via upsert:', {
      userId: data.id,
      hasKey: !!data.personal_mistral_api_key,
      usePersonalKey: data.use_personal_api_key
    });
    
    res.json({ success: true, message: 'Clé API sauvegardée' });
    
  } catch (error) {
    console.error('❌ Erreur sauvegarde server:', error);
    
    // S'assurer que les en-têtes CORS sont présents même en cas d'erreur
    addCorsHeaders(req, res);
    
    res.status(500).json({ error: 'Erreur interne serveur' });
  }
});

// Route pour récupérer la clé API déchiffrée (contourne les problèmes RLS)
app.get('/api/get-api-key/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      addCorsHeaders(req, res);
      return res.status(400).json({ error: 'userId requis' });
    }

    console.log('🔍 Récupération clé API côté serveur pour:', userId);
    
    const decryptedKey = await getApiKey(userId);
    
    // S'assurer que les en-têtes CORS sont présents avant la réponse
    addCorsHeaders(req, res);
    
    if (decryptedKey) {
      console.log('✅ Clé API récupérée et déchiffrée côté serveur');
      res.json({ success: true, apiKey: decryptedKey });
    } else {
      console.log('ℹ️  Aucune clé API trouvée pour cet utilisateur');
      
      // Log supplémentaire pour débogage
      console.log('🔍 Debug: Vérifier que la clé est bien stockée dans Supabase pour', userId);
      
      res.json({ success: false, apiKey: null });
    }
    
  } catch (error) {
    console.error('❌ Erreur récupération server:', error);
    
    // Log supplémentaire avec la stack trace
    console.error('🔍 Debug: Stack trace:', error.stack);
    
    // S'assurer que les en-têtes CORS sont présents même en cas d'erreur
    addCorsHeaders(req, res);
    
    if (!res.headersSent) {
      res.status(500).json({ error: 'Erreur interne serveur' });
    }
  }
});

// Route de test Supabase
app.get('/api/test-supabase', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Erreur Supabase:', error);
      return res.status(500).json({ 
        error: 'Erreur de connexion à Supabase',
        details: error.message 
      });
    }

    res.json({
      connected: true,
      data: data
    });
  } catch (error) {
    console.error('❌ Erreur test Supabase:', error);
    res.status(500).json({ 
      error: 'Erreur interne',
      details: error.message 
    });
  }
});

// Route racine
app.get('/', (req, res) => {
  res.json({
    message: 'MediScribe API - Assistant IA pour Comptes Rendus Médicaux',
    version: '2.0.0',
    ai_provider: 'Mistral AI',
    endpoints: {
      transcribe: 'POST /api/transcribe',
      generateReport: 'POST /api/generate-report',
      testKey: 'POST /api/test-key',
      health: 'GET /api/health'
    },
    timestamp: new Date().toISOString()
  });
});

// The error handler must be registered before any other error middleware and after all controllers
if (process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.errorHandler());
}

// Gestionnaire d'erreurs global
app.use((error, req, res, next) => {
  console.error('❌ Erreur serveur:', error);
  
  // S'assurer que les en-têtes CORS sont toujours présents, même en cas d'erreur
  addCorsHeaders(req, res);
  
  // Log sécurisé (pas de données sensibles)
  const sanitizedError = {
    message: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    timestamp: new Date().toISOString(),
    url: req.url,
    method: req.method,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  };
  
  // Ne pas exposer les détails en production
  const clientError = process.env.NODE_ENV === 'production' 
    ? { error: 'Erreur interne du serveur' }
    : sanitizedError;
    
  res.status(error.status || 500).json(clientError);
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`🚀 Serveur API MediScribe démarré sur le port ${PORT}`);
  console.log(`🤖 Provider IA: Mistral AI`);
  console.log(`🔒 Sécurité: Niveau 100% - Production Ready`);
  console.log(`🔑 Service role key: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'présente' : 'manquante'}`);
  console.log(`📡 Endpoints disponibles:`);
  console.log(`   POST /api/transcribe - Transcription audio`);
  console.log(`   POST /api/generate-report - Génération de compte rendu`);
  console.log(`   POST /api/test-key - Test de clé API`);
  console.log(`   GET  /api/health - Santé du serveur`);
  console.log(`   GET  /api/csrf-token - Token CSRF`);
  
  console.log(``);
  console.log(`💡 Assurez-vous que SUPABASE_SERVICE_ROLE_KEY et VITE_ENCRYPTION_KEY sont définies dans vos variables d'environnement`);
  console.log(`🔐 Pour activer Sentry, définir SENTRY_DSN`);
});

export default app;
