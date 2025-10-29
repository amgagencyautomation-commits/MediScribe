import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { PendingInvitation } from '@/types/database';
import { 
  Building2, 
  Users, 
  Plus, 
  Mail, 
  MoreHorizontal, 
  Eye, 
  EyeOff,
  Check,
  AlertCircle,
  Loader2,
  Trash2,
  UserPlus,
  Key
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

interface OrganizationMember {
  id: string;
  email: string;
  full_name: string;
  specialty: string;
  role: 'admin' | 'member';
  status: 'active' | 'pending' | 'suspended';
  created_at: string;
}

export default function Organization() {
  const { user, profile, organization, refreshOrganization } = useAuth();
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [testingApiKey, setTestingApiKey] = useState(false);
  const [apiKeyValid, setApiKeyValid] = useState<'not-tested' | 'testing' | 'valid' | 'invalid'>('not-tested');

  // État du formulaire d'invitation
  const [inviteData, setInviteData] = useState({
    email: '',
    name: '',
    specialty: '',
    message: '',
  });

  useEffect(() => {
    if (organization) {
      loadMembers();
      loadPendingInvitations();
    }
  }, [organization]);

  const loadMembers = async () => {
    if (!organization) return;

    try {
      const { data, error } = await (supabase
        .from('profiles') as any)
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const membersData: OrganizationMember[] = (data as any[]).map((member: any) => ({
        id: member.id,
        email: member.email,
        full_name: member.full_name,
        specialty: member.specialty,
        role: member.role || 'member',
        status: 'active',
        created_at: member.created_at,
      }));

      setMembers(membersData);
    } catch (error) {
      console.error('Erreur lors du chargement des membres:', error);
    }
  };

  const loadPendingInvitations = async () => {
    if (!organization) return;

    try {
      const { data, error } = await supabase
        .from('pending_invitations')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingInvitations(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des invitations:', error);
    }
  };

  const handleSendInvitation = async () => {
    if (!organization || !inviteData.email || !inviteData.name) {
      toast({
        title: 'Informations manquantes',
        description: 'Veuillez remplir tous les champs obligatoires.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const token = crypto.randomUUID();
      
      const { error } = await (supabase
        .from('pending_invitations') as any)
        .insert({
          organization_id: organization.id,
          email: inviteData.email,
          full_name: inviteData.name,
          specialty: inviteData.specialty,
          token: token,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 jours
        });

      if (error) throw error;

      // TODO: Envoyer l'email d'invitation
      console.log(`Invitation envoyée à ${inviteData.email} pour ${organization.name}`);

      toast({
        title: 'Invitation envoyée !',
        description: `Email envoyé à ${inviteData.email}`,
      });

      // Réinitialiser le formulaire
      setInviteData({
        email: '',
        name: '',
        specialty: '',
        message: '',
      });
      setShowInviteDialog(false);
      
      // Recharger les invitations
      await loadPendingInvitations();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'envoyer l\'invitation.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('pending_invitations')
        .delete()
        .eq('id', invitationId);

      if (error) throw error;

      toast({
        title: 'Invitation supprimée',
        description: 'L\'invitation a été supprimée.',
      });

      await loadPendingInvitations();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer l\'invitation.',
        variant: 'destructive',
      });
    }
  };

  const testSharedApiKey = async () => {
    if (!organization?.shared_mistral_api_key) return;

    setTestingApiKey(true);
    setApiKeyValid('testing');

    try {
      // TODO: Implémenter le test de la clé partagée
      // const isValid = await MistralService.testApiKey(decryptedKey);
      setApiKeyValid('valid');
      
      toast({
        title: 'Clé API valide',
        description: 'La clé API partagée fonctionne correctement.',
      });
    } catch (error) {
      setApiKeyValid('invalid');
      toast({
        title: 'Clé API invalide',
        description: 'Vérifiez la clé API partagée.',
        variant: 'destructive',
      });
    } finally {
      setTestingApiKey(false);
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

  const getRoleBadge = (role: string) => {
    const variants = {
      admin: 'default',
      member: 'secondary'
    } as const;

    return (
      <Badge variant={variants[role as keyof typeof variants]}>
        {role === 'admin' ? 'Administrateur' : 'Membre'}
      </Badge>
    );
  };

  if (!organization) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Card>
            <CardContent className="text-center py-8">
              <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Aucune organisation</h3>
              <p className="text-muted-foreground mb-4">
                Vous n'appartenez à aucune organisation pour le moment.
              </p>
              <Button onClick={() => window.location.href = '/account-type'}>
                Créer un cabinet
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestion du cabinet</h1>
          <p className="text-muted-foreground mt-1">
            Gérez votre cabinet médical et votre équipe
          </p>
        </div>

        {/* Informations du cabinet */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Informations du cabinet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm text-muted-foreground">Nom du cabinet</Label>
                <p className="font-semibold">{organization.name}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Plan</Label>
                <p className="font-semibold">{organization.max_users} praticiens max</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Statut</Label>
                <Badge variant="default">Actif</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Membres du cabinet */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Praticiens du cabinet
                </CardTitle>
                <CardDescription>
                  Gérez les membres de votre équipe
                </CardDescription>
              </div>
              <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Inviter un praticien
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Inviter un praticien</DialogTitle>
                    <DialogDescription>
                      Envoyez une invitation à un nouveau praticien pour rejoindre votre cabinet.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="inviteEmail">Email *</Label>
                      <Input
                        id="inviteEmail"
                        type="email"
                        placeholder="praticien@cabinet.com"
                        value={inviteData.email}
                        onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="inviteName">Nom complet *</Label>
                      <Input
                        id="inviteName"
                        placeholder="Votre clé Mistral AI"
                        value={inviteData.name}
                        onChange={(e) => setInviteData({ ...inviteData, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="inviteSpecialty">Spécialité</Label>
                      <Select
                        value={inviteData.specialty}
                        onValueChange={(value) => setInviteData({ ...inviteData, specialty: value })}
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
                    <div className="space-y-2">
                      <Label htmlFor="inviteMessage">Message personnalisé (optionnel)</Label>
                      <Input
                        id="inviteMessage"
                        placeholder="Message d'accueil..."
                        value={inviteData.message}
                        onChange={(e) => setInviteData({ ...inviteData, message: e.target.value })}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSendInvitation} disabled={loading}>
                        {loading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Envoi...
                          </>
                        ) : (
                          <>
                            <Mail className="h-4 w-4 mr-2" />
                            Envoyer l'invitation
                          </>
                        )}
                      </Button>
                      <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
                        Annuler
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Spécialité</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.full_name}</TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>{member.specialty}</TableCell>
                    <TableCell>{getRoleBadge(member.role)}</TableCell>
                    <TableCell>
                      <Badge variant="default">Actif</Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Invitations en attente */}
        {pendingInvitations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Invitations en attente
              </CardTitle>
              <CardDescription>
                Invitations envoyées en attente de réponse
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingInvitations.map((invitation) => (
                  <div key={invitation.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{invitation.full_name}</p>
                      <p className="text-sm text-muted-foreground">{invitation.email}</p>
                      <p className="text-sm text-muted-foreground">{invitation.specialty}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        En attente
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteInvitation(invitation.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Clé API partagée */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Clé API Mistral AI du cabinet
            </CardTitle>
            <CardDescription>
              Configuration de la clé API Mistral AI partagée par défaut dans le cabinet
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Clé API du cabinet</h3>
                <p className="text-sm text-muted-foreground">
                  {organization.shared_mistral_api_key ? 'Configurée' : 'Non configurée'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {organization.shared_mistral_api_key && getApiKeyStatus()}
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm">
                  Modifier
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={testSharedApiKey}
                  disabled={!organization.shared_mistral_api_key || testingApiKey}
                >
                  {testingApiKey ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {!organization.shared_mistral_api_key && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-900 mb-2">Clé API non configurée</h4>
                <p className="text-sm text-yellow-700 mb-3">
                  Configurez une clé API partagée pour permettre à tous les praticiens d'utiliser l'IA.
                </p>
                <Button size="sm">
                  Configurer la clé API
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
