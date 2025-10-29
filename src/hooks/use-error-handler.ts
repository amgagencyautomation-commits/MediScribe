import { useState, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';

export interface ErrorInfo {
  message: string;
  code?: string;
  details?: any;
}

export const useErrorHandler = () => {
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<ErrorInfo | null>(null);

  const handleError = useCallback((error: any, context?: string) => {
    console.error(`Erreur${context ? ` dans ${context}` : ''}:`, error);

    let errorInfo: ErrorInfo = {
      message: 'Une erreur inattendue est survenue',
      code: 'UNKNOWN_ERROR'
    };

    // Gestion des erreurs spécifiques
    if (error instanceof Error) {
      errorInfo.message = error.message;
      
      // Erreurs réseau
      if (error.message.includes('fetch') || error.message.includes('network')) {
        errorInfo = {
          message: 'Erreur de connexion. Vérifiez votre connexion internet.',
          code: 'NETWORK_ERROR'
        };
      }
      
      // Erreurs d'authentification
      if (error.message.includes('auth') || error.message.includes('401')) {
        errorInfo = {
          message: 'Session expirée. Veuillez vous reconnecter.',
          code: 'AUTH_ERROR'
        };
      }
      
      // Erreurs d'API
      if (error.message.includes('API') || error.message.includes('500')) {
        errorInfo = {
          message: 'Erreur du serveur. Veuillez réessayer plus tard.',
          code: 'API_ERROR'
        };
      }
      
      // Erreurs de clé API
      if (error.message.includes('Clé API') || error.message.includes('API key')) {
        errorInfo = {
          message: 'Clé API invalide ou manquante. Vérifiez votre configuration.',
          code: 'API_KEY_ERROR'
        };
      }
    }

    // Erreurs de réponse HTTP
    if (error?.response) {
      const status = error.response.status;
      switch (status) {
        case 400:
          errorInfo = {
            message: 'Données invalides. Vérifiez vos informations.',
            code: 'BAD_REQUEST'
          };
          break;
        case 401:
          errorInfo = {
            message: 'Non autorisé. Vérifiez vos identifiants.',
            code: 'UNAUTHORIZED'
          };
          break;
        case 403:
          errorInfo = {
            message: 'Accès refusé. Vous n\'avez pas les permissions nécessaires.',
            code: 'FORBIDDEN'
          };
          break;
        case 404:
          errorInfo = {
            message: 'Ressource non trouvée.',
            code: 'NOT_FOUND'
          };
          break;
        case 429:
          errorInfo = {
            message: 'Trop de requêtes. Veuillez patienter avant de réessayer.',
            code: 'RATE_LIMITED'
          };
          break;
        case 500:
          errorInfo = {
            message: 'Erreur interne du serveur. Veuillez réessayer plus tard.',
            code: 'SERVER_ERROR'
          };
          break;
        default:
          errorInfo = {
            message: `Erreur HTTP ${status}. Veuillez réessayer.`,
            code: `HTTP_${status}`
          };
      }
    }

    setError(errorInfo);
    setIsError(true);

    // Afficher une notification toast
    toast({
      title: 'Erreur',
      description: errorInfo.message,
      variant: 'destructive',
    });

    return errorInfo;
  }, []);

  const clearError = useCallback(() => {
    setIsError(false);
    setError(null);
  }, []);

  const retry = useCallback((retryFn: () => void) => {
    clearError();
    retryFn();
  }, [clearError]);

  return {
    isError,
    error,
    handleError,
    clearError,
    retry
  };
};
