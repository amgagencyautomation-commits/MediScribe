import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { 
  Shield, 
  Building2, 
  Users, 
  TrendingUp,
  DollarSign,
  Eye,
  Search,
  Download,
  Filter,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface GlobalStats {
  totalUsers: number;
  totalOrganizations: number;
  totalConsultations: number;
  totalRevenue: number;
  activeUsers: number;
}

interface UserData {
  id: string;
  email: string;
  full_name: string;
  specialty: string;
  account_type: string;
  organization_name: string | null;
  created_at: string;
  last_login: string;
}

interface OrganizationData {
  id: string;
  name: string;
  member_count: number;
  admin_name: string;
  created_at: string;
  status: string;
}

export default function SuperAdmin() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [users, setUsers] = useState<UserData[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState('overview');

  // Vérifier si l'utilisateur est super-admin
  useEffect(() => {
    // Ici, vous devriez vérifier si l'utilisateur a le rôle super-admin
    // Pour l'instant, on considère que seul vous (le créateur) êtes admin
    const isSuperAdmin = user?.email === 'admin@mediscribe.com'; // Configurez votre email admin
    
    if (!isSuperAdmin && user) {
      toast({
        title: 'Accès refusé',
        description: 'Cette page est réservée aux administrateurs.',
        variant: 'destructive',
      });
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadStats(),
        loadUsers(),
        loadOrganizations()
      ]);
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les données.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const [usersData, orgsData, consultationsData] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact' }),
        supabase.from('organizations').select('id', { count: 'exact' }),
        supabase.from('consultations').select('id', { count: 'exact' })
      ]);

      setStats({
        totalUsers: usersData.count || 0,
        totalOrganizations: orgsData.count || 0,
        totalConsultations: consultationsData.count || 0,
        totalRevenue: 0, // À implémenter
        activeUsers: usersData.count || 0, // Simplifié
      });
    } catch (error) {
      console.error('Erreur stats:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          full_name,
          specialty,
          account_type,
          created_at,
          organizations (
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedUsers = data?.map(user => ({
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        specialty: user.specialty,
        account_type: user.account_type,
        organization_name: (user.organizations as any)?.[0]?.name || null,
        created_at: user.created_at,
        last_login: user.created_at, // À implémenter
      })) || [];

      setUsers(formattedUsers);
    } catch (error) {
      console.error('Erreur chargement users:', error);
    }
  };

  const loadOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select(`
          *,
          profiles!organizations_admin_user_id_fkey (
            full_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Compter les membres
      const orgsWithCount = await Promise.all(
        (data || []).map(async (org) => {
          const { count } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', org.id);

          return {
            id: org.id,
            name: org.name,
            member_count: count || 0,
            admin_name: (org.profiles as any)?.[0]?.full_name || 'N/A',
            created_at: org.created_at,
            status: 'active',
          };
        })
      );

      setOrganizations(orgsWithCount);
    } catch (error) {
      console.error('Erreur chargement orgs:', error);
    }
  };

  const filteredUsers = users.filter(user =>
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.specialty.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getAccountTypeBadge = (type: string) => {
    switch (type) {
      case 'solo':
        return <Badge variant="secondary">Solo</Badge>;
      case 'cabinet_admin':
        return <Badge variant="default">Admin Cabinet</Badge>;
      case 'cabinet_member':
        return <Badge variant="outline">Membre Cabinet</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Chargement des données...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Shield className="h-8 w-8 text-primary" />
              Administration Générale
            </h1>
            <p className="text-muted-foreground mt-1">
              Gestion globale de la plateforme MediScribe
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualiser
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </Button>
          </div>
        </div>

        {/* Stats Globales */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Utilisateurs</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalUsers}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.activeUsers} actifs
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cabinets</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalOrganizations}</div>
                <p className="text-xs text-muted-foreground">
                  Tous actifs
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Consultations</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalConsultations}</div>
                <p className="text-xs text-muted-foreground">
                  Total enregistrées
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenus</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalRevenue}€</div>
                <p className="text-xs text-muted-foreground">
                  Ce mois
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Onglets */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList>
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="users">Utilisateurs</TabsTrigger>
            <TabsTrigger value="organizations">Cabinets</TabsTrigger>
          </TabsList>

          {/* Vue d'ensemble */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Activité récente</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">À venir...</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Utilisateurs actifs</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">À venir...</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Utilisateurs */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Tous les utilisateurs</CardTitle>
                    <CardDescription>
                      {filteredUsers.length} utilisateur(s)
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Rechercher..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 w-64"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Spécialité</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Cabinet</TableHead>
                      <TableHead>Inscription</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.full_name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.specialty}</TableCell>
                        <TableCell>{getAccountTypeBadge(user.account_type)}</TableCell>
                        <TableCell>{user.organization_name || '-'}</TableCell>
                        <TableCell>{new Date(user.created_at).toLocaleDateString('fr-FR')}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cabinets */}
          <TabsContent value="organizations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Tous les cabinets</CardTitle>
                <CardDescription>
                  {organizations.length} cabinet(s)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom du cabinet</TableHead>
                      <TableHead>Administrateur</TableHead>
                      <TableHead>Membres</TableHead>
                      <TableHead>Création</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {organizations.map((org) => (
                      <TableRow key={org.id}>
                        <TableCell className="font-medium">{org.name}</TableCell>
                        <TableCell>{org.admin_name}</TableCell>
                        <TableCell>{org.member_count} membre(s)</TableCell>
                        <TableCell>{new Date(org.created_at).toLocaleDateString('fr-FR')}</TableCell>
                        <TableCell>
                          <Badge variant="default">{org.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

