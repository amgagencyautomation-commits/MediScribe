import { ZodError } from 'zod';
import { logger } from '@/lib/browserLogger';

/**
 * Erreur user-friendly avec titre, message et action optionnelle
 */
export interface UserFriendlyError {
  title: string;
  message: string;
  action?: string;
  technical?: string; // Message technique pour les développeurs
}

/**
 * Gère les erreurs API et retourne un message user-friendly
 * @param error - Erreur à gérer
 * @returns Erreur formatée pour l'utilisateur
 */
export function handleApiError(error: unknown): UserFriendlyError {
  logger.error('Erreur API', error instanceof Error ? error : new Error(String(error)));

  // Erreur réseau
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      title: 'Erreur de connexion',
      message: 'Impossible de se connecter au serveur. Vérifiez votre connexion internet.',
      action: 'Réessayer',
    };
  }

  // Erreur avec response HTTP
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as any).status;

    switch (status) {
      case 400:
        return {
          title: 'Requête invalide',
          message: 'Les données envoyées sont invalides. Veuillez vérifier votre saisie.',
          technical: (error as any).message,
        };

      case 401:
        return {
          title: 'Non authentifié',
          message: 'Votre session a expiré. Veuillez vous reconnecter.',
          action: 'Se reconnecter',
        };

      case 403:
        return {
          title: 'Accès refusé',
          message: 'Vous n\'avez pas les permissions nécessaires pour effectuer cette action.',
        };

      case 404:
        return {
          title: 'Ressource introuvable',
          message: 'La ressource demandée n\'existe pas ou a été supprimée.',
        };

      case 429:
        return {
          title: 'Trop de requêtes',
          message: 'Vous avez effectué trop de requêtes. Veuillez patienter quelques instants.',
          action: 'Réessayer plus tard',
        };

      case 500:
        return {
          title: 'Erreur serveur',
          message: 'Une erreur est survenue sur le serveur. Nos équipes ont été notifiées.',
          action: 'Réessayer',
        };

      case 503:
        return {
          title: 'Service indisponible',
          message: 'Le service est temporairement indisponible. Veuillez réessayer dans quelques instants.',
          action: 'Réessayer',
        };

      default:
        return {
          title: 'Erreur',
          message: `Une erreur est survenue (code ${status}).`,
          technical: (error as any).message,
        };
    }
  }

  // Erreur générique
  if (error instanceof Error) {
    return {
      title: 'Erreur',
      message: error.message || 'Une erreur inattendue est survenue.',
      technical: error.stack,
    };
  }

  return {
    title: 'Erreur inconnue',
    message: 'Une erreur inattendue est survenue. Veuillez réessayer.',
  };
}

/**
 * Gère les erreurs réseau
 * @returns Erreur formatée
 */
export function handleNetworkError(): UserFriendlyError {
  logger.error('Erreur réseau détectée');

  return {
    title: 'Erreur de connexion',
    message: 'Impossible de se connecter au serveur. Vérifiez votre connexion internet et réessayez.',
    action: 'Réessayer',
  };
}

/**
 * Gère les erreurs de validation Zod
 * @param zodError - Erreur Zod
 * @returns Erreur formatée
 */
export function handleValidationError(zodError: ZodError): UserFriendlyError {
  logger.warn('Erreur de validation', { errors: zodError.errors });

  const firstError = zodError.errors[0];
  const field = firstError?.path.join('.') || 'champ';
  const message = firstError?.message || 'Valeur invalide';

  return {
    title: 'Données invalides',
    message: `${field}: ${message}`,
    technical: JSON.stringify(zodError.errors, null, 2),
  };
}

/**
 * Gère les erreurs de quota API (Mistral, OpenAI, etc.)
 * @param provider - Fournisseur API (mistral, openai, etc.)
 * @returns Erreur formatée
 */
export function handleQuotaError(provider: string = 'API'): UserFriendlyError {
  logger.warn('Quota API dépassé', { provider });

  return {
    title: 'Quota dépassé',
    message: `Votre quota ${provider} est dépassé. Veuillez vérifier votre abonnement ou réessayer plus tard.`,
    action: 'Vérifier mon abonnement',
  };
}

/**
 * Gère les erreurs de clé API invalide
 * @param provider - Fournisseur API
 * @returns Erreur formatée
 */
export function handleInvalidApiKeyError(provider: string = 'API'): UserFriendlyError {
  logger.error('Clé API invalide', { provider });

  return {
    title: 'Clé API invalide',
    message: `Votre clé ${provider} est invalide ou a expiré. Veuillez la vérifier dans les paramètres.`,
    action: 'Configurer ma clé API',
  };
}

/**
 * Gère les erreurs de fichier (taille, format, etc.)
 * @param reason - Raison de l'erreur
 * @returns Erreur formatée
 */
export function handleFileError(reason: 'size' | 'format' | 'upload'): UserFriendlyError {
  logger.warn('Erreur de fichier', { reason });

  switch (reason) {
    case 'size':
      return {
        title: 'Fichier trop volumineux',
        message: 'Le fichier dépasse la taille maximale autorisée (25 MB).',
        action: 'Choisir un autre fichier',
      };

    case 'format':
      return {
        title: 'Format non supporté',
        message: 'Le format du fichier n\'est pas supporté. Utilisez MP3, WAV, WEBM ou M4A.',
        action: 'Choisir un autre fichier',
      };

    case 'upload':
      return {
        title: 'Échec de l\'upload',
        message: 'L\'upload du fichier a échoué. Vérifiez votre connexion et réessayez.',
        action: 'Réessayer',
      };

    default:
      return {
        title: 'Erreur de fichier',
        message: 'Une erreur est survenue avec le fichier.',
      };
  }
}

/**
 * Gère les erreurs de transcription
 * @param error - Erreur originale
 * @returns Erreur formatée
 */
export function handleTranscriptionError(error: unknown): UserFriendlyError {
  logger.error('Erreur de transcription', error instanceof Error ? error : new Error(String(error)));

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes('quota')) {
      return handleQuotaError('Mistral');
    }

    if (message.includes('invalid') || message.includes('401')) {
      return handleInvalidApiKeyError('Mistral');
    }

    if (message.includes('format') || message.includes('file')) {
      return handleFileError('format');
    }

    if (message.includes('network') || message.includes('timeout')) {
      return handleNetworkError();
    }

    return {
      title: 'Erreur de transcription',
      message: error.message,
      action: 'Réessayer',
    };
  }

  return {
    title: 'Erreur de transcription',
    message: 'La transcription a échoué. Veuillez réessayer.',
    action: 'Réessayer',
  };
}

/**
 * Gère les erreurs de génération de rapport
 * @param error - Erreur originale
 * @returns Erreur formatée
 */
export function handleReportGenerationError(error: unknown): UserFriendlyError {
  logger.error('Erreur de génération de rapport', error instanceof Error ? error : new Error(String(error)));

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes('quota')) {
      return handleQuotaError('Mistral');
    }

    if (message.includes('invalid') || message.includes('401')) {
      return handleInvalidApiKeyError('Mistral');
    }

    if (message.includes('network') || message.includes('timeout')) {
      return handleNetworkError();
    }

    return {
      title: 'Erreur de génération',
      message: error.message,
      action: 'Réessayer',
    };
  }

  return {
    title: 'Erreur de génération',
    message: 'La génération du rapport a échoué. Veuillez réessayer.',
    action: 'Réessayer',
  };
}

/**
 * Classe d'erreur personnalisée pour les erreurs métier
 */
export class BusinessError extends Error {
  constructor(
    message: string,
    public title: string = 'Erreur',
    public action?: string
  ) {
    super(message);
    this.name = 'BusinessError';
  }

  toUserFriendly(): UserFriendlyError {
    return {
      title: this.title,
      message: this.message,
      action: this.action,
    };
  }
}
