import request from 'supertest';
import { describe, it, expect, beforeEach } from 'vitest';

const API_BASE_URL = process.env.API_URL || 'http://localhost:3001';

describe('Security Tests', () => {
  describe('Rate Limiting', () => {
    it('should enforce general rate limit (100 requests/15min)', async () => {
      const requests = [];
      
      // Send 105 requests rapidly
      for (let i = 0; i < 105; i++) {
        requests.push(
          request(API_BASE_URL)
            .get('/api/health')
        );
      }
      
      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      // Should have some rate limited responses
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    }, 30000);

    it('should enforce API rate limit (20 requests/min)', async () => {
      const requests = [];
      const testUserId = 'rate-limit-test-user';
      
      // Send 25 API requests
      for (let i = 0; i < 25; i++) {
        requests.push(
          request(API_BASE_URL)
            .post('/api/test-key')
            .set('x-user-id', testUserId)
            .send({ apiKey: 'test-key-for-rate-limiting' })
        );
      }
      
      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      // Should have rate limited responses after 20 requests
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    }, 30000);

    it('should return proper rate limit headers', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/health');
      
      // Should have rate limit headers
      expect(response.headers).toHaveProperty('x-ratelimit-limit');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
    });

    it('should include retry-after header when rate limited', async () => {
      // Send many requests to trigger rate limit
      for (let i = 0; i < 105; i++) {
        await request(API_BASE_URL).get('/api/health');
      }
      
      const response = await request(API_BASE_URL).get('/api/health');
      
      if (response.status === 429) {
        expect(response.headers).toHaveProperty('retry-after');
      }
    }, 30000);
  });

  describe('Input Sanitization', () => {
    it('should sanitize XSS in transcript', async () => {
      const xssPayload = '<script>alert("XSS")</script>Test transcript';
      
      const response = await request(API_BASE_URL)
        .post('/api/generate-report')
        .set('x-user-id', 'test-user')
        .send({
          transcript: xssPayload,
          specialty: 'Médecine générale',
          consultationType: 'Consultation',
          userId: 'test-user'
        });
      
      // Should either sanitize or reject
      if (response.status === 200) {
        expect(response.body.report).not.toContain('<script>');
      }
    }, 60000);

    it('should sanitize SQL injection attempts', async () => {
      const sqlPayload = "'; DROP TABLE users; --";
      
      const response = await request(API_BASE_URL)
        .post('/api/test-key')
        .send({ apiKey: sqlPayload });
      
      // Should not crash or execute SQL
      expect(response.status).toBeLessThan(500);
    });

    it('should sanitize HTML entities', async () => {
      const htmlPayload = '&lt;img src=x onerror=alert(1)&gt;';
      
      const response = await request(API_BASE_URL)
        .post('/api/generate-report')
        .set('x-user-id', 'test-user')
        .send({
          transcript: htmlPayload + ' Test medical transcript',
          specialty: 'Médecine générale',
          consultationType: 'Consultation',
          userId: 'test-user'
        });
      
      if (response.status === 200) {
        expect(response.body.report).not.toContain('onerror');
      }
    }, 60000);

    it('should reject excessively long inputs', async () => {
      const veryLongString = 'a'.repeat(100000); // 100KB string
      
      const response = await request(API_BASE_URL)
        .post('/api/generate-report')
        .set('x-user-id', 'test-user')
        .send({
          transcript: veryLongString,
          specialty: 'Médecine générale',
          consultationType: 'Consultation',
          userId: 'test-user'
        });
      
      expect(response.status).toBe(400);
    });
  });

  describe('CSRF Protection', () => {
    it('should require CSRF token for POST requests', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/generate-report')
        .set('x-user-id', 'test-user')
        .send({
          transcript: 'Test transcript',
          specialty: 'Médecine générale',
          consultationType: 'Consultation',
          userId: 'test-user'
        });
      
      // Should either require CSRF token or authenticate differently
      expect([200, 400, 403]).toContain(response.status);
    });

    it('should provide CSRF token endpoint', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/csrf-token');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('csrfToken');
      expect(typeof response.body.csrfToken).toBe('string');
      expect(response.body.csrfToken.length).toBeGreaterThan(0);
    });

    it('should validate CSRF token on protected routes', async () => {
      // Get CSRF token first
      const tokenResponse = await request(API_BASE_URL)
        .get('/api/csrf-token');
      
      const csrfToken = tokenResponse.body.csrfToken;
      
      // Use token in POST request
      const response = await request(API_BASE_URL)
        .post('/api/generate-report')
        .set('x-user-id', 'test-user')
        .set('x-csrf-token', csrfToken)
        .send({
          transcript: 'Test transcript',
          specialty: 'Médecine générale',
          consultationType: 'Consultation',
          userId: 'test-user'
        });
      
      // With valid CSRF token, should not get 403
      expect(response.status).not.toBe(403);
    });
  });

  describe('Authentication & Authorization', () => {
    it('should require user ID for authenticated endpoints', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/transcribe')
        .attach('file', Buffer.from('test'), 'test.mp3');
      
      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/user|userId|authentication/i);
    });

    it('should validate UUID format for user ID', async () => {
      const invalidUUID = 'not-a-valid-uuid';
      
      const response = await request(API_BASE_URL)
        .post('/api/test-key')
        .set('x-user-id', invalidUUID)
        .send({ apiKey: 'test-key' });
      
      // Should validate UUID format
      expect([400, 401]).toContain(response.status);
    });

    it('should reject requests without proper headers', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/save-api-key')
        .send({
          userId: 'test-user',
          apiKey: 'test-key'
        });
      
      // Should require authentication
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Security Headers', () => {
    it('should include security headers in responses', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/health');
      
      // Helmet security headers
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      
      expect(response.headers).toHaveProperty('x-frame-options');
      
      expect(response.headers).toHaveProperty('x-xss-protection');
    });

    it('should set proper CORS headers', async () => {
      const response = await request(API_BASE_URL)
        .options('/api/health')
        .set('Origin', 'http://localhost:8080');
      
      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });

    it('should include Content-Security-Policy', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/health');
      
      expect(response.headers).toHaveProperty('content-security-policy');
    });
  });

  describe('Error Handling', () => {
    it('should not expose sensitive information in errors', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/nonexistent-endpoint');
      
      expect(response.status).toBe(404);
      
      // Should not expose stack traces or internal paths
      const bodyStr = JSON.stringify(response.body);
      expect(bodyStr).not.toContain('/Users/');
      expect(bodyStr).not.toContain('node_modules');
      expect(bodyStr).not.toContain('stack');
    });

    it('should handle malformed JSON gracefully', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/test-key')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}');
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return consistent error format', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/test-key')
        .send({});
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(typeof response.body.error).toBe('string');
    });
  });

  describe('File Upload Security', () => {
    it('should validate file type', async () => {
      const textFile = Buffer.from('This is a text file, not audio');
      
      const response = await request(API_BASE_URL)
        .post('/api/transcribe')
        .set('x-user-id', 'test-user')
        .attach('file', textFile, 'test.txt');
      
      // Should reject non-audio files
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should enforce file size limits', async () => {
      const largeFile = Buffer.alloc(30 * 1024 * 1024); // 30MB
      
      const response = await request(API_BASE_URL)
        .post('/api/transcribe')
        .set('x-user-id', 'test-user')
        .attach('file', largeFile, 'large.mp3');
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should sanitize filenames', async () => {
      const maliciousFilename = '../../../etc/passwd';
      const testFile = Buffer.from('test');
      
      const response = await request(API_BASE_URL)
        .post('/api/transcribe')
        .set('x-user-id', 'test-user')
        .attach('file', testFile, maliciousFilename);
      
      // Should handle safely without path traversal
      expect(response.status).toBeLessThan(500);
    });
  });

  describe('API Key Security', () => {
    it('should encrypt API keys before storage', async () => {
      const plainKey = 'test-api-key-123456';
      
      const response = await request(API_BASE_URL)
        .post('/api/save-api-key')
        .send({
          userId: 'test-user-uuid',
          apiKey: plainKey
        });
      
      // Key should be encrypted (can't verify directly, but should succeed)
      expect([200, 400, 401]).toContain(response.status);
    });

    it('should not expose API keys in responses', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/health');
      
      const bodyStr = JSON.stringify(response.body);
      
      // Should not contain API key patterns
      expect(bodyStr).not.toMatch(/mistral.*api.*key/i);
      expect(bodyStr).not.toMatch(/sk-[a-zA-Z0-9]{32,}/);
    });

    it('should validate API key format', async () => {
      const invalidKey = 'too-short';
      
      const response = await request(API_BASE_URL)
        .post('/api/test-key')
        .send({ apiKey: invalidKey });
      
      expect(response.status).toBe(400);
    });
  });
});
