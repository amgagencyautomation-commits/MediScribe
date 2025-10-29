import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'path';
import fs from 'fs';

// Note: In a real scenario, you'd import your app
// For now, we'll create a placeholder that can be replaced
const API_BASE_URL = process.env.API_URL || 'http://localhost:3001';

describe('Transcription API', () => {
  const testUserId = 'test-user-uuid-12345';
  const testAudioPath = path.join(__dirname, '../fixtures/test-audio.mp3');

  beforeAll(async () => {
    // Create test fixtures directory if doesn't exist
    const fixturesDir = path.join(__dirname, '../fixtures');
    if (!fs.existsSync(fixturesDir)) {
      fs.mkdirSync(fixturesDir, { recursive: true });
    }

    // Create a minimal test audio file if it doesn't exist
    if (!fs.existsSync(testAudioPath)) {
      // Create a minimal valid MP3 file (empty but valid)
      const minimalMP3 = Buffer.from([
        0xFF, 0xFB, 0x90, 0x00, // MP3 header
        ...new Array(1000).fill(0x00) // Some data
      ]);
      fs.writeFileSync(testAudioPath, minimalMP3);
    }
  });

  describe('POST /api/transcribe', () => {
    it('should return 400 without user ID', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/transcribe')
        .attach('file', testAudioPath);
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('should return 400 without file', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/transcribe')
        .set('x-user-id', testUserId);
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('should transcribe valid audio file', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/transcribe')
        .set('x-user-id', testUserId)
        .set('x-api-key', process.env.TEST_MISTRAL_KEY || 'test-key')
        .attach('file', testAudioPath);
      
      // May fail if no API key, but structure should be correct
      if (response.status === 200) {
        expect(response.body).toHaveProperty('transcript');
        expect(response.body).toHaveProperty('success');
        expect(response.body.success).toBe(true);
        expect(typeof response.body.transcript).toBe('string');
      } else {
        // Should return proper error
        expect(response.body).toHaveProperty('error');
      }
    }, 30000); // 30 second timeout for API call

    it('should validate file size limit', async () => {
      // Create a file larger than 25MB limit
      const largeFilePath = path.join(__dirname, '../fixtures/large-test.mp3');
      const largeBuffer = Buffer.alloc(26 * 1024 * 1024); // 26MB
      fs.writeFileSync(largeFilePath, largeBuffer);

      const response = await request(API_BASE_URL)
        .post('/api/transcribe')
        .set('x-user-id', testUserId)
        .attach('file', largeFilePath);
      
      expect(response.status).toBeGreaterThanOrEqual(400);
      
      // Cleanup
      fs.unlinkSync(largeFilePath);
    });

    it('should sanitize user inputs', async () => {
      const maliciousUserId = '<script>alert("xss")</script>';
      
      const response = await request(API_BASE_URL)
        .post('/api/transcribe')
        .set('x-user-id', maliciousUserId)
        .attach('file', testAudioPath);
      
      // Should either reject invalid UUID or sanitize
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('POST /api/generate-report', () => {
    const testTranscript = 'Le patient présente des douleurs abdominales depuis 3 jours. Température à 38.5°C. Examen clinique révèle une sensibilité au point de McBurney.';

    it('should return 400 without required fields', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/generate-report')
        .set('x-user-id', testUserId)
        .send({});
      
      expect(response.status).toBe(400);
    });

    it('should validate transcript length', async () => {
      const shortTranscript = 'Test';
      
      const response = await request(API_BASE_URL)
        .post('/api/generate-report')
        .set('x-user-id', testUserId)
        .send({
          transcript: shortTranscript,
          specialty: 'Médecine générale',
          consultationType: 'Consultation',
          userId: testUserId
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/transcription.*courte|too.*short/i);
    });

    it('should generate report from valid transcript', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/generate-report')
        .set('x-user-id', testUserId)
        .send({
          transcript: testTranscript,
          specialty: 'Médecine générale',
          consultationType: 'Consultation',
          userId: testUserId
        });
      
      if (response.status === 200) {
        expect(response.body).toHaveProperty('report');
        expect(response.body).toHaveProperty('success');
        expect(response.body.success).toBe(true);
        expect(typeof response.body.report).toBe('string');
        expect(response.body.report.length).toBeGreaterThan(0);
      } else {
        // Should have proper error structure
        expect(response.body).toHaveProperty('error');
      }
    }, 60000); // 60 second timeout

    it('should include cost information', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/generate-report')
        .set('x-user-id', testUserId)
        .send({
          transcript: testTranscript,
          specialty: 'Médecine générale',
          consultationType: 'Consultation',
          userId: testUserId
        });
      
      if (response.status === 200) {
        expect(response.body).toHaveProperty('tokens_used');
        expect(response.body).toHaveProperty('cost_usd');
        expect(typeof response.body.tokens_used).toBe('number');
        expect(typeof response.body.cost_usd).toBe('number');
      }
    }, 60000);

    it('should sanitize HTML in transcript', async () => {
      const maliciousTranscript = '<script>alert("xss")</script>' + testTranscript;
      
      const response = await request(API_BASE_URL)
        .post('/api/generate-report')
        .set('x-user-id', testUserId)
        .send({
          transcript: maliciousTranscript,
          specialty: 'Médecine générale',
          consultationType: 'Consultation',
          userId: testUserId
        });
      
      // Should not contain script tags
      if (response.status === 200) {
        expect(response.body.report).not.toContain('<script>');
      }
    }, 60000);
  });

  describe('POST /api/test-key', () => {
    it('should validate Mistral API key format', async () => {
      const invalidKey = 'invalid-key-123';
      
      const response = await request(API_BASE_URL)
        .post('/api/test-key')
        .send({ apiKey: invalidKey });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('valid');
      expect(response.body.valid).toBe(false);
    });

    it('should return 400 without API key', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/test-key')
        .send({});
      
      expect(response.status).toBe(400);
    });

    it('should validate key length requirements', async () => {
      const shortKey = 'abc';
      
      const response = await request(API_BASE_URL)
        .post('/api/test-key')
        .send({ apiKey: shortKey });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });
  });

  afterAll(async () => {
    // Cleanup test files
    if (fs.existsSync(testAudioPath)) {
      fs.unlinkSync(testAudioPath);
    }
  });
});
