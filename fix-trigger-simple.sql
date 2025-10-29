-- ============================================
-- FIX URGENT: Trigger de création de profil
-- ============================================
-- Version ultra-simplifiée garantie de fonctionner
-- ============================================

-- 1. Supprimer l'ancien trigger s'il existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 2. Créer la fonction de trigger (version simplifiée)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insérer le profil avec des valeurs par défaut
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
EXCEPTION
  WHEN OTHERS THEN
    -- Log l'erreur mais ne bloque pas l'inscription
    RAISE WARNING 'Erreur création profil: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- 3. Créer le trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 4. Vérifier que le trigger existe
SELECT 
  'Trigger créé avec succès!' as message,
  tgname as trigger_name,
  tgenabled as enabled
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';

-- 5. Test: Afficher les colonnes de la table profiles
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;
