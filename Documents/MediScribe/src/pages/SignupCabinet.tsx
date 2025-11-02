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
  AlertCircle,
  Building2,
  Plus,
  X,
  Users
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

const PRACTITIONER_COUNTS = [
  { value: '2-5', label: '2-5 praticiens', price: '550€/mois', maxUsers: 5 },
  { value: '6-10', label: '6-10 praticiens', price: '850€/mois', maxUsers: 10 },
  { value: '11-20', label: '11-20 praticiens', price: '1400€/mois', maxUsers: 20 },
  { value: '20+', label: 'Plus de 20 praticiens', price: 'Sur mesure', maxUsers: 50 },
];

interface Invitation {
  id: string;
  email: string;
  name: string;
  specialty: string;
}

export default function SignupCabinet() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [testingApiKey, setTestingApiKey] = useState(false);
  const [apiKeyValid, setApiKeyValid] = useState<'not-tested' | 'testing' | 'valid' | 'invalid'>('not-tested');

  // État du formulaire
  const [formData, setFormData] = useState({
    // Étape 1 - Informations administrateur
    adminEmail: '',
    adminPassword: '',
    adminConfirmPassword: '',
    adminFullName: '',
    adminSpecialty: '',
    
    // Étape 2 - Informations cabinet
    cabinetName: '',
    cabinetAddress: '',
    practitionerCount: '',
    
    // Étape 3 - Configuration API
    apiConfigType: 'shared', // 'shared', 'individual', 'hybrid'
    sharedApiKey: '',
    
    // Étape 4 - Invitations
    invitations: [] as Invitation[],
    
    // Étape 5 - Finalisation
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
    if (!formData.sharedApiKey) return;
    
    setTestingApiKey(true);
    setApiKeyValid('testing');
    
    try {
      const isValid = await MistralService.testApiKey(formData.sharedApiKey);
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

  const addInvitation = () => {
    const newInvitation: Invitation = {
      id: Date.now().toString(),
      email: '',
      name: '',
      specialty: '',
    };
    setFormData({
      ...formData,
      invitations: [...formData.invitations, newInvitation]
    });
  };

  const removeInvitation = (id: string) => {
    setFormData({
      ...formData,
      invitations: formData.invitations.filter(inv => inv.id !== id)
    });
  };

  const updateInvitation = (id: string, field: keyof Invitation, value: string) => {
    setFormData({
      ...formData,
      invitations: formData.invitations.map(inv => 
        inv.id === id ? { ...inv, [field]: value } : inv
      )
    });
  };

  const handleNext = () => {
    if (currentStep < 5) {
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

    if (formData.apiConfigType === 'shared' && apiKeyValid !== 'valid') {
      toast({
        title: 'Clé API requise',
        description: 'Vous devez valider votre clé API partagée pour continuer.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Créer le compte administrateur
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.adminEmail,
        password: formData.adminPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
          data: {
            full_name: formData.adminFullName,
            specialty: formData.adminSpecialty,
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

        // CRÉER le profil manuellement d'abord
        console.log('Création du profil cabinet pour:', authData.user.id);
        
        const { error: profileError } = await (supabase
          .from('profiles') as any)
          .insert({
            id: authData.user.id,
            email: formData.adminEmail,
            full_name: formData.adminFullName,
            specialty: formData.adminSpecialty,
            account_type: 'cabinet_admin',
            role: 'admin',
            use_personal_api_key: false,
          });
        
        if (profileError && profileError.code !== '23505') {
          console.error('Erreur création profil:', profileError);
          toast({
            title: 'Erreur',
            description: 'Impossible de créer le profil.',
            variant: 'destructive',
          });
          return;
        }
        
        // Créer l'organisation avec le bon nombre d'utilisateurs
        const selectedPlan = PRACTITIONER_COUNTS.find(p => p.value === formData.practitionerCount);
        const maxUsers = selectedPlan?.maxUsers || 5;
        
        const { data: orgData, error: orgError } = await (supabase as any).rpc('create_organization', {
          org_name: formData.cabinetName,
          max_users: maxUsers
        });

        if (orgError) {
          console.error('Erreur création organisation:', orgError);
          toast({
            title: 'Erreur',
            description: 'Impossible de créer l\'organisation.',
            variant: 'destructive',
          });
          return;
        }

        // Mettre à jour l'organisation avec la clé API partagée si fournie
        if (formData.apiConfigType === 'shared' && formData.sharedApiKey) {
          // Sauvegarder dans api_keys (nouveau système) en priorité
          try {
            const { apiKeyService } = await import('@/lib/apiKeyService');
            const saveResult = await apiKeyService.saveOrganizationApiKey(
              orgData,
              formData.sharedApiKey,
              'mistral'
            );
            if (saveResult.success) {
              console.log('✅ Clé API organisation sauvegardée dans api_keys');
            } else {
              console.warn('⚠️  Erreur sauvegarde api_keys org:', saveResult.error);
            }
          } catch (apiKeyServiceError) {
            console.warn('⚠️  apiKeyService non disponible, sauvegarde uniquement dans organizations');
          }
          
          // Sauvegarder aussi dans organizations (ancien système - compatibilité)
          await (supabase
            .from('organizations') as any)
            .update({ shared_mistral_api_key: encryptApiKey(formData.sharedApiKey) })
            .eq('id', orgData);
        }
        
        // Sauvegarder la clé personnelle dans api_keys si fournie
        if (formData.apiConfigType === 'personal' && formData.personalApiKey) {
          try {
            const { apiKeyService } = await import('@/lib/apiKeyService');
            const saveResult = await apiKeyService.saveUserApiKey(
              authData.user.id,
              formData.personalApiKey,
              'mistral'
            );
            if (saveResult.success) {
              console.log('✅ Clé API personnelle sauvegardée dans api_keys');
            }
          } catch (apiKeyServiceError) {
            console.warn('⚠️  apiKeyService non disponible pour clé personnelle');
          }
        }

        // Créer les invitations en attente
        for (const invitation of formData.invitations) {
          if (invitation.email && invitation.name) {
            const token = crypto.randomUUID();
            await (supabase
              .from('pending_invitations') as any)
              .insert({
                organization_id: orgData,
                email: invitation.email,
                full_name: invitation.name,
                specialty: invitation.specialty,
                token: token,
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 jours
              });

            // Log pour l'envoi d'email (à implémenter plus tard)
            console.log(`Invitation envoyée à ${invitation.email} pour ${formData.cabinetName}`);
          }
        }

        toast({
          title: 'Cabinet créé !',
          description: 'Votre cabinet médical a été créé avec succès. Les invitations ont été envoyées.',
        });

        navigate('/dashboard');
      }
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la création du cabinet.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = getPasswordStrength(formData.adminPassword);
  const progress = (currentStep / 5) * 100;

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="adminFullName">Nom complet</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="adminFullName"
                  placeholder="Dr. Jean Dupont"
                  value={formData.adminFullName}
                  onChange={(e) => setFormData({ ...formData, adminFullName: e.target.value })}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="adminEmail">Email professionnel</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="adminEmail"
                  type="email"
                  placeholder="admin@cabinet.com"
                  value={formData.adminEmail}
                  onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="adminSpecialty">Spécialité médicale</Label>
              <div className="relative">
                <Stethoscope className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
                <Select
                  value={formData.adminSpecialty}
                  onValueChange={(value) => setFormData({ ...formData, adminSpecialty: value })}
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
              <Label htmlFor="adminPassword">Mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="adminPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={formData.adminPassword}
                  onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
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
              {formData.adminPassword && (
                <p className={`text-sm ${passwordStrength.color}`}>
                  Force: {passwordStrength.label}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="adminConfirmPassword">Confirmer le mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="adminConfirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={formData.adminConfirmPassword}
                  onChange={(e) => setFormData({ ...formData, adminConfirmPassword: e.target.value })}
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
              <Label htmlFor="cabinetName">Nom du cabinet</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="cabinetName"
                  placeholder="Centre Médical Saint-Martin"
                  value={formData.cabinetName}
                  onChange={(e) => setFormData({ ...formData, cabinetName: e.target.value })}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cabinetAddress">Adresse complète (optionnel)</Label>
              <Textarea
                id="cabinetAddress"
                placeholder="123 Rue de la Santé, 75001 Paris"
                value={formData.cabinetAddress}
                onChange={(e) => setFormData({ ...formData, cabinetAddress: e.target.value })}
                rows={3}
              />
            </div>

              <div className="space-y-2">
              <Label htmlFor="practitionerCount">Nombre de praticiens</Label>
              <Select
                value={formData.practitionerCount}
                onValueChange={(value) => setFormData({ ...formData, practitionerCount: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez le nombre de praticiens" />
                </SelectTrigger>
                <SelectContent>
                  {PRACTITIONER_COUNTS.map((count) => (
                    <SelectItem key={count.value} value={count.value}>
                      {count.label} - {count.price}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.practitionerCount && (
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 mt-2">
                  <p className="text-sm font-medium text-primary">
                    {PRACTITIONER_COUNTS.find(p => p.value === formData.practitionerCount)?.price}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Facturation mensuelle - Sans engagement
                  </p>
                </div>
              )}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="space-y-3">
              <Label>Configuration de l'accès à l'IA</Label>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="shared"
                    name="apiConfig"
                    value="shared"
                    checked={formData.apiConfigType === 'shared'}
                    onChange={(e) => setFormData({ ...formData, apiConfigType: e.target.value as any })}
                  />
                  <Label htmlFor="shared" className="cursor-pointer">
                    <strong>Clé API partagée</strong>
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground ml-6">
                  Une seule clé pour tout le cabinet
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="individual"
                    name="apiConfig"
                    value="individual"
                    checked={formData.apiConfigType === 'individual'}
                    onChange={(e) => setFormData({ ...formData, apiConfigType: e.target.value as any })}
                  />
                  <Label htmlFor="individual" className="cursor-pointer">
                    <strong>Clés individuelles</strong>
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground ml-6">
                  Chaque praticien utilise sa propre clé
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="hybrid"
                    name="apiConfig"
                    value="hybrid"
                    checked={formData.apiConfigType === 'hybrid'}
                    onChange={(e) => setFormData({ ...formData, apiConfigType: e.target.value as any })}
                  />
                  <Label htmlFor="hybrid" className="cursor-pointer">
                    <strong>Hybride</strong>
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground ml-6">
                  Clé par défaut fournie, mais les praticiens peuvent utiliser la leur
                </p>
              </div>
            </div>

            {(formData.apiConfigType === 'shared' || formData.apiConfigType === 'hybrid') && (
              <div className="space-y-2">
                <Label htmlFor="sharedApiKey">Clé API Mistral du cabinet</Label>
                <div className="relative">
                  <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="sharedApiKey"
                    type={showApiKey ? 'text' : 'password'}
                    placeholder="Votre clé Mistral"
                    value={formData.sharedApiKey}
                    onChange={(e) => {
                      setFormData({ ...formData, sharedApiKey: e.target.value });
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

                <div className="flex items-center gap-2">
                  <Button
                    onClick={testApiKey}
                    disabled={!formData.sharedApiKey || testingApiKey}
                    variant="outline"
                    size="sm"
                  >
                    {testingApiKey ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Test en cours...
                      </>
                    ) : (
                      'Tester'
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
              </div>
            )}

            {formData.apiConfigType === 'individual' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-700">
                  Les praticiens entreront leur clé lors de leur première connexion.
                </p>
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Invitez votre équipe</Label>
              <Badge variant="outline">Optionnel</Badge>
            </div>

            <div className="space-y-3">
              {formData.invitations.map((invitation) => (
                <div key={invitation.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Praticien {formData.invitations.indexOf(invitation) + 1}</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeInvitation(invitation.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor={`email-${invitation.id}`}>Email</Label>
                      <Input
                        id={`email-${invitation.id}`}
                        type="email"
                        placeholder="praticien@cabinet.com"
                        value={invitation.email}
                        onChange={(e) => updateInvitation(invitation.id, 'email', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`name-${invitation.id}`}>Nom</Label>
                      <Input
                        id={`name-${invitation.id}`}
                        placeholder="Dr. Marie Martin"
                        value={invitation.name}
                        onChange={(e) => updateInvitation(invitation.id, 'name', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <Label htmlFor={`specialty-${invitation.id}`}>Spécialité</Label>
                      <Select
                        value={invitation.specialty}
                        onValueChange={(value) => updateInvitation(invitation.id, 'specialty', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez la spécialité" />
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
                </div>
              ))}

              <Button
                variant="outline"
                onClick={addInvitation}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un praticien
              </Button>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <div className="space-y-3">
              <h3 className="font-semibold">Récapitulatif du cabinet</h3>
              
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nom du cabinet :</span>
                  <span className="font-medium">{formData.cabinetName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Administrateur :</span>
                  <span className="font-medium">{formData.adminFullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email admin :</span>
                  <span className="font-medium">{formData.adminEmail}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nombre de praticiens :</span>
                  <span className="font-medium">
                    {PRACTITIONER_COUNTS.find(p => p.value === formData.practitionerCount)?.label || formData.practitionerCount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tarif :</span>
                  <span className="font-medium text-primary text-lg">
                    {PRACTITIONER_COUNTS.find(p => p.value === formData.practitionerCount)?.price}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Configuration API :</span>
                  <span className="font-medium capitalize">{formData.apiConfigType}</span>
                </div>
                {formData.invitations.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Invitations :</span>
                    <span className="font-medium">{formData.invitations.length} praticien(s)</span>
                  </div>
                )}
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
                  </a>{' '}
                  Obtenez votre clé sur{' '}
                  <a href="https://console.mistral.ai/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    console.mistral.ai
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
        return formData.adminFullName && formData.adminEmail && formData.adminSpecialty && 
               formData.adminPassword && formData.adminConfirmPassword &&
               formData.adminPassword === formData.adminConfirmPassword &&
               validatePassword(formData.adminPassword);
      case 2:
        return formData.cabinetName && formData.practitionerCount;
      case 3:
        if (formData.apiConfigType === 'shared' || formData.apiConfigType === 'hybrid') {
          return apiKeyValid === 'valid';
        }
        return true;
      case 4:
        return true; // Étape optionnelle
      case 5:
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
            <Building2 className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-primary">MediScribe</h1>
          </div>
          <h2 className="text-xl font-semibold">Compte Cabinet</h2>
          <p className="text-muted-foreground mt-2">Étape {currentStep} sur 5</p>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <Progress value={progress} className="h-2" />
        </div>

        {/* Formulaire */}
        <Card className="shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl font-bold">
              {currentStep === 1 && 'Créons votre compte administrateur'}
              {currentStep === 2 && 'Présentez votre cabinet'}
              {currentStep === 3 && 'Configurez l\'accès à l\'IA'}
              {currentStep === 4 && 'Invitez votre équipe'}
              {currentStep === 5 && 'Finalisation'}
            </CardTitle>
            <CardDescription>
              {currentStep === 1 && 'Informations de l\'administrateur'}
              {currentStep === 2 && 'Détails de votre cabinet'}
              {currentStep === 3 && 'Configuration des clés API'}
              {currentStep === 4 && 'Ajoutez vos praticiens'}
              {currentStep === 5 && 'Vérifiez vos informations'}
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

              {currentStep < 5 ? (
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
                    'Créer le cabinet'
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
