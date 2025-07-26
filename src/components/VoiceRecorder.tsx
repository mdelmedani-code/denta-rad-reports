import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useToast } from '@/hooks/use-toast';

interface VoiceRecorderProps {
  onTranscription: (text: string) => void;
  disabled?: boolean;
}

export const VoiceRecorder = ({ onTranscription, disabled }: VoiceRecorderProps) => {
  const [transcript, setTranscript] = useState('');
  const { isRecording, isProcessing, startRecording, stopRecording } = useAudioRecorder();
  const { toast } = useToast();

  const handleStartRecording = async () => {
    try {
      setTranscript('');
      await startRecording((newText) => {
        setTranscript(prev => {
          const updatedText = prev ? `${prev} ${newText}` : newText;
          onTranscription(updatedText);
          return updatedText;
        });
      });
    } catch (error) {
      toast({
        title: "Recording Error",
        description: "Failed to access microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const handleStopRecording = () => {
    stopRecording();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant={isRecording ? "destructive" : "outline"}
          size="sm"
          onClick={isRecording ? handleStopRecording : handleStartRecording}
          disabled={disabled}
          className="flex items-center gap-2"
        >
          {isRecording ? (
            <>
              <MicOff className="h-4 w-4" />
              Stop Recording
            </>
          ) : (
            <>
              <Mic className="h-4 w-4" />
              Start Voice Dictation
            </>
          )}
        </Button>
        
        {isProcessing && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing audio...
          </div>
        )}
        
        {isRecording && !isProcessing && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            Recording...
          </div>
        )}
      </div>
      
      {transcript && (
        <div className="p-3 bg-muted rounded-md">
          <p className="text-sm text-muted-foreground mb-1">Live Transcription:</p>
          <p className="text-sm">{transcript}</p>
        </div>
      )}
    </div>
  );
};