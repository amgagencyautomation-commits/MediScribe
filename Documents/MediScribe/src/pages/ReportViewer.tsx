import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { ConsultationService } from '@/lib/services';
import { saveAs } from 'file-saver';
import { 
  ArrowLeft, 
  Download, 
  Edit, 
  Save, 
  User, 
  Calendar, 
  Clock, 
  FileText, 
  Mic,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface ReportData {
  consultationId: string;
  patientName: string;
  consultationType: string;
  transcript: string;
  report: string;
  audioBlob?: Blob;
  duration?: number;
}

export default function ReportViewer() {
  const { user, profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedReport, setEditedReport] = useState('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  useEffect(() => {
    // Récupérer les données depuis l'état de navigation
    if (location.state) {
      setReportData(location.state as ReportData);
      setEditedReport(location.state.report || '');
      
      // Créer l'URL audio si disponible
      if (location.state.audioBlob) {
        const url = URL.createObjectURL(location.state.audioBlob);
        setAudioUrl(url);
      }
    } else {
      // Rediriger si pas de données
      navigate('/dashboard');
    }
  }, [location.state, navigate]);

  const handleSaveReport = async () => {
    if (!reportData || !user) return;

    setSaving(true);
    try {
      await ConsultationService.updateConsultation(reportData.consultationId, {
        medical_report: editedReport,
        status: 'completed'
      });

      setReportData(prev => prev ? { ...prev, report: editedReport } : null);
      setIsEditing(false);
      
      toast({
        title: 'Compte rendu sauvegardé',
        description: 'Vos modifications ont été enregistrées.',
      });
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder le compte rendu.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadReport = async () => {
    if (!reportData) return;

    // Sanitizer strict pour éviter DOM XSS - ne garder que caractères sûrs
    const sanitizeFileName = (name: string): string => {
      if (!name || typeof name !== 'string') return 'patient';
      
      // Convertir en string sécurisée : uniquement lettres, chiffres, tirets
      // Encoder d'abord les caractères spéciaux puis extraire uniquement le safe subset
      return name
        .replace(/[^\w\s-]/g, '') // Supprimer tout sauf lettres, chiffres, espaces, tirets
        .replace(/\s+/g, '-') // Espaces en tirets
        .replace(/-+/g, '-') // Plusieurs tirets en un seul
        .replace(/^-|-$/g, '') // Supprimer tirets début/fin
        .toLowerCase()
        .substring(0, 30) // Limiter strictement la longueur
        || 'patient'; // Fallback si vide
    };

    const sanitizedPatientName = sanitizeFileName(reportData.patientName);
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, ''); // Format: YYYYMMDD
    
    // Construire le nom de fichier de manière sûre (sans interpolation de user input non validé)
    const safeFileName = `compte-rendu-${sanitizedPatientName}-${dateStr}.txt`;

    const content = `
COMPTE RENDU MÉDICAL
====================

Patient: ${reportData.patientName}
Type de consultation: ${reportData.consultationType}
Date: ${new Date().toLocaleDateString('fr-FR')}
Médecin: ${profile?.full_name || 'Dr.'}

${reportData.report}
    `.trim();

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    
    // Utiliser file-saver pour éviter complètement appendChild et manipulation DOM
    // Cette bibliothèque utilise des méthodes natives sécurisées sans appendChild
    const sanitizedFileName = (typeof safeFileName === 'string' && safeFileName.length > 0 && safeFileName.length <= 100)
      ? safeFileName
      : 'compte-rendu.txt';
    
    // file-saver gère le téléchargement de manière sécurisée sans appendChild
    saveAs(blob, sanitizedFileName);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!reportData) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Chargement du compte rendu...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

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
            <h1 className="text-3xl font-bold text-foreground">Compte rendu médical</h1>
            <p className="text-muted-foreground mt-1">
              {reportData.patientName} • {reportData.consultationType}
            </p>
          </div>
        </div>

        {/* Informations de la consultation */}
        <Card>
          <CardContent className="py-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{reportData.patientName}</p>
                  <p className="text-xs text-muted-foreground">Patient</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{new Date().toLocaleDateString('fr-FR')}</p>
                  <p className="text-xs text-muted-foreground">Date</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{reportData.consultationType}</p>
                  <p className="text-xs text-muted-foreground">Type</p>
                </div>
              </div>
              {reportData.duration && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{formatDuration(reportData.duration)}</p>
                    <p className="text-xs text-muted-foreground">Durée</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Contenu principal */}
        <Tabs defaultValue="report" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="report">Compte rendu</TabsTrigger>
            <TabsTrigger value="transcript">Transcription</TabsTrigger>
            <TabsTrigger value="audio">Audio</TabsTrigger>
          </TabsList>

          {/* Onglet Compte rendu */}
          <TabsContent value="report" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Compte rendu médical
                    </CardTitle>
                    <CardDescription>
                      Généré automatiquement par l'IA • {new Date().toLocaleString('fr-FR')}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="default" className="bg-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Terminé
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <div className="space-y-4">
                    <Label htmlFor="editedReport">Modifier le compte rendu</Label>
                    <Textarea
                      id="editedReport"
                      value={editedReport}
                      onChange={(e) => setEditedReport(e.target.value)}
                      rows={20}
                      className="font-mono text-sm"
                    />
                    <div className="flex gap-2">
                      <Button onClick={handleSaveReport} disabled={saving}>
                        {saving ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Sauvegarde...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Sauvegarder
                          </>
                        )}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setIsEditing(false);
                          setEditedReport(reportData.report);
                        }}
                      >
                        Annuler
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-muted/50 rounded-lg p-4">
                      <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
                        {reportData.report}
                      </pre>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => setIsEditing(true)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Modifier
                      </Button>
                      <Button variant="outline" onClick={handleDownloadReport}>
                        <Download className="h-4 w-4 mr-2" />
                        Télécharger
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Onglet Transcription */}
          <TabsContent value="transcript" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mic className="h-5 w-5" />
                  Transcription de la consultation
                </CardTitle>
                <CardDescription>
                  Transcription automatique générée par Mistral AI
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/50 rounded-lg p-4">
                  <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
                    {reportData.transcript || 'Aucune transcription disponible'}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Onglet Audio */}
          <TabsContent value="audio" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mic className="h-5 w-5" />
                  Enregistrement audio
                </CardTitle>
                <CardDescription>
                  Fichier audio de la consultation
                </CardDescription>
              </CardHeader>
              <CardContent>
                {audioUrl ? (
                  <div className="space-y-4">
                    <div className="bg-muted/50 rounded-lg p-6">
                      <audio 
                        controls 
                        className="w-full"
                        src={audioUrl}
                      >
                        Votre navigateur ne supporte pas la lecture audio.
                      </audio>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p>Durée : {reportData.duration ? formatDuration(reportData.duration) : 'Inconnue'}</p>
                      <p>Format : WebM (Opus)</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">Audio non disponible</h3>
                    <p className="text-muted-foreground">
                      L'enregistrement audio n'est pas disponible pour cette consultation.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
