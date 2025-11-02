import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { AudioRecorder } from '@/components/AudioRecorder';
import { AudioImporter } from '@/components/AudioImporter';
import { DocumentImporter } from '@/components/DocumentImporter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { ConsultationService, ProfileService, MistralService as BackendMistralService } from '@/lib/services';
import { DEMO_MODE } from '@/lib/demo-config';
import { 
  Mic, 
  ArrowLeft, 
  User, 
  Calendar, 
  FileText,
  Loader2,
  CheckCircle,
  AlertCircle,
  Upload,
  File,
  Sparkles
} from 'lucide-react';

const CONSULTATION_TYPES = [
  'Première consultation',
  'Consultation de suivi',
  'Consultation d\'urgence',
  'Téléconsultation',
  'Consultation préventive',
];

export default function RecordPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<'form' | 'recording' | 'import_audio' | 'import_document' | 'processing' | 'review_transcript' | 'generating_report' | 'complete'>('form');
  const [importMode, setImportMode] = useState<'audio' | 'document'>('audio');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [transcript, setTranscript] = useState<string>('');
  const [report, setReport] = useState<string>('');
  const [consultationId, setConsultationId] = useState<string>('');

  // État du formulaire de consultation
  const [consultationData, setConsultationData] = useState({
    patient_name: '',
    patient_age: '',
    consultation_type: '',
    notes: '',
  });

  const handleRecordingComplete = (blob: Blob, duration: number) => {
    setAudioBlob(blob);
    setRecordingDuration(duration);
    setCurrentStep('recording');
  };

  const handleTranscribe = async (blob: Blob) => {
    if (!user) {
      toast({
        title: 'Erreur',
        description: 'Vous devez être connecté pour utiliser cette fonctionnalité.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    setCurrentStep('processing');

    try {
      if (DEMO_MODE) {
        // Mode démo - simuler le traitement
        await new Promise(resolve => setTimeout(resolve, 2000)); // Simuler le délai de traitement
        
        // Transcription factice
        const demoTranscription = `Patient se présente pour une ${consultationData.consultation_type.toLowerCase()}. 
        Motif de consultation : douleurs abdominales depuis 2 jours. 
        Pas de fièvre. Appétit conservé. 
        Examen abdominal : abdomen souple, sensible au niveau de l'hypocondre droit. 
        Pas de défense. Pouls régulier. Tension artérielle normale.`;
        
        setTranscript(demoTranscription);
        
        // Compte rendu factice
        const demoReport = `MOTIF DE CONSULTATION
${consultationData.consultation_type} - Douleurs abdominales

ANTÉCÉDENTS
Patient de ${consultationData.patient_age || 'XX'} ans, sans antécédents particuliers.

EXAMEN CLINIQUE
- État général conservé
- Abdomen souple, sensible au niveau de l'hypocondre droit
- Pas de défense ni de contracture
- Pouls régulier, tension artérielle normale
- Pas de fièvre

DIAGNOSTIC
Douleurs abdominales à préciser
Suspicion de colique hépatique

TRAITEMENT
- Antalgiques (paracétamol 1g x 3/j)
- Régime sans graisse
- Repos relatif

SUIVI
Consultation de contrôle dans 48h si persistance des symptômes
Bilan biologique si nécessaire`;

        setReport(demoReport);
        
        // ID de consultation factice
        setConsultationId('demo-consultation-' + Date.now());
        
        setCurrentStep('complete');

        toast({
          title: 'Succès !',
          description: 'Consultation enregistrée et compte rendu généré (mode démo).',
        });
        
        setIsProcessing(false);
        return;
      }

      // Mode normal avec Supabase
      console.log('📝 Étape 1: Création de la consultation...');
      console.log('📋 Données consultation:', {
        patient_name: consultationData.patient_name,
        consultation_type: consultationData.consultation_type,
        doctor_id: user.id,
      });
      
      let consultation;
      try {
        consultation = await ConsultationService.createConsultation({
          patient_name: consultationData.patient_name,
          patient_age: consultationData.patient_age ? parseInt(consultationData.patient_age) : undefined,
          consultation_date: new Date().toISOString(),
          consultation_type: consultationData.consultation_type,
          doctor_id: user.id,
          organization_id: profile?.organization_id || undefined,
        });
        console.log('✅ Consultation créée avec succès, ID:', consultation.id);
        setConsultationId(consultation.id);
      } catch (consultationError) {
        console.error('❌ ERREUR création consultation:', consultationError);
        throw new Error(`Erreur lors de la création de la consultation: ${consultationError instanceof Error ? consultationError.message : 'Erreur inconnue'}`);
      }

      // 2. Vérifier le blob audio avant de continuer
      console.log('📄 Vérification blob audio...');
      if (!blob || blob.size === 0) {
        console.error('❌ Blob audio vide ou invalide:', { exists: !!blob, size: blob?.size });
        throw new Error('Le fichier audio est vide ou invalide. Veuillez réessayer l\'enregistrement.');
      }
      console.log('✅ Blob audio valide:', { size: blob.size, type: blob.type });

      // 3. Récupérer la clé API et transcrire l'audio via backend (Mistral)
      console.log('🔑 Étape 2: Récupération clé API pour transcription...');
      console.log('🌐 URL API:', import.meta.env.VITE_API_URL);
      
      let apiKeyResponse;
      try {
        apiKeyResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/get-api-key/${user.id}`);
        console.log('📡 Réponse clé API status:', apiKeyResponse.status);
        
        if (!apiKeyResponse.ok) {
          throw new Error(`Erreur HTTP ${apiKeyResponse.status} lors de la récupération de la clé API`);
        }
        
        const apiKeyResult = await apiKeyResponse.json();
        console.log('📥 Résultat clé API:', { success: apiKeyResult.success, hasApiKey: !!apiKeyResult.apiKey });
        
        const apiKey = apiKeyResult.success ? apiKeyResult.apiKey : null;
        
        if (!apiKey) {
          console.error('❌ Pas de clé API trouvée dans la réponse');
          throw new Error('Clé API Mistral non configurée. Veuillez la configurer dans les paramètres.');
        }
        
        console.log('✅ Clé API récupérée, longueur:', apiKey.length);
        console.log('📄 Blob audio - taille:', blob.size, 'type:', blob.type);
        
        // 4. Transcription
        console.log('🎙️ Étape 3: Début de la transcription...');
        console.log('🚀 AVANT APPEL transcribeAudio');
        
        try {
          const transcription = await BackendMistralService.transcribeAudio(blob, user.id, apiKey);
          console.log('✅ Transcription reçue, longueur:', transcription.length);
          console.log('✅ Transcription (100 premiers caractères):', transcription.substring(0, 100) + '...');
          setTranscript(transcription);
        } catch (transcribeError) {
          console.error('❌ ERREUR DANS transcribeAudio:', transcribeError);
          console.error('📋 Détails erreur:', {
            message: transcribeError instanceof Error ? transcribeError.message : 'Erreur inconnue',
            stack: transcribeError instanceof Error ? transcribeError.stack : undefined,
            name: transcribeError instanceof Error ? transcribeError.name : undefined,
          });
          throw transcribeError; // Re-throw pour être capturé par le catch principal
        }
      } catch (apiKeyError) {
        console.error('❌ ERREUR récupération clé API:', apiKeyError);
        throw apiKeyError instanceof Error ? apiKeyError : new Error('Erreur lors de la récupération de la clé API');
      }

      // 3. Afficher la transcription pour validation
      setCurrentStep('review_transcript');

      toast({
        title: 'Transcription terminée',
        description: 'Veuillez vérifier la transcription avant de générer le compte rendu.',
      });

    } catch (error) {
      console.error('❌ ERREUR GLOBALE lors du traitement:', error);
      console.error('📋 Détails complets:', {
        message: error instanceof Error ? error.message : 'Erreur inconnue',
        name: error instanceof Error ? error.name : undefined,
        stack: error instanceof Error ? error.stack : undefined,
      });
      
      let errorMessage = 'Erreur lors du traitement de la consultation.';
      
      if (error instanceof Error) {
        console.error('📋 Message d\'erreur:', error.message);
        
        if (error.message.includes('Clé API')) {
          errorMessage = 'Clé API non configurée. Veuillez la configurer dans les paramètres.';
        } else if (error.message.includes('quota')) {
          errorMessage = 'Quota API dépassé. Vérifiez votre compte Mistral AI.';
        } else if (error.message.includes('network') || error.message.includes('réseau') || error.message.includes('fetch')) {
          errorMessage = 'Erreur réseau. Vérifiez votre connexion et que le serveur est démarré.';
        } else if (error.message.includes('consultation')) {
          errorMessage = error.message;
        } else if (error.message.includes('blob') || error.message.includes('audio')) {
          errorMessage = error.message;
        } else {
          errorMessage = `Erreur: ${error.message}`;
        }
      }

      console.error('📤 Affichage message d\'erreur à l\'utilisateur:', errorMessage);

      toast({
        title: 'Erreur',
        description: errorMessage,
        variant: 'destructive',
      });

      setCurrentStep('recording');
    } finally {
      console.log('🏁 Fin du traitement, setIsProcessing(false)');
      setIsProcessing(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!user || !transcript) {
      toast({
        title: 'Erreur',
        description: 'Transcription manquante ou utilisateur non connecté.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    setCurrentStep('generating_report');

    try {
      if (DEMO_MODE) {
        // Mode démo - simuler le traitement
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const demoReport = `MOTIF DE CONSULTATION
${consultationData.consultation_type} - Douleurs abdominales

ANTÉCÉDENTS
Patient de ${consultationData.patient_age || 'XX'} ans, sans antécédents particuliers.

EXAMEN CLINIQUE
- État général conservé
- Abdomen souple, sensible au niveau de l'hypocondre droit
- Pas de défense ni de contracture
- Pouls régulier, tension artérielle normale
- Pas de fièvre

DIAGNOSTIC
Douleurs abdominales à préciser
Suspicion de colique hépatique

TRAITEMENT
- Antalgiques (paracétamol 1g x 3/j)
- Régime sans graisse
- Repos relatif

SUIVI
Consultation de contrôle dans 48h si persistance des symptômes
Bilan biologique si nécessaire`;

        setReport(demoReport);
        setCurrentStep('complete');

        toast({
          title: 'Succès !',
          description: 'Compte rendu généré (mode démo).',
        });
        
        setIsProcessing(false);
        return;
      }

      // Mode normal - Générer le compte rendu
      const medicalReport = await BackendMistralService.generateMedicalReport(
        transcript,
        profile?.specialty || 'Médecine générale',
        consultationData.consultation_type,
        user.id
      );
      setReport(medicalReport);

      // Mettre à jour la consultation avec le rapport
      await ConsultationService.updateConsultation(consultationId, {
        transcription: transcript,
        medical_report: medicalReport,
        status: 'completed',
      });

      setCurrentStep('complete');

      toast({
        title: 'Succès !',
        description: 'Compte rendu médical généré avec succès.',
      });

    } catch (error) {
      console.error('Erreur lors de la génération:', error);
      
      toast({
        title: 'Erreur',
        description: 'Erreur lors de la génération du compte rendu.',
        variant: 'destructive',
      });

      setCurrentStep('review_transcript');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartRecording = () => {
    if (!consultationData.patient_name || !consultationData.consultation_type) {
      toast({
        title: 'Informations manquantes',
        description: 'Veuillez remplir le nom du patient et le type de consultation.',
        variant: 'destructive',
      });
      return;
    }
    setCurrentStep('recording');
  };

  const handleStartImport = (mode: 'audio' | 'document') => {
    if (!consultationData.patient_name || !consultationData.consultation_type) {
      toast({
        title: 'Informations manquantes',
        description: 'Veuillez remplir le nom du patient et le type de consultation.',
        variant: 'destructive',
      });
      return;
    }
    setImportMode(mode);
    setCurrentStep(mode === 'audio' ? 'import_audio' : 'import_document');
  };

  const handleDocumentImported = (text: string, fileName: string) => {
    // Le texte du document devient la transcription
    setTranscript(text);
    setCurrentStep('review_transcript');
    
    toast({
      title: 'Document importé',
      description: `Le contenu de ${fileName} a été importé comme transcription.`,
    });
  };

  const handleViewReport = () => {
    navigate('/dashboard/report', {
      state: {
        consultationId,
        patientName: consultationData.patient_name,
        consultationType: consultationData.consultation_type,
        transcript,
        report,
        audioBlob,
        duration: recordingDuration,
      }
    });
  };

  const handleNewConsultation = () => {
    setCurrentStep('form');
    setConsultationData({
      patient_name: '',
      patient_age: '',
      consultation_type: '',
      notes: '',
    });
    setAudioBlob(null);
    setTranscript('');
    setReport('');
    setConsultationId('');
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Nouvelle consultation</h1>
            <p className="text-muted-foreground mt-1">
              Enregistrez votre consultation, nous nous occupons du reste
            </p>
          </div>
        </div>

        {/* Formulaire de consultation */}
        {currentStep === 'form' && (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informations de la consultation
              </CardTitle>
              <CardDescription>
                Renseignez les informations de base avant l'enregistrement
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="patientName">Nom du patient *</Label>
                  <Input
                    id="patientName"
                    placeholder="Nom Prénom"
                    value={consultationData.patient_name}
                    onChange={(e) => setConsultationData({ ...consultationData, patient_name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="patientAge">Âge (optionnel)</Label>
                  <Input
                    id="patientAge"
                    type="number"
                    placeholder="45"
                    value={consultationData.patient_age}
                    onChange={(e) => setConsultationData({ ...consultationData, patient_age: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="consultationType">Type de consultation *</Label>
                <Select
                  value={consultationData.consultation_type}
                  onValueChange={(value) => setConsultationData({ ...consultationData, consultation_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez le type de consultation" />
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

              <div className="space-y-2">
                <Label htmlFor="notes">Notes préliminaires (optionnel)</Label>
                <Input
                  id="notes"
                  placeholder="Motif de consultation, antécédents..."
                  value={consultationData.notes}
                  onChange={(e) => setConsultationData({ ...consultationData, notes: e.target.value })}
                />
              </div>

              <div className="space-y-4 pt-4">
                <div className="flex justify-center">
                  <Button 
                    size="lg"
                    onClick={handleStartRecording}
                    disabled={!consultationData.patient_name || !consultationData.consultation_type}
                    className="min-w-[250px] h-14 text-lg"
                  >
                    <Mic className="h-6 w-6 mr-2" />
                    Enregistrer maintenant
                  </Button>
                </div>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Ou importer un fichier existant
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Button 
                    variant="outline"
                    size="lg"
                    onClick={() => handleStartImport('audio')}
                    disabled={!consultationData.patient_name || !consultationData.consultation_type}
                    className="h-12"
                  >
                    <Upload className="h-5 w-5 mr-2" />
                    Fichier Audio
                  </Button>
                  <Button 
                    variant="outline"
                    size="lg"
                    onClick={() => handleStartImport('document')}
                    disabled={!consultationData.patient_name || !consultationData.consultation_type}
                    className="h-12"
                  >
                    <File className="h-5 w-5 mr-2" />
                    Document Texte
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Interface d'enregistrement */}
        {currentStep === 'recording' && (
          <div className="space-y-6">
            {/* Informations de la consultation */}
            <Card className="max-w-2xl mx-auto">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{consultationData.patient_name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {consultationData.consultation_type}
                      {consultationData.patient_age && ` • ${consultationData.patient_age} ans`}
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4 inline mr-1" />
                    {new Date().toLocaleDateString('fr-FR')}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Composant d'enregistrement */}
            <AudioRecorder
              onRecordingComplete={handleRecordingComplete}
              onTranscribe={handleTranscribe}
              isProcessing={isProcessing}
            />
          </div>
        )}

        {/* Interface d'importation audio */}
        {currentStep === 'import_audio' && (
          <div className="space-y-6">
            {/* Informations de la consultation */}
            <Card className="max-w-2xl mx-auto border-primary/20 shadow-sm">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{consultationData.patient_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {consultationData.consultation_type}
                        {consultationData.patient_age && ` • ${consultationData.patient_age} ans`}
                      </p>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {new Date().toLocaleDateString('fr-FR', { 
                      day: 'numeric', 
                      month: 'long', 
                      year: 'numeric' 
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Composant d'importation audio */}
            <AudioImporter
              onAudioImported={handleRecordingComplete}
              onTranscribe={handleTranscribe}
              isProcessing={isProcessing}
            />

            <div className="flex justify-center">
              <Button 
                variant="ghost"
                onClick={() => setCurrentStep('form')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour au formulaire
              </Button>
            </div>
          </div>
        )}

        {/* Interface d'importation document */}
        {currentStep === 'import_document' && (
          <div className="space-y-6">
            {/* Informations de la consultation */}
            <Card className="max-w-2xl mx-auto border-primary/20 shadow-sm">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{consultationData.patient_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {consultationData.consultation_type}
                        {consultationData.patient_age && ` • ${consultationData.patient_age} ans`}
                      </p>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {new Date().toLocaleDateString('fr-FR', { 
                      day: 'numeric', 
                      month: 'long', 
                      year: 'numeric' 
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Composant d'importation document */}
            <DocumentImporter
              onDocumentImported={handleDocumentImported}
              isProcessing={isProcessing}
            />

            <div className="flex justify-center">
              <Button 
                variant="ghost"
                onClick={() => setCurrentStep('form')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour au formulaire
              </Button>
            </div>
          </div>
        )}

        {/* Révision de la transcription */}
        {currentStep === 'review_transcript' && (
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Vérification de la transcription
              </CardTitle>
              <CardDescription>
                Vérifiez et modifiez la transcription si nécessaire avant de générer le compte rendu
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Informations patient */}
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span className="font-semibold">{consultationData.patient_name}</span>
                    {consultationData.patient_age && (
                      <span className="text-sm text-muted-foreground">• {consultationData.patient_age} ans</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {consultationData.consultation_type}
                  </div>
                </div>
              </div>

              {/* Zone de transcription éditable */}
              <div className="space-y-2">
                <Label htmlFor="transcript">Transcription de la consultation</Label>
                <textarea
                  id="transcript"
                  className="w-full min-h-[300px] p-4 border rounded-lg font-mono text-sm"
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="La transcription apparaîtra ici..."
                />
                <p className="text-sm text-muted-foreground">
                  Vous pouvez modifier la transcription pour corriger d'éventuelles erreurs
                </p>
              </div>

              {/* Boutons d'action */}
              <div className="flex justify-between items-center pt-4">
                <Button 
                  variant="outline"
                  onClick={() => setCurrentStep('recording')}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour
                </Button>
                <Button 
                  size="lg"
                  onClick={handleGenerateReport}
                  disabled={!transcript.trim()}
                >
                  <FileText className="h-5 w-5 mr-2" />
                  Générer le compte rendu
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Génération du compte rendu en cours */}
        {currentStep === 'generating_report' && (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="text-center py-12">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
              
              <h3 className="text-xl font-semibold mb-2">Génération du compte rendu</h3>
              <p className="text-muted-foreground mb-6">
                L'IA analyse la transcription et génère le compte rendu médical...
              </p>
              
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-2">
                  <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
                  <span className="text-sm">Analyse de la transcription...</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className="h-2 w-2 bg-primary rounded-full animate-pulse delay-75" />
                  <span className="text-sm">Structuration du compte rendu...</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className="h-2 w-2 bg-primary rounded-full animate-pulse delay-150" />
                  <span className="text-sm">Finalisation et sauvegarde...</span>
                </div>
              </div>
              
              <div className="mt-6 text-sm text-muted-foreground">
                Cela peut prendre 20-40 secondes
              </div>
            </CardContent>
          </Card>
        )}

        {/* Traitement en cours */}
        {currentStep === 'processing' && (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="text-center py-12">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
              
              <h3 className="text-xl font-semibold mb-2">Traitement en cours</h3>
              <p className="text-muted-foreground mb-6">
                Nous traitons votre consultation...
              </p>
              
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-2">
                  <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
                  <span className="text-sm">Transcription de l'audio...</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className="h-2 w-2 bg-muted rounded-full" />
                  <span className="text-sm text-muted-foreground">Génération du compte rendu médical...</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className="h-2 w-2 bg-muted rounded-full" />
                  <span className="text-sm text-muted-foreground">Sauvegarde dans votre dossier...</span>
                </div>
              </div>
              
              <div className="mt-6 text-sm text-muted-foreground">
                Cela peut prendre 30-60 secondes selon la durée de l'enregistrement
              </div>
            </CardContent>
          </Card>
        )}

        {/* Consultation terminée */}
        {currentStep === 'complete' && (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="text-center py-12">
              <div className="h-16 w-16 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
              
              <h3 className="text-xl font-semibold mb-2">Consultation terminée !</h3>
              <p className="text-muted-foreground mb-6">
                Votre compte rendu médical a été généré avec succès.
              </p>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-center justify-center gap-2 text-sm">
                  <FileText className="h-4 w-4" />
                  <span>Durée : {Math.floor(recordingDuration / 60)}min {recordingDuration % 60}s</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-sm">
                  <User className="h-4 w-4" />
                  <span>Patient : {consultationData.patient_name}</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-sm">
                  <Calendar className="h-4 w-4" />
                  <span>Type : {consultationData.consultation_type}</span>
                </div>
              </div>
              
              <div className="flex gap-3 justify-center">
                <Button 
                  variant="outline"
                  onClick={handleNewConsultation}
                >
                  Nouvelle consultation
                </Button>
                <Button 
                  size="lg"
                  onClick={handleViewReport}
                >
                  <FileText className="h-5 w-5 mr-2" />
                  Voir le compte rendu
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
