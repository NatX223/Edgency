import { useCallback, useEffect, useRef, useState } from 'react';
import { Audio, type AVPlaybackStatus } from 'expo-av';

export interface RecordingResult {
  uri: string;
  durationMs: number;
}

export interface AudioRecorderState {
  isRecording: boolean;
  durationMs: number;
}

export function useAudioRecorder() {
  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);

  const [state, setState] = useState<AudioRecorderState>({
    isRecording: false,
    durationMs:  0,
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimer();
      recordingRef.current?.stopAndUnloadAsync().catch(() => {});
    };
  }, []);

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  /** Call this when the mic button is pressed down */
  const startRecording = useCallback(async (): Promise<boolean> => {
    try {
      // Configure audio session for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS:  true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recordingRef.current = recording;

      // Start duration counter
      let elapsed = 0;
      timerRef.current = setInterval(() => {
        elapsed += 100;
        setState({ isRecording: true, durationMs: elapsed });
      }, 100);

      setState({ isRecording: true, durationMs: 0 });
      return true;
    } catch (e) {
      console.warn('[useAudioRecorder] startRecording error:', e);
      return false;
    }
  }, []);

  /** Call this when the mic button is released */
  const stopRecording = useCallback(async (): Promise<RecordingResult | null> => {
    stopTimer();

    const recording = recordingRef.current;
    if (!recording) return null;

    try {
      const status = await recording.getStatusAsync();
      const durationMs = status.isLoaded ? (status.durationMillis ?? 0) : 0;

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      recordingRef.current = null;

      // Reset audio session
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      setState({ isRecording: false, durationMs: 0 });

      if (!uri) return null;
      return { uri, durationMs };
    } catch (e) {
      console.warn('[useAudioRecorder] stopRecording error:', e);
      setState({ isRecording: false, durationMs: 0 });
      recordingRef.current = null;
      return null;
    }
  }, []);

  return { state, startRecording, stopRecording };
}
