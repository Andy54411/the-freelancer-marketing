/**
 * VoiceRecorder Component
 * 
 * Sprachnachricht aufnehmen für WhatsApp
 */
'use client';

import React from 'react';
import { Mic, Square, Send, Trash2, Pause, Play } from 'lucide-react';

interface VoiceRecorderProps {
  onSend: (audioBlob: Blob, duration: number) => void;
  onCancel: () => void;
  isRecording: boolean;
  onStartRecording: () => void;
}

export function VoiceRecorder({ onSend, onCancel, isRecording, onStartRecording }: VoiceRecorderProps) {
  const [mediaRecorder, setMediaRecorder] = React.useState<MediaRecorder | null>(null);
  const [_audioChunks, setAudioChunks] = React.useState<Blob[]>([]);
  const [recordingTime, setRecordingTime] = React.useState(0);
  const [isPaused, setIsPaused] = React.useState(false);
  const [audioBlob, setAudioBlob] = React.useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = React.useState<string | null>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [hasPermission, setHasPermission] = React.useState<boolean | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const timerRef = React.useRef<NodeJS.Timeout | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);

  // Aufnahme starten
  const startRecording = React.useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setHasPermission(true);

      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });
      
      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
          setAudioChunks([...chunks]);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: recorder.mimeType });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        
        // Stream stoppen
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start(100); // Alle 100ms Daten sammeln
      setMediaRecorder(recorder);
      onStartRecording();

      // Timer starten
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch {
      setHasPermission(false);
      setError('Mikrofonzugriff verweigert');
    }
  }, [onStartRecording]);

  // Aufnahme pausieren/fortsetzen
  const togglePause = () => {
    if (!mediaRecorder) return;

    if (isPaused) {
      mediaRecorder.resume();
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      mediaRecorder.pause();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    setIsPaused(!isPaused);
  };

  // Aufnahme stoppen
  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  // Aufnahme abbrechen
  const cancelRecording = () => {
    stopRecording();
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setAudioChunks([]);
    setIsPaused(false);
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    onCancel();
  };

  // Audio abspielen
  const togglePlayback = () => {
    if (!audioRef.current || !audioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  // Senden
  const handleSend = () => {
    if (audioBlob) {
      onSend(audioBlob, recordingTime);
      cancelRecording();
    }
  };

  // Zeit formatieren
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Cleanup
  React.useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Audio-Element Event Handler
  React.useEffect(() => {
    if (audioRef.current) {
      audioRef.current.onended = () => setIsPlaying(false);
    }
  }, [audioUrl]);

  // Kein Mikrofon-Zugriff
  if (hasPermission === false) {
    return (
      <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
        <Mic className="w-5 h-5 text-red-500" />
        <span className="text-sm text-red-600">{error || 'Mikrofonzugriff nicht verfügbar'}</span>
      </div>
    );
  }

  // Aufnahme-Modus (noch nicht gestartet)
  if (!isRecording && !audioBlob) {
    return (
      <button
        onClick={startRecording}
        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        title="Sprachnachricht aufnehmen"
      >
        <Mic className="w-5 h-5 text-gray-500" />
      </button>
    );
  }

  // Aktive Aufnahme
  if (isRecording && !audioBlob) {
    return (
      <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl w-full">
        {/* Aufnahme-Indikator */}
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full bg-red-500 ${!isPaused ? 'animate-pulse' : ''}`} />
          <span className="text-sm font-mono font-medium text-gray-700">
            {formatTime(recordingTime)}
          </span>
        </div>

        {/* Wellenform (vereinfacht) */}
        <div className="flex-1 flex items-center justify-center gap-0.5 h-8">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className={`w-1 bg-red-400 rounded-full transition-all ${
                isPaused ? 'h-1' : ''
              }`}
              style={{
                height: isPaused ? '4px' : `${Math.random() * 24 + 8}px`,
                animationDelay: `${i * 50}ms`,
              }}
            />
          ))}
        </div>

        {/* Aktionen */}
        <div className="flex items-center gap-2">
          <button
            onClick={togglePause}
            className="p-2 hover:bg-red-100 rounded-full"
            title={isPaused ? 'Fortsetzen' : 'Pausieren'}
          >
            {isPaused ? (
              <Play className="w-5 h-5 text-red-600" />
            ) : (
              <Pause className="w-5 h-5 text-red-600" />
            )}
          </button>
          
          <button
            onClick={stopRecording}
            className="p-2 bg-red-500 hover:bg-red-600 rounded-full"
            title="Aufnahme beenden"
          >
            <Square className="w-4 h-4 text-white" />
          </button>

          <button
            onClick={cancelRecording}
            className="p-2 hover:bg-red-100 rounded-full"
            title="Abbrechen"
          >
            <Trash2 className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>
    );
  }

  // Vorschau-Modus (Aufnahme fertig)
  if (audioBlob && audioUrl) {
    return (
      <div className="flex items-center gap-3 p-3 bg-gray-100 rounded-xl w-full">
        {/* Play Button */}
        <button
          onClick={togglePlayback}
          className="w-10 h-10 rounded-full bg-[#14ad9f] flex items-center justify-center shrink-0"
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 text-white" />
          ) : (
            <Play className="w-5 h-5 text-white ml-0.5" />
          )}
        </button>

        {/* Dauer */}
        <div className="flex-1">
          <div className="h-2 bg-gray-300 rounded-full">
            <div className="h-full bg-[#14ad9f] rounded-full" style={{ width: '100%' }} />
          </div>
          <span className="text-xs text-gray-500 mt-1">{formatTime(recordingTime)}</span>
        </div>

        {/* Aktionen */}
        <div className="flex items-center gap-2">
          <button
            onClick={cancelRecording}
            className="p-2 hover:bg-gray-200 rounded-full"
            title="Verwerfen"
          >
            <Trash2 className="w-5 h-5 text-gray-500" />
          </button>
          
          <button
            onClick={handleSend}
            className="p-2 bg-[#14ad9f] hover:bg-teal-600 rounded-full"
            title="Senden"
          >
            <Send className="w-5 h-5 text-white" />
          </button>
        </div>

        <audio ref={audioRef} src={audioUrl} />
      </div>
    );
  }

  return null;
}
