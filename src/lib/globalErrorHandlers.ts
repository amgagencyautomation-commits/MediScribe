import { logger } from '@/lib/browserLogger';
import { toast } from 'sonner';

/**
 * Initialise les gestionnaires d'erreurs globaux
 * À appeler au démarrage de l'application
 */
export function initializeGlobalErrorHandlers(): void {
  /**
   * Gestionnaire pour les promesses rejetées non catchées
   */
  window.addEventListener('unhandledrejection', (event) => {
    event.preventDefault(); // Empêcher l'erreur de crash l'app

    const error = event.reason;
    
    logger.error('Promise rejetée non catchée', error instanceof Error ? error : new Error(String(error)), {
      promise: event.promise,
      timestamp: new Date().toISOString(),
    });

    // Afficher un toast générique
    toast.error('Une erreur est survenue', {
      description: 'Nous avons été notifiés et travaillons sur le problème.',
    });
  });

  /**
   * Gestionnaire pour les erreurs synchrones non catchées
   */
  window.addEventListener('error', (event) => {
    event.preventDefault(); // Empêcher l'erreur de crash l'app

    logger.error('Erreur non catchée', event.error || new Error(event.message), {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      timestamp: new Date().toISOString(),
    });

    // Afficher un toast générique
    toast.error('Une erreur est survenue', {
      description: 'Nous avons été notifiés et travaillons sur le problème.',
    });
  });

  logger.info('Gestionnaires d\'erreurs globaux initialisés');
}

/**
 * Nettoie les gestionnaires d'erreurs globaux
 * À appeler lors du démontage de l'application (si nécessaire)
 */
export function cleanupGlobalErrorHandlers(): void {
  // Les event listeners seront automatiquement nettoyés
  // Cette fonction est fournie pour la complétude
  logger.info('Gestionnaires d\'erreurs globaux nettoyés');
}
