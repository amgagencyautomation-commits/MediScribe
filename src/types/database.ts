export type AccountType = 'solo' | 'cabinet_admin' | 'cabinet_member';
export type UserRole = 'admin' | 'member';
export type PlanType = 'cabinet';
export type ConsultationStatus = 'draft' | 'completed' | 'archived';
export type ApiType = 'mistral_transcription' | 'mistral_generation';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  specialty: string;
  sub_specialties?: string | null;
  consultation_types?: string[] | null;
  personal_mistral_api_key?: string | null;
  account_type: AccountType;
  organization_id?: string | null;
  role?: UserRole | null;
  use_personal_api_key: boolean;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  plan_type: PlanType;
  shared_mistral_api_key?: string | null;
  admin_user_id?: string | null;
  max_users: number;
  created_at: string;
  updated_at: string;
}

export interface Consultation {
  id: string;
  doctor_id: string;
  organization_id?: string | null;
  patient_name: string;
  patient_age?: number | null;
  consultation_date: string;
  consultation_type: string;
  audio_file_url?: string | null;
  audio_file_path?: string | null;
  transcription?: string | null;
  medical_report?: string | null;
  status: ConsultationStatus;
  created_at: string;
  updated_at: string;
}

export interface ApiUsage {
  id: string;
  user_id: string;
  organization_id?: string | null;
  api_type: ApiType;
  tokens_used: number;
  cost_usd: number;
  consultation_id?: string | null;
  created_at: string;
}

export interface PendingInvitation {
  id: string;
  organization_id: string;
  email: string;
  full_name?: string | null;
  specialty?: string | null;
  token: string;
  expires_at: string;
  created_at: string;
}

// Supabase Database type
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>;
      };
      organizations: {
        Row: Organization;
        Insert: Omit<Organization, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Organization, 'id' | 'created_at' | 'updated_at'>>;
      };
      consultations: {
        Row: Consultation;
        Insert: Omit<Consultation, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Consultation, 'id' | 'created_at' | 'updated_at'>>;
      };
      api_usage: {
        Row: ApiUsage;
        Insert: Omit<ApiUsage, 'id' | 'created_at'>;
        Update: Partial<Omit<ApiUsage, 'id' | 'created_at'>>;
      };
      pending_invitations: {
        Row: PendingInvitation;
        Insert: Omit<PendingInvitation, 'id' | 'created_at'>;
        Update: Partial<Omit<PendingInvitation, 'id' | 'created_at'>>;
      };
    };
    Functions: {
      create_organization: {
        Args: {
          org_name: string;
          max_users?: number;
        };
        Returns: string;
      };
      invite_user_to_organization: {
        Args: {
          user_email: string;
          org_id: string;
        };
        Returns: boolean;
      };
    };
  };
}
