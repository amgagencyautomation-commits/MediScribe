import { ReactNode, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface SmartRouteProps {
  children: ReactNode;
  type: 'public' | 'protected' | 'auth-only';
  redirectTo?: string;
}

/**
 * SmartRoute - Navigation intelligente basée sur l'état d'authentification
 * 
 * @param type 
 *   - 'public': Accessible par tous, redirige les connectés vers dashboard
 *   - 'protected': Nécessite une connexion, redirige les non-connectés vers login
 *   - 'auth-only': Accessible uniquement aux connectés (login/signup pages)
 */
export const SmartRoute = ({ children, type, redirectTo }: SmartRouteProps) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Attendre la fin du chargement auth
    if (loading) return;

    const currentPath = location.pathname;

    // Routes publiques avec redirection intelligente pour les connectés
    if (type === 'public') {
      if (user && (currentPath === '/' || currentPath === '/login' || currentPath === '/signup' || currentPath.startsWith('/account') || currentPath.startsWith('/signup'))) {
        console.log('👤 Utilisateur connecté redirigé vers dashboard depuis:', currentPath);
        navigate('/dashboard', { replace: true });
      }
      return;
    }

    // Routes protégées
    if (type === 'protected') {
      if (!user) {
        console.log('🔒 Accès protégé refusé, redirection vers login');
        navigate('/login', { 
          state: { from: location },
          replace: true 
        });
      }
      return;
    }

    // Routes auth-only (pages de connexion uniquement pour non-connectés)
    if (type === 'auth-only') {
      if (user) {
        console.log('👤 Utilisateur déjà connecté, redirection vers dashboard');
        navigate(redirectTo || '/dashboard', { replace: true });
      }
      return;
    }
  }, [user, loading, location, navigate, type, redirectTo]);

  // Afficher le contenu si autorisé
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  // Routes publiques : toujours afficher (redirection gérée au-dessus)
  if (type === 'public') {
    return <>{children}</>;
  }

  // Routes protégées : afficher seulement si connecté
  if (type === 'protected') {
    return user ? <>{children}</> : null;
  }

  // Routes auth-only : afficher seulement si non connecté
  if (type === 'auth-only') {
    return !user ? <>{children}</> : null;
  }

  return <>{children}</>;
};
