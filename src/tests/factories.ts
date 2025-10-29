/**
 * Factories pour générer des données de test cohérentes
 */

export const testData = {
  /**
   * Utilisateur de test
   */
  user: {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'test@mediscribe.com',
    password: 'TestPassword123!',
    full_name: 'Dr. Test User',
  },

  /**
   * Organisation de test
   */
  organization: {
    id: '660e8400-e29b-41d4-a716-446655440000',
    name: 'Cabinet Test',
  },

  /**
   * Clé API Mistral de test
   */
  apiKey: {
    valid: 'sk-test-valid-mistral-key-1234567890',
    invalid: 'invalid-key',
    encrypted: 'U2FsdGVkX1+encrypted-key-data',
  },

  /**
   * Consultation de test
   */
  consultation: {
    id: '770e8400-e29b-41d4-a716-446655440000',
    patient_name: 'Jean Dupont',
    patient_age: 45,
    consultation_date: '2025-10-28',
    consultation_type: 'Consultation générale',
  },

  /**
   * Transcription de test
   */
  transcription: {
    short: 'Patient se plaint de maux de tête.',
    long: `Patient se présente pour des maux de tête récurrents depuis 3 jours.
Les douleurs sont localisées au niveau frontal, d'intensité modérée.
Pas de fièvre, pas de troubles visuels.
Antécédents: hypertension artérielle traitée.
Examen clinique: tension artérielle 140/90, reste normal.`,
  },

  /**
   * Rapport médical de test
   */
  report: {
    structured: `1. MOTIF DE CONSULTATION
Maux de tête récurrents

2. ANTÉCÉDENTS PERTINENTS
Hypertension artérielle traitée

3. EXAMEN CLINIQUE
Tension artérielle: 140/90 mmHg
Examen neurologique: normal

4. DIAGNOSTIC(S)
Céphalées de tension

5. TRAITEMENT / PRESCRIPTIONS
Paracétamol 1g x 3/jour
Repos

6. PLAN DE SUIVI
Consultation de contrôle dans 1 semaine`,
  },

  /**
   * Fichier audio de test
   */
  audioFile: {
    name: 'test-audio.webm',
    size: 1024 * 1024, // 1MB
    type: 'audio/webm',
  },
};

/**
 * Crée un utilisateur de test avec des valeurs personnalisables
 */
export function createTestUser(overrides: Partial<typeof testData.user> = {}) {
  return {
    ...testData.user,
    ...overrides,
  };
}

/**
 * Crée une organisation de test
 */
export function createTestOrganization(overrides: Partial<typeof testData.organization> = {}) {
  return {
    ...testData.organization,
    ...overrides,
  };
}

/**
 * Crée une consultation de test
 */
export function createTestConsultation(overrides: Partial<typeof testData.consultation> = {}) {
  return {
    ...testData.consultation,
    ...overrides,
  };
}

/**
 * Crée un fichier audio de test
 */
export function createTestAudioFile(overrides: Partial<typeof testData.audioFile> = {}) {
  const fileData = {
    ...testData.audioFile,
    ...overrides,
  };

  const blob = new Blob(['test audio content'], { type: fileData.type });
  return new File([blob], fileData.name, { type: fileData.type });
}

/**
 * Crée une réponse API mock
 */
export function createMockApiResponse<T>(data: T, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
  } as Response;
}

/**
 * Crée une erreur API mock
 */
export function createMockApiError(status: number, message: string) {
  return {
    ok: false,
    status,
    json: async () => ({ error: message }),
    text: async () => JSON.stringify({ error: message }),
  } as Response;
}
