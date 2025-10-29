// Configuration démo pour MediScribe
// Ce fichier permet de tester l'application sans Supabase

export const DEMO_MODE = false; // Mode démo désactivé

export const DEMO_USER = {
  id: 'demo-user-123',
  email: 'demo@mediscribe.com',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const DEMO_PROFILE = {
  id: 'demo-user-123',
  email: 'demo@mediscribe.com',
  full_name: 'Dr. Demo',
  specialty: 'Médecine générale',
  sub_specialties: null,
  consultation_types: ['Consultation générale', 'Consultation de suivi'],
  personal_mistral_api_key: null,
  account_type: 'solo' as const,
  organization_id: null,
  role: null,
  use_personal_api_key: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const DEMO_CONSULTATIONS = [
  {
    id: 'demo-consultation-1',
    doctor_id: 'demo-user-123',
    organization_id: null,
    patient_name: 'Marie Dupont',
    patient_age: 45,
    consultation_date: new Date(Date.now() - 86400000).toISOString(), // Hier
    consultation_type: 'Consultation générale',
    audio_file_url: null,
    transcription: 'Patient se plaint de maux de tête depuis 3 jours. Pas de fièvre. Examen neurologique normal.',
    medical_report: 'MOTIF DE CONSULTATION\nMaux de tête depuis 3 jours\n\nEXAMEN CLINIQUE\n- État général conservé\n- Pas de fièvre\n- Examen neurologique normal\n- Tension artérielle : 12/8\n\nDIAGNOSTIC\nCéphalée de tension\n\nTRAITEMENT\nParacétamol 1g x 3/j pendant 5 jours\n\nSUIVI\nConsultation dans 1 semaine si persistance',
    status: 'completed' as const,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'demo-consultation-2',
    doctor_id: 'demo-user-123',
    organization_id: null,
    patient_name: 'Jean Martin',
    patient_age: 62,
    consultation_date: new Date(Date.now() - 172800000).toISOString(), // Il y a 2 jours
    consultation_type: 'Consultation de suivi',
    audio_file_url: null,
    transcription: 'Suivi diabète. Patient bien équilibré. HbA1c à 6.2%. Pas de complications.',
    medical_report: 'MOTIF DE CONSULTATION\nSuivi diabète de type 2\n\nANTÉCÉDENTS\nDiabète de type 2 diagnostiqué il y a 3 ans\n\nEXAMEN CLINIQUE\n- État général bon\n- Poids stable\n- Pas de complications\n- Pieds : pas de lésions\n\nBIOLOGIE\nHbA1c : 6.2% (objectif < 7%)\n\nDIAGNOSTIC\nDiabète de type 2 bien équilibré\n\nTRAITEMENT\nMetformine 1000mg x 2/j maintenu\n\nSUIVI\nContrôle dans 3 mois',
    status: 'completed' as const,
    created_at: new Date(Date.now() - 172800000).toISOString(),
    updated_at: new Date(Date.now() - 172800000).toISOString(),
  },
];

export const DEMO_STATS = {
  consultationsThisMonth: 8,
  timeSaved: 2.0,
  reportsGenerated: 8,
  totalCost: 0.0,
};
