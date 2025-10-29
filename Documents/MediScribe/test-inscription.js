// Test d'inscription pour diagnostiquer le problème
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bfyoebrkmpbpeihiqqvz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmeW9lYnJrbXBicGVpaGlxcXZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2ODcwMjYsImV4cCI6MjA3NzI2MzAyNn0.Pid5xDtpFwdH8NqGj6UMTwRfDUS1SlpOxZWvdGuFhk0';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║         TEST D\'INSCRIPTION - DIAGNOSTIC                      ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

async function testInscription() {
  console.log('1️⃣  Test de création de compte...\n');
  
  const testEmail = `test${Date.now()}@mediscribe.test`;
  const testPassword = 'Test123456!';
  
  console.log('📧 Email de test:', testEmail);
  console.log('🔐 Mot de passe:', testPassword);
  console.log('');
  
  try {
    console.log('⏳ Tentative d\'inscription...');
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: 'Dr. Test',
          specialty: 'Médecine générale'
        }
      }
    });
    
    if (error) {
      console.log('❌ ERREUR D\'INSCRIPTION:');
      console.log('   Message:', error.message);
      console.log('   Status:', error.status);
      console.log('   Code:', error.code);
      console.log('');
      
      if (error.message.includes('after') && error.message.includes('seconds')) {
        const match = error.message.match(/(\d+)\s+seconds/);
        const seconds = match ? match[1] : '?';
        console.log('⚠️  Rate limiting détecté');
        console.log(`   Attendez ${seconds} secondes avant de réessayer`);
      }
      
      return;
    }
    
    if (data.user) {
      console.log('✅ INSCRIPTION RÉUSSIE !');
      console.log('   User ID:', data.user.id);
      console.log('   Email:', data.user.email);
      console.log('   Email confirmé:', data.user.email_confirmed_at ? 'Oui' : 'Non');
      console.log('');
      
      // Attendre un peu pour que le trigger crée le profil
      console.log('⏳ Attente de la création du profil (2 secondes)...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Vérifier si le profil a été créé
      console.log('2️⃣  Vérification du profil...\n');
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();
      
      if (profileError) {
        console.log('❌ ERREUR: Profil non créé');
        console.log('   Message:', profileError.message);
        console.log('   Code:', profileError.code);
        console.log('');
        console.log('🔍 CAUSE PROBABLE:');
        console.log('   Le trigger handle_new_user() n\'a pas fonctionné');
        console.log('   OU les policies RLS bloquent la lecture');
        console.log('');
      } else if (profile) {
        console.log('✅ PROFIL CRÉÉ AUTOMATIQUEMENT !');
        console.log('   Nom:', profile.full_name);
        console.log('   Spécialité:', profile.specialty);
        console.log('   Type de compte:', profile.account_type);
        console.log('');
      } else {
        console.log('⚠️  Profil non trouvé (mais pas d\'erreur)');
        console.log('   Le profil existe peut-être mais les policies bloquent');
        console.log('');
      }
      
      // Nettoyer le compte de test
      console.log('🧹 Nettoyage du compte de test...');
      await supabase.auth.signOut();
      console.log('✅ Compte de test déconnecté');
      console.log('');
    }
    
  } catch (error) {
    console.log('❌ ERREUR INATTENDUE:');
    console.log('   ', error.message);
    console.log('');
  }
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 RÉSUMÉ DU TEST');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log('Si vous voyez "✅ INSCRIPTION RÉUSSIE" et "✅ PROFIL CRÉÉ"');
  console.log('→ Le système fonctionne correctement');
  console.log('→ Vous pouvez créer un vrai compte sur http://localhost:8081/');
  console.log('');
  console.log('Si vous voyez des erreurs:');
  console.log('→ Notez le message d\'erreur exact');
  console.log('→ Vérifiez que supabase-schema-fixed.sql a été exécuté');
  console.log('→ Vérifiez les policies RLS dans Supabase Dashboard');
  console.log('');
}

testInscription().catch(console.error);
