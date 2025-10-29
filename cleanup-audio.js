/**
 * Script de nettoyage automatique des fichiers audio
 * Supprime les fichiers audio de consultations créées il y a plus de 5 heures
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupOldAudioFiles() {
  try {
    console.log('🧹 Démarrage du nettoyage des fichiers audio...');
    
    // Appeler la fonction SQL pour obtenir les fichiers à supprimer
    const { data, error } = await supabase.rpc('cleanup_old_audio_files');
    
    if (error) {
      console.error('❌ Erreur lors de l\'appel à cleanup_old_audio_files:', error);
      return;
    }
    
    if (!data || data.length === 0) {
      console.log('ℹ️  Aucun fichier audio à supprimer');
      return;
    }
    
    const result = data[0];
    const deletedCount = result.deleted_count;
    const deletedFiles = result.deleted_files || [];
    
    if (deletedCount === 0) {
      console.log('✅ Aucun fichier audio à supprimer');
      return;
    }
    
    // Supprimer les fichiers du Storage Supabase
    if (deletedFiles.length > 0) {
      // Récupérer les noms de fichiers depuis les chemins
      const fileNames = deletedFiles.map(path => {
        // Extraire le nom du fichier depuis le chemin
        // Format: consultations/consultation-id_timestamp.webm
        return path;
      });
      
      console.log(`🗑️  Suppression de ${deletedCount} fichier(s) audio...`);
      
      const { error: deleteError } = await supabase.storage
        .from('audio-files')
        .remove(deletedFiles);
      
      if (deleteError) {
        console.error('❌ Erreur lors de la suppression des fichiers:', deleteError);
      } else {
        console.log(`✅ ${deletedCount} fichier(s) audio supprimé(s) avec succès`);
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error);
  }
}

// Exécuter le nettoyage
console.log('🚀 Service de nettoyage automatique des fichiers audio');
console.log(`⏰ Exécution prévue toutes les heures`);
console.log('');

// Exécuter immédiatement
cleanupOldAudioFiles();

// Programmer l'exécution toutes les heures (3600000 ms)
setInterval(() => {
  cleanupOldAudioFiles();
}, 60 * 60 * 1000);

console.log('✅ Service de nettoyage actif');

