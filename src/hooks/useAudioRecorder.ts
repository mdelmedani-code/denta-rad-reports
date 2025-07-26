import { useRef, useState, useCallback } from 'react';

export class AudioRecorder {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;

  constructor(private onAudioData: (audioData: Float32Array) => void) {}

  async start() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      this.audioContext = new AudioContext({
        sampleRate: 24000,
      });

      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      this.processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        this.onAudioData(new Float32Array(inputData));
      };

      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      throw error;
    }
  }

  stop() {
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

export const encodeAudioForAPI = (float32Array: Float32Array): string => {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  const uint8Array = new Uint8Array(int16Array.buffer);
  let binary = '';
  const chunkSize = 0x8000;
  
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  
  return btoa(binary);
};

export const useAudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);

  const startRecording = useCallback(async (onTranscription: (text: string) => void) => {
    try {
      setIsRecording(true);
      setIsProcessing(false);

      // Connect WebSocket
      websocketRef.current = new WebSocket('wss://swusayoygknritombbwg.functions.supabase.co/live-transcription');
      
      websocketRef.current.onopen = () => {
        console.log('WebSocket connected');
      };

      websocketRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'transcription_completed') {
          onTranscription(data.transcript);
          setIsProcessing(false);
        } else if (data.type === 'processing') {
          setIsProcessing(true);
        }
      };

      websocketRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      // Start audio recording
      audioRecorderRef.current = new AudioRecorder((audioData) => {
        if (websocketRef.current?.readyState === WebSocket.OPEN) {
          const base64Audio = encodeAudioForAPI(audioData);
          websocketRef.current.send(JSON.stringify({
            type: 'audio_data',
            audio: base64Audio
          }));
        }
      });

      await audioRecorderRef.current.start();
    } catch (error) {
      console.error('Error starting recording:', error);
      setIsRecording(false);
      throw error;
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (audioRecorderRef.current) {
      audioRecorderRef.current.stop();
      audioRecorderRef.current = null;
    }
    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
    }
    setIsRecording(false);
    setIsProcessing(false);
  }, []);

  return {
    isRecording,
    isProcessing,
    startRecording,
    stopRecording
  };
};