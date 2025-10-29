-- ============================================
-- DIAGNOSTIC COMPLET DU TRIGGER
-- ============================================

-- 1. Vérifier si le trigger existe
SELECT 
  'TRIGGER' as type,
  tgname as name,
  tgenabled as enabled,
  CASE 
    WHEN tgenabled = 'O' THEN 'Activé'
    WHEN tgenabled = 'D' THEN 'Désactivé'
    ELSE 'Inconnu'
  END as status
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';

-- 2. Vérifier si la fonction existe
SELECT 
  'FUNCTION' as type,
  proname as name,
  pg_get_functiondef(oid) as definition
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- 3. Compter les utilisateurs dans auth.users
SELECT 
  'USERS' as type,
  COUNT(*) as count
FROM auth.users;

-- 4. Compter les profils dans profiles
SELECT 
  'PROFILES' as type,
  COUNT(*) as count
FROM profiles;

-- 5. Afficher les colonnes de la table profiles
SELECT 
  'COLUMNS' as info,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
ORDER BY ordinal_position;
