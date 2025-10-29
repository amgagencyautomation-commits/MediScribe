import { useCallback } from 'react';
import { toast } from 'sonner';
import { ZodError } from 'zod';
import {
  handleApiError,
  handleNetworkError,
  handleValidationError,
  handleTranscriptionError,
  handleReportGenerationError,
  handleFileError,
  UserFriendlyError,
  BusinessError,
} from '@/lib/errorHandler';

/**
 * Hook pour gérer les erreurs de manière cohérente dans l'application
 * Affiche des toasts user-friendly et log les erreurs
 */
export function useErrorHandler() {
  /**
   * Affiche un toast d'erreur
   */
  const showError = useCallback((error: UserFriendlyError) => {
    toast.error(error.title, {
      description: error.message,
      action: error.action ? {
        label: error.action,
        onClick: () => {
          // L'action sera gérée par le composant parent
        },
      } : undefined,
    });
  }, []);

  /**
   * Gère une erreur API
   */
  const handleError = useCallback((error: unknown) => {
    if (error instanceof BusinessError) {
      showError(error.toUserFriendly());
      return;
    }

    if (error instanceof ZodError) {
      showError(handleValidationError(error));
      return;
    }

    showError(handleApiError(error));
  }, [showError]);

  /**
   * Gère une erreur réseau
   */
  const handleNetwork = useCallback(() => {
    showError(handleNetworkError());
  }, [showError]);

  /**
   * Gère une erreur de validation
   */
  const handleValidation = useCallback((error: ZodError) => {
    showError(handleValidationError(error));
  }, [showError]);

  /**
   * Gère une erreur de transcription
   */
  const handleTranscription = useCallback((error: unknown) => {
    showError(handleTranscriptionError(error));
  }, [showError]);

  /**
   * Gère une erreur de génération de rapport
   */
  const handleReportGeneration = useCallback((error: unknown) => {
    showError(handleReportGenerationError(error));
  }, [showError]);

  /**
   * Gère une erreur de fichier
   */
  const handleFile = useCallback((reason: 'size' | 'format' | 'upload') => {
    showError(handleFileError(reason));
  }, [showError]);

  /**
   * Affiche un message de succès
   */
  const showSuccess = useCallback((title: string, message?: string) => {
    toast.success(title, {
      description: message,
    });
  }, []);

  /**
   * Affiche un message d'information
   */
  const showInfo = useCallback((title: string, message?: string) => {
    toast.info(title, {
      description: message,
    });
  }, []);

  /**
   * Affiche un avertissement
   */
  const showWarning = useCallback((title: string, message?: string) => {
    toast.warning(title, {
      description: message,
    });
  }, []);

  return {
    handleError,
    handleNetwork,
    handleValidation,
    handleTranscription,
    handleReportGeneration,
    handleFile,
    showError,
    showSuccess,
    showInfo,
    showWarning,
  };
}
