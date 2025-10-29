import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Composant intelligent pour la route racine "/"
 * Redirige automatiquement selon l'état d'authentification
 */
export const RootRedirect = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    if (user) {
      // Utilisateur connecté → dashboard
      console.log('👤 Utilisateur connecté détecté, redirection vers dashboard');
      navigate('/dashboard', { replace: true });
    } else {
      // Utilisateur non connecté → page d'accueil
      console.log('🏠 Utilisateur non connecté, affichage page d\'accueil');
      navigate('/login', { replace: true });
    }
  }, [user, loading, navigate]);

  // Pendant le chargement
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <h2 className="text-xl font-semibold">MediScribe</h2>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return null;
};
