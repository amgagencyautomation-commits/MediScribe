-- ============================================
-- MEDSCRIBE - SCHEMA SUPABASE CORRIGÉ
-- ============================================
-- Version sans récursion infinie dans les policies
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- SUPPRESSION DES TABLES EXISTANTES
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

-- ============================================
-- TABLE: organizations (Cabinets médicaux)
-- ============================================
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  plan_type TEXT DEFAULT 'cabinet' CHECK (plan_type IN ('cabinet')),
  shared_mistral_api_key TEXT,
  admin_user_id UUID,
  max_users INTEGER DEFAULT 5 CHECK (max_users > 0),
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
  sub_specialties TEXT,
  consultation_types JSONB,
  personal_mistral_api_key TEXT,
  account_type TEXT NOT NULL CHECK (account_type IN ('solo', 'cabinet_admin', 'cabinet_member')),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  role TEXT CHECK (role IN ('admin', 'member')),
  use_personal_api_key BOOLEAN DEFAULT FALSE,
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
  audio_file_url TEXT,
  audio_file_path TEXT,
  transcription TEXT,
  medical_report TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'completed', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLE: pending_invitations
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
-- TABLE: api_usage
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
-- INDEXES
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
-- ROW LEVEL SECURITY (RLS) - VERSION SIMPLIFIÉE
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLICIES SIMPLIFIÉES (sans récursion)
-- ============================================

-- Profiles: Les utilisateurs peuvent voir leur propre profil
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Profiles: Les utilisateurs peuvent modifier leur propre profil
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Profiles: Permettre l'insertion (pour le trigger de création)
CREATE POLICY "Allow profile creation"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Organizations: Les utilisateurs peuvent voir leur organisation
CREATE POLICY "Users can view their organization"
  ON organizations FOR SELECT
  USING (
    admin_user_id = auth.uid()
    OR id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid() AND organization_id IS NOT NULL
    )
  );

-- Organizations: Les admins peuvent modifier leur organisation
CREATE POLICY "Admins can update their organization"
  ON organizations FOR UPDATE
  USING (admin_user_id = auth.uid());

-- Organizations: Les admins peuvent créer des organisations
CREATE POLICY "Admins can create organizations"
  ON organizations FOR INSERT
  WITH CHECK (admin_user_id = auth.uid());

-- Consultations: Les médecins peuvent voir leurs consultations
CREATE POLICY "Doctors can view own consultations"
  ON consultations FOR SELECT
  USING (doctor_id = auth.uid());

-- Consultations: Les médecins peuvent créer leurs consultations
CREATE POLICY "Doctors can create consultations"
  ON consultations FOR INSERT
  WITH CHECK (doctor_id = auth.uid());

-- Consultations: Les médecins peuvent modifier leurs consultations
CREATE POLICY "Doctors can update own consultations"
  ON consultations FOR UPDATE
  USING (doctor_id = auth.uid());

-- Consultations: Les médecins peuvent supprimer leurs consultations
CREATE POLICY "Doctors can delete own consultations"
  ON consultations FOR DELETE
  USING (doctor_id = auth.uid());

-- API Usage: Les utilisateurs peuvent voir leur utilisation
CREATE POLICY "Users can view own api usage"
  ON api_usage FOR SELECT
  USING (user_id = auth.uid());

-- API Usage: Permettre l'insertion
CREATE POLICY "Allow api usage creation"
  ON api_usage FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Pending Invitations: Lecture publique (pour vérifier les tokens)
CREATE POLICY "Anyone can view pending invitations"
  ON pending_invitations FOR SELECT
  USING (true);

-- Pending Invitations: Insertion autorisée
CREATE POLICY "Allow invitation creation"
  ON pending_invitations FOR INSERT
  WITH CHECK (true);

-- ============================================
-- FUNCTION: Créer automatiquement un profil
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
-- FUNCTION: Créer une organisation
-- ============================================
CREATE OR REPLACE FUNCTION public.create_organization(
  org_name TEXT,
  max_users INTEGER DEFAULT 5
)
RETURNS UUID AS $$
DECLARE
  org_id UUID;
BEGIN
  INSERT INTO organizations (name, admin_user_id, max_users)
  VALUES (org_name, auth.uid(), max_users)
  RETURNING id INTO org_id;
  
  UPDATE profiles 
  SET 
    organization_id = org_id,
    account_type = 'cabinet_admin',
    role = 'admin'
  WHERE id = auth.uid();
  
  RETURN org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
