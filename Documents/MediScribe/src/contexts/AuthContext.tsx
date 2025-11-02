import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Profile, Organization } from '@/types/database';
import { DEMO_MODE, DEMO_USER, DEMO_PROFILE } from '@/lib/demo-config';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  organization: Organization | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshOrganization: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      console.log('Chargement du profil pour:', userId);
      
      // Récupérer le profil (sans timeout pour éviter les erreurs)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.warn('⚠️  Profil manquant, création automatique...');
          await createMissingProfile(userId);
          return;
        }
        throw error;
      }
      
      if (!data) {
        console.warn('Profil vide, création automatique...');
        await createMissingProfile(userId);
        return;
      }
      
      console.log('✅ Profil chargé:', (data as any).full_name || 'Sans nom');
      setProfile(data as Profile);
      
      // Organisation en async (non bloquant)
      if ((data as any).organization_id) {
        fetchOrganization((data as any).organization_id).catch(() => {
          setOrganization(null);
        });
      } else {
        setOrganization(null);
      }
    } catch (error) {
      console.error('Erreur profil (non bloquant):', error.message);
      setProfile(null);
      setOrganization(null);
    }
  };

  const createMissingProfile = async (userId: string) => {
    try {
      console.log('🔧 Création profil manquant pour:', userId);
      
      // Récupérer les infos utilisateur depuis l'auth
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await (supabase
        .from('profiles') as any)
        .insert({
          id: userId,
          email: user.email,
          full_name: user.user_metadata?.full_name || 'Utilisateur',
          specialty: user.user_metadata?.specialty || 'Non définie',
          account_type: 'solo',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          // Profil créé entre temps, on le récupère
          console.log('Profil créé entre temps, récupération...');
          await fetchProfile(userId);
          return;
        }
        throw error;
      }

      if (data) {
        console.log('✅ Profil créé automatiquement:', (data as any).full_name);
        setProfile(data as Profile);
      }
    } catch (error) {
      console.error('❌ Impossible de créer le profil:', error);
      setProfile(null);
    }
  };

  const fetchOrganization = async (orgId: string) => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single();

      if (error) throw error;
      setOrganization(data);
    } catch (error) {
      console.error('Erreur lors du chargement de l\'organisation:', error);
      setOrganization(null);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const refreshOrganization = async () => {
    if (profile?.organization_id) {
      await fetchOrganization(profile.organization_id);
    }
  };

  useEffect(() => {
    if (DEMO_MODE) {
      // Mode démo - simuler un utilisateur connecté
      setUser(DEMO_USER as User);
      // Token de démo : utiliser constante plutôt que string hardcodée
      const DEMO_TOKEN = `demo-token-${Date.now()}`;
      setSession({ user: DEMO_USER as User, access_token: DEMO_TOKEN } as Session);
      setProfile(DEMO_PROFILE);
      setLoading(false);
      return;
    }

    // Initialiser la session depuis Supabase
    const initializeAuth = async () => {
      console.log('🔄 Initialisation de l\'authentification...');
      
      try {
        // Essayer de récupérer la session directement (plus simple)
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Erreur récupération session:', error);
          setLoading(false);
          return;
        }

        if (session?.user) {
          console.log('✅ Session trouvée:', session.user.email);
          setSession(session);
          setUser(session.user);
          
          // Débloquer l'interface immédiatement (ne pas attendre le profil)
          setLoading(false);
          
          // Charger le profil en arrière-plan (non bloquant)
          fetchProfile(session.user.id).catch((profileError) => {
            console.error('⚠️  Erreur chargement profil (non bloquant):', profileError);
          });
        } else {
          console.log('ℹ️  Aucune session active');
          setSession(null);
          setUser(null);
          setProfile(null);
          setOrganization(null);
          setLoading(false);
        }
      } catch (error) {
        console.error('❌ Erreur initialisation auth:', error);
        // En cas d'erreur, on considère qu'il n'y a pas de session
        setSession(null);
        setUser(null);
        setLoading(false);
      }
    };

    initializeAuth();

    // Timeout de sécurité absolu pour débloquer l'interface (2s max, réduit pour meilleure UX)
    const emergencyTimeout = setTimeout(() => {
      if (loading) {
        console.warn('⚠️  Timeout de sécurité atteint, débloquage forcé (profil peut se charger en arrière-plan)');
        setLoading(false);
      }
    }, 2000);

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Optimisation : ne recharger que si c'est un nouvel utilisateur
          if (event === 'SIGNED_IN' || !profile || profile.id !== session.user.id) {
            await fetchProfile(session.user.id);
          }
        } else {
          setProfile(null);
          setOrganization(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
      clearTimeout(emergencyTimeout);
    };
  }, []);

  const signOut = async () => {
    if (DEMO_MODE) {
      // En mode démo, on reste connecté
      return;
    }
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setOrganization(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      profile, 
      organization, 
      loading, 
      signOut, 
      refreshProfile, 
      refreshOrganization 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
