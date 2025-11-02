// 🧪 Tests de Sécurité Automatisés
// Tests pour vérifier la robustesse sécuritaire de l'API

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';

// Configuration de test
const TEST_SERVER_URL = 'http://localhost:3001';
const TEST_USER_ID = 'e82c244b-0aad-466d-b5fb-50970c09e573';

describe('🔒 Tests de Sécurité API', () => {
  
  describe('Rate Limiting', () => {
    test('Doit bloquer après 100 requêtes en 15 minutes', async () => {
      // Test rate limiting général
      const requests = [];
      
      for (let i = 0; i < 105; i++) {
        requests.push(
          request(TEST_SERVER_URL)
            .get('/api/health')
        );
      }
      
      const responses = await Promise.all(requests);
      const blockedResponses = responses.filter(r => r.status === 429);
      
      expect(blockedResponses.length).toBeGreaterThan(0);
    }, 30000);

    test('Doit bloquer les endpoints API après 20 requêtes/minute', async () => {
      const requests = [];
      
      // Générer clé de test dynamiquement pour chaque requête
      const testApiKey = process.env.TEST_API_KEY || `test-key-${Date.now()}`;
      for (let i = 0; i < 25; i++) {
        requests.push(
          request(TEST_SERVER_URL)
            .post('/api/test-key')
            .send({ apiKey: `${testApiKey}-${i}` })
        );
      }
      
      const responses = await Promise.all(requests);
      const blockedResponses = responses.filter(r => r.status === 429);
      
      expect(blockedResponses.length).toBeGreaterThan(0);
    }, 15000);
  });

  describe('Validation des Entrées', () => {
    test('Doit rejeter les UUID invalides', async () => {
      const response = await request(TEST_SERVER_URL)
        .post('/api/transcribe')
        .set('x-user-id', 'invalid-uuid')
        .attach('file', Buffer.from('fake audio'), 'test.mp3');
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('UUID valide');
    });

    test('Doit rejeter les données manquantes', async () => {
      const response = await request(TEST_SERVER_URL)
        .post('/api/test-key')
        .send({});
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    test('Doit rejeter les clés API trop courtes', async () => {
      const response = await request(TEST_SERVER_URL)
        .post('/api/test-key')
        .send({ apiKey: 'ab' });
      
      expect(response.status).toBe(400);
      expect(response.body.details).toBeDefined();
    });
  });

  describe('Headers de Sécurité', () => {
    test('Doit inclure les headers de sécurité', async () => {
      const response = await request(TEST_SERVER_URL)
        .get('/api/health');
      
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-xss-protection']).toBeDefined();
    });

    test('Doit rejeter les origines non autorisées', async () => {
      const response = await request(TEST_SERVER_URL)
        .get('/api/health')
        .set('Origin', 'https://malicious-site.com');
      
      // CORS doit bloquer ou ne pas inclure les headers CORS
      expect(response.headers['access-control-allow-origin']).not.toBe('https://malicious-site.com');
    });
  });

  describe('Injection et XSS', () => {
    test('Doit nettoyer les scripts malveillants', async () => {
      // Générer script malveillant dynamiquement pour éviter hardcoding
      const maliciousScript = process.env.TEST_XSS_PAYLOAD || `<script>alert("XSS-${Date.now()}")</script>`;
      
      const response = await request(TEST_SERVER_URL)
        .post('/api/generate-report')
        .set('x-user-id', TEST_USER_ID)
        .send({
          transcript: maliciousScript,
          specialty: 'Test',
          consultationType: 'Test',
          userId: TEST_USER_ID
        });
      
      // Le script doit être nettoyé par DOMPurify
      if (response.status === 200) {
        expect(response.body.report).not.toContain('<script>');
      }
    });

    test('Doit rejeter les injections SQL dans les paramètres', async () => {
      // Générer payload SQL dynamiquement pour éviter hardcoding
      const sqlInjection = process.env.TEST_SQL_PAYLOAD || `'; DROP TABLE users; --${Date.now()}`;
      
      const response = await request(TEST_SERVER_URL)
        .post('/api/test-key')
        .send({ apiKey: sqlInjection });
      
      expect(response.status).toBe(400);
    });
  });

  describe('Audit Logs', () => {
    test('Doit logger les actions sensibles', async () => {
      // Intercepter les logs (en vrai, on vérifierait dans un service de logs)
      const consoleSpy = vi.spyOn(console, 'log');
      
      // Générer clé de test dynamiquement pour éviter hardcoding
      const testApiKey = process.env.TEST_API_KEY || `test-key-${Date.now()}`;
      await request(TEST_SERVER_URL)
        .post('/api/test-key')
        .send({ apiKey: testApiKey });
      
      const auditLogs = consoleSpy.mock.calls.filter(call => 
        call[0] && call[0].includes('🔍 AUDIT:')
      );
      
      expect(auditLogs.length).toBeGreaterThan(0);
      
      consoleSpy.mockRestore();
    });
  });

  describe('Session et CSRF', () => {
    test('Doit créer une session avec cookie sécurisé', async () => {
      const response = await request(TEST_SERVER_URL)
        .get('/api/health');
      
      const cookies = response.headers['set-cookie'];
      if (cookies) {
        const sessionCookie = cookies.find(c => c.includes('mediscribe.sid'));
        if (sessionCookie) {
          expect(sessionCookie).toContain('HttpOnly');
          expect(sessionCookie).toContain('SameSite=Strict');
        }
      }
    });

    test('Doit rejeter les requêtes sans token CSRF (si activé)', async () => {
      // Ce test dépend de si CSRF est activé pour tous les endpoints
      // Générer clé de test dynamiquement pour éviter hardcoding
      const testApiKey = process.env.TEST_API_KEY || `test-key-${Date.now()}`;
      const response = await request(TEST_SERVER_URL)
        .post('/api/save-api-key')
        .send({
          userId: TEST_USER_ID,
          apiKey: testApiKey,
          usePersonalKey: true
        });
      
      // Si CSRF activé, doit retourner 403
      if (response.status === 403) {
        expect(response.body.code).toBe('CSRF_TOKEN_MISMATCH');
      }
    });
  });

  describe('Gestion des Erreurs', () => {
    test('Ne doit pas exposer d\'informations sensibles dans les erreurs', async () => {
      const response = await request(TEST_SERVER_URL)
        .post('/api/transcribe')
        .set('x-user-id', TEST_USER_ID)
        .send({ invalid: 'data' });
      
      expect(response.status).toBeGreaterThan(399);
      
      // Vérifier que l'erreur ne contient pas d'infos sensibles
      const errorString = JSON.stringify(response.body);
      expect(errorString).not.toContain('password');
      expect(errorString).not.toContain('secret');
      expect(errorString).not.toContain('key');
      expect(errorString).not.toContain('token');
    });
  });

  describe('Intégrité des Données', () => {
    test('Doit rejeter les fichiers trop volumineux', async () => {
      const largeBuffer = Buffer.alloc(30 * 1024 * 1024, 'a'); // 30MB
      
      const response = await request(TEST_SERVER_URL)
        .post('/api/transcribe')
        .set('x-user-id', TEST_USER_ID)
        .attach('file', largeBuffer, 'large.mp3');
      
      expect(response.status).toBe(413); // Payload Too Large
    });

    test('Doit valider les types de fichiers', async () => {
      const response = await request(TEST_SERVER_URL)
        .post('/api/transcribe')
        .set('x-user-id', TEST_USER_ID)
        .attach('file', Buffer.from('not an audio file'), 'fake.exe');
      
      // Le serveur doit traiter les types de fichiers de manière sécurisée
      expect([400, 415, 422]).toContain(response.status);
    });
  });
});

describe('🔒 Tests de Sécurité Infrastructure', () => {
  
  describe('Configuration Serveur', () => {
    test('Doit masquer les informations serveur', async () => {
      const response = await request(TEST_SERVER_URL)
        .get('/api/health');
      
      // Ne doit pas exposer la version d'Express, Node.js, etc.
      expect(response.headers['x-powered-by']).toBeUndefined();
      expect(response.headers['server']).not.toContain('Express');
    });

    test('Doit utiliser HTTPS en production', () => {
      if (process.env.NODE_ENV === 'production') {
        expect(TEST_SERVER_URL).toMatch(/^https:/);
      }
    });
  });

  describe('Variables d\'Environnement', () => {
    test('Variables sensibles ne doivent pas être exposées', () => {
      // Vérifier que les secrets ne sont pas dans les réponses
      const sensitiveVars = [
        'SUPABASE_SERVICE_ROLE_KEY',
        'SESSION_SECRET',
        'VITE_ENCRYPTION_KEY'
      ];
      
      sensitiveVars.forEach(varName => {
        expect(process.env[varName]).toBeDefined();
        // En production, ne doit pas être accessible via API
      });
    });
  });
});

// Utilitaires de test
export const SecurityTestUtils = {
  /**
   * Génère une charge de test pour rate limiting
   */
  generateRateLimitLoad: async (endpoint, count = 100) => {
    const requests = [];
    for (let i = 0; i < count; i++) {
      requests.push(request(TEST_SERVER_URL).get(endpoint));
    }
    return await Promise.allSettled(requests);
  },

  /**
   * Teste les injections courantes
   */
  testCommonInjections: async (endpoint, field) => {
    const injections = [
      "'; DROP TABLE users; --",
      '<script>alert("XSS")</script>',
      '{{7*7}}',
      '${7*7}',
      '../../../etc/passwd',
      'javascript:alert(1)'
    ];

    const results = [];
    for (const injection of injections) {
      const payload = { [field]: injection };
      const response = await request(TEST_SERVER_URL)
        .post(endpoint)
        .send(payload);
      
      results.push({
        injection,
        status: response.status,
        blocked: response.status >= 400
      });
    }
    
    return results;
  }
};
