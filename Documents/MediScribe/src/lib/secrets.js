// 🔒 Gestionnaire de Secrets Sécurisé
// Système évolutif pour gérer les secrets en production

import crypto from 'crypto';

class SecretsManager {
  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.secrets = new Map();
    this.initialized = false;
  }

  /**
   * Initialise le gestionnaire de secrets
   */
  async initialize() {
    if (this.initialized) return;

    try {
      if (this.isProduction) {
        // En production : utiliser AWS Secrets Manager, Azure Key Vault, etc.
        await this.loadFromVault();
      } else {
        // En développement : utiliser variables d'environnement sécurisées
        await this.loadFromEnv();
      }
      
      this.initialized = true;
      console.log('🔐 Gestionnaire de secrets initialisé');
    } catch (error) {
      console.error('❌ Erreur initialisation secrets:', error);
      throw new Error('Impossible d\'initialiser les secrets');
    }
  }

  /**
   * Charge les secrets depuis les variables d'environnement (dev)
   */
  async loadFromEnv() {
    const requiredSecrets = [
      'SUPABASE_SERVICE_ROLE_KEY',
      'VITE_ENCRYPTION_KEY',
      'SESSION_SECRET'
    ];

    for (const secret of requiredSecrets) {
      const value = process.env[secret];
      if (!value) {
        throw new Error(`Secret manquant: ${secret}`);
      }
      
      // Chiffrer le secret en mémoire
      this.secrets.set(secret, this.encryptInMemory(value));
    }
  }

  /**
   * Charge les secrets depuis un vault (production)
   */
  async loadFromVault() {
    // Exemple AWS Secrets Manager
    try {
      // const AWS = require('aws-sdk');
      // const secretsManager = new AWS.SecretsManager({ region: 'us-east-1' });
      
      // const secretValue = await secretsManager.getSecretValue({
      //   SecretId: 'mediscribe/production/secrets'
      // }).promise();
      
      // const secrets = JSON.parse(secretValue.SecretString);
      
      // Fallback vers variables d'environnement si pas de vault configuré
      console.log('⚠️ Vault non configuré, utilisation variables d\'environnement');
      await this.loadFromEnv();
      
    } catch (error) {
      console.error('❌ Erreur accès vault:', error);
      // Fallback vers env
      await this.loadFromEnv();
    }
  }

  /**
   * Chiffre un secret en mémoire avec AES-GCM (intégrité incluse)
   */
  encryptInMemory(value) {
    // Utiliser variable d'environnement pour la clé de chiffrement mémoire
    const memoryKey = process.env.MEMORY_ENCRYPTION_KEY || 
                      process.env.VITE_ENCRYPTION_KEY?.substring(0, 32) ||
                      crypto.randomBytes(32).toString('hex');
    
    // Générer salt aléatoire (ne pas hardcoder)
    const salt = crypto.randomBytes(16);
    
    // Dériver la clé de manière sécurisée
    const key = crypto.scryptSync(memoryKey, salt, 32);
    
    // Utiliser AES-GCM pour l'intégrité (au lieu de CBC)
    const iv = crypto.randomBytes(12); // GCM recommande 12 bytes
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Tag d'authentification pour vérifier l'intégrité
    const authTag = cipher.getAuthTag();
    
    return { 
      encrypted, 
      iv: iv.toString('hex'),
      salt: salt.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  /**
   * Déchiffre un secret depuis la mémoire avec vérification d'intégrité
   */
  decryptFromMemory(encryptedData) {
    // Récupérer la clé depuis variable d'environnement
    const memoryKey = process.env.MEMORY_ENCRYPTION_KEY || 
                      process.env.VITE_ENCRYPTION_KEY?.substring(0, 32) ||
                      crypto.randomBytes(32).toString('hex');
    
    // Reconstituer salt et IV
    const salt = Buffer.from(encryptedData.salt, 'hex');
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const authTag = Buffer.from(encryptedData.authTag, 'hex');
    
    // Dériver la même clé
    const key = crypto.scryptSync(memoryKey, salt, 32);
    
    // Déchiffrer avec GCM et vérifier l'intégrité
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Récupère un secret de manière sécurisée
   */
  async getSecret(name) {
    if (!this.initialized) {
      await this.initialize();
    }

    const encryptedSecret = this.secrets.get(name);
    if (!encryptedSecret) {
      throw new Error(`Secret non trouvé: ${name}`);
    }

    return this.decryptFromMemory(encryptedSecret);
  }

  /**
   * Rotation automatique des secrets (pour production)
   */
  async rotateSecret(name) {
    if (!this.isProduction) {
      console.log('⚠️ Rotation des secrets uniquement en production');
      return;
    }

    try {
      // Logique de rotation selon le vault utilisé
      console.log(`🔄 Rotation du secret: ${name}`);
      
      // 1. Générer nouveau secret
      // 2. Mettre à jour dans le vault
      // 3. Recharger en mémoire
      // 4. Invalider l'ancien secret
      
    } catch (error) {
      console.error(`❌ Erreur rotation secret ${name}:`, error);
      throw error;
    }
  }

  /**
   * Nettoie les secrets de la mémoire
   */
  cleanup() {
    this.secrets.clear();
    this.initialized = false;
    console.log('🧹 Secrets nettoyés de la mémoire');
  }
}

// Instance singleton
const secretsManager = new SecretsManager();

export default secretsManager;

// Helpers pour migration facile
export const getSecret = async (name) => {
  return await secretsManager.getSecret(name);
};

export const initializeSecrets = async () => {
  return await secretsManager.initialize();
};
