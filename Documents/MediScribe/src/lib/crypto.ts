import CryptoJS from 'crypto-js';
import config from '@/config';
import { logger } from '@/lib/browserLogger';

/**
 * Crypte une clé API avec AES-256
 */
export const encryptApiKey = (apiKey: string): string => {
  return CryptoJS.AES.encrypt(apiKey, config.security.encryptionKey).toString();
};

/**
 * Décrypte une clé API
 */
export const decryptApiKey = (encryptedKey: string): string => {
  const bytes = CryptoJS.AES.decrypt(encryptedKey, config.security.encryptionKey);
  return bytes.toString(CryptoJS.enc.Utf8);
};

/**
 * Teste la validité d'une clé Mistral AI
 * @param apiKey - Clé API à tester
 * @returns true si la clé est valide, false sinon
 */
export async function testMistralKey(apiKey: string): Promise<boolean> {
  try {
    // Vérifier le format de base de la clé
    if (!apiKey || apiKey.trim().length === 0) {
      return false;
    }

    // Tester directement avec l'API Mistral
    const response = await fetch('https://api.mistral.ai/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
    
    // Si la requête réussit (200), la clé est valide
    return response.ok;
  } catch (error) {
    logger.error('Erreur lors du test de la clé Mistral AI', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
};
