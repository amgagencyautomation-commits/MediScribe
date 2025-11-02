// Script de test de connexion Supabase
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Charger variables d'environnement
dotenv.config({ path: '.env.server' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables Supabase manquantes dans .env.server');
  console.error('   Définissez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('🔍 Test de connexion Supabase...\n');

  // Test 1: Vérifier la connexion
  console.log('1️⃣ Test de connexion basique...');
  try {
    const { data, error } = await supabase.from('profiles').select('count');
    if (error) {
      console.log('❌ Erreur:', error.message);
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        console.log('⚠️  La table "profiles" n\'existe PAS !');
        console.log('→ La migration SQL n\'a pas été exécutée correctement\n');
      }
    } else {
      console.log('✅ Table "profiles" existe !');
      console.log('→ Nombre de profils:', data?.length || 0, '\n');
    }
  } catch (err) {
    console.log('❌ Erreur de connexion:', err.message, '\n');
  }

  // Test 2: Vérifier les autres tables
  console.log('2️⃣ Vérification des autres tables...');
  const tables = ['organizations', 'consultations', 'api_usage', 'pending_invitations'];
  
  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).select('count').limit(1);
      if (error) {
        console.log(`❌ Table "${table}": N'existe PAS`);
      } else {
        console.log(`✅ Table "${table}": Existe`);
      }
    } catch (err) {
      console.log(`❌ Table "${table}": Erreur -`, err.message);
    }
  }

  console.log('\n3️⃣ Test de création d\'utilisateur...');
  try {
    // Tester si on peut accéder à auth
    const { data: { session } } = await supabase.auth.getSession();
    console.log('✅ Auth accessible');
    console.log('→ Session active:', session ? 'Oui' : 'Non');
  } catch (err) {
    console.log('❌ Erreur auth:', err.message);
  }

  console.log('\n📊 RÉSUMÉ:');
  console.log('─────────────────────────────────────');
  console.log('Si vous voyez des ❌ ci-dessus:');
  console.log('→ Les tables n\'existent pas');
  console.log('→ Réexécutez la migration SQL');
  console.log('→ Vérifiez dans Supabase Dashboard > Table Editor');
}

testConnection();
