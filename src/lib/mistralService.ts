import { Mistral } from '@mistralai/mistralai';
import config from '@/config';
import { logger } from '@/lib/browserLogger';

/**
 * Configuration du service Mistral
 */
export interface MistralServiceConfig {
  apiKey?: string;
}

/**
 * Paramètres pour la génération de compte rendu médical
 */
export interface GenerateReportParams {
  transcription: string;
  specialty?: string;
  consultationType?: string;
  patientAge?: number;
}

/**
 * Service Mistral AI pour transcription audio et génération de comptes rendus médicaux
 * Support BYOK (Bring Your Own Key) et clé de développement
 */
class MistralService {
  private client: any; // Type any temporairement pour éviter les erreurs TypeScript
  private apiKey: string;

  /**
   * Crée une instance du service Mistral
   * @param config - Configuration optionnelle avec clé API custom
   */
  constructor(config?: MistralServiceConfig) {
    // Mode BYOK : utiliser la clé fournie
    // Mode Dev : utiliser la clé depuis la configuration
    this.apiKey = config?.apiKey || import.meta.env.VITE_MISTRAL_API_KEY || '';

    if (!this.apiKey) {
      logger.warn('Aucune clé API Mistral configurée. Le service ne fonctionnera pas.');
    }

    this.client = new Mistral({
      apiKey: this.apiKey,
    });

    logger.debug('Service Mistral initialisé', {
      mode: config?.apiKey ? 'BYOK' : 'Dev',
      hasKey: !!this.apiKey,
    });
  }

  /**
   * Transcrit un fichier audio en texte avec Mistral Voxtral
   * @param audioFile - Fichier audio à transcrire
   * @returns Transcription en texte
   */
  async transcribeAudio(audioFile: File): Promise<string> {
    const startTime = Date.now();
    
    try {
      logger.info('Début transcription audio', {
        fileName: audioFile.name,
        fileSize: audioFile.size,
        fileType: audioFile.type,
      });

      if (!this.apiKey) {
        throw new Error('Clé API Mistral manquante. Veuillez configurer votre clé API.');
      }

      // Appel à l'API Mistral pour transcription
      const response = await this.client.audio.transcriptions.create({
        file: audioFile,
        model: 'voxtral-mini-transcribe',
        language: 'fr',
      });

      const duration = Date.now() - startTime;
      const transcription = response.text || '';

      logger.info('Transcription terminée', {
        duration: `${duration}ms`,
        textLength: transcription.length,
        fileName: audioFile.name,
      });

      return transcription;

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Erreur lors de la transcription', {
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      });

      throw this.handleTranscriptionError(error);
    }
  }

  /**
   * Génère un compte rendu médical structuré à partir d'une transcription
   * @param params - Paramètres de génération (transcription, spécialité, etc.)
   * @returns Compte rendu médical formaté
   */
  async generateMedicalReport(params: GenerateReportParams): Promise<string> {
    const { transcription, specialty, consultationType, patientAge } = params;
    const startTime = Date.now();

    try {
      logger.info('Début génération compte rendu', {
        specialty: specialty || 'généraliste',
        consultationType: consultationType || 'consultation générale',
        transcriptionLength: transcription.length,
        patientAge,
      });

      if (!this.apiKey) {
        throw new Error('Clé API Mistral manquante. Veuillez configurer votre clé API.');
      }

      // Construction du prompt système
      const systemPrompt = `Tu es un assistant médical professionnel français spécialisé en ${specialty || 'médecine générale'}.
Ta mission est de générer des comptes rendus médicaux structurés, précis et conformes aux standards médicaux français.
Tu dois utiliser un vocabulaire médical approprié tout en restant clair et professionnel.`;

      // Construction du prompt utilisateur
      const userPrompt = `Génère un compte rendu médical professionnel basé sur cette transcription de ${consultationType || 'consultation générale'}.
${patientAge ? `Le patient a ${patientAge} ans.` : ''}

TRANSCRIPTION:
${transcription}

INSTRUCTIONS:
- Structure le compte rendu de manière professionnelle et médicale
- Utilise un vocabulaire médical approprié et précis
- Sois concis mais complet
- Respecte la confidentialité médicale
- Utilise des termes médicaux français standards

FORMAT REQUIS:
1. MOTIF DE CONSULTATION
2. ANTÉCÉDENTS PERTINENTS
3. EXAMEN CLINIQUE
4. DIAGNOSTIC(S) / HYPOTHÈSES DIAGNOSTIQUES
5. TRAITEMENT / PRESCRIPTIONS
6. PLAN DE SUIVI

Compte rendu médical:`;

      // Appel à l'API Mistral
      const response = await this.client.chat.complete({
        model: 'mistral-large-latest',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        maxTokens: 2000,
      });

      const duration = Date.now() - startTime;
      const report = response.choices?.[0]?.message?.content;

      if (!report) {
        throw new Error('Aucun contenu généré par Mistral');
      }

      const tokensUsed = response.usage?.totalTokens || 0;

      logger.info('Génération compte rendu terminée', {
        duration: `${duration}ms`,
        reportLength: report.length,
        tokensUsed,
        specialty: specialty || 'généraliste',
      });

      return report;

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Erreur lors de la génération du compte rendu', {
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      });

      throw this.handleGenerationError(error);
    }
  }

  /**
   * Teste la validité d'une clé API Mistral
   * @param apiKey - Clé API à tester
   * @returns true si la clé est valide, false sinon
   */
  async testApiKey(apiKey: string): Promise<boolean> {
    try {
      logger.debug('Test de clé API Mistral');

      // Créer un client temporaire avec la clé à tester
      const testClient = new Mistral({ apiKey });

      // Appel minimal pour tester la clé
      await testClient.chat.complete({
        model: 'mistral-tiny',
        messages: [{ role: 'user', content: 'test' }],
        maxTokens: 5,
      });

      logger.info('Clé API Mistral valide');
      return true;

    } catch (error) {
      logger.warn('Clé API Mistral invalide', {
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      });
      return false;
    }
  }

  /**
   * Gère les erreurs de transcription et retourne une erreur user-friendly
   * @param error - Erreur originale
   * @returns Erreur formatée
   */
  private handleTranscriptionError(error: unknown): Error {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      // Erreur de quota
      if (message.includes('quota') || message.includes('429')) {
        return new Error(
          'Quota de transcription dépassé. Veuillez réessayer plus tard ou vérifier votre abonnement Mistral.'
        );
      }

      // Erreur d'authentification
      if (message.includes('401') || message.includes('unauthorized') || message.includes('invalid api key')) {
        return new Error(
          'Clé API Mistral invalide ou expirée. Veuillez vérifier votre clé API dans les paramètres.'
        );
      }

      // Erreur de réseau
      if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
        return new Error(
          'Erreur de connexion au service Mistral. Vérifiez votre connexion internet et réessayez.'
        );
      }

      // Erreur de fichier
      if (message.includes('file') || message.includes('format')) {
        return new Error(
          'Format de fichier audio non supporté. Utilisez un fichier MP3, WAV, WEBM ou M4A.'
        );
      }

      // Erreur générique avec message original
      return new Error(`Erreur de transcription: ${error.message}`);
    }

    return new Error('Erreur inconnue lors de la transcription');
  }

  /**
   * Gère les erreurs de génération et retourne une erreur user-friendly
   * @param error - Erreur originale
   * @returns Erreur formatée
   */
  private handleGenerationError(error: unknown): Error {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      // Erreur de quota
      if (message.includes('quota') || message.includes('429')) {
        return new Error(
          'Quota de génération dépassé. Veuillez réessayer plus tard ou vérifier votre abonnement Mistral.'
        );
      }

      // Erreur d'authentification
      if (message.includes('401') || message.includes('unauthorized') || message.includes('invalid api key')) {
        return new Error(
          'Clé API Mistral invalide ou expirée. Veuillez vérifier votre clé API dans les paramètres.'
        );
      }

      // Erreur de réseau
      if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
        return new Error(
          'Erreur de connexion au service Mistral. Vérifiez votre connexion internet et réessayez.'
        );
      }

      // Erreur de contenu
      if (message.includes('content') || message.includes('moderation')) {
        return new Error(
          'Le contenu de la transcription a été rejeté par les filtres de sécurité. Veuillez vérifier le contenu.'
        );
      }

      // Erreur générique avec message original
      return new Error(`Erreur de génération: ${error.message}`);
    }

    return new Error('Erreur inconnue lors de la génération du compte rendu');
  }
}

// Export singleton avec configuration par défaut
export const mistralService = new MistralService();

// Export classe pour instanciation custom (BYOK)
export { MistralService };
