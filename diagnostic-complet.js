// Script de diagnostic complet du système MediScribe
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bfyoebrkmpbpeihiqqvz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmeW9lYnJrbXBicGVpaGlxcXZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2ODcwMjYsImV4cCI6MjA3NzI2MzAyNn0.Pid5xDtpFwdH8NqGj6UMTwRfDUS1SlpOxZWvdGuFhk0';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║         DIAGNOSTIC COMPLET MEDISCRIBE                        ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

async function runDiagnostic() {
  // 1. Test de connexion Supabase
  console.log('1️⃣  TEST DE CONNEXION SUPABASE');
  console.log('─────────────────────────────────────────────────────────────');
  try {
    const { data, error } = await supabase.from('profiles').select('count');
    if (error) {
      console.log('❌ Erreur:', error.message);
    } else {
      console.log('✅ Connexion Supabase OK');
    }
  } catch (err) {
    console.log('❌ Erreur de connexion:', err.message);
  }

  // 2. Vérifier les tables
  console.log('\n2️⃣  VÉRIFICATION DES TABLES');
  console.log('─────────────────────────────────────────────────────────────');
  const tables = ['profiles', 'organizations', 'consultations', 'api_usage', 'pending_invitations'];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('count').limit(1);
      if (error) {
        console.log(`❌ Table "${table}": ${error.message}`);
      } else {
        console.log(`✅ Table "${table}": Existe`);
      }
    } catch (err) {
      console.log(`❌ Table "${table}": ${err.message}`);
    }
  }

  // 3. Vérifier les utilisateurs auth
  console.log('\n3️⃣  VÉRIFICATION DES UTILISATEURS');
  console.log('─────────────────────────────────────────────────────────────');
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      console.log('✅ Session active');
      console.log('   User ID:', session.user.id);
      console.log('   Email:', session.user.email);
      
      // Essayer de récupérer le profil
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      if (profileError) {
        console.log('❌ Erreur récupération profil:', profileError.message);
      } else if (profile) {
        console.log('✅ Profil trouvé');
        console.log('   Nom:', profile.full_name);
        console.log('   Spécialité:', profile.specialty);
        console.log('   Clé Mistral:', profile.personal_mistral_api_key ? 'Configurée' : 'Non configurée');
      } else {
        console.log('⚠️  Profil non trouvé');
      }
    } else {
      console.log('⚠️  Aucune session active');
      console.log('   → Vous devez vous connecter');
    }
  } catch (err) {
    console.log('❌ Erreur:', err.message);
  }

  // 4. Test de l'API backend
  console.log('\n4️⃣  TEST DE L\'API BACKEND');
  console.log('─────────────────────────────────────────────────────────────');
  try {
    const response = await fetch('http://localhost:3001/api/health');
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API Backend accessible');
      console.log('   Status:', data.status);
      console.log('   Provider:', data.ai_provider);
    } else {
      console.log('❌ API Backend erreur:', response.status);
    }
  } catch (err) {
    console.log('❌ API Backend non accessible');
    console.log('   → Vérifiez que le serveur tourne sur le port 3001');
  }

  // 5. Vérifier les colonnes de la table profiles
  console.log('\n5️⃣  VÉRIFICATION DES COLONNES');
  console.log('─────────────────────────────────────────────────────────────');
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('❌ Erreur:', error.message);
    } else if (data && data.length > 0) {
      console.log('✅ Colonnes de la table profiles:');
      Object.keys(data[0]).forEach(col => {
        console.log(`   - ${col}`);
      });
    } else {
      console.log('⚠️  Table profiles vide');
    }
  } catch (err) {
    console.log('❌ Erreur:', err.message);
  }

  // 6. Résumé et recommandations
  console.log('\n6️⃣  RÉSUMÉ ET RECOMMANDATIONS');
  console.log('─────────────────────────────────────────────────────────────');
  console.log('\n📋 CHECKLIST:');
  console.log('   [ ] Tables Supabase créées');
  console.log('   [ ] Utilisateur inscrit et connecté');
  console.log('   [ ] Profil créé dans la base');
  console.log('   [ ] Clé Mistral AI configurée');
  console.log('   [ ] API Backend en cours d\'exécution');
  console.log('\n💡 ACTIONS RECOMMANDÉES:');
  console.log('   1. Si pas de session: Créer un compte sur http://localhost:8080/');
  console.log('   2. Si profil manquant: Vérifier le trigger handle_new_user()');
  console.log('   3. Si clé manquante: Ajouter clé Mistral dans Paramètres');
  console.log('   4. Si API down: Lancer "node server.mjs"');
}

runDiagnostic().catch(console.error);
