-- ============================================
-- MEDSCRIBE - SCHEMA SUPABASE COMPLET
-- ============================================
-- Ce fichier contient le schéma complet pour MediScribe
-- Exécuter ces commandes dans l'éditeur SQL de Supabase
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- SUPPRESSION DES TABLES EXISTANTES (si elles existent)
-- ============================================
DROP TABLE IF EXISTS api_usage CASCADE;
DROP TABLE IF EXISTS pending_invitations CASCADE;
DROP TABLE IF EXISTS consultations CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- Supprimer les fonctions existantes
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.create_organization(TEXT, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.invite_user_to_organization(TEXT, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

-- Les tables, triggers et policies seront supprimés automatiquement avec DROP TABLE CASCADE

-- ============================================
-- TABLE: organizations (Cabinets médicaux)
-- ============================================
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  plan_type TEXT DEFAULT 'cabinet' CHECK (plan_type IN ('cabinet')),
  shared_mistral_api_key TEXT, -- Clé API Mistral partagée (cryptée)
  admin_user_id UUID, -- Référence vers l'admin du cabinet
  max_users INTEGER DEFAULT 5 CHECK (max_users > 0), -- Limite de praticiens
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLE: profiles (Utilisateurs)
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  specialty TEXT NOT NULL,
  sub_specialties TEXT, -- Sous-spécialités (texte libre)
  consultation_types JSONB, -- Array des types de consultations
  personal_mistral_api_key TEXT, -- Clé API Mistral personnelle (cryptée)
  account_type TEXT NOT NULL CHECK (account_type IN ('solo', 'cabinet_admin', 'cabinet_member')),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  role TEXT CHECK (role IN ('admin', 'member')), -- Rôle dans le cabinet
  use_personal_api_key BOOLEAN DEFAULT FALSE, -- Utilise clé perso ou cabinet
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLE: consultations (Consultations médicales)
-- ============================================
CREATE TABLE consultations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doctor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  patient_name TEXT NOT NULL,
  patient_age INTEGER,
  consultation_date TIMESTAMP WITH TIME ZONE NOT NULL,
  consultation_type TEXT NOT NULL,
  audio_file_url TEXT, -- URL du fichier audio (publique)
  audio_file_path TEXT, -- Chemin du fichier dans Storage (pour suppression)
  transcription TEXT, -- Transcription de l'audio
  medical_report TEXT, -- Compte rendu généré
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'completed', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLE: pending_invitations (Invitations en attente)
-- ============================================
CREATE TABLE pending_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  specialty TEXT,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLE: api_usage (Suivi de l'utilisation des API)
-- ============================================
CREATE TABLE api_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  api_type TEXT NOT NULL CHECK (api_type IN ('mistral_transcription', 'mistral_generation')),
  tokens_used INTEGER NOT NULL DEFAULT 0,
  cost_usd DECIMAL(10,4) DEFAULT 0,
  consultation_id UUID REFERENCES consultations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES pour performance
-- ============================================
CREATE INDEX idx_profiles_organization ON profiles(organization_id);
CREATE INDEX idx_profiles_account_type ON profiles(account_type);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_organizations_admin ON organizations(admin_user_id);
CREATE INDEX idx_consultations_doctor ON consultations(doctor_id);
CREATE INDEX idx_consultations_organization ON consultations(organization_id);
CREATE INDEX idx_consultations_date ON consultations(consultation_date);
CREATE INDEX idx_pending_invitations_organization ON pending_invitations(organization_id);
CREATE INDEX idx_pending_invitations_email ON pending_invitations(email);
CREATE INDEX idx_pending_invitations_token ON pending_invitations(token);
CREATE INDEX idx_api_usage_user ON api_usage(user_id);
CREATE INDEX idx_api_usage_organization ON api_usage(organization_id);

-- ============================================
-- TRIGGERS pour updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_consultations_updated_at BEFORE UPDATE ON consultations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Activer RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLICIES: profiles
-- ============================================

-- Les utilisateurs peuvent voir leur propre profil
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Les utilisateurs peuvent voir les profils de leur organisation
CREATE POLICY "Users can view org members profiles"
  ON profiles FOR SELECT
  USING (
    organization_id IS NOT NULL 
    AND organization_id IN (
      SELECT organization_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

-- Les utilisateurs peuvent modifier leur propre profil
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Les admins peuvent modifier les profils de leur organisation
CREATE POLICY "Admins can update org members"
  ON profiles FOR UPDATE
  USING (
    role = 'admin' 
    AND organization_id IN (
      SELECT organization_id 
      FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- POLICIES: organizations
-- ============================================

-- Les admins peuvent voir leur organisation
CREATE POLICY "Admins can view their organization"
  ON organizations FOR SELECT
  USING (
    admin_user_id = auth.uid()
    OR id IN (
      SELECT organization_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

-- Les admins peuvent modifier leur organisation
CREATE POLICY "Admins can update their organization"
  ON organizations FOR UPDATE
  USING (admin_user_id = auth.uid());

-- Les admins peuvent créer des organisations
CREATE POLICY "Admins can create organizations"
  ON organizations FOR INSERT
  WITH CHECK (admin_user_id = auth.uid());

-- ============================================
-- POLICIES: consultations
-- ============================================

-- Les médecins peuvent voir leurs propres consultations
CREATE POLICY "Doctors can view own consultations"
  ON consultations FOR SELECT
  USING (doctor_id = auth.uid());

-- Les membres d'une organisation peuvent voir les consultations de l'organisation
CREATE POLICY "Org members can view org consultations"
  ON consultations FOR SELECT
  USING (
    organization_id IS NOT NULL 
    AND organization_id IN (
      SELECT organization_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

-- Les médecins peuvent créer leurs consultations
CREATE POLICY "Doctors can create consultations"
  ON consultations FOR INSERT
  WITH CHECK (doctor_id = auth.uid());

-- Les médecins peuvent modifier leurs consultations
CREATE POLICY "Doctors can update own consultations"
  ON consultations FOR UPDATE
  USING (doctor_id = auth.uid());

-- ============================================
-- POLICIES: pending_invitations
-- ============================================

-- Les admins peuvent voir les invitations de leur organisation
CREATE POLICY "Admins can view org invitations"
  ON pending_invitations FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Les admins peuvent créer des invitations pour leur organisation
CREATE POLICY "Admins can create org invitations"
  ON pending_invitations FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Les admins peuvent supprimer les invitations de leur organisation
CREATE POLICY "Admins can delete org invitations"
  ON pending_invitations FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- POLICIES: api_usage
-- ============================================

-- Les utilisateurs peuvent voir leur propre utilisation
CREATE POLICY "Users can view own api usage"
  ON api_usage FOR SELECT
  USING (user_id = auth.uid());

-- Les admins peuvent voir l'utilisation de leur organisation
CREATE POLICY "Admins can view org api usage"
  ON api_usage FOR SELECT
  USING (
    organization_id IS NOT NULL 
    AND organization_id IN (
      SELECT organization_id 
      FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- FUNCTION: Créer automatiquement un profil après inscription
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    specialty,
    account_type,
    use_personal_api_key
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Dr. ' || split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'specialty', 'Médecine générale'),
    'solo',
    false
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour créer automatiquement un profil
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- FUNCTION: Fonction pour créer une organisation
-- ============================================
CREATE OR REPLACE FUNCTION public.create_organization(
  org_name TEXT,
  max_users INTEGER DEFAULT 5
)
RETURNS UUID AS $$
DECLARE
  org_id UUID;
BEGIN
  -- Créer l'organisation
  INSERT INTO organizations (name, admin_user_id, max_users)
  VALUES (org_name, auth.uid(), max_users)
  RETURNING id INTO org_id;
  
  -- Mettre à jour le profil de l'admin
  UPDATE profiles 
  SET 
    organization_id = org_id,
    account_type = 'cabinet_admin',
    role = 'admin'
  WHERE id = auth.uid();
  
  RETURN org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Fonction pour inviter un utilisateur dans une organisation
-- ============================================
CREATE OR REPLACE FUNCTION public.invite_user_to_organization(
  user_email TEXT,
  org_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  user_profile_id UUID;
BEGIN
  -- Vérifier que l'utilisateur actuel est admin de l'organisation
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND organization_id = org_id 
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Seuls les administrateurs peuvent inviter des utilisateurs';
  END IF;
  
  -- Trouver l'utilisateur par email
  SELECT id INTO user_profile_id 
  FROM profiles 
  WHERE email = user_email;
  
  IF user_profile_id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur non trouvé';
  END IF;
  
  -- Ajouter l'utilisateur à l'organisation
  UPDATE profiles 
  SET 
    organization_id = org_id,
    account_type = 'cabinet_member',
    role = 'member'
  WHERE id = user_profile_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Supprimer automatiquement les fichiers audio après 5h
-- ============================================
-- Cette fonction est appelée par le serveur API toutes les heures
-- pour supprimer les fichiers audio de consultations créées il y a plus de 5 heures
CREATE OR REPLACE FUNCTION public.cleanup_old_audio_files()
RETURNS TABLE(deleted_count INTEGER, deleted_files TEXT[]) AS $$
DECLARE
  consultation_record RECORD;
  deleted_paths TEXT[] := ARRAY[]::TEXT[];
  count INTEGER := 0;
BEGIN
  -- Trouver toutes les consultations avec des fichiers audio de plus de 5 heures
  FOR consultation_record IN
    SELECT id, audio_file_path
    FROM consultations
    WHERE audio_file_path IS NOT NULL
    AND created_at < NOW() - INTERVAL '5 hours'
  LOOP
    -- Supprimer le fichier du storage (cette partie sera gérée par l'application)
    -- On retourne juste les chemins à supprimer
    deleted_paths := array_append(deleted_paths, consultation_record.audio_file_path);
    
    -- Marquer le chemin comme null dans la base de données
    UPDATE consultations
    SET audio_file_path = NULL
    WHERE id = consultation_record.id;
    
    count := count + 1;
  END LOOP;
  
  RETURN QUERY SELECT count, deleted_paths;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ACTIVER L'EXTENSION pg_cron (si disponible)
-- ============================================
-- Cette extension permet d'exécuter des fonctions SQL automatiquement
-- Pour l'activer dans Supabase :
-- 1. Allez dans Database > Extensions
-- 2. Activez l'extension pg_cron
-- 3. Exécutez ensuite cette commande dans l'éditeur SQL :
--
-- SELECT cron.schedule(
--   'cleanup-audio-files',
--   '0 * * * *', -- Toutes les heures
--   $$SELECT public.cleanup_old_audio_files();$$
-- );
--
-- Pour désactiver le cron :
-- SELECT cron.unschedule('cleanup-audio-files');
-- ============================================

-- ============================================
-- NOTES D'IMPLÉMENTATION
-- ============================================
-- 1. Les clés API Mistral doivent être cryptées avec AES-256 avant stockage
-- 2. Utiliser crypto-js côté client pour le cryptage
-- 3. Stocker la clé de cryptage dans les variables d'environnement
-- 4. Ne JAMAIS exposer les clés API en clair
-- 5. Valider les clés Mistral avant de les stocker
-- 6. Implémenter un système de quotas pour l'utilisation des API
-- 7. Ajouter des logs d'audit pour les actions sensibles
-- ============================================
