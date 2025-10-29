import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  Play, 
  Pause, 
  Square, 
  Volume2,
  VolumeX,
  FileAudio,
  AlertCircle,
  CheckCircle,
  Loader2,
  X
} from 'lucide-react';

interface AudioImporterProps {
  onAudioImported: (audioBlob: Blob, duration: number) => void;
  onTranscribe: (audioBlob: Blob) => Promise<void>;
  isProcessing?: boolean;
}

const SUPPORTED_FORMATS = [
  'audio/mp3',
  'audio/wav', 
  'audio/m4a',
  'audio/webm',
  'audio/ogg',
  'audio/mpeg',
  'audio/mp4'
];

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

export const AudioImporter = ({ 
  onAudioImported, 
  onTranscribe, 
  isProcessing = false 
}: AudioImporterProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Nettoyer les ressources
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const validateFile = (file: File): string | null => {
    // Vérifier la taille
    if (file.size > MAX_FILE_SIZE) {
      return `Fichier trop volumineux (${Math.round(file.size / 1024 / 1024)}MB). Maximum autorisé : 25MB`;
    }

    // Vérifier le type
    if (!SUPPORTED_FORMATS.includes(file.type)) {
      return `Format non supporté (${file.type}). Formats acceptés : MP3, WAV, M4A, WEBM, OGG`;
    }

    return null;
  };

  const handleFileSelect = async (file: File) => {
    setError(null);
    setIsValidating(true);

    try {
      // Validation
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        setIsValidating(false);
        return;
      }

      // Créer un blob et URL pour prévisualisation
      const blob = new Blob([file], { type: file.type });
      const url = URL.createObjectURL(blob);
      
      setSelectedFile(file);
      setAudioBlob(blob);
      setAudioUrl(url);

      // Charger l'audio pour obtenir la durée
      const audio = new Audio(url);
      audio.addEventListener('loadedmetadata', () => {
        setDuration(audio.duration);
        setIsValidating(false);
      });

      audio.addEventListener('error', () => {
        setError('Erreur lors du chargement du fichier audio');
        setIsValidating(false);
      });

    } catch (err) {
      setError('Erreur lors du traitement du fichier');
      setIsValidating(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current || !audioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleImport = () => {
    if (audioBlob) {
      onAudioImported(audioBlob, duration);
    }
  };

  const handleTranscribe = async () => {
    if (!audioBlob) return;
    
    try {
      await onTranscribe(audioBlob);
    } catch (error) {
      console.error('Erreur lors de la transcription:', error);
    }
  };

  const resetImport = () => {
    setSelectedFile(null);
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setDuration(0);
    setIsPlaying(false);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFileSize = (bytes: number) => {
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Zone de sélection de fichier */}
      {!selectedFile && (
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Importer un enregistrement existant
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragOver 
                  ? 'border-primary bg-primary/5' 
                  : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <div className="space-y-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <FileAudio className="h-8 w-8 text-primary" />
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    Glissez-déposez votre fichier audio ici
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    ou cliquez pour sélectionner un fichier
                  </p>
                  
                  <Button 
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Choisir un fichier
                  </Button>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  <p>Formats supportés : MP3, WAV, M4A, WEBM, OGG</p>
                  <p>Taille maximale : 25 MB</p>
                </div>
              </div>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleFileInputChange}
              className="hidden"
            />
          </CardContent>
        </Card>
      )}

      {/* Erreur */}
      {error && (
        <Card className="max-w-2xl mx-auto border-destructive">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Erreur</span>
            </div>
            <p className="text-sm text-destructive mt-1">{error}</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={resetImport}
              className="mt-3"
            >
              Réessayer
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Validation en cours */}
      {isValidating && (
        <Card className="max-w-2xl mx-auto">
          <CardContent className="text-center py-8">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Validation du fichier</h3>
            <p className="text-muted-foreground">
              Vérification du format et de la taille...
            </p>
          </CardContent>
        </Card>
      )}

      {/* Fichier sélectionné */}
      {selectedFile && !error && !isValidating && (
        <Card className="max-w-4xl mx-auto">
          <CardContent className="py-8">
            <div className="text-center mb-6">
              <div className="h-16 w-16 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Fichier audio importé</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p><strong>Nom :</strong> {selectedFile.name}</p>
                <p><strong>Taille :</strong> {getFileSize(selectedFile.size)}</p>
                <p><strong>Durée :</strong> {formatTime(duration)}</p>
                <p><strong>Format :</strong> {selectedFile.type}</p>
              </div>
            </div>

            {/* Lecteur audio */}
            {audioUrl && (
              <div className="bg-muted/50 rounded-lg p-6 mb-6">
                <div className="flex items-center gap-4 mb-4">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={togglePlayback}
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  
                  <div className="flex-1">
                    <div className="w-full bg-background rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{ width: '0%' }} />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setVolume(volume === 0 ? 1 : 0)}
                    >
                      {volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </Button>
                    
                    <select 
                      value={playbackRate} 
                      onChange={(e) => setPlaybackRate(Number(e.target.value))}
                      className="text-sm border rounded px-2 py-1"
                    >
                      <option value={0.5}>0.5x</option>
                      <option value={1}>1x</option>
                      <option value={1.5}>1.5x</option>
                      <option value={2}>2x</option>
                    </select>
                  </div>
                </div>
                
                <audio
                  ref={audioRef}
                  src={audioUrl}
                  onEnded={() => setIsPlaying(false)}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-center">
              <Button 
                variant="outline"
                onClick={resetImport}
              >
                <X className="h-4 w-4 mr-2" />
                Choisir un autre fichier
              </Button>
              <Button 
                variant="outline"
                onClick={handleImport}
              >
                <Upload className="h-4 w-4 mr-2" />
                Importer ce fichier
              </Button>
              <Button 
                size="lg"
                onClick={handleTranscribe}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Traitement...
                  </>
                ) : (
                  <>
                    <FileAudio className="h-5 w-5 mr-2" />
                    Transcrire et générer le compte rendu
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
