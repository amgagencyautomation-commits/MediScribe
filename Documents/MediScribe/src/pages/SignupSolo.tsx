import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { ProfileService, MistralService } from '@/lib/services';
import { encryptApiKey } from '@/lib/crypto';
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  Eye, 
  EyeOff, 
  Mail, 
  Lock, 
  User, 
  Stethoscope,
  Key,
  Loader2,
  AlertCircle
} from 'lucide-react';

const SPECIALTIES = [
  'Médecine générale',
  'Cardiologie',
  'Dermatologie',
  'Pédiatrie',
  'Gynécologie-Obstétrique',
  'Psychiatrie',
  'Orthopédie',
  'ORL',
  'Ophtalmologie',
  'Neurologie',
  'Gastro-entérologie',
  'Autre',
];

const CONSULTATION_TYPES = [
  'Première consultation',
  'Consultation de suivi',
  'Consultation d\'urgence',
  'Téléconsultation',
  'Consultation préventive',
];

export default function SignupSolo() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [testingApiKey, setTestingApiKey] = useState(false);
  const [apiKeyValid, setApiKeyValid] = useState<'not-tested' | 'testing' | 'valid' | 'invalid'>('not-tested');

  // État du formulaire
  const [formData, setFormData] = useState({
    // Étape 1 - Informations de base
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    specialty: '',
    
    // Étape 2 - Informations professionnelles
    subSpecialties: '',
    consultationTypes: [] as string[],
    
    // Étape 3 - Configuration API
    mistralApiKey: '',
    
    // Étape 4 - Finalisation
    acceptTerms: false,
    newsletter: false,
  });

  const validatePassword = (password: string) => {
    const hasMinLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    return hasMinLength && hasUpperCase && hasNumber;
  };

  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return { label: '', color: '' };
    if (password.length < 6) return { label: 'Faible', color: 'text-destructive' };
    if (!validatePassword(password)) return { label: 'Moyen', color: 'text-warning' };
    return { label: 'Fort', color: 'text-success' };
  };

  const testApiKey = async () => {
    if (!formData.mistralApiKey) return;
    
    setTestingApiKey(true);
    setApiKeyValid('testing');
    
    try {
      const isValid = await MistralService.testApiKey(formData.mistralApiKey);
      setApiKeyValid(isValid ? 'valid' : 'invalid');
      
      if (isValid) {
        toast({
          title: 'Clé API valide',
          description: 'Votre clé Mistral fonctionne correctement.',
        });
      } else {
        toast({
          title: 'Clé API invalide',
          description: 'Vérifiez votre clé Mistral.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      setApiKeyValid('invalid');
      toast({
        title: 'Erreur de test',
        description: 'Impossible de tester la clé API.',
        variant: 'destructive',
      });
    } finally {
      setTestingApiKey(false);
    }
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!formData.acceptTerms) {
      toast({
        title: 'Conditions requises',
        description: 'Vous devez accepter les CGU pour continuer.',
        variant: 'destructive',
      });
      return;
    }

    if (apiKeyValid !== 'valid') {
      toast({
        title: 'Clé API requise',
        description: 'Vous devez valider votre clé API pour continuer.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Créer le compte Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
          data: {
            full_name: formData.fullName,
            specialty: formData.specialty,
          },
        },
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          toast({
            title: 'Compte existant',
            description: 'Un compte existe déjà avec cet email.',
            variant: 'destructive',
          });
        } else if (authError.message.includes('after') && authError.message.includes('seconds')) {
          // Extraire le nombre de secondes du message
          const match = authError.message.match(/(\d+)\s+seconds/);
          const seconds = match ? match[1] : '16';
          toast({
            title: 'Veuillez patienter',
            description: `Pour des raisons de sécurité, veuillez attendre ${seconds} secondes avant de réessayer.`,
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Erreur d\'inscription',
            description: authError.message,
            variant: 'destructive',
          });
        }
        return;
      }

      if (authData.user) {
        // Si l'email de confirmation est requis, aucune session n'est créée immédiatement
        if (!authData.session) {
          toast({
            title: 'Vérification requise',
            description: 'Un email de confirmation vous a été envoyé. Veuillez confirmer votre adresse pour vous connecter.',
          });
          navigate('/login');
          return;
        }

        // Session active: créer le profil (fallback au trigger) puis naviguer
        console.log('Création du profil pour:', authData.user.id);
        
        // Sauvegarder la clé API dans api_keys (nouveau système)
        if (formData.mistralApiKey) {
          try {
            const { apiKeyService } = await import('@/lib/apiKeyService');
            const saveResult = await apiKeyService.saveUserApiKey(
              authData.user.id,
              formData.mistralApiKey,
              'mistral'
            );
            if (saveResult.success) {
              console.log('✅ Clé API sauvegardée dans api_keys');
            } else {
              console.warn('⚠️  Erreur sauvegarde api_keys:', saveResult.error);
            }
          } catch (apiKeyServiceError) {
            console.warn('⚠️  apiKeyService non disponible, sauvegarde uniquement dans profiles');
          }
        }
        
        const { error: profileError } = await (supabase
          .from('profiles') as any)
          .insert({
            id: authData.user.id,
            email: formData.email,
            full_name: formData.fullName,
            specialty: formData.specialty,
            sub_specialties: formData.subSpecialties || null,
            consultation_types: formData.consultationTypes,
            personal_mistral_api_key: encryptApiKey(formData.mistralApiKey),
            account_type: 'solo',
            use_personal_api_key: true,
          });

        if (profileError) {
          console.error('Erreur création profil:', profileError);
          // Si le profil existe déjà (trigger a fonctionné), on le met à jour
          if ((profileError as any).code === '23505') { // Duplicate key
            console.log('Profil existe déjà, mise à jour...');
            await ProfileService.updateProfile(authData.user.id, {
              full_name: formData.fullName,
              specialty: formData.specialty,
              sub_specialties: formData.subSpecialties || null,
              consultation_types: formData.consultationTypes,
              personal_mistral_api_key: encryptApiKey(formData.mistralApiKey),
              use_personal_api_key: true,
            });
          } else {
            throw profileError;
          }
        }

        toast({
          title: 'Compte créé !',
          description: 'Bienvenue sur MediScribe. Votre compte est maintenant configuré.',
        });

        navigate('/dashboard');
      }
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de l\'inscription.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = getPasswordStrength(formData.password);
  const progress = (currentStep / 4) * 100;

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nom complet</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="fullName"
                  placeholder="Dr. Jean Dupont"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email professionnel</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="dr.dupont@exemple.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="specialty">Spécialité médicale</Label>
              <div className="relative">
                <Stethoscope className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
                <Select
                  value={formData.specialty}
                  onValueChange={(value) => setFormData({ ...formData, specialty: value })}
                >
                  <SelectTrigger className="pl-10">
                    <SelectValue placeholder="Sélectionnez votre spécialité" />
                  </SelectTrigger>
                  <SelectContent>
                    {SPECIALTIES.map((specialty) => (
                      <SelectItem key={specialty} value={specialty}>
                        {specialty}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {formData.password && (
                <p className={`text-sm ${passwordStrength.color}`}>
                  Force: {passwordStrength.label}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="pl-10"
                  required
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subSpecialties">Sous-spécialités (optionnel)</Label>
              <Textarea
                id="subSpecialties"
                placeholder="Ex: Échographie, Diabétologie, Médecine du sport..."
                value={formData.subSpecialties}
                onChange={(e) => setFormData({ ...formData, subSpecialties: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Types de consultations</Label>
              <div className="space-y-2">
                {CONSULTATION_TYPES.map((type) => (
                  <div key={type} className="flex items-center space-x-2">
                    <Checkbox
                      id={type}
                      checked={formData.consultationTypes.includes(type)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData({
                            ...formData,
                            consultationTypes: [...formData.consultationTypes, type]
                          });
                        } else {
                          setFormData({
                            ...formData,
                            consultationTypes: formData.consultationTypes.filter(t => t !== type)
                          });
                        }
                      }}
                    />
                    <Label htmlFor={type} className="text-sm font-normal cursor-pointer">
                      {type}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Lock className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-900">Confidentialité garantie</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Vos données ne transitent jamais par nos serveurs. Vous gardez le contrôle total.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="mistralApiKey">Clé API Mistral</Label>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => {
                    // Ouvrir modal avec tuto
                    window.open('https://console.mistral.ai/', '_blank');
                  }}
                >
                  Comment obtenir ma clé ?
                </Button>
              </div>
              <div className="relative">
                <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="mistralApiKey"
                  type={showApiKey ? 'text' : 'password'}
                  placeholder="Votre clé Mistral"
                  value={formData.mistralApiKey}
                  onChange={(e) => {
                    setFormData({ ...formData, mistralApiKey: e.target.value });
                    setApiKeyValid('not-tested');
                  }}
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={testApiKey}
                disabled={!formData.mistralApiKey || testingApiKey}
                variant="outline"
                size="sm"
              >
                {testingApiKey ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Test en cours...
                  </>
                ) : (
                  'Tester la clé'
                )}
              </Button>

              {apiKeyValid === 'valid' && (
                <Badge variant="default" className="bg-green-600">
                  <Check className="h-3 w-3 mr-1" />
                  Clé valide
                </Badge>
              )}
              {apiKeyValid === 'invalid' && (
                <Badge variant="destructive">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Clé invalide
                </Badge>
              )}
              {apiKeyValid === 'not-tested' && (
                <Badge variant="secondary">
                  Non testée
                </Badge>
              )}
            </div>

            <div className="text-sm text-muted-foreground">
              <p>Coût estimé : ~0.50-2€ par consultation</p>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="space-y-3">
              <h3 className="font-semibold">Récapitulatif de votre compte</h3>
              
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nom :</span>
                  <span className="font-medium">{formData.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email :</span>
                  <span className="font-medium">{formData.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Spécialité :</span>
                  <span className="font-medium">{formData.specialty}</span>
                </div>
                {formData.subSpecialties && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sous-spécialités :</span>
                    <span className="font-medium">{formData.subSpecialties}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Types de consultations :</span>
                  <span className="font-medium">{formData.consultationTypes.join(', ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Clé API :</span>
                  <Badge variant={apiKeyValid === 'valid' ? 'default' : 'destructive'}>
                    {apiKeyValid === 'valid' ? 'Validée' : 'Non validée'}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="acceptTerms"
                  checked={formData.acceptTerms}
                  onCheckedChange={(checked) => setFormData({ ...formData, acceptTerms: !!checked })}
                />
                <Label htmlFor="acceptTerms" className="text-sm font-normal cursor-pointer">
                  J'accepte les{' '}
                  <a href="#" className="text-primary hover:underline">
                    Conditions Générales d'Utilisation
                  </a>
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="newsletter"
                  checked={formData.newsletter}
                  onCheckedChange={(checked) => setFormData({ ...formData, newsletter: !!checked })}
                />
                <Label htmlFor="newsletter" className="text-sm font-normal cursor-pointer">
                  Je souhaite recevoir la newsletter MediScribe (optionnel)
                </Label>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.fullName && formData.email && formData.specialty && 
               formData.password && formData.confirmPassword &&
               formData.password === formData.confirmPassword &&
               validatePassword(formData.password);
      case 2:
        return true; // Étape optionnelle
      case 3:
        return apiKeyValid === 'valid';
      case 4:
        return formData.acceptTerms;
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Stethoscope className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-primary">MediScribe</h1>
          </div>
          <h2 className="text-xl font-semibold">Compte Individuel</h2>
          <p className="text-muted-foreground mt-2">Étape {currentStep} sur 4</p>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <Progress value={progress} className="h-2" />
        </div>

        {/* Formulaire */}
        <Card className="shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl font-bold">
              {currentStep === 1 && 'Informations de base'}
              {currentStep === 2 && 'Informations professionnelles'}
              {currentStep === 3 && 'Configuration clé API'}
              {currentStep === 4 && 'Finalisation'}
            </CardTitle>
            <CardDescription>
              {currentStep === 1 && 'Créez votre compte médecin'}
              {currentStep === 2 && 'Définissez votre pratique'}
              {currentStep === 3 && 'Configurez l\'accès à l\'IA'}
              {currentStep === 4 && 'Vérifiez vos informations'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderStepContent()}

            {/* Navigation */}
            <div className="flex justify-between mt-6">
              <Button
                variant="outline"
                onClick={currentStep === 1 ? () => navigate('/account-type') : handlePrevious}
                disabled={loading}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {currentStep === 1 ? 'Retour' : 'Précédent'}
              </Button>

              {currentStep < 4 ? (
                <Button
                  onClick={handleNext}
                  disabled={!canProceed() || loading}
                >
                  Suivant
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={!canProceed() || loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Création...
                    </>
                  ) : (
                    'Créer mon compte'
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
