import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Mic, 
  MicOff, 
  Play, 
  Pause, 
  Square, 
  RotateCcw, 
  Volume2,
  VolumeX,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

type RecordingState = 'idle' | 'recording' | 'paused' | 'stopped' | 'processing';

interface AudioRecorderProps {
  onRecordingComplete: (audioBlob: Blob, duration: number) => void;
  onTranscribe: (audioBlob: Blob) => Promise<void>;
  isProcessing?: boolean;
}

export const AudioRecorder = ({ 
  onRecordingComplete, 
  onTranscribe, 
  isProcessing = false 
}: AudioRecorderProps) => {
  const [state, setState] = useState<RecordingState>('idle');
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [audioQuality, setAudioQuality] = useState<'good' | 'medium' | 'poor'>('good');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Nettoyer les ressources
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const startTimer = () => {
    intervalRef.current = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        }
      });
      
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        onRecordingComplete(audioBlob, duration);
      };

      mediaRecorder.start(1000); // Collecte les données toutes les secondes
      setState('recording');
      startTimer();
      
      // Simuler la qualité audio (dans un vrai projet, utiliser Web Audio API)
      setTimeout(() => {
        const quality = Math.random();
        if (quality > 0.7) setAudioQuality('good');
        else if (quality > 0.4) setAudioQuality('medium');
        else setAudioQuality('poor');
      }, 2000);

    } catch (error) {
      console.error('Erreur lors du démarrage de l\'enregistrement:', error);
      alert('Impossible d\'accéder au microphone. Vérifiez les permissions.');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setState('paused');
      stopTimer();
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setState('recording');
      startTimer();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setState('stopped');
      stopTimer();
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    }
  };

  const resetRecording = () => {
    setState('idle');
    setDuration(0);
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setIsPlaying(false);
    audioChunksRef.current = [];
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

  const handleTranscribe = async () => {
    if (!audioBlob) return;
    
    setState('processing');
    try {
      await onTranscribe(audioBlob);
    } catch (error) {
      console.error('Erreur lors de la transcription:', error);
      setState('stopped');
    }
  };

  const getQualityBadge = () => {
    const variants = {
      good: { variant: 'default' as const, color: 'bg-green-600', icon: CheckCircle },
      medium: { variant: 'secondary' as const, color: 'bg-yellow-600', icon: AlertCircle },
      poor: { variant: 'destructive' as const, color: 'bg-red-600', icon: AlertCircle }
    };
    
    const config = variants[audioQuality];
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {audioQuality === 'good' ? 'Bonne' : audioQuality === 'medium' ? 'Moyenne' : 'Faible'}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* État 1: Avant enregistrement */}
      {state === 'idle' && (
        <Card className="max-w-2xl mx-auto">
          <CardContent className="text-center py-12">
            <div className="h-32 w-32 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Mic className="h-16 w-16 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Prêt à enregistrer</h3>
            <p className="text-muted-foreground mb-6">
              Appuyez sur le bouton pour commencer l'enregistrement de votre consultation
            </p>
            <Button 
              size="lg" 
              onClick={startRecording}
              className="bg-primary hover:bg-primary/90"
            >
              <Mic className="h-5 w-5 mr-2" />
              Démarrer l'enregistrement
            </Button>
            <div className="mt-4 text-sm text-muted-foreground">
              💡 Conseil : Placez-vous dans un environnement calme pour une meilleure qualité
            </div>
          </CardContent>
        </Card>
      )}

      {/* État 2: En cours d'enregistrement */}
      {state === 'recording' && (
        <Card className="max-w-2xl mx-auto">
          <CardContent className="text-center py-8">
            <div className="h-24 w-24 rounded-full bg-red-500 animate-pulse flex items-center justify-center mx-auto mb-4">
              <MicOff className="h-12 w-12 text-white" />
            </div>
            
            <div className="space-y-4">
              <div className="text-3xl font-mono font-bold text-red-600">
                {formatTime(duration)}
              </div>
              
              <div className="flex items-center justify-center gap-4">
                {getQualityBadge()}
                <div className="flex space-x-1">
                  {[...Array(5)].map((_, i) => (
                    <div 
                      key={i}
                      className="h-2 w-1 bg-primary animate-pulse"
                      style={{ animationDelay: `${i * 0.1}s` }}
                    />
                  ))}
                </div>
              </div>
              
              <div className="flex gap-3 justify-center">
                <Button 
                  size="lg" 
                  variant="destructive"
                  onClick={stopRecording}
                >
                  <Square className="h-5 w-5 mr-2" />
                  Arrêter
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={pauseRecording}
                >
                  <Pause className="h-5 w-5 mr-2" />
                  Pause
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* État 3: En pause */}
      {state === 'paused' && (
        <Card className="max-w-2xl mx-auto">
          <CardContent className="text-center py-8">
            <div className="h-24 w-24 rounded-full bg-yellow-500 flex items-center justify-center mx-auto mb-4">
              <Pause className="h-12 w-12 text-white" />
            </div>
            
            <div className="space-y-4">
              <div className="text-3xl font-mono font-bold text-yellow-600">
                {formatTime(duration)}
              </div>
              
              <p className="text-muted-foreground">Enregistrement en pause</p>
              
              <div className="flex gap-3 justify-center">
                <Button 
                  size="lg" 
                  onClick={resumeRecording}
                >
                  <Play className="h-5 w-5 mr-2" />
                  Reprendre
                </Button>
                <Button 
                  size="lg" 
                  variant="destructive"
                  onClick={stopRecording}
                >
                  <Square className="h-5 w-5 mr-2" />
                  Arrêter
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* État 4: Enregistrement terminé */}
      {state === 'stopped' && (
        <Card className="max-w-4xl mx-auto">
          <CardContent className="py-8">
            <div className="text-center mb-6">
              <div className="h-16 w-16 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Enregistrement terminé</h3>
              <p className="text-muted-foreground">
                Durée : {formatTime(duration)} • Qualité : {audioQuality === 'good' ? 'Bonne' : audioQuality === 'medium' ? 'Moyenne' : 'Faible'}
              </p>
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
                onClick={resetRecording}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Recommencer
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
                    <Mic className="h-5 w-5 mr-2" />
                    Transcrire et générer le compte rendu
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* État 5: Traitement en cours */}
      {state === 'processing' && (
        <Card className="max-w-2xl mx-auto">
          <CardContent className="text-center py-12">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
            
            <h3 className="text-xl font-semibold mb-2">Traitement en cours</h3>
            <p className="text-muted-foreground mb-6">
              Transcription et génération du compte rendu...
            </p>
            
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2">
                <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
                <span className="text-sm">Transcription en cours...</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <div className="h-2 w-2 bg-muted rounded-full" />
                <span className="text-sm text-muted-foreground">Génération du compte rendu...</span>
              </div>
            </div>
            
            <div className="mt-6 text-sm text-muted-foreground">
              Cela peut prendre 30-60 secondes selon la durée de l'enregistrement
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
