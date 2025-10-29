import { supabase } from '@/lib/supabase';
import { Consultation, ApiUsage } from '@/types/database';
import { encryptApiKey, decryptApiKey, testMistralKey } from '@/lib/crypto';
import config from '@/config';
import { logger } from '@/lib/browserLogger';

export class ConsultationService {
  /**
   * Créer une nouvelle consultation
   */
  static async createConsultation(data: {
    patient_name: string;
    patient_age?: number;
    consultation_date: string;
    consultation_type: string;
    doctor_id: string;
    organization_id?: string;
  }): Promise<Consultation> {
    const { data: consultation, error } = await (supabase
      .from('consultations') as any)
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return consultation;
  }

  /**
   * Récupérer les consultations d'un médecin
   */
  static async getConsultationsByDoctor(doctorId: string): Promise<Consultation[]> {
    const { data, error } = await (supabase
      .from('consultations') as any)
      .select('*')
      .eq('doctor_id', doctorId)
      .order('consultation_date', { ascending: false });

    if (error) throw error;
    return data;
  }

  /**
   * Récupérer les consultations d'une organisation
   */
  static async getConsultationsByOrganization(organizationId: string): Promise<Consultation[]> {
    const { data, error } = await (supabase
      .from('consultations') as any)
      .select('*')
      .eq('organization_id', organizationId)
      .order('consultation_date', { ascending: false });

    if (error) throw error;
    return data;
  }

  /**
   * Mettre à jour une consultation
   */
  static async updateConsultation(
    id: string, 
    updates: Partial<Consultation>
  ): Promise<Consultation> {
    const { data, error } = await (supabase
      .from('consultations') as any)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Supprimer une consultation
   */
  static async deleteConsultation(id: string): Promise<void> {
    const { error } = await (supabase
      .from('consultations') as any)
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
}

export class AudioService {
  /**
   * Enregistrer un fichier audio dans Supabase Storage
   */
  static async uploadAudioFile(
    file: File, 
    consultationId: string
  ): Promise<{ url: string; path: string }> {
    const fileName = `${consultationId}_${Date.now()}.webm`;
    const filePath = `consultations/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('audio-files')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // Récupérer l'URL publique
    const { data } = supabase.storage
      .from('audio-files')
      .getPublicUrl(filePath);

    return { url: data.publicUrl, path: filePath };
  }

  /**
   * Supprimer un fichier audio
   */
  static async deleteAudioFile(filePath: string): Promise<void> {
    const { error } = await supabase.storage
      .from('audio-files')
      .remove([filePath]);

    if (error) throw error;
  }

  /**
   * Supprimer plusieurs fichiers audio
   */
  static async deleteAudioFiles(filePaths: string[]): Promise<void> {
    if (filePaths.length === 0) return;
    
    const { error } = await supabase.storage
      .from('audio-files')
      .remove(filePaths);

    if (error) throw error;
  }
}

export class MistralService {
  /**
   * Transcrire un fichier audio avec Mistral AI
   */
  static async transcribeAudio(
    audioBlob: Blob, 
    userId: string,
    apiKey?: string
  ): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.webm');

      const headers: Record<string, string> = {
        'x-user-id': userId,
      };

      // Ajouter la clé API si fournie
      if (apiKey) {
        headers['x-api-key'] = apiKey;
      }

      const response = await fetch(`${config.api.baseUrl}${config.api.endpoints.transcribe}`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la transcription');
      }

      const result = await response.json();
      return result.transcript;
    } catch (error) {
      logger.error('Erreur lors de la transcription:', error);
      throw error;
    }
  }

  /**
   * Générer un compte rendu médical avec Mistral AI
   */
  static async generateMedicalReport(
    transcription: string,
    specialty: string,
    consultationType: string,
    userId: string
  ): Promise<string> {
    try {
      const response = await fetch(`${config.api.baseUrl}${config.api.endpoints.generateReport}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({
          transcript: transcription,
          specialty: specialty,
          consultationType: consultationType,
          userId: userId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la génération du compte rendu');
      }

      const result = await response.json();
      return result.report;
    } catch (error) {
      logger.error('Erreur lors de la génération du compte rendu:', error);
      throw error;
    }
  }

  /**
   * Tester une clé API Mistral
   */
  static async testApiKey(apiKey: string): Promise<boolean> {
    return await testMistralKey(apiKey);
  }
}

export class ApiUsageService {
  /**
   * Enregistrer l'utilisation d'une API
   */
  static async recordUsage(data: {
    user_id: string;
    organization_id?: string;
    api_type: 'mistral_transcription' | 'mistral_generation';
    tokens_used: number;
    cost_usd: number;
    consultation_id?: string;
  }): Promise<ApiUsage> {
    const { data: usage, error } = await (supabase
      .from('api_usage') as any)
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return usage;
  }

  /**
   * Récupérer l'utilisation d'un utilisateur
   */
  static async getUserUsage(userId: string): Promise<ApiUsage[]> {
    const { data, error } = await (supabase
      .from('api_usage') as any)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  /**
   * Récupérer l'utilisation d'une organisation
   */
  static async getOrganizationUsage(organizationId: string): Promise<ApiUsage[]> {
    const { data, error } = await (supabase
      .from('api_usage') as any)
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }
}

export class ProfileService {
  /**
   * Mettre à jour le profil utilisateur
   */
  static async updateProfile(
    userId: string, 
    updates: {
      full_name?: string;
      specialty?: string;
      sub_specialties?: string;
      consultation_types?: string[];
      personal_mistral_api_key?: string;
      use_personal_api_key?: boolean;
    }
  ): Promise<void> {
    try {
      console.log('📝 ProfileService.updateProfile appelé pour:', userId);
      console.log('📝 Updates à appliquer:', Object.keys(updates));
      
      // Si une clé API est fournie, la crypter
      if (updates.personal_mistral_api_key) {
        console.log('🔐 Chiffrement de la clé API...');
        const originalKey = updates.personal_mistral_api_key;
        updates.personal_mistral_api_key = encryptApiKey(originalKey);
        console.log('✅ Clé chiffrée, longueur:', updates.personal_mistral_api_key.length);
      }

      console.log('📡 Envoi de la requête Supabase...');
      
      // Timeout de sécurité pour éviter les blocages
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout requête Supabase')), 10000)
      );

      const supabasePromise = (supabase
        .from('profiles') as any)
        .update(updates)
        .eq('id', userId);

      const { data, error } = await Promise.race([supabasePromise, timeoutPromise]) as any;

      if (error) {
        console.error('❌ Erreur Supabase:', error);
        console.error('❌ Code erreur:', error.code);
        console.error('❌ Message:', error.message);
        console.error('❌ Détails:', error.details);
        throw error;
      }
      
      console.log('✅ ProfileService.updateProfile réussi:', data);
    } catch (error) {
      console.error('❌ Erreur dans ProfileService.updateProfile:', error);
      throw error;
    }
  }

  /**
   * Récupérer la clé API décryptée d'un utilisateur
   */
  static async getDecryptedApiKey(userId: string): Promise<string | null> {
    try {
      console.log('🔍 getDecryptedApiKey pour userId:', userId);
      
      const { data: profile, error } = await (supabase
        .from('profiles') as any)
        .select('personal_mistral_api_key, organization_id, use_personal_api_key')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('❌ Erreur récupération profil:', error);
        return null;
      }

      if (!profile) {
        console.log('⚠️  Aucun profil trouvé');
        return null;
      }

      console.log('📄 Profil trouvé:');
      console.log('- use_personal_api_key:', (profile as any).use_personal_api_key);
      console.log('- personal_mistral_api_key existe:', !!(profile as any).personal_mistral_api_key);
      console.log('- organization_id:', (profile as any).organization_id);

      // Si l'utilisateur utilise sa clé personnelle
      if ((profile as any).use_personal_api_key && (profile as any).personal_mistral_api_key) {
        console.log('🔐 Déchiffrement de la clé personnelle...');
        try {
          const decrypted = decryptApiKey((profile as any).personal_mistral_api_key);
          console.log('✅ Clé déchiffrée avec succès, longueur:', decrypted.length);
          return decrypted;
        } catch (decryptError) {
          console.error('❌ Erreur déchiffrement:', decryptError);
          return null;
        }
      }

      // Si l'utilisateur fait partie d'une organisation avec clé partagée
      if ((profile as any).organization_id && !(profile as any).use_personal_api_key) {
        console.log('🏢 Recherche clé organisation...');
        const { data: org } = await (supabase
          .from('organizations') as any)
          .select('shared_mistral_api_key')
          .eq('id', (profile as any).organization_id)
          .single();

        if (org && (org as any).shared_mistral_api_key) {
          console.log('🔐 Déchiffrement de la clé organisation...');
          return decryptApiKey((org as any).shared_mistral_api_key);
        }
      }

      console.log('ℹ️  Aucune clé API configurée');
      return null;
    } catch (error) {
      console.error('❌ Erreur getDecryptedApiKey:', error);
      return null;
    }
  }

  /**
   * Récupérer les membres d'une organisation
   */
  static async getOrganizationMembers(organizationId: string) {
    const { data, error } = await (supabase
      .from('profiles') as any)
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  /**
   * Récupérer les invitations en attente
   */
  static async getPendingInvitations(organizationId: string) {
    const { data, error } = await (supabase
      .from('pending_invitations') as any)
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }
}
