import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Upload, 
  FileText,
  AlertCircle,
  CheckCircle,
  Loader2,
  X,
  File
} from 'lucide-react';

interface DocumentImporterProps {
  onDocumentImported: (text: string, fileName: string) => void;
  isProcessing?: boolean;
}

const SUPPORTED_FORMATS = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
  '.pdf',
  '.docx',
  '.doc',
  '.txt'
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const DocumentImporter = ({ 
  onDocumentImported, 
  isProcessing = false 
}: DocumentImporterProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // Vérifier la taille
    if (file.size > MAX_FILE_SIZE) {
      return `Fichier trop volumineux (${Math.round(file.size / 1024 / 1024)}MB). Maximum autorisé : 10MB`;
    }

    // Vérifier le type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!SUPPORTED_FORMATS.includes(file.type) && !SUPPORTED_FORMATS.includes(fileExtension)) {
      return `Format non supporté. Formats acceptés : PDF, DOCX, DOC, TXT`;
    }

    return null;
  };

  const extractTextFromFile = async (file: File): Promise<string> => {
    const fileType = file.name.split('.').pop()?.toLowerCase();

    if (fileType === 'txt') {
      // Lire le fichier texte directement
      return await file.text();
    } else if (fileType === 'pdf' || fileType === 'docx' || fileType === 'doc') {
      // Pour les PDF et DOCX, on devrait utiliser une bibliothèque comme pdf.js ou mammoth.js
      // Pour l'instant, on retourne un message d'aide
      throw new Error(`L'extraction de texte depuis ${fileType.toUpperCase()} nécessite une transcription audio. Veuillez utiliser l'importation audio à la place.`);
    }

    throw new Error('Format de fichier non supporté pour l\'extraction de texte');
  };

  const handleFileSelect = async (file: File) => {
    setError(null);
    setIsProcessingFile(true);

    try {
      // Validation
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        setIsProcessingFile(false);
        return;
      }

      setSelectedFile(file);

      // Extraire le texte
      const text = await extractTextFromFile(file);
      setExtractedText(text);
      setIsProcessingFile(false);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du traitement du fichier';
      setError(errorMessage);
      setIsProcessingFile(false);
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

  const handleImport = () => {
    if (extractedText && selectedFile) {
      onDocumentImported(extractedText, selectedFile.name);
    }
  };

  const resetImport = () => {
    setSelectedFile(null);
    setExtractedText('');
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFileSize = (bytes: number) => {
    const mb = bytes / 1024 / 1024;
    if (mb < 1) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Zone de sélection de fichier */}
      {!selectedFile && (
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <File className="h-5 w-5" />
              Importer un document texte
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
                  <FileText className="h-8 w-8 text-primary" />
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    Glissez-déposez votre document ici
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
                  <p className="font-medium mb-1">Formats supportés :</p>
                  <p>• TXT (recommandé pour transcription directe)</p>
                  <p>• PDF, DOCX, DOC (utilisez plutôt l'importation audio)</p>
                  <p className="mt-2">Taille maximale : 10 MB</p>
                </div>
              </div>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.pdf,.doc,.docx,text/plain,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
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

      {/* Traitement en cours */}
      {isProcessingFile && (
        <Card className="max-w-2xl mx-auto">
          <CardContent className="text-center py-8">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Traitement du fichier</h3>
            <p className="text-muted-foreground">
              Extraction du texte en cours...
            </p>
          </CardContent>
        </Card>
      )}

      {/* Fichier sélectionné */}
      {selectedFile && extractedText && !error && !isProcessingFile && (
        <Card className="max-w-4xl mx-auto">
          <CardContent className="py-8">
            <div className="text-center mb-6">
              <div className="h-16 w-16 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Document importé</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p><strong>Nom :</strong> {selectedFile.name}</p>
                <p><strong>Taille :</strong> {getFileSize(selectedFile.size)}</p>
                <p><strong>Caractères extraits :</strong> {extractedText.length}</p>
              </div>
            </div>

            {/* Aperçu du texte */}
            <div className="bg-muted/50 rounded-lg p-6 mb-6">
              <h4 className="font-semibold mb-3">Aperçu du texte extrait :</h4>
              <div className="max-h-60 overflow-y-auto bg-background rounded p-4 text-sm font-mono">
                {extractedText.substring(0, 500)}
                {extractedText.length > 500 && '...'}
              </div>
            </div>

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
                size="lg"
                onClick={handleImport}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Traitement...
                  </>
                ) : (
                  <>
                    <FileText className="h-5 w-5 mr-2" />
                    Utiliser ce texte comme transcription
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
