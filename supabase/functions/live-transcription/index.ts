import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

let audioBuffer: Uint8Array[] = [];
let lastProcessTime = 0;
const PROCESS_INTERVAL = 2000; // Process every 2 seconds

function processBase64Chunks(base64String: string, chunkSize = 32768) {
  const chunks: Uint8Array[] = [];
  let position = 0;
  
  while (position < base64String.length) {
    const chunk = base64String.slice(position, position + chunkSize);
    const binaryChunk = atob(chunk);
    const bytes = new Uint8Array(binaryChunk.length);
    
    for (let i = 0; i < binaryChunk.length; i++) {
      bytes[i] = binaryChunk.charCodeAt(i);
    }
    
    chunks.push(bytes);
    position += chunkSize;
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

async function transcribeAudio(audioData: Uint8Array): Promise<string> {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const formData = new FormData();
  const blob = new Blob([audioData], { type: 'audio/wav' });
  formData.append('file', blob, 'audio.wav');
  formData.append('model', 'whisper-1');
  formData.append('language', 'en');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${await response.text()}`);
  }

  const result = await response.json();
  return result.text || '';
}

function createWavFromPCM(pcmData: Uint8Array) {
  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);
  
  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  const sampleRate = 24000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + pcmData.byteLength, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, 'data');
  view.setUint32(40, pcmData.byteLength, true);

  const wavArray = new Uint8Array(wavHeader.byteLength + pcmData.byteLength);
  wavArray.set(new Uint8Array(wavHeader), 0);
  wavArray.set(pcmData, wavHeader.byteLength);
  
  return wavArray;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);

  socket.onopen = () => {
    console.log('WebSocket connection opened');
  };

  socket.onmessage = async (event) => {
    try {
      const data = JSON.parse(event.data);
      
      if (data.type === 'audio_data' && data.audio) {
        const binaryAudio = processBase64Chunks(data.audio);
        audioBuffer.push(binaryAudio);

        const now = Date.now();
        if (now - lastProcessTime >= PROCESS_INTERVAL && audioBuffer.length > 0) {
          lastProcessTime = now;
          
          socket.send(JSON.stringify({
            type: 'processing'
          }));

          // Combine all audio chunks
          const totalLength = audioBuffer.reduce((acc, chunk) => acc + chunk.length, 0);
          const combinedAudio = new Uint8Array(totalLength);
          let offset = 0;

          for (const chunk of audioBuffer) {
            combinedAudio.set(chunk, offset);
            offset += chunk.length;
          }

          // Clear buffer
          audioBuffer = [];

          if (combinedAudio.length > 0) {
            try {
              const wavData = createWavFromPCM(combinedAudio);
              const transcript = await transcribeAudio(wavData);
              
              if (transcript.trim()) {
                socket.send(JSON.stringify({
                  type: 'transcription_completed',
                  transcript: transcript.trim()
                }));
              }
            } catch (error) {
              console.error('Transcription error:', error);
              socket.send(JSON.stringify({
                type: 'error',
                message: 'Transcription failed'
              }));
            }
          }
        }
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  };

  socket.onclose = () => {
    console.log('WebSocket connection closed');
    audioBuffer = [];
  };

  socket.onerror = (error) => {
    console.error('WebSocket error:', error);
    audioBuffer = [];
  };

  return response;
});