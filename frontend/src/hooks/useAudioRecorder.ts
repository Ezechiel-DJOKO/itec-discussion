import { useState, useRef } from 'react';

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };

      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (err) {
      alert("Microphone inaccessible. Veuillez autoriser l'accès au micro dans votre navigateur.");
    }
  };

  const stopRecording = (): Promise<File | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorder.current) return resolve(null);

      mediaRecorder.current.onstop = () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        const file = new File([audioBlob], `vocal_${Date.now()}.webm`, { type: 'audio/webm' });
        
        // Couper le micro
        mediaRecorder.current?.stream.getTracks().forEach(track => track.stop());
        
        setIsRecording(false);
        resolve(file);
      };

      mediaRecorder.current.stop();
    });
  };

  return { isRecording, startRecording, stopRecording };
}