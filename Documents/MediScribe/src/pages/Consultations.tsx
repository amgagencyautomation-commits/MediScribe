import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AudioRecorder } from '@/components/AudioRecorder';
import { ConsultationService, AudioService, ApiUsageService, ProfileService } from '@/lib/services';
import { Consultation, ConsultationStatus } from '@/types/database';
import { toast } from '@/hooks/use-toast';
import { Calendar, Clock, User, FileText, Mic, Loader2 } from 'lucide-react';

const CONSULTATION_TYPES = [
  'Consultation générale',
  'Consultation de suivi',
  'Consultation spécialisée',
  'Urgence',
  'Téléconsultation',
  'Autre'
];

export default function ConsultationsPage() {
  const { user, profile, organization } = useAuth();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
  
  // État du formulaire
  const [formData, setFormData] = useState({
    patient_name: '',
    patient_age: '',
    consultation_date: new Date().toISOString().slice(0, 16),
    consultation_type: '',
  });
  
  // État de l'enregistrement
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [medicalReport, setMedicalReport] = useState('');

  useEffect(() => {
    loadConsultations();
  }, []);

  const loadConsultations = async () => {
    try {
      setLoading(true);
      let data: Consultation[];
      
      if (organization) {
        data = await ConsultationService.getConsultationsByOrganization(organization.id);
      } else if (user) {
        data = await ConsultationService.getConsultationsByDoctor(user.id);
      } else {
        data = [];
      }
      
      setConsultations(data);
    } catch (error) {
      console.error('Erreur lors du chargement des consultations:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les consultations.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateConsultation = async () => {
    if (!user || !profile) return;

    try {
      setCreating(true);
      
      const consultationData = {
        patient_name: formData.patient_name,
        patient_age: formData.patient_age ? parseInt(formData.patient_age) : undefined,
        consultation_date: formData.consultation_date,
        consultation_type: formData.consultation_type,
        doctor_id: user.id,
        organization_id: organization?.id,
      };

      const consultation = await ConsultationService.createConsultation(consultationData);
      
      // Si un enregistrement audio existe, le traiter
      if (audioBlob) {
        await processAudioRecording(consultation);
      }
      
      toast({
        title: 'Consultation créée',
        description: 'La consultation a été créée avec succès.',
      });
      
      // Réinitialiser le formulaire
      setFormData({
        patient_name: '',
        patient_age: '',
        consultation_date: new Date().toISOString().slice(0, 16),
        consultation_type: '',
      });
      setAudioBlob(null);
      setTranscription('');
      setMedicalReport('');
      setShowNewForm(false);
      
      // Recharger les consultations
      await loadConsultations();
      
    } catch (error) {
      console.error('Erreur lors de la création:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de créer la consultation.',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const processAudioRecording = async (consultation: Consultation) => {
    if (!audioBlob || !profile) return;

    try {
      // 1. Upload du fichier audio
      const audioFile = new File([audioBlob], 'consultation.webm', { type: 'audio/webm' });
      const { url: audioUrl, path: audioPath } = await AudioService.uploadAudioFile(audioFile, consultation.id);
      
      // Mettre à jour la consultation avec l'URL et le chemin audio
      await ConsultationService.updateConsultation(consultation.id, {
        audio_file_url: audioUrl,
        audio_file_path: audioPath
      });

      // 2. Récupérer la clé API
      const apiKey = await ProfileService.getDecryptedApiKey(profile.id);
      if (!apiKey) {
        toast({
          title: 'Clé API manquante',
          description: 'Configurez votre clé Mistral AI pour utiliser la transcription.',
          variant: 'destructive',
        });
        return;
      }

      // 3. Transcription
      setIsTranscribing(true);
      // TODO: Implémenter transcription Mistral
      const transcriptionText = 'Transcription Mistral AI à implémenter';
      setTranscription(transcriptionText);
      
      // Mettre à jour la consultation avec la transcription
      await ConsultationService.updateConsultation(consultation.id, {
        transcription: transcriptionText
      });

      // Enregistrer l'utilisation de l'API
      await ApiUsageService.recordUsage({
        user_id: profile.id,
        organization_id: organization?.id,
        api_type: 'openai_transcription',
        tokens_used: Math.ceil(transcriptionText.length / 4), // Estimation
        cost_usd: 0.006, // Coût approximatif Whisper
        consultation_id: consultation.id,
      });

      toast({
        title: 'Transcription terminée',
        description: 'L\'audio a été transcrit avec succès.',
      });

      // 4. Génération du compte rendu
      setIsGenerating(true);
      // TODO: Implémenter génération Mistral
      const reportText = 'Rapport médical à générer avec Mistral AI';
      setMedicalReport(reportText);
      
      // Mettre à jour la consultation avec le compte rendu
      await ConsultationService.updateConsultation(consultation.id, {
        medical_report: reportText,
        status: 'completed' as ConsultationStatus
      });

      // Enregistrer l'utilisation de l'API
      await ApiUsageService.recordUsage({
        user_id: profile.id,
        organization_id: organization?.id,
        api_type: 'openai_generation',
        tokens_used: Math.ceil(reportText.length / 4), // Estimation
        cost_usd: 0.03, // Coût approximatif GPT-4
        consultation_id: consultation.id,
      });

      toast({
        title: 'Compte rendu généré',
        description: 'Le compte rendu médical a été généré avec succès.',
      });

    } catch (error) {
      console.error('Erreur lors du traitement audio:', error);
      toast({
        title: 'Erreur de traitement',
        description: 'Une erreur est survenue lors du traitement de l\'audio.',
        variant: 'destructive',
      });
    } finally {
      setIsTranscribing(false);
      setIsGenerating(false);
    }
  };

  const getStatusBadge = (status: ConsultationStatus) => {
    const variants = {
      draft: 'secondary',
      completed: 'default',
      archived: 'outline'
    } as const;
    
    const labels = {
      draft: 'Brouillon',
      completed: 'Terminé',
      archived: 'Archivé'
    };

    return (
      <Badge variant={variants[status]}>
        {labels[status]}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement des consultations...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Consultations</h1>
            <p className="text-muted-foreground">
              Gérez vos consultations médicales et générez des comptes rendus
            </p>
          </div>
          <Button onClick={() => setShowNewForm(true)}>
            <FileText className="h-4 w-4 mr-2" />
            Nouvelle consultation
          </Button>
        </div>

        {/* Formulaire de nouvelle consultation */}
        {showNewForm && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Nouvelle consultation</CardTitle>
              <CardDescription>
                Créez une nouvelle consultation médicale
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="patient_name">Nom du patient</Label>
                  <Input
                    id="patient_name"
                    value={formData.patient_name}
                    onChange={(e) => setFormData({ ...formData, patient_name: e.target.value })}
                    placeholder="Nom du patient"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="patient_age">Âge (optionnel)</Label>
                  <Input
                    id="patient_age"
                    type="number"
                    value={formData.patient_age}
                    onChange={(e) => setFormData({ ...formData, patient_age: e.target.value })}
                    placeholder="Âge"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="consultation_date">Date et heure</Label>
                  <Input
                    id="consultation_date"
                    type="datetime-local"
                    value={formData.consultation_date}
                    onChange={(e) => setFormData({ ...formData, consultation_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="consultation_type">Type de consultation</Label>
                  <Select
                    value={formData.consultation_type}
                    onValueChange={(value) => setFormData({ ...formData, consultation_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez le type" />
                    </SelectTrigger>
                    <SelectContent>
                      {CONSULTATION_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Enregistrement audio */}
              <div className="space-y-4">
                <Label>Enregistrement audio (optionnel)</Label>
                <AudioRecorder 
                  onRecordingComplete={(blob) => setAudioBlob(blob)}
                  onTranscribe={async (blob) => {
                    // Transcription sera gérée après soumission du formulaire
                    setAudioBlob(blob);
                  }}
                />
                {audioBlob && (
                  <div className="text-sm text-green-600">
                    ✓ Audio enregistré ({Math.round(audioBlob.size / 1024)} KB)
                  </div>
                )}
              </div>

              {/* Transcription et compte rendu */}
              {(transcription || medicalReport) && (
                <div className="space-y-4">
                  {transcription && (
                    <div className="space-y-2">
                      <Label>Transcription</Label>
                      <Textarea
                        value={transcription}
                        onChange={(e) => setTranscription(e.target.value)}
                        rows={6}
                        placeholder="Transcription de l'audio..."
                      />
                    </div>
                  )}
                  {medicalReport && (
                    <div className="space-y-2">
                      <Label>Compte rendu médical</Label>
                      <Textarea
                        value={medicalReport}
                        onChange={(e) => setMedicalReport(e.target.value)}
                        rows={8}
                        placeholder="Compte rendu médical..."
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Indicateurs de traitement */}
              {(isTranscribing || isGenerating) && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isTranscribing && 'Transcription en cours...'}
                  {isGenerating && 'Génération du compte rendu...'}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  onClick={handleCreateConsultation}
                  disabled={creating || !formData.patient_name || !formData.consultation_type}
                >
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Création...
                    </>
                  ) : (
                    'Créer la consultation'
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowNewForm(false);
                    setFormData({
                      patient_name: '',
                      patient_age: '',
                      consultation_date: new Date().toISOString().slice(0, 16),
                      consultation_type: '',
                    });
                    setAudioBlob(null);
                    setTranscription('');
                    setMedicalReport('');
                  }}
                >
                  Annuler
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Liste des consultations */}
        <div className="grid gap-4">
          {consultations.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Aucune consultation</h3>
                <p className="text-muted-foreground mb-4">
                  Commencez par créer votre première consultation.
                </p>
                <Button onClick={() => setShowNewForm(true)}>
                  Créer une consultation
                </Button>
              </CardContent>
            </Card>
          ) : (
            consultations.map((consultation) => (
              <Card key={consultation.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">{consultation.patient_name}</span>
                        {consultation.patient_age && (
                          <span className="text-muted-foreground">
                            ({consultation.patient_age} ans)
                          </span>
                        )}
                        {getStatusBadge(consultation.status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(consultation.consultation_date).toLocaleDateString('fr-FR')}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {new Date(consultation.consultation_date).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                        <span>{consultation.consultation_type}</span>
                      </div>
                      {consultation.transcription && (
                        <div className="text-sm">
                          <strong>Transcription:</strong> {consultation.transcription.substring(0, 100)}...
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedConsultation(consultation)}
                      >
                        Voir détails
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
