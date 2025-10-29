import CryptoJS from 'crypto-js';
import { supabase } from '@/lib/supabase';
import config from '@/config';
import { logger } from '@/lib/browserLogger';

/**
 * Clé de chiffrement pour les clés API
 * Utilise la même clé que pour le chiffrement général
 */
const ENCRYPTION_KEY = config.security.encryptionKey;

if (!ENCRYPTION_KEY) {
  throw new Error(
    'ENCRYPTION_KEY manquante. La clé de chiffrement est requise pour sécuriser les clés API.'
  );
}

/**
 * Types de clés API supportés
 */
export type ApiKeyType = 'mistral' | 'openai';

/**
 * Résultat de validation d'une clé API
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Résultat d'enregistrement d'une clé API
 */
export interface SaveResult {
  success: boolean;
  error?: string;
}

/**
 * Données d'une clé API stockée
 */
export interface ApiKeyData {
  id: string;
  user_id?: string;
  organization_id?: string;
  key_type: ApiKeyType;
  key_name?: string;
  is_valid: boolean;
  last_validated_at?: string;
  validation_error?: string;
  last_used_at?: string;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * Service de gestion des clés API
 * Gère le cycle de vie complet des clés API : validation, chiffrement, stockage, récupération
 */
class ApiKeyService {
  /**
   * Chiffre une clé API avec AES-256
   * @param apiKey - Clé API en clair
   * @returns Clé chiffrée en base64
   */
  private encryptKey(apiKey: string): string {
    return CryptoJS.AES.encrypt(apiKey, ENCRYPTION_KEY).toString();
  }

  /**
   * Déchiffre une clé API
   * @param encryptedKey - Clé chiffrée en base64
   * @returns Clé API en clair
   */
  private decryptKey(encryptedKey: string): string {
    const bytes = CryptoJS.AES.decrypt(encryptedKey, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  /**
   * Valide une clé API Mistral en effectuant un appel test
   * @param apiKey - Clé API Mistral à valider
   * @returns Résultat de validation avec statut et erreur éventuelle
   */
  async validateMistralKey(apiKey: string): Promise<ValidationResult> {
    try {
      logger.debug('Validation de clé Mistral en cours...');

      // Appel test à l'API Mistral avec un message minimal
      const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'mistral-tiny',
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 5,
        }),
      });

      if (response.ok) {
        logger.info('Clé Mistral validée avec succès');
        return { valid: true };
      }

      // Gestion des erreurs spécifiques
      const errorData = await response.json().catch(() => ({}));
      
      if (response.status === 401) {
        logger.warn('Clé Mistral invalide (401)');
        return { valid: false, error: 'Clé API invalide ou expirée' };
      }

      if (response.status === 429) {
        logger.warn('Rate limit Mistral atteint (429)');
        return { valid: false, error: 'Limite de requêtes atteinte, réessayez plus tard' };
      }

      if (response.status === 403) {
        logger.warn('Quota Mistral dépassé (403)');
        return { valid: false, error: 'Quota dépassé ou accès refusé' };
      }

      logger.warn(`Erreur validation Mistral (${response.status}):`, errorData);
      return { 
        valid: false, 
        error: errorData.error?.message || `Erreur ${response.status}` 
      };

    } catch (error) {
      logger.error('Erreur lors de la validation de la clé Mistral:', error);
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Erreur de connexion' 
      };
    }
  }

  /**
   * Enregistre ou met à jour une clé API pour un utilisateur
   * @param userId - ID de l'utilisateur
   * @param apiKey - Clé API en clair
   * @param keyType - Type de clé (mistral, openai, etc.)
   * @param keyName - Nom optionnel pour identifier la clé
   * @returns Résultat de l'enregistrement
   */
  async saveUserApiKey(
    userId: string,
    apiKey: string,
    keyType: ApiKeyType = 'mistral',
    keyName?: string
  ): Promise<SaveResult> {
    try {
      logger.debug(`Enregistrement clé ${keyType} pour utilisateur`, { userId, keyName });

      // Validation de la clé avant enregistrement
      let validationResult: ValidationResult;
      
      if (keyType === 'mistral') {
        validationResult = await this.validateMistralKey(apiKey);
      } else {
        // Pour OpenAI ou autres, on pourrait ajouter d'autres validateurs
        logger.warn(`Type de clé ${keyType} non validé automatiquement`);
        validationResult = { valid: true }; // Accepter sans validation pour l'instant
      }

      if (!validationResult.valid) {
        logger.warn(`Validation échouée pour clé ${keyType}:`, validationResult.error);
        return {
          success: false,
          error: validationResult.error || 'Validation de la clé échouée',
        };
      }

      // Chiffrement de la clé
      const encryptedKey = this.encryptKey(apiKey);

      // Upsert dans la base de données
      const { error } = await (supabase
        .from('api_keys') as any)
        .upsert({
          user_id: userId,
          encrypted_key: encryptedKey,
          key_type: keyType,
          key_name: keyName,
          is_valid: true,
          last_validated_at: new Date().toISOString(),
          validation_error: null,
        }, {
          onConflict: 'user_id,key_type',
        });

      if (error) {
        logger.error(`Erreur lors de l'enregistrement de la clé ${keyType}:`, error);
        return {
          success: false,
          error: 'Erreur lors de l\'enregistrement de la clé',
        };
      }

      logger.info(`Clé ${keyType} enregistrée avec succès pour utilisateur`, { 
        userId, 
        keyType,
        keyName 
      });

      return { success: true };

    } catch (error) {
      logger.error('Erreur inattendue lors de l\'enregistrement de la clé:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  /**
   * Enregistre ou met à jour une clé API pour une organisation
   * @param organizationId - ID de l'organisation
   * @param apiKey - Clé API en clair
   * @param keyType - Type de clé (mistral, openai, etc.)
   * @param keyName - Nom optionnel pour identifier la clé
   * @returns Résultat de l'enregistrement
   */
  async saveOrganizationApiKey(
    organizationId: string,
    apiKey: string,
    keyType: ApiKeyType = 'mistral',
    keyName?: string
  ): Promise<SaveResult> {
    try {
      logger.debug(`Enregistrement clé ${keyType} pour organisation`, { 
        organizationId, 
        keyName 
      });

      // Validation de la clé
      let validationResult: ValidationResult;
      
      if (keyType === 'mistral') {
        validationResult = await this.validateMistralKey(apiKey);
      } else {
        validationResult = { valid: true };
      }

      if (!validationResult.valid) {
        logger.warn(`Validation échouée pour clé organisation ${keyType}:`, validationResult.error);
        return {
          success: false,
          error: validationResult.error || 'Validation de la clé échouée',
        };
      }

      // Chiffrement de la clé
      const encryptedKey = this.encryptKey(apiKey);

      // Upsert dans la base de données
      const { error } = await (supabase
        .from('api_keys') as any)
        .upsert({
          organization_id: organizationId,
          encrypted_key: encryptedKey,
          key_type: keyType,
          key_name: keyName,
          is_valid: true,
          last_validated_at: new Date().toISOString(),
          validation_error: null,
        }, {
          onConflict: 'organization_id,key_type',
        });

      if (error) {
        logger.error(`Erreur lors de l'enregistrement de la clé organisation ${keyType}:`, error);
        return {
          success: false,
          error: 'Erreur lors de l\'enregistrement de la clé',
        };
      }

      logger.info(`Clé ${keyType} enregistrée avec succès pour organisation`, { 
        organizationId, 
        keyType,
        keyName 
      });

      return { success: true };

    } catch (error) {
      logger.error('Erreur inattendue lors de l\'enregistrement de la clé organisation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  /**
   * Récupère la clé API déchiffrée d'un utilisateur
   * @param userId - ID de l'utilisateur
   * @param keyType - Type de clé à récupérer
   * @returns Clé API en clair ou null si non trouvée/invalide
   */
  async getUserApiKey(userId: string, keyType: ApiKeyType = 'mistral'): Promise<string | null> {
    try {
      logger.debug(`Récupération clé ${keyType} pour utilisateur`, { userId });

      const { data, error } = await (supabase
        .from('api_keys') as any)
        .select('encrypted_key, is_valid')
        .eq('user_id', userId)
        .eq('key_type', keyType)
        .single();

      if (error || !data) {
        logger.debug(`Aucune clé ${keyType} trouvée pour utilisateur`, { userId });
        return null;
      }

      if (!(data as any).is_valid) {
        logger.warn(`Clé ${keyType} invalide pour utilisateur`, { userId });
        return null;
      }

      // Déchiffrement de la clé
      const decryptedKey = this.decryptKey((data as any).encrypted_key);
      
      logger.debug(`Clé ${keyType} récupérée avec succès pour utilisateur`, { userId });
      return decryptedKey;

    } catch (error) {
      logger.error('Erreur lors de la récupération de la clé utilisateur:', error);
      return null;
    }
  }

  /**
   * Récupère la clé API déchiffrée d'une organisation
   * @param organizationId - ID de l'organisation
   * @param keyType - Type de clé à récupérer
   * @returns Clé API en clair ou null si non trouvée/invalide
   */
  async getOrganizationApiKey(
    organizationId: string, 
    keyType: ApiKeyType = 'mistral'
  ): Promise<string | null> {
    try {
      logger.debug(`Récupération clé ${keyType} pour organisation`, { organizationId });

      const { data, error } = await (supabase
        .from('api_keys') as any)
        .select('encrypted_key, is_valid')
        .eq('organization_id', organizationId)
        .eq('key_type', keyType)
        .single();

      if (error || !data) {
        logger.debug(`Aucune clé ${keyType} trouvée pour organisation`, { organizationId });
        return null;
      }

      if (!(data as any).is_valid) {
        logger.warn(`Clé ${keyType} invalide pour organisation`, { organizationId });
        return null;
      }

      // Déchiffrement de la clé
      const decryptedKey = this.decryptKey((data as any).encrypted_key);
      
      logger.debug(`Clé ${keyType} récupérée avec succès pour organisation`, { organizationId });
      return decryptedKey;

    } catch (error) {
      logger.error('Erreur lors de la récupération de la clé organisation:', error);
      return null;
    }
  }

  /**
   * Supprime une clé API d'un utilisateur
   * @param userId - ID de l'utilisateur
   * @param keyType - Type de clé à supprimer
   * @returns true si suppression réussie, false sinon
   */
  async deleteApiKey(userId: string, keyType: ApiKeyType = 'mistral'): Promise<boolean> {
    try {
      logger.debug(`Suppression clé ${keyType} pour utilisateur`, { userId });

      const { error } = await (supabase
        .from('api_keys') as any)
        .delete()
        .eq('user_id', userId)
        .eq('key_type', keyType);

      if (error) {
        logger.error(`Erreur lors de la suppression de la clé ${keyType}:`, error);
        return false;
      }

      logger.info(`Clé ${keyType} supprimée avec succès pour utilisateur`, { userId });
      return true;

    } catch (error) {
      logger.error('Erreur inattendue lors de la suppression de la clé:', error);
      return false;
    }
  }

  /**
   * Enregistre l'utilisation d'une clé API (incrémente le compteur)
   * @param userId - ID de l'utilisateur
   * @param keyType - Type de clé utilisée
   */
  async trackApiKeyUsage(userId: string, keyType: ApiKeyType = 'mistral'): Promise<void> {
    try {
      logger.debug(`Tracking usage clé ${keyType} pour utilisateur`, { userId });

      const { error } = await (supabase as any).rpc('increment_api_key_usage', {
        p_user_id: userId,
        p_key_type: keyType,
      });

      if (error) {
        logger.warn(`Erreur lors du tracking d'usage de la clé ${keyType}:`, error);
      }

    } catch (error) {
      logger.error('Erreur inattendue lors du tracking d\'usage:', error);
    }
  }

  /**
   * Enregistre l'utilisation d'une clé API d'organisation
   * @param organizationId - ID de l'organisation
   * @param keyType - Type de clé utilisée
   */
  async trackOrganizationApiKeyUsage(
    organizationId: string, 
    keyType: ApiKeyType = 'mistral'
  ): Promise<void> {
    try {
      logger.debug(`Tracking usage clé ${keyType} pour organisation`, { organizationId });

      const { error } = await (supabase as any).rpc('increment_org_api_key_usage', {
        p_organization_id: organizationId,
        p_key_type: keyType,
      });

      if (error) {
        logger.warn(`Erreur lors du tracking d'usage de la clé organisation ${keyType}:`, error);
      }

    } catch (error) {
      logger.error('Erreur inattendue lors du tracking d\'usage organisation:', error);
    }
  }

  /**
   * Récupère les informations d'une clé API (sans la clé elle-même)
   * @param userId - ID de l'utilisateur
   * @param keyType - Type de clé
   * @returns Données de la clé ou null
   */
  async getApiKeyInfo(userId: string, keyType: ApiKeyType = 'mistral'): Promise<ApiKeyData | null> {
    try {
      const { data, error } = await (supabase
        .from('api_keys') as any)
        .select('*')
        .eq('user_id', userId)
        .eq('key_type', keyType)
        .single();

      if (error || !data) {
        return null;
      }

      // Ne pas retourner la clé chiffrée
      const { encrypted_key, ...keyInfo } = data as any;
      return keyInfo as ApiKeyData;

    } catch (error) {
      logger.error('Erreur lors de la récupération des infos de clé:', error);
      return null;
    }
  }
}

// Export singleton
export const apiKeyService = new ApiKeyService();

// Export classe pour tests
export { ApiKeyService };
