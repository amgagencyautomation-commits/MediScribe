import { useState } from 'react';
import { CheckCircle2, ExternalLink, Eye, EyeOff, Loader2, AlertCircle, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { apiKeyService } from '@/lib/apiKeyService';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

/**
 * Étapes de l'onboarding
 */
type OnboardingStep = 'information' | 'configuration' | 'validation';

/**
 * Composant d'onboarding pour la configuration de la clé API Mistral
 * Guide l'utilisateur à travers 3 étapes : Information → Configuration → Validation
 */
export function ApiKeyOnboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // State management
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('information');
  const [apiKey, setApiKey] = useState('');
  const [keyName, setKeyName] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [validationDate, setValidationDate] = useState<Date | null>(null);

  /**
   * Valide le format de la clé API Mistral
   */
  const isValidKeyFormat = (key: string): boolean => {
    // Les clés Mistral commencent généralement par un pattern spécifique
    // Pour l'instant, on vérifie juste qu'elle n'est pas vide et a une longueur minimale
    return key.length >= 20;
  };

  /**
   * Gère la soumission de la clé API
   */
  const handleSubmit = async () => {
    if (!user?.id) {
      setError('Utilisateur non connecté');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await apiKeyService.saveUserApiKey(
        user.id,
        apiKey,
        'mistral',
        keyName || undefined
      );

      if (result.success) {
        setValidationDate(new Date());
        setCurrentStep('validation');
      } else {
        setError(result.error || 'Erreur lors de l\'enregistrement de la clé');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Réessaye l'enregistrement en cas d'erreur
   */
  const handleRetry = () => {
    setError(null);
    handleSubmit();
  };

  /**
   * Rend l'étape 1 : Information
   */
  const renderInformationStep = () => (
    <div className="space-y-6">
      <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-900">Pourquoi une clé API Mistral ?</AlertTitle>
        <AlertDescription className="text-blue-800">
          <ul className="mt-2 space-y-1 list-disc list-inside">
            <li><strong>Contrôle des coûts</strong> : Vous payez uniquement ce que vous utilisez</li>
            <li><strong>Souveraineté des données</strong> : Vos données restent sous votre contrôle</li>
            <li><strong>Conformité RGPD</strong> : Mistral AI est conforme aux réglementations européennes</li>
          </ul>
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Coûts estimés</CardTitle>
          <CardDescription>Tarification indicative Mistral AI</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Transcription audio (par minute)</span>
            <Badge variant="secondary">~0.001€</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Génération compte rendu (par consultation)</span>
            <Badge variant="secondary">~0.10€</Badge>
          </div>
          <div className="pt-2 border-t">
            <p className="text-xs text-gray-500">
              Coûts approximatifs basés sur les tarifs Mistral AI actuels. 
              Consultez la documentation officielle pour les tarifs exacts.
            </p>
          </div>
        </CardContent>
      </Card>

      <Collapsible open={showTutorial} onOpenChange={setShowTutorial}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full">
            {showTutorial ? 'Masquer' : 'Comment obtenir ma clé Mistral ?'}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Guide pas à pas</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-4">
                <li className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-semibold">
                    1
                  </div>
                  <div>
                    <p className="font-medium">Créer un compte Mistral AI</p>
                    <p className="text-sm text-gray-600">
                      Rendez-vous sur{' '}
                      <a
                        href="https://console.mistral.ai"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline inline-flex items-center gap-1"
                      >
                        console.mistral.ai
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      {' '}et créez un compte
                    </p>
                  </div>
                </li>

                <li className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-semibold">
                    2
                  </div>
                  <div>
                    <p className="font-medium">Accéder aux clés API</p>
                    <p className="text-sm text-gray-600">
                      Dans le menu de gauche, cliquez sur "API Keys"
                    </p>
                  </div>
                </li>

                <li className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-semibold">
                    3
                  </div>
                  <div>
                    <p className="font-medium">Créer une nouvelle clé</p>
                    <p className="text-sm text-gray-600">
                      Cliquez sur "Create New Key" et donnez-lui un nom
                    </p>
                  </div>
                </li>

                <li className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-semibold">
                    4
                  </div>
                  <div>
                    <p className="font-medium">Copier la clé</p>
                    <p className="text-sm text-gray-600">
                      Copiez la clé générée (elle ne sera affichée qu'une seule fois)
                    </p>
                  </div>
                </li>

                <li className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-semibold">
                    5
                  </div>
                  <div>
                    <p className="font-medium">Revenir ici et coller la clé</p>
                    <p className="text-sm text-gray-600">
                      Collez votre clé dans le formulaire ci-dessous
                    </p>
                  </div>
                </li>
              </ol>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      <div className="flex justify-end">
        <Button onClick={() => setCurrentStep('configuration')} size="lg">
          Configurer ma clé API
        </Button>
      </div>
    </div>
  );

  /**
   * Rend l'étape 2 : Configuration
   */
  const renderConfigurationStep = () => (
    <div className="space-y-6">
      <Alert className="border-amber-200 bg-amber-50">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-900">Sécurité</AlertTitle>
        <AlertDescription className="text-amber-800">
          Ne partagez jamais votre clé API. Elle donne accès à votre compte Mistral AI.
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="apiKey">Clé API Mistral *</Label>
          <div className="relative">
            <Input
              id="apiKey"
              type={showApiKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Collez votre clé API ici..."
              className={!isValidKeyFormat(apiKey) && apiKey.length > 0 ? 'border-red-500' : ''}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3"
              onClick={() => setShowApiKey(!showApiKey)}
            >
              {showApiKey ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
          {!isValidKeyFormat(apiKey) && apiKey.length > 0 && (
            <p className="text-sm text-red-600">
              Format de clé invalide. La clé doit contenir au moins 20 caractères.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="keyName">Nom de la clé (optionnel)</Label>
          <Input
            id="keyName"
            type="text"
            value={keyName}
            onChange={(e) => setKeyName(e.target.value)}
            placeholder="Ex: Clé Cabinet Principal"
          />
          <p className="text-sm text-gray-500">
            Donnez un nom à votre clé pour la retrouver facilement
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-3 justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentStep('information')}
          disabled={isLoading}
        >
          Retour
        </Button>
        <div className="flex gap-3">
          {error && (
            <Button
              variant="outline"
              onClick={handleRetry}
              disabled={isLoading}
            >
              Réessayer
            </Button>
          )}
          <Button
            onClick={handleSubmit}
            disabled={!isValidKeyFormat(apiKey) || isLoading}
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Validation en cours...
              </>
            ) : (
              'Valider et enregistrer'
            )}
          </Button>
        </div>
      </div>
    </div>
  );

  /**
   * Rend l'étape 3 : Validation/Succès
   */
  const renderValidationStep = () => (
    <div className="space-y-6">
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="rounded-full bg-green-100 p-3 animate-in zoom-in duration-300">
          <CheckCircle2 className="h-12 w-12 text-green-600" />
        </div>
        
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Clé API configurée avec succès !
          </h2>
          <p className="text-gray-600 mt-2">
            Votre clé Mistral AI est maintenant active et prête à être utilisée
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-3">
          {keyName && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Nom de la clé</span>
              <Badge>{keyName}</Badge>
            </div>
          )}
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Date de configuration</span>
            <span className="text-sm font-medium">
              {validationDate?.toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Coût estimé par consultation</span>
            <Badge variant="secondary">~0.10€</Badge>
          </div>
        </CardContent>
      </Card>

      <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          Vous pouvez modifier ou supprimer votre clé API à tout moment dans les paramètres.
        </AlertDescription>
      </Alert>

      <div className="flex justify-center">
        <Button onClick={() => navigate('/dashboard')} size="lg">
          Commencer à utiliser MediScribe
        </Button>
      </div>
    </div>
  );

  /**
   * Rendu principal avec gestion des étapes
   */
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-2">
                {(['information', 'configuration', 'validation'] as OnboardingStep[]).map((step, index) => (
                  <div
                    key={step}
                    className={`h-2 flex-1 rounded-full transition-colors ${
                      currentStep === step
                        ? 'bg-blue-600'
                        : index < (['information', 'configuration', 'validation'] as OnboardingStep[]).indexOf(currentStep)
                        ? 'bg-blue-300'
                        : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
            </div>
            
            <CardTitle className="text-2xl">
              {currentStep === 'information' && 'Configuration de votre clé API'}
              {currentStep === 'configuration' && 'Entrez votre clé Mistral AI'}
              {currentStep === 'validation' && 'Configuration terminée'}
            </CardTitle>
            
            <CardDescription>
              {currentStep === 'information' && 'Découvrez pourquoi et comment configurer votre clé API Mistral'}
              {currentStep === 'configuration' && 'Collez votre clé API pour commencer à utiliser MediScribe'}
              {currentStep === 'validation' && 'Votre clé API est maintenant active'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {currentStep === 'information' && renderInformationStep()}
            {currentStep === 'configuration' && renderConfigurationStep()}
            {currentStep === 'validation' && renderValidationStep()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
