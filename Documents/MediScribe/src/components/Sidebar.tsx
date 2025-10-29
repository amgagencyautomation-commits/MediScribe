import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Stethoscope, 
  Home, 
  Mic, 
  FileText, 
  Settings, 
  Users, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const Sidebar = ({ collapsed, onToggle }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, organization, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const menuItems = [
    {
      id: 'home',
      label: 'Accueil',
      icon: Home,
      path: '/dashboard',
      highlight: false,
    },
    {
      id: 'record',
      label: 'Nouvel enregistrement',
      icon: Mic,
      path: '/dashboard/record',
      highlight: true,
    },
    {
      id: 'consultations',
      label: 'Mes comptes rendus',
      icon: FileText,
      path: '/dashboard/consultations',
      highlight: false,
    },
    {
      id: 'settings',
      label: 'Paramètres',
      icon: Settings,
      path: '/dashboard/settings',
      highlight: false,
    },
  ];

  // Vérifier si c'est un super-admin (temporairement basé sur l'email)
  const isSuperAdmin = user?.email?.includes('amgv') || user?.email === 'admin@mediscribe.com';
  
  // Ajouter la gestion d'organisation pour les admins de cabinet
  if (profile?.account_type === 'cabinet_admin') {
    menuItems.splice(3, 0, {
      id: 'organization',
      label: 'Gestion cabinet',
      icon: Users,
      path: '/dashboard/organization',
      highlight: false,
    });
  }
  
  // Ajouter l'administration pour les super-admins
  if (isSuperAdmin) {
    menuItems.splice(4, 0, {
      id: 'superadmin',
      label: 'Administration',
      icon: Shield,
      path: '/dashboard/admin',
      highlight: false,
    });
  }

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className={`bg-card border-r transition-all duration-300 ${
      collapsed ? 'w-16' : 'w-64'
    } flex flex-col h-screen`}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <Stethoscope className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-primary truncate">MediScribe</h1>
              <p className="text-xs text-muted-foreground truncate">
                {organization ? organization.name : 'Compte individuel'}
              </p>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="h-8 w-8 p-0"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <Button
              key={item.id}
              variant={active ? 'default' : 'ghost'}
              className={`w-full justify-start h-10 ${
                collapsed ? 'px-2' : 'px-3'
              } ${item.highlight ? 'ring-2 ring-primary/20' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <Icon className={`h-4 w-4 ${collapsed ? '' : 'mr-3'}`} />
              {!collapsed && (
                <span className="truncate">
                  {item.label}
                  {item.highlight && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      Nouveau
                    </Badge>
                  )}
                </span>
              )}
            </Button>
          );
        })}
      </nav>

      {/* User info */}
      <div className="p-4 border-t">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">
              {profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {profile?.full_name || 'Utilisateur'}
              </p>
              <div className="flex items-center gap-1">
                <Badge 
                  variant="outline" 
                  className="text-xs px-1 py-0"
                >
                  {profile?.account_type === 'solo' ? 'Solo' : 
                   profile?.account_type === 'cabinet_admin' ? 'Admin' : 'Membre'}
                </Badge>
                {organization && (
                  <Badge variant="secondary" className="text-xs px-1 py-0">
                    {organization.name}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
        
        {!collapsed && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="w-full mt-3 text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Se déconnecter
          </Button>
        )}
      </div>
    </div>
  );
};
