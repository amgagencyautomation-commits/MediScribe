-- Migration: Add API Keys Table for BYOK (Bring Your Own Key)
-- Description: Infrastructure pour stockage sécurisé des clés API Mistral
-- Date: 2025-10-28

-- Créer la table api_keys
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    encrypted_key TEXT NOT NULL,
    key_type TEXT NOT NULL DEFAULT 'mistral',
    key_name TEXT,
    is_valid BOOLEAN DEFAULT false,
    last_validated_at TIMESTAMPTZ,
    validation_error TEXT,
    last_used_at TIMESTAMPTZ,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Contraintes: un utilisateur ne peut avoir qu'une seule clé par type
    CONSTRAINT unique_user_key_type UNIQUE (user_id, key_type),
    
    -- Contraintes: une organisation ne peut avoir qu'une seule clé par type
    CONSTRAINT unique_org_key_type UNIQUE (organization_id, key_type),
    
    -- Contrainte: soit user_id soit organization_id doit être défini (pas les deux)
    CONSTRAINT check_owner CHECK (
        (user_id IS NOT NULL AND organization_id IS NULL) OR
        (user_id IS NULL AND organization_id IS NOT NULL)
    )
);

-- Créer des index B-tree pour améliorer les performances de recherche
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_organization_id ON api_keys(organization_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_type ON api_keys(key_type);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_valid ON api_keys(is_valid);

-- Activer Row Level Security (RLS)
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Policy 1: SELECT - Les utilisateurs peuvent voir uniquement leurs propres clés
CREATE POLICY "Users can view their own API keys"
    ON api_keys
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy 2: INSERT - Les utilisateurs peuvent créer uniquement leurs propres clés
CREATE POLICY "Users can insert their own API keys"
    ON api_keys
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy 3: UPDATE - Les utilisateurs peuvent modifier uniquement leurs propres clés
CREATE POLICY "Users can update their own API keys"
    ON api_keys
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy 4: DELETE - Les utilisateurs peuvent supprimer uniquement leurs propres clés
CREATE POLICY "Users can delete their own API keys"
    ON api_keys
    FOR DELETE
    USING (auth.uid() = user_id);

-- Policy 5: SELECT - Les admins d'organisation peuvent voir les clés de leur organisation
CREATE POLICY "Organization admins can view org API keys"
    ON api_keys
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Policy 6: UPDATE - Les admins d'organisation peuvent modifier les clés de leur organisation
CREATE POLICY "Organization admins can update org API keys"
    ON api_keys
    FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    )
    WITH CHECK (
        organization_id IN (
            SELECT organization_id 
            FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Fonction PL/pgSQL pour incrémenter l'utilisation d'une clé API
-- SECURITY DEFINER permet de bypass RLS pour cette opération spécifique
CREATE OR REPLACE FUNCTION increment_api_key_usage(
    p_user_id UUID,
    p_key_type TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE api_keys
    SET 
        usage_count = usage_count + 1,
        last_used_at = NOW()
    WHERE 
        user_id = p_user_id 
        AND key_type = p_key_type;
        
    -- Si aucune ligne n'a été mise à jour, on peut logger ou ignorer
    IF NOT FOUND THEN
        RAISE NOTICE 'No API key found for user % with type %', p_user_id, p_key_type;
    END IF;
END;
$$;

-- Fonction similaire pour les organisations
CREATE OR REPLACE FUNCTION increment_org_api_key_usage(
    p_organization_id UUID,
    p_key_type TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE api_keys
    SET 
        usage_count = usage_count + 1,
        last_used_at = NOW()
    WHERE 
        organization_id = p_organization_id 
        AND key_type = p_key_type;
        
    IF NOT FOUND THEN
        RAISE NOTICE 'No API key found for organization % with type %', p_organization_id, p_key_type;
    END IF;
END;
$$;

-- Trigger pour auto-update du champ updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER update_api_keys_updated_at
    BEFORE UPDATE ON api_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Commentaires pour documentation
COMMENT ON TABLE api_keys IS 'Stockage sécurisé des clés API (Mistral, OpenAI, etc.) avec chiffrement AES-256';
COMMENT ON COLUMN api_keys.encrypted_key IS 'Clé API chiffrée avec AES-256 (jamais stockée en clair)';
COMMENT ON COLUMN api_keys.key_type IS 'Type de clé API: mistral, openai, etc.';
COMMENT ON COLUMN api_keys.is_valid IS 'Indique si la clé a été validée avec succès';
COMMENT ON COLUMN api_keys.last_validated_at IS 'Dernière validation réussie de la clé';
COMMENT ON COLUMN api_keys.validation_error IS 'Message d''erreur de la dernière validation échouée';
COMMENT ON COLUMN api_keys.usage_count IS 'Nombre total d''utilisations de cette clé';
COMMENT ON FUNCTION increment_api_key_usage IS 'Incrémente le compteur d''usage et met à jour last_used_at (bypass RLS)';
