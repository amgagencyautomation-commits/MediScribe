import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from '@/hooks/use-toast';
 import { ProfileService } from '@/lib/services';
 import { testMistralKey } from '@/lib/crypto';
 import config from '@/config';
import { 
  User, 
  Key, 
  CreditCard, 
  Eye, 
  EyeOff, 
  Check, 
  AlertCircle, 
  Loader2,
  Save,
  TestTube
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

export default function Settings() {
  const { user, profile, organization, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [testingApiKey, setTestingApiKey] = useState(false);
  const [apiKeyValid, setApiKeyValid] = useState<'not-tested' | 'testing' | 'valid' | 'invalid'>('not-tested');
  const [showApiKey, setShowApiKey] = useState(false);
  const [showNewApiKey, setShowNewApiKey] = useState(false);

  // État du formulaire profil
  const [profileData, setProfileData] = useState({
    full_name: '',
    specialty: '',
    sub_specialties: '',
    consultation_types: [] as string[],
  });

  // État de la clé API
  const [apiKeyData, setApiKeyData] = useState({
    currentKey: '',
    newKey: '',
    usePersonalKey: true,
  });

  useEffect(() => {
    if (profile) {
      setProfileData({
        full_name: profile.full_name || '',
        specialty: profile.specialty || '',
        sub_specialties: profile.sub_specialties || '',
        consultation_types: profile.consultation_types || [],
      });
      setApiKeyData({
        currentKey: '',
        newKey: '',
        usePersonalKey: profile.use_personal_api_key,
      });
    }
  }, [profile]);

  const loadCurrentApiKey = async () => {
    if (!user) return;
    
    try {
      console.log('🔑 Chargement clé API via serveur...');
      
      // Utiliser l'endpoint serveur pour contourner les problèmes RLS
      const response = await fetch(`${config.api.baseUrl}/api/get-api-key/${user.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Erreur serveur: ${response.status}`);
      }

      const result = await response.json();
      console.log('📥 Réponse serveur chargement clé:', result);
      
      if (result.success && result.apiKey) {
        console.log('✅ Clé API trouvée et déchiffrée côté serveur');
        setApiKeyData(prev => ({ ...prev, currentKey: result.apiKey }));
        setApiKeyValid('valid');
      } else {
        console.log('ℹ️  Aucune clé API configurée');
        setApiKeyData(prev => ({ ...prev, currentKey: '' }));
        setApiKeyValid('not-tested');
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement de la clé:', error);
      setApiKeyData(prev => ({ ...prev, currentKey: '' }));
      setApiKeyValid('not-tested');
    }
  };

  useEffect(() => {
    loadCurrentApiKey();
  }, [user]);

  const testApiKey = async (key: string) => {
    if (!key) return;
    
    setTestingApiKey(true);
    setApiKeyValid('testing');
    
    try {
      const isValid = await testMistralKey(key);
      setApiKeyValid(isValid ? 'valid' : 'invalid');
      
      if (isValid) {
        toast({
          title: 'Clé API valide',
          description: 'Votre clé Mistral AI fonctionne correctement.',
        });
      } else {
        toast({
          title: 'Clé API invalide',
          description: 'Vérifiez votre clé Mistral AI.',
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

  const handleSaveProfile = async () => {
    if (!user) return;

    setLoading(true);
    try {
      await ProfileService.updateProfile(user.id, {
        full_name: profileData.full_name,
        specialty: profileData.specialty,
        sub_specialties: profileData.sub_specialties || null,
        consultation_types: profileData.consultation_types,
      });

      await refreshProfile();
      
      toast({
        title: 'Profil mis à jour',
        description: 'Vos informations ont été sauvegardées.',
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder le profil.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveApiKey = async () => {
    if (!user || !apiKeyData.newKey) {
      toast({
        title: 'Clé manquante',
        description: 'Veuillez saisir une clé API.',
        variant: 'destructive',
      });
      return;
    }

    if (apiKeyValid !== 'valid') {
      toast({
        title: 'Clé API invalide',
        description: 'Vous devez valider votre clé API avant de la sauvegarder.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      console.log('💾 Sauvegarde clé API via serveur...');
      
      // Utiliser l'endpoint serveur pour contourner les problèmes RLS
      const response = await fetch(`${config.api.baseUrl}/api/save-api-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          apiKey: apiKeyData.newKey,
          usePersonalKey: apiKeyData.usePersonalKey,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur serveur');
      }

      const result = await response.json();
      console.log('✅ Clé sauvegardée côté serveur:', result);
      
      // Attendre un peu puis actualiser le profil et recharger la clé
      console.log('⏳ Attente puis rechargement...');
      setTimeout(async () => {
        await refreshProfile();
        await loadCurrentApiKey();
      }, 1000);
      
      // Réinitialiser le formulaire
      setApiKeyData(prev => ({ ...prev, newKey: '' }));
      setShowNewApiKey(false);
      
      toast({
        title: '✅ Clé API sauvegardée',
        description: 'Votre clé Mistral AI a été enregistrée et chiffrée de manière sécurisée.',
      });
      
      console.log('🔐 Clé API sauvegardée et chiffrée avec succès');
      
    } catch (error: any) {
      console.error('❌ Erreur sauvegarde clé:', error);
      toast({
        title: 'Erreur de sauvegarde',
        description: `Impossible de sauvegarder la clé API: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getApiKeyStatus = () => {
    if (apiKeyValid === 'valid') {
      return (
        <Badge variant="default" className="bg-green-600">
          <Check className="h-3 w-3 mr-1" />
          Clé valide
        </Badge>
      );
    }
    if (apiKeyValid === 'invalid') {
      return (
        <Badge variant="destructive">
          <AlertCircle className="h-3 w-3 mr-1" />
          Clé invalide
        </Badge>
      );
    }
    if (apiKeyValid === 'testing') {
      return (
        <Badge variant="secondary">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          Test en cours...
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">
        Non testée
      </Badge>
    );
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Paramètres</h1>
          <p className="text-muted-foreground mt-1">
            Gérez votre profil et configurez vos préférences
          </p>
        </div>

        {/* Onglets */}
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">Mon profil</TabsTrigger>
            <TabsTrigger value="api">Clé API</TabsTrigger>
            <TabsTrigger value="billing" disabled>Facturation</TabsTrigger>
          </TabsList>

          {/* Onglet Profil */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Informations personnelles
                </CardTitle>
                <CardDescription>
                  Mettez à jour vos informations de profil
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Photo de profil */}
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarFallback className="text-lg">
                      {profileData.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">{profileData.full_name}</h3>
                    <p className="text-sm text-muted-foreground">{profileData.specialty}</p>
                    <Button variant="outline" size="sm" className="mt-2">
                      Changer la photo
                    </Button>
                  </div>
                </div>

                {/* Formulaire */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Nom complet</Label>
                    <Input
                      id="fullName"
                      value={profileData.full_name}
                      onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                      placeholder="Dr. Jean Dupont"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={user?.email || ''}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">
                      L'email ne peut pas être modifié
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="specialty">Spécialité</Label>
                    <Select
                      value={profileData.specialty}
                      onValueChange={(value) => setProfileData({ ...profileData, specialty: value })}
                    >
                      <SelectTrigger>
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

                  <div className="space-y-2">
                    <Label htmlFor="subSpecialties">Sous-spécialités</Label>
                    <Textarea
                      id="subSpecialties"
                      placeholder="Ex: Échographie, Diabétologie..."
                      value={profileData.sub_specialties}
                      onChange={(e) => setProfileData({ ...profileData, sub_specialties: e.target.value })}
                      rows={3}
                    />
                  </div>
                </div>

                {/* Types de consultations */}
                <div className="space-y-2">
                  <Label>Types de consultations</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {CONSULTATION_TYPES.map((type) => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox
                          id={type}
                          checked={profileData.consultation_types.includes(type)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setProfileData({
                                ...profileData,
                                consultation_types: [...profileData.consultation_types, type]
                              });
                            } else {
                              setProfileData({
                                ...profileData,
                                consultation_types: profileData.consultation_types.filter(t => t !== type)
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

                {/* Actions */}
                <div className="flex justify-end">
                  <Button onClick={handleSaveProfile} disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sauvegarde...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Sauvegarder
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Onglet Clé API */}
          <TabsContent value="api" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Configuration de la clé API Mistral AI
                </CardTitle>
                <CardDescription>
                  Gérez votre accès à l'intelligence artificielle
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Clé actuelle */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Clé API actuelle</h3>
                    {getApiKeyStatus()}
                  </div>

                  <div className="space-y-2">
                    <Label>Clé API (masquée)</Label>
                    <div className="flex gap-2">
                      <Input
                        value={apiKeyData.currentKey ? '••••••••••••••••' : 'Aucune clé configurée'}
                        disabled
                        className="bg-muted"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowApiKey(!showApiKey)}
                        disabled={!apiKeyData.currentKey}
                      >
                        {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testApiKey(apiKeyData.currentKey)}
                        disabled={!apiKeyData.currentKey || testingApiKey}
                      >
                        {testingApiKey ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <TestTube className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {showApiKey && apiKeyData.currentKey && (
                      <p className="text-sm text-muted-foreground font-mono">
                        {apiKeyData.currentKey}
                      </p>
                    )}
                  </div>

                  <div className="text-sm text-muted-foreground">
                    <p>Dernier test : {apiKeyValid === 'valid' ? 'Réussi' : 'Non testé'}</p>
                  </div>
                </div>

                {/* Nouvelle clé */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Modifier la clé API</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowNewApiKey(!showNewApiKey)}
                    >
                      {showNewApiKey ? 'Annuler' : 'Modifier'}
                    </Button>
                  </div>

                  {showNewApiKey && (
                    <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                      <div className="space-y-2">
                        <Label htmlFor="newApiKey">Nouvelle clé API Mistral AI</Label>
                        <div className="flex gap-2">
                          <Input
                            id="newApiKey"
                            type="password"
                            placeholder="sk-..."
                            value={apiKeyData.newKey}
                            onChange={(e) => {
                              setApiKeyData({ ...apiKeyData, newKey: e.target.value });
                              setApiKeyValid('not-tested');
                            }}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => testApiKey(apiKeyData.newKey)}
                            disabled={!apiKeyData.newKey || testingApiKey}
                          >
                            {testingApiKey ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <TestTube className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="usePersonalKey"
                          checked={apiKeyData.usePersonalKey}
                          onCheckedChange={(checked) => setApiKeyData({ ...apiKeyData, usePersonalKey: !!checked })}
                        />
                        <Label htmlFor="usePersonalKey" className="text-sm font-normal cursor-pointer">
                          Utiliser ma clé personnelle (recommandé)
                        </Label>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={handleSaveApiKey}
                          disabled={!apiKeyData.newKey || apiKeyValid !== 'valid' || loading}
                        >
                          {loading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Sauvegarde...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-2" />
                              Enregistrer
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowNewApiKey(false);
                            setApiKeyData({ ...apiKeyData, newKey: '' });
                            setApiKeyValid('not-tested');
                          }}
                        >
                          Annuler
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Informations */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">Informations importantes</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Votre clé API est cryptée et stockée de manière sécurisée</li>
                    <li>• Coût estimé : ~0.50-2€ par consultation</li>
                    <li>• Vous pouvez obtenir une clé sur console.mistral.ai</li>
                    <li>• La clé est utilisée uniquement pour vos consultations</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Onglet Facturation */}
          <TabsContent value="billing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Facturation
                </CardTitle>
                <CardDescription>
                  Gérez votre abonnement et vos paiements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">Facturation bientôt disponible</h3>
                  <p className="text-muted-foreground">
                    Cette fonctionnalité sera disponible dans une prochaine mise à jour.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
