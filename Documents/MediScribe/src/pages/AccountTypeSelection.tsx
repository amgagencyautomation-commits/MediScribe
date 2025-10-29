import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Stethoscope, Building2, Check, ArrowLeft } from 'lucide-react';

export default function AccountTypeSelection() {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState<'solo' | 'cabinet' | null>(null);

  const handleTypeSelection = (type: 'solo' | 'cabinet') => {
    setSelectedType(type);
    // Animation de sélection puis navigation
    setTimeout(() => {
      if (type === 'solo') {
        navigate('/signup-solo');
      } else {
        navigate('/signup-cabinet');
      }
    }, 300);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Stethoscope className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-primary">MediScribe</h1>
          </div>
          <h2 className="text-2xl font-semibold text-foreground mb-2">
            Choisissez votre type de compte
          </h2>
          <p className="text-muted-foreground">
            Sélectionnez l'option qui correspond le mieux à votre pratique médicale
          </p>
        </div>

        {/* Cartes de sélection */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Carte Médecin Solo */}
          <Card 
            className={`cursor-pointer transition-all duration-300 hover:scale-102 hover:shadow-lg ${
              selectedType === 'solo' ? 'ring-2 ring-primary shadow-lg scale-102' : ''
            }`}
            onClick={() => handleTypeSelection('solo')}
          >
            <CardHeader className="text-center pb-4">
              <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                <Stethoscope className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle className="text-xl">Compte Individuel</CardTitle>
              <CardDescription>
                Pour les praticiens en exercice individuel
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Accès complet à l'application</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Votre clé API Mistral AI personnelle</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Gestion de vos consultations</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Export Word illimité</span>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary mb-1">
                    À partir de 100€/mois
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Facturation mensuelle
                  </div>
                </div>
              </div>

              <Button 
                className="w-full" 
                size="lg"
                onClick={(e) => {
                  e.stopPropagation();
                  handleTypeSelection('solo');
                }}
              >
                Choisir Individuel
              </Button>
            </CardContent>
          </Card>

          {/* Carte Cabinet Médical */}
          <Card 
            className={`cursor-pointer transition-all duration-300 hover:scale-102 hover:shadow-lg ${
              selectedType === 'cabinet' ? 'ring-2 ring-primary shadow-lg scale-102' : ''
            }`}
            onClick={() => handleTypeSelection('cabinet')}
          >
            <CardHeader className="text-center pb-4">
              <div className="h-16 w-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
                <Building2 className="h-8 w-8 text-purple-600" />
              </div>
              <CardTitle className="text-xl">Compte Cabinet</CardTitle>
              <CardDescription>
                Pour les cabinets médicaux et centres de santé
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Gestion multi-praticiens</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Clé API partagée OU clés individuelles</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Tableau de bord administrateur</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Gestion des accès</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Statistiques d'utilisation</span>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary mb-1">
                    À partir de 400€/mois
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Pour 2-5 praticiens
                  </div>
                </div>
              </div>

              <Button 
                className="w-full" 
                size="lg"
                onClick={(e) => {
                  e.stopPropagation();
                  handleTypeSelection('cabinet');
                }}
              >
                Choisir Cabinet
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour à l'accueil
          </Button>
        </div>
      </div>
    </div>
  );
}
