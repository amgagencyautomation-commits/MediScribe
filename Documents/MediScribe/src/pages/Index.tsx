import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Stethoscope, FileText, Zap } from 'lucide-react';

export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-primary">MediScribe</h1>
          </div>
          <div className="flex gap-4">
            <Button variant="ghost" onClick={() => navigate('/login')}>
              Se connecter
            </Button>
            <Button onClick={() => navigate('/account-type')}>
              S'inscrire
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-5xl font-bold text-foreground">
              Assistant IA pour vos comptes rendus médicaux
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Gagnez du temps avec la transcription et génération automatique de vos consultations médicales
            </p>
          </div>

          <div className="flex gap-4 justify-center">
            <Button size="lg" onClick={() => navigate('/account-type')}>
              Commencer gratuitement
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/login')}>
              Se connecter
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mt-16">
            <div className="bg-card border rounded-lg p-6 space-y-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Stethoscope className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Transcription automatique</h3>
              <p className="text-sm text-muted-foreground">
                Enregistrez vos consultations et obtenez une transcription précise en quelques secondes
              </p>
            </div>

            <div className="bg-card border rounded-lg p-6 space-y-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Génération de CR</h3>
              <p className="text-sm text-muted-foreground">
                Générez automatiquement des comptes rendus structurés et conformes
              </p>
            </div>

            <div className="bg-card border rounded-lg p-6 space-y-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Confidentiel et sécurisé</h3>
              <p className="text-sm text-muted-foreground">
                Vos données restent privées avec votre propre clé API Mistral AI
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
