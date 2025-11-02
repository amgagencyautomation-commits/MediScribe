import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, FileText, Clock, TrendingUp, Calendar } from 'lucide-react';
import { ConsultationService, ApiUsageService } from '@/lib/services';
import { Consultation } from '@/types/database';
import { DEMO_MODE, DEMO_CONSULTATIONS, DEMO_STATS } from '@/lib/demo-config';

export default function Dashboard() {
  const { user, profile, organization } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    consultationsThisMonth: 0,
    timeSaved: 0,
    reportsGenerated: 0,
    totalCost: 0,
  });
  const [recentConsultations, setRecentConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);

  // Charger les vraies statistiques
  useEffect(() => {
    loadDashboardData();
  }, [user, profile, organization]);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      if (DEMO_MODE) {
        // Mode démo - utiliser les données factices
        setStats(DEMO_STATS);
        setRecentConsultations(DEMO_CONSULTATIONS.slice(0, 5));
        setLoading(false);
        return;
      }

      // Mode normal avec Supabase
      let consultations: Consultation[] = [];
      if (organization) {
        consultations = await ConsultationService.getConsultationsByOrganization(organization.id);
      } else {
        consultations = await ConsultationService.getConsultationsByDoctor(user.id);
      }

      // Calculer les statistiques
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const consultationsThisMonth = consultations.filter(c => 
        new Date(c.consultation_date) >= startOfMonth
      ).length;

      const completedConsultations = consultations.filter(c => c.status === 'completed');
      const reportsGenerated = completedConsultations.length;

      // Calculer le temps gagné (estimation: 15 min par consultation)
      const timeSaved = completedConsultations.length * 0.25; // 15 min = 0.25h

      // Charger l'utilisation des API pour le coût
      let totalCost = 0;
      try {
        const apiUsage = await ApiUsageService.getUserUsage(user.id);
        totalCost = apiUsage.reduce((sum, usage) => sum + usage.cost_usd, 0);
      } catch (error) {
        console.error('Erreur lors du chargement des coûts:', error);
      }

      setStats({
        consultationsThisMonth,
        timeSaved,
        reportsGenerated,
        totalCost,
      });

      // Charger les 5 dernières consultations
      setRecentConsultations(consultations.slice(0, 5));

    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      // En cas d'erreur, utiliser des valeurs par défaut
      setStats({
        consultationsThisMonth: 0,
        timeSaved: 0,
        reportsGenerated: 0,
        totalCost: 0,
      });
    } finally {
      setLoading(false);
    }
  };


  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: 'default',
      draft: 'secondary',
      archived: 'outline'
    } as const;
    
    const labels = {
      completed: 'Terminé',
      draft: 'Brouillon',
      archived: 'Archivé'
    };

    return (
      <Badge variant={variants[status as keyof typeof variants]}>
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {getGreeting()}, {profile?.full_name?.split(' ')[0] || 'Docteur'} 👋
            </h1>
            <p className="text-muted-foreground mt-1">
              {new Date().toLocaleDateString('fr-FR', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          <Button 
            size="lg" 
            onClick={() => navigate('/dashboard/record')}
            className="bg-primary hover:bg-primary/90"
          >
            <Mic className="h-5 w-5 mr-2" />
            Nouvelle consultation
          </Button>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Consultations ce mois</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.consultationsThisMonth}</div>
              <p className="text-xs text-muted-foreground">
                {loading ? 'Chargement...' : 'Ce mois-ci'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Temps gagné</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.timeSaved}h</div>
              <p className="text-xs text-muted-foreground">
                {loading ? 'Chargement...' : 'Grâce à l\'IA'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Comptes rendus générés</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.reportsGenerated}</div>
              <p className="text-xs text-muted-foreground">
                {loading ? 'Chargement...' : 'Comptes rendus générés'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Section principale */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* CTA principal */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mic className="h-5 w-5 text-primary" />
                  Commencer une nouvelle consultation
                </CardTitle>
                <CardDescription>
                  Enregistrez votre consultation et laissez l'IA générer automatiquement le compte rendu
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-8">
                  <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Mic className="h-12 w-12 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Prêt à enregistrer ?</h3>
                  <p className="text-muted-foreground mb-4">
                    Cliquez sur le bouton ci-dessous pour commencer l'enregistrement de votre consultation
                  </p>
                  <Button 
                    size="lg" 
                    onClick={() => navigate('/dashboard/record')}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Mic className="h-5 w-5 mr-2" />
                    Démarrer l'enregistrement
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Derniers comptes rendus */}
          <div>
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Derniers comptes rendus
                </CardTitle>
                <CardDescription>
                  Vos 5 dernières consultations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {loading ? (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground">Chargement des consultations...</p>
                    </div>
                  ) : recentConsultations.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground">Aucune consultation récente</p>
                    </div>
                  ) : (
                    recentConsultations.map((consultation) => (
                      <div 
                        key={consultation.id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => navigate(`/dashboard/consultations`)}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {consultation.patient_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {consultation.consultation_type}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(consultation.consultation_date).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        <div className="flex-shrink-0 ml-2">
                          {getStatusBadge(consultation.status)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                
                <div className="mt-4 pt-4 border-t">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => navigate('/dashboard/consultations')}
                  >
                    Voir toutes les consultations
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Guide rapide */}
        <Card>
          <CardHeader>
            <CardTitle>Guide rapide</CardTitle>
            <CardDescription>
              Comment utiliser MediScribe efficacement
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold text-primary">1</span>
                  </div>
                  <div>
                    <h4 className="font-semibold">Configurez votre clé API</h4>
                    <p className="text-sm text-muted-foreground">
                      Ajoutez votre clé Mistral AI dans les paramètres pour utiliser la transcription et la génération de comptes rendus.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold text-primary">2</span>
                  </div>
                  <div>
                    <h4 className="font-semibold">Créez une consultation</h4>
                    <p className="text-sm text-muted-foreground">
                      Enregistrez vos consultations audio et laissez l'IA générer automatiquement les comptes rendus.
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold text-primary">3</span>
                  </div>
                  <div>
                    <h4 className="font-semibold">Collaborez en équipe</h4>
                    <p className="text-sm text-muted-foreground">
                      Créez un cabinet médical pour partager les ressources et collaborer avec vos collègues.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold text-primary">4</span>
                  </div>
                  <div>
                    <h4 className="font-semibold">Suivez vos coûts</h4>
                    <p className="text-sm text-muted-foreground">
                      Consultez l'utilisation de vos API et les coûts associés dans les paramètres.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
