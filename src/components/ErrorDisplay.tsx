import { AlertCircle, XCircle, AlertTriangle, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserFriendlyError } from '@/lib/errorHandler';

/**
 * Variants d'affichage de l'erreur
 */
export type ErrorDisplayVariant = 'inline' | 'card' | 'page';

/**
 * Niveau de sévérité de l'erreur
 */
export type ErrorSeverity = 'error' | 'warning' | 'info';

interface ErrorDisplayProps {
  error: UserFriendlyError;
  variant?: ErrorDisplayVariant;
  severity?: ErrorSeverity;
  onAction?: () => void;
  onDismiss?: () => void;
  className?: string;
}

/**
 * Composant réutilisable pour afficher les erreurs de manière cohérente
 */
export function ErrorDisplay({
  error,
  variant = 'inline',
  severity = 'error',
  onAction,
  onDismiss,
  className = '',
}: ErrorDisplayProps) {
  const getIcon = () => {
    switch (severity) {
      case 'error':
        return <XCircle className="h-5 w-5" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5" />;
      case 'info':
        return <Info className="h-5 w-5" />;
      default:
        return <AlertCircle className="h-5 w-5" />;
    }
  };

  const getAlertVariant = () => {
    return severity === 'error' ? 'destructive' : 'default';
  };

  /**
   * Affichage inline (Alert)
   */
  if (variant === 'inline') {
    return (
      <Alert variant={getAlertVariant()} className={className}>
        {getIcon()}
        <AlertTitle>{error.title}</AlertTitle>
        <AlertDescription className="mt-2">
          {error.message}
          {error.action && onAction && (
            <Button
              variant="outline"
              size="sm"
              onClick={onAction}
              className="mt-3"
            >
              {error.action}
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  /**
   * Affichage card
   */
  if (variant === 'card') {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center gap-2">
            {getIcon()}
            <CardTitle>{error.title}</CardTitle>
          </div>
          <CardDescription>{error.message}</CardDescription>
        </CardHeader>
        {(error.action || onDismiss) && (
          <CardContent className="flex gap-2">
            {error.action && onAction && (
              <Button onClick={onAction} variant="default">
                {error.action}
              </Button>
            )}
            {onDismiss && (
              <Button onClick={onDismiss} variant="outline">
                Fermer
              </Button>
            )}
          </CardContent>
        )}
      </Card>
    );
  }

  /**
   * Affichage page complète
   */
  if (variant === 'page') {
    return (
      <div className={`min-h-screen flex items-center justify-center bg-background p-4 ${className}`}>
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ${
              severity === 'error' ? 'bg-red-100' : 
              severity === 'warning' ? 'bg-amber-100' : 
              'bg-blue-100'
            }`}>
              <div className={
                severity === 'error' ? 'text-red-600' : 
                severity === 'warning' ? 'text-amber-600' : 
                'text-blue-600'
              }>
                {getIcon()}
              </div>
            </div>
            <CardTitle className="text-xl">{error.title}</CardTitle>
            <CardDescription>{error.message}</CardDescription>
          </CardHeader>
          {(error.action || onDismiss) && (
            <CardContent className="flex flex-col gap-2">
              {error.action && onAction && (
                <Button onClick={onAction} className="w-full">
                  {error.action}
                </Button>
              )}
              {onDismiss && (
                <Button onClick={onDismiss} variant="outline" className="w-full">
                  Fermer
                </Button>
              )}
            </CardContent>
          )}
        </Card>
      </div>
    );
  }

  return null;
}
