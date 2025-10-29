import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiKeyService } from '../apiKeyService';
import { testData, createMockApiResponse, createMockApiError } from '@/tests/factories';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      upsert: vi.fn(),
      select: vi.fn(),
      delete: vi.fn(),
      eq: vi.fn(),
      single: vi.fn(),
    })),
    rpc: vi.fn(),
  },
}));

// Mock Winston logger
vi.mock('@/lib/winstonLogger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock fetch global
global.fetch = vi.fn();

describe('ApiKeyService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateMistralKey', () => {
    it('devrait retourner valid: true pour une clé valide', async () => {
      // Mock réponse API Mistral réussie
      (global.fetch as any).mockResolvedValueOnce(
        createMockApiResponse({ choices: [{ message: { content: 'test' } }] })
      );

      const result = await apiKeyService.validateMistralKey(testData.apiKey.valid);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.mistral.ai/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: `Bearer ${testData.apiKey.valid}`,
          }),
        })
      );
    });

    it('devrait retourner valid: false pour une clé invalide (401)', async () => {
      (global.fetch as any).mockResolvedValueOnce(createMockApiError(401, 'Invalid API key'));

      const result = await apiKeyService.validateMistralKey(testData.apiKey.invalid);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('invalide');
    });

    it('devrait retourner valid: false pour un quota dépassé (429)', async () => {
      (global.fetch as any).mockResolvedValueOnce(createMockApiError(429, 'Rate limit exceeded'));

      const result = await apiKeyService.validateMistralKey(testData.apiKey.valid);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('limite');
    });

    it('devrait gérer les erreurs réseau', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const result = await apiKeyService.validateMistralKey(testData.apiKey.valid);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('saveUserApiKey', () => {
    it('devrait enregistrer une clé valide en DB', async () => {
      const { supabase } = await import('@/lib/supabase');

      // Mock validation réussie
      (global.fetch as any).mockResolvedValueOnce(
        createMockApiResponse({ choices: [{ message: { content: 'test' } }] })
      );

      // Mock upsert Supabase
      const mockUpsert = vi.fn().mockResolvedValue({ error: null });
      (supabase.from as any).mockReturnValue({
        upsert: mockUpsert,
      });

      const result = await apiKeyService.saveUserApiKey(
        testData.user.id,
        testData.apiKey.valid,
        'mistral',
        'Ma clé test'
      );

      expect(result.success).toBe(true);
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: testData.user.id,
          key_type: 'mistral',
          key_name: 'Ma clé test',
          is_valid: true,
        }),
        expect.any(Object)
      );
    });

    it('ne devrait pas enregistrer une clé invalide', async () => {
      const { supabase } = await import('@/lib/supabase');

      // Mock validation échouée
      (global.fetch as any).mockResolvedValueOnce(createMockApiError(401, 'Invalid API key'));

      const mockUpsert = vi.fn();
      (supabase.from as any).mockReturnValue({
        upsert: mockUpsert,
      });

      const result = await apiKeyService.saveUserApiKey(
        testData.user.id,
        testData.apiKey.invalid,
        'mistral'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it('devrait gérer les erreurs DB', async () => {
      const { supabase } = await import('@/lib/supabase');

      // Mock validation réussie
      (global.fetch as any).mockResolvedValueOnce(
        createMockApiResponse({ choices: [{ message: { content: 'test' } }] })
      );

      // Mock erreur DB
      const mockUpsert = vi.fn().mockResolvedValue({
        error: { message: 'Database error' },
      });
      (supabase.from as any).mockReturnValue({
        upsert: mockUpsert,
      });

      const result = await apiKeyService.saveUserApiKey(
        testData.user.id,
        testData.apiKey.valid,
        'mistral'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('getUserApiKey', () => {
    it('devrait retourner la clé déchiffrée si elle existe et est valide', async () => {
      const { supabase } = await import('@/lib/supabase');

      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          encrypted_key: testData.apiKey.encrypted,
          is_valid: true,
        },
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: mockSingle,
            }),
          }),
        }),
      });

      const result = await apiKeyService.getUserApiKey(testData.user.id, 'mistral');

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('devrait retourner null si la clé n\'existe pas', async () => {
      const { supabase } = await import('@/lib/supabase');

      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: mockSingle,
            }),
          }),
        }),
      });

      const result = await apiKeyService.getUserApiKey(testData.user.id, 'mistral');

      expect(result).toBeNull();
    });

    it('devrait retourner null si la clé est invalide', async () => {
      const { supabase } = await import('@/lib/supabase');

      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          encrypted_key: testData.apiKey.encrypted,
          is_valid: false,
        },
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: mockSingle,
            }),
          }),
        }),
      });

      const result = await apiKeyService.getUserApiKey(testData.user.id, 'mistral');

      expect(result).toBeNull();
    });
  });

  describe('deleteApiKey', () => {
    it('devrait supprimer la clé avec succès', async () => {
      const { supabase } = await import('@/lib/supabase');

      const mockDelete = vi.fn().mockResolvedValue({ error: null });

      (supabase.from as any).mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: mockDelete,
          }),
        }),
      });

      const result = await apiKeyService.deleteApiKey(testData.user.id, 'mistral');

      expect(result).toBe(true);
      expect(mockDelete).toHaveBeenCalled();
    });

    it('devrait retourner false en cas d\'erreur', async () => {
      const { supabase } = await import('@/lib/supabase');

      const mockDelete = vi.fn().mockResolvedValue({
        error: { message: 'Delete failed' },
      });

      (supabase.from as any).mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: mockDelete,
          }),
        }),
      });

      const result = await apiKeyService.deleteApiKey(testData.user.id, 'mistral');

      expect(result).toBe(false);
    });
  });

  describe('trackApiKeyUsage', () => {
    it('devrait appeler la fonction RPC pour incrémenter le compteur', async () => {
      const { supabase } = await import('@/lib/supabase');

      const mockRpc = vi.fn().mockResolvedValue({ error: null });
      (supabase.rpc as any) = mockRpc;

      await apiKeyService.trackApiKeyUsage(testData.user.id, 'mistral');

      expect(mockRpc).toHaveBeenCalledWith('increment_api_key_usage', {
        p_user_id: testData.user.id,
        p_key_type: 'mistral',
      });
    });

    it('devrait gérer les erreurs sans throw', async () => {
      const { supabase } = await import('@/lib/supabase');

      const mockRpc = vi.fn().mockResolvedValue({
        error: { message: 'RPC failed' },
      });
      (supabase.rpc as any) = mockRpc;

      // Ne devrait pas throw
      await expect(
        apiKeyService.trackApiKeyUsage(testData.user.id, 'mistral')
      ).resolves.not.toThrow();
    });
  });
});
